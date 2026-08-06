/**
 * @fileoverview
 * Reportes de riesgos por unidad: exporta matrices/mapas de riesgos a PDF, Word y Excel.
 *
 * @module /Riesgos/Reportes F/ReportesRiesgosUnidadCard
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useState } from 'react';
import apiClient from 'api/apiClient';
import {
    Button, Select, MenuItem, Grid, FormControl, InputLabel,
    Card, CardHeader, CardContent, ButtonGroup,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Alert, LinearProgress
} from '@mui/material';
import AlertaMensaje from '../Alerta F/AlertaMensaje';
import { MatrizEvaluacion } from './Riesgos/MatrizEvaluacion';
import { GenerarMapaCalor } from './Riesgos/GenerarMapaCalor';

import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, TextRun, WidthType
} from 'docx';

/**
 * ReportesRiesgosUnidadCard
 *
 * Tarjeta de reportes que permite generar matrices/mapas de riesgos por unidad y período.
 *
 * - Permite seleccionar tipo de reporte, período, unidad y tipo de riesgo.
 * - Consulta la API de reportes para obtener la información de riesgos.
 * - Genera archivos en PDF (usando MatrizEvaluacion / GenerarMapaCalor), Word y Excel.
 * - Muestra un modal para confirmar el responsable que firmará los PDFs.
 *
 * @component
 * @param {Array} props.tipos   Lista de tipos de riesgos disponibles.
 * @param {Array} props.unidades Lista de unidades disponibles.
 * @param {Array} props.periodos Lista de períodos disponibles.
 * @param {string} props.logoBase64 Logo en base64 que se pasa a los generadores de PDF.
 * @returns {JSX.Element}
 */
function ReportesRiesgosUnidadCard({ tipos = [], unidades = [], periodos = [], logoBase64 }) {

    const [periodo, setPeriodo] = useState('');
    const [unidad, setUnidad] = useState('');
    const [tipo, setTipo] = useState('');
    const [reporteTitulo, setReporteTitulo] = useState('');
    const [alerta, setAlerta] = useState({ open: false, tipo: 'warning', mensaje: '' });

    const mostrarAlerta = (mensaje, tipo = 'warning') => {
        setAlerta({ open: true, tipo, mensaje });
    };

    const handleLimpiarFiltros = () => {
        setPeriodo('');
        setUnidad('');
        setTipo('');
        setReporteTitulo('');
    };

    /* ===================== Helpers ===================== */
    /**
     * mapTituloToConfig
     *
     * Mapea el texto seleccionado en el combo de "Tipo de reporte"
     * a la configuración interna que se usa para llamar a la API y
     * generar los nombres/títulos de los archivos.
     *
     * @param {string} tituloSel Texto del tipo de reporte seleccionado.
     * @returns {{categoria:string,pdfFn:'MATRIZ'|'MAPA',nombreBase:string,tituloDoc:string}|null}
     */
    const mapTituloToConfig = (tituloSel) => {
        switch (tituloSel) {
            case '1. Matriz de evaluación de riesgos':
                return {
                    categoria: 'ME',
                    pdfFn: 'MATRIZ',
                    nombreBase: `Matriz_Evaluacion_${periodo}`,
                    tituloDoc: 'Matriz de Evaluación'
                };
            case '2. Mapa de calor de riesgos residual':
                return {
                    categoria: 'MC',
                    pdfFn: 'MAPA',
                    nombreBase: `Mapa_de_calor_de_riesgos_${periodo}`,
                    tituloDoc: 'Mapa de Calor de Riesgos (Residual)'
                };
            case '3. Matriz de continuidad de evaluación de riesgos':
                return {
                    categoria: 'MCE',
                    pdfFn: 'MATRIZ',
                    nombreBase: `Matriz_Continuidad_Y_Monitoreo_${periodo}`,
                    tituloDoc: 'Matriz de continuidad y monitoreo'
                };
            default:
                return null;
        }
    };

    /**
     * fetchReporte
     *
     * Consulta al backend la información de riesgos para el reporte.
     *
     * - Envía como parámetros: período, tipo de riesgo, unidad y categoría del reporte.
     * - El backend devuelve `propiedades`, `valores` y, en algunos casos, `superior`.
     *
     * @route GET /api/reportes-actualizados/informacion-riesgos
     * @param {string} categoria Código de categoría del reporte (ME | MC | MCE).
     * @returns {Promise<Object>} Payload con la información del reporte.
     */
    const fetchReporte = async (categoria) => {
        const { data } = await apiClient.get('/api/reportes-actualizados/informacion-riesgos', {
            params: { periodo, tipo, unidad, categoria }
        });
        return data;
    };

    const safe = (v) => (v === null || v === undefined || v === '') ? '—' : String(v);

    const getCellValue = (row, prop) => {
        const label = prop?.label ?? '';
        const key = prop?.key ?? '';
        const source = (prop?.source ?? 'predefinida');

        if (source === 'extra') {
            if (row?.EXTRAS && Object.prototype.hasOwnProperty.call(row.EXTRAS, label)) return safe(row.EXTRAS[label]);
            if (row?.EXTRAS && Object.prototype.hasOwnProperty.call(row.EXTRAS, key)) return safe(row.EXTRAS[key]);
            return '—';
        }
        if (Object.prototype.hasOwnProperty.call(row, label)) return safe(row[label]);
        if (Object.prototype.hasOwnProperty.call(row, key)) return safe(row[key]);
        return '—';
    };

    
    /**
     * candidateKeys
     *
     * Construye la lista de posibles claves de agrupación para
     * identificar la unidad/dirección en el dataset.
     *
     * @param {Object} [meta={}] Metadatos opcionales del reporte.
     * @returns {string[]} Lista de nombres de campos candidatos.
     */
    const candidateKeys = (meta = {}) => ([
        meta?.groupKey,
        'Nombre unidad',
        'Unidad', 'Unidad organizacional', 'NOMBRE_UNIDAD',
        'Dirección', 'Direccion', 'DIRECCION',
        'Dirección evaluada', 'Dirección / Unidad',
        'Área evaluada'
    ].filter(Boolean));

    /**
     * findGroupKey
     *
     * Determina la primera clave candidata que tenga al menos un valor no vacío
     * dentro del arreglo de filas.
     *
     * @param {Array<Object>} items Filas de datos.
     * @param {Object} [meta={}] Metadatos opcionales.
     * @returns {string|null} Nombre del campo de agrupación o `null` si no se encuentra.
     */
    const findGroupKey = (items, meta = {}) => {
        const cands = candidateKeys(meta);
        for (const c of cands) {
            const hasAny = (items ?? []).some(r => r && (r[c] !== undefined && r[c] !== null && r[c] !== ''));
            if (hasAny) return c;
        }
        return null;
    };

    const groupByUnidad = (rows, meta = {}) => {
        const gk = findGroupKey(rows, meta);
        const getG = (row) => gk ? safe(row[gk]) : 'Sin unidad';
        const grupos = {};
        (rows ?? []).forEach(r => {
            const g = getG(r);
            if (!grupos[g]) grupos[g] = [];
            grupos[g].push(r);
        });
        const names = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        return { groupKey: gk, groups: grupos, order: names };
    };

    
    /**
     * normalizeColumns
     *
     * Normaliza el payload del backend para asegurar que siempre haya
     * un arreglo de `propiedades` y un arreglo de filas (`rows`).
     *
     * - Si el backend no envía `propiedades`, se generan a partir de las claves
     *   de la primera fila.
     *
     * @param {Object} payload Payload devuelto por la API.
     * @returns {{propiedades:Array,rows:Array}}
     */
    const normalizeColumns = (payload) => {
        const props = Array.isArray(payload?.propiedades) ? payload.propiedades : [];
        const rows = Array.isArray(payload?.valores) ? payload.valores : [];

        if (props.length > 0) return { propiedades: props, rows };

        if (rows.length > 0) {
            const keys = Object.keys(rows[0]);
            const props2 = keys.map(k => ({ key: k, label: k, source: 'predefinida' }));
            return { propiedades: props2, rows };
        }
        return { propiedades: [], rows: [] };
    };

    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfLoadingData, setPdfLoadingData] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [pdfError, setPdfError] = useState('');

    const [pdfCfg, setPdfCfg] = useState(null); // guarda cfg de mapTituloToConfig
    const [pdfPayload, setPdfPayload] = useState(null); // { propiedades, valores, superior }
    const [respNombre, setRespNombre] = useState('');
    const [respPuesto, setRespPuesto] = useState('');

    /**
     * handleGenerarPDF
     *
     * Paso 1 para generar PDF:
     * - Valida selección de tipo de reporte y período.
     * - Resuelve configuración con `mapTituloToConfig`.
     * - Llama a la API para obtener datos de riesgos y el responsable superior.
     * - Abre el modal para que el usuario confirme/ajuste nombre y puesto.
     *
     * Consume:
     * - GET /api/reportes-actualizados/informacion-riesgos
     */
    const handleGenerarPDF = async () => {
        if (!reporteTitulo || !periodo) {
            mostrarAlerta('Debe seleccionar el tipo de reporte y el período antes de generar el PDF.');
            return;
        }

        const cfg = mapTituloToConfig(reporteTitulo);
        if (!cfg) {
            mostrarAlerta('Seleccione un tipo de reporte válido.');
            return;
        }

        try {
            setPdfError('');
            setPdfLoadingData(true);
            const data = await fetchReporte(cfg.categoria);

            const sup = data?.superior || {};
            setRespNombre(sup?.nombre || '');
            setRespPuesto(sup?.puesto || '');
            setPdfPayload({ propiedades: data.propiedades, valores: data.valores, superior: sup });
            setPdfCfg(cfg);
            setPdfModalOpen(true);
        } catch (error) {
            console.error('Error preparando PDF:', error);
            mostrarAlerta('Ocurrió un error obteniendo los datos para el PDF.', 'error');
        } finally {
            setPdfLoadingData(false);
        }
    };

    /**
     * doGeneratePDF
     *
     * Paso 2 para generar PDF (se ejecuta al confirmar el modal):
     *
     * - Construye el objeto `responsable` usando los campos editados o el valor original del backend.
     * - Llama a `MatrizEvaluacion` o `GenerarMapaCalor` según `pdfCfg.pdfFn`.
     * - Genera y descarga el PDF en el navegador.
     *
     * No llama directamente a la API, utiliza los datos ya cargados en `pdfPayload`.
     *
     * @param {boolean} [useEditedFields=true] Si `true`, usa los valores editados de nombre/puesto.
     */
    const doGeneratePDF = async (useEditedFields = true) => {
        if (!pdfCfg || !pdfPayload) return;
        setPdfGenerating(true);
        try {
            const responsable = {
                nombre: useEditedFields ? respNombre : (pdfPayload?.superior?.nombre || ''),
                puesto: useEditedFields ? respPuesto : (pdfPayload?.superior?.puesto || '')
            };

            if (pdfCfg.pdfFn === 'MATRIZ') {
                MatrizEvaluacion(
                    { propiedades: pdfPayload.propiedades, valores: pdfPayload.valores },
                    logoBase64,
                    {
                        titulo: pdfCfg.tituloDoc,
                        pageSize: 'LEGAL',
                        subtitulo: `Periodo ${periodo}`,
                        responsable
                    },
                    `${pdfCfg.nombreBase}.pdf`
                );
            } else {
                GenerarMapaCalor(
                    { propiedades: pdfPayload.propiedades, valores: pdfPayload.valores },
                    logoBase64,
                    {
                        titulo: pdfCfg.tituloDoc,
                        pageSize: 'LEGAL',
                        subtitulo: `Periodo ${periodo}`,
                        responsable
                    },
                    `${pdfCfg.nombreBase}.pdf`
                );
            }
            setPdfModalOpen(false);
            setPdfCfg(null);
            setPdfPayload(null);
        } catch (error) {
            console.error('Error generando PDF:', error);
            setPdfError('Ocurrió un error generando el PDF. Revisa la consola.');
        } finally {
            setPdfGenerating(false);
        }
    };

    /**
     * handleGenerarWord
     *
     * Exporta el reporte seleccionado a Word (.docx).
     *
     * - Valida selección de tipo de reporte y período.
     * - Llama al backend para obtener la información de riesgos.
     * - Normaliza columnas y agrupa por unidad.
     * - Construye el documento con `docx` (encabezado general, ficha por unidad y tabla detallada).
     * - Descarga el archivo `.docx` en el navegador.
     *
     * Consume:
     * - GET /api/reportes-actualizados/informacion-riesgos
     */
    const handleGenerarWord = async () => {
        if (!reporteTitulo || !periodo) {
            mostrarAlerta('Debe seleccionar el tipo de reporte y el período antes de exportar a Word.');
            return;
        }
        const cfg = mapTituloToConfig(reporteTitulo);
        if (!cfg) {
            mostrarAlerta('Seleccione un tipo de reporte válido.');
            return;
        }

        try {
            const payload = await fetchReporte(cfg.categoria);
            const { propiedades, rows } = normalizeColumns(payload);
            if (!propiedades.length || !rows.length) {
                mostrarAlerta('No hay datos para exportar a Word.');
                return;
            }

            const { groups, order } = groupByUnidad(rows, {});

            const tituloDoc = cfg.tituloDoc || 'Reporte';
            const periodoTexto = `Periodo ${periodo}`;

            const docChildren = [];
            // Encabezado general
            docChildren.push(new Paragraph({
                text: tituloDoc,
                heading: HeadingLevel.HEADING1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }));
            docChildren.push(new Paragraph({
                text: periodoTexto,
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }));

            order.forEach((gName) => {
                docChildren.push(new Paragraph({ text: ' ', spacing: { before: 120, after: 80 } }));

                const ficha = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Unidad', bold: true })] })] }),
                                new TableCell({ children: [new Paragraph(safe(gName))] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Período', bold: true })] })] }),
                                new TableCell({ children: [new Paragraph(safe(periodoTexto))] })
                            ]
                        })
                    ]
                });
                docChildren.push(ficha);

                const headerRow = new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No.', bold: true })] })] }),
                        ...propiedades.map(p =>
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (p?.label ?? p?.key ?? '—'), bold: true })] })] })
                        )
                    ]
                });

                const bodyRows = groups[gName].map((r, i) => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(String(i + 1))] }),
                        ...propiedades.map(p => new TableCell({ children: [new Paragraph(getCellValue(r, p))] }))
                    ]
                }));

                const tabla = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [headerRow, ...bodyRows]
                });

                docChildren.push(new Paragraph({ text: ' ' }));
                docChildren.push(tabla);
            });

            const doc = new Document({ sections: [{ children: docChildren }] });
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${cfg.nombreBase}.docx`);
        } catch (error) {
            console.error('Error generando Word:', error);
            mostrarAlerta('Ocurrió un error generando el Word. Revise la consola.', 'error');
        }
    };

   
    /**
     * handleGenerarExcel
     *
     * Exporta el reporte seleccionado a Excel (.xlsx).
     *
     * - Valida selección de tipo de reporte y período.
     * - Llama al backend para obtener la información de riesgos.
     * - Normaliza columnas y agrupa por unidad.
     * - Crea un libro de Excel con una hoja por unidad (título, ficha, tabla de datos).
     * - Ajusta anchos de columna y congela encabezados.
     * - Descarga el archivo `.xlsx` en el navegador.
     *
     * Consume:
     * - GET /api/reportes-actualizados/informacion-riesgos
     */
    const handleGenerarExcel = async () => {
        if (!reporteTitulo || !periodo) {
            mostrarAlerta('Debe seleccionar el tipo de reporte y el período antes de exportar a Excel.');
            return;
        }
        const cfg = mapTituloToConfig(reporteTitulo);
        if (!cfg) {
            mostrarAlerta('Seleccione un tipo de reporte válido.');
            return;
        }

        try {
            const payload = await fetchReporte(cfg.categoria);
            const { propiedades, rows } = normalizeColumns(payload);

            if (!propiedades.length || !rows.length) {
                mostrarAlerta('No hay datos para exportar a Excel.');
                return;
            }

            const { groups, order } = groupByUnidad(rows, {});
            const wb = new ExcelJS.Workbook();
            const tituloDoc = cfg.tituloDoc || 'Reporte';
            const periodoTexto = `Periodo ${periodo}`;

            const colCount = Math.max(propiedades.length + 1, 2); // +1 por "No."
            const toCol = (n) => {
                let s = '', t = n;
                while (t > 0) {
                    const m = (t - 1) % 26;
                    s = String.fromCharCode(65 + m) + s;
                    t = Math.floor((t - 1) / 26);
                }
                return s;
            };

            order.forEach((gName) => {
                const sheetName = (String(gName).trim() || 'Sin_unidad').slice(0, 31);
                const ws = wb.addWorksheet(sheetName);

                const endCol = toCol(colCount);
                // Título y subtítulo
                ws.mergeCells(`A1:${endCol}1`);
                ws.getCell('A1').value = tituloDoc;
                ws.getCell('A1').font = { bold: true, size: 14 };
                ws.getCell('A1').alignment = { horizontal: 'center' };

                ws.mergeCells(`A2:${endCol}2`);
                ws.getCell('A2').value = periodoTexto;
                ws.getCell('A2').alignment = { horizontal: 'center' };

                ws.getCell('A4').value = 'Unidad';
                ws.getCell('A4').font = { bold: true };
                ws.getCell('B4').value = safe(gName);

                ws.getCell('A5').value = 'Período';
                ws.getCell('A5').font = { bold: true };
                ws.getCell('B5').value = safe(periodoTexto);

                const headerRowIndex = 7;
                const headers = ['No.', ...propiedades.map(p => p?.label ?? p?.key ?? '—')];
                ws.getRow(headerRowIndex).values = headers;
                ws.getRow(headerRowIndex).font = { bold: true };
                ws.getRow(headerRowIndex).alignment = { horizontal: 'center' };

                // Filas
                groups[gName].forEach((r, i) => {
                    const arr = [String(i + 1), ...propiedades.map(p => getCellValue(r, p))];
                    ws.getRow(headerRowIndex + 1 + i).values = arr;
                });

                // Auto ancho
                for (let i = 1; i <= colCount; i++) {
                    let max = (headers[i - 1] ?? '').toString().length;
                    for (let r = headerRowIndex + 1; r <= headerRowIndex + groups[gName].length; r++) {
                        const v = ws.getRow(r).getCell(i).value;
                        const s = (v == null ? '' : String(v));
                        if (s.length > max) max = s.length;
                    }
                    ws.getColumn(i).width = Math.min(Math.max(max + 2, 10), 60);
                }

                // Congelar encabezado
                ws.views = [{ state: 'frozen', ySplit: headerRowIndex }];
            });

            const blob = await wb.xlsx.writeBuffer();
            saveAs(
                new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                `${cfg.nombreBase}.xlsx`
            );
        } catch (error) {
            console.error('Error generando Excel:', error);
            mostrarAlerta('Ocurrió un error generando el Excel. Revise la consola.', 'error');
        }
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardHeader title="Reportes riesgos por unidad" />
            <CardContent>
                <AlertaMensaje
                    open={alerta.open}
                    setOpen={(v) => setAlerta((prev) => ({ ...prev, open: v }))}
                    tipo={alerta.tipo}
                    mensaje={alerta.mensaje}
                />

                <Grid container spacing={2}>
                    {/* Tipo de Reporte */}
                    <Grid item xs={12} md={6} >
                        <FormControl fullWidth>
                            <InputLabel shrink>Tipo de reporte</InputLabel>
                            <Select value={reporteTitulo} onChange={(e) => setReporteTitulo(e.target.value)}
                                label="Tipo de reporte" displayEmpty >
                                <MenuItem value={''} sx={{ color: 'gray' }}>
                                    --- INGRESE UN TIPO DE REPORTE ---
                                </MenuItem>
                                <MenuItem value={'1. Matriz de evaluación de riesgos'}>1. Matriz de evaluación de riesgos</MenuItem>
                                <MenuItem value={'2. Mapa de calor de riesgos residual'}>2. Mapa de calor de riesgos residual</MenuItem>
                                <MenuItem value={'3. Matriz de continuidad de evaluación de riesgos'}>3. Matriz de continuidad de evaluación de riesgos</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Período */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel shrink>Ingrese periodo</InputLabel>
                            <Select
                                value={periodo}
                                onChange={(e) => setPeriodo(e.target.value)}
                                label="Ingrese periodo"
                                displayEmpty
                            >
                                <MenuItem value={''} sx={{ color: 'gray' }}>
                                    --- INGRESE UN PERIODO ---
                                </MenuItem>
                                {periodos.map((p) => (
                                    <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                        {p.FECINI} - {p.FECFIN} {p.CODIGO_PERIODO}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel shrink>Ingrese unidad (opcional)</InputLabel>
                            <Select
                                value={unidad}
                                onChange={(e) => setUnidad(e.target.value)}
                                label="Ingrese unidad (opcional)"
                                displayEmpty
                            >
                                <MenuItem value={''} sx={{ color: 'gray' }}>
                                    TODAS
                                </MenuItem>
                                {unidades.map((u) => (
                                    <MenuItem key={u.CODIGO_ENTIDAD} value={u.CODIGO_ENTIDAD}>
                                        {u.NOMBRE}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel shrink>Ingrese tipo de riesgos (opcional)</InputLabel>
                            <Select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                label="Ingrese tipo de riesgos (opcional)"
                                displayEmpty
                            >
                                <MenuItem value={''} sx={{ color: 'gray' }}>
                                    TODAS
                                </MenuItem>
                                {tipos.map((a) => (
                                    <MenuItem key={a.ID} value={a.ID}>
                                        {a.NOMBRE}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Acciones */}
                    <Grid item xs={12} container justifyContent="flex-end" spacing={2}>
                        <Grid item>
                            <Button variant="outlined" color="secondary" onClick={handleLimpiarFiltros}>
                                Limpiar filtros
                            </Button>
                        </Grid>
                        <Grid item>
                            {/* Botón extra para Word y Excel */}
                            <ButtonGroup variant="outlined" color="primary">
                                <Button onClick={handleGenerarPDF} disabled={pdfLoadingData}>
                                    {pdfLoadingData ? 'Preparando…' : 'PDF'}
                                </Button>
                                <Button onClick={handleGenerarWord}>Word</Button>
                                <Button onClick={handleGenerarExcel}>Excel</Button>
                            </ButtonGroup>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Feedback de carga para PDF */}
                {pdfLoadingData && <LinearProgress sx={{ mt: 2 }} />}
            </CardContent>

            {/* ===== Modal de confirmación de responsable (previo a PDF) ===== */}
            <Dialog
                open={pdfModalOpen}
                onClose={() => !pdfGenerating && setPdfModalOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Confirmar responsable para la firma</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Verifica o ajusta el nombre y el puesto que irán en el reporte PDF.
                    </Alert>
                    {pdfError && <Alert severity="error" sx={{ mb: 2 }}>{pdfError}</Alert>}
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Nombre del responsable"
                                fullWidth
                                size="small"
                                value={respNombre}
                                onChange={(e) => setRespNombre(e.target.value)}
                                disabled={pdfGenerating}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Puesto del responsable"
                                fullWidth
                                size="small"
                                value={respPuesto}
                                onChange={(e) => setRespPuesto(e.target.value)}
                                disabled={pdfGenerating}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setPdfModalOpen(false)} disabled={pdfGenerating}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => doGeneratePDF(true)}
                        disabled={pdfGenerating}
                    >
                        {pdfGenerating ? 'Generando…' : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
}

export default ReportesRiesgosUnidadCard;
