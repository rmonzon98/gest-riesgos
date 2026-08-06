/**
 * @fileoverview
 * Reportes de matrices de control interno/gobernanza y riesgos de fraude por unidad.
 *
 * @module /Riesgos/Reportes F/ReportesControlFraudeUnidadCard
 * @version 1.2
 * @author Equipo
 */

import { useState } from 'react';
import apiClient from 'api/apiClient';
import {
    Button,
    Select,
    MenuItem,
    Grid,
    FormControl,
    InputLabel,
    Card,
    CardHeader,
    CardContent,
    LinearProgress,
    ButtonGroup,
} from '@mui/material';
import AlertaMensaje from '../Alerta F/AlertaMensaje';

// Generadores de PDF existentes
import { GenerarReporteMatricesDesdeUltimo } from './Matrices/ReportesAnexo1';
import { GenerarReporteAnexo2DesdeUltimo } from './Matrices/ReportesAnexo2';

import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    HeadingLevel,
    AlignmentType,
    TextRun,
    WidthType,
} from 'docx';

/**
 * ReportesControlFraudeUnidadCard
 *
 * Tarjeta para generar:
 *  - Matriz de control interno y gobernanza (primera matriz)
 *  - Matriz de riesgos asociados al fraude o corrupción (segunda matriz)
 *
 * por período y UNA unidad seleccionada.
 *
 * @component
 * @param {Array}  props.unidades   Lista de direcciones [{ CODIGO_ENTIDAD, NOMBRE }, ...].
 * @param {Array}  props.periodos   Lista de períodos [{ CODIGO_PERIODO, FECINI, FECFIN }, ...].
 * @param {string} props.logoBase64 Logo institucional en base64 (opcional).
 */
function ReportesControlFraudeUnidadCard({ unidades = [], periodos = [], logoBase64 }) {
    const [periodo, setPeriodo] = useState('');
    const [unidad, setUnidad] = useState('');
    const [reporteTitulo, setReporteTitulo] = useState('');
    const [alerta, setAlerta] = useState({ open: false, tipo: 'warning', mensaje: '' });
    const [loading, setLoading] = useState(false);

    const mostrarAlerta = (mensaje, tipo = 'warning') => {
        setAlerta({ open: true, tipo, mensaje });
    };
    /**
     * mapTituloToConfig
     *
     * Mapea el tipo de reporte a:
     *  - endpoint
     *  - tipo (A1/A2)
     *  - nombre base del archivo.
     */
    const mapTituloToConfig = (tituloSel) => {
        switch (tituloSel) {
            case '1. Matriz de control interno y gobernanza':
                return {
                    tipo: 'A1',
                    apiPath: '/api/primera-matriz-actualizados/ultima-version',
                    nombreBase: 'Matriz_Control_Interno_Gobernanza',
                };
            case '2. Matriz de riesgos asociados al fraude o corrupción':
                return {
                    tipo: 'A2',
                    apiPath: '/api/segunda-matriz-actualizados/ultima-version',
                    nombreBase: 'Matriz_Riesgos_Fraude_Corrupcion',
                };
            default:
                return null;
        }
    };

    const handleLimpiarFiltros = () => {
        setPeriodo('');
        setUnidad('');
        setReporteTitulo('');
    };

    /** Texto bonito para el período (usa FECINI/FECFIN si están disponibles) */
    const getPeriodoTexto = () => {
        const p = periodos.find((x) => String(x.CODIGO_PERIODO) === String(periodo));
        if (!p) return String(periodo || '—');
        return `${p.FECINI} - ${p.FECFIN} ${p.CODIGO_PERIODO}`;
    };

    /** Nombre visible de la dirección seleccionada */
    const getUnidadTexto = () => {
        const u = unidades.find((x) => String(x.CODIGO_ENTIDAD) === String(unidad));
        return u ? u.NOMBRE : String(unidad || '');
    };

    /**
     * Obtiene el "último" registro del historial que viene en la respuesta:
     * {
     *   ok: true,
     *   historial: [ {...}, {...}, ... ]
     * }
     */
    const obtenerUltimoDelHistorial = (data) => {
        const historial = Array.isArray(data?.historial) ? data.historial : [];
        if (!historial.length) return null;
        return historial[historial.length - 1];
    };

    /** Parsea RESPUESTA (puede venir como objeto o string JSON) */
    const parseRespuesta = (ultimo) => {
        if (!ultimo) return null;
        let resp = ultimo.RESPUESTA;
        if (!resp) return null;
        if (typeof resp === 'string') {
            try {
                resp = JSON.parse(resp);
            } catch (e) {
                console.error('Error parseando RESPUESTA:', e);
                return null;
            }
        }
        return resp;
    };

    /** Extrae arreglo de matrices desde RESPUESTA */
    const extraerMatrices = (ultimo) => {
        const resp = parseRespuesta(ultimo);
        const matrices = Array.isArray(resp?.matrices) ? resp.matrices : [];
        return matrices;
    };

    const buildNombreArchivoBase = (cfgNombreBase, periodoTexto) =>
        `${cfgNombreBase}_${periodoTexto}`
            .replace(/\s+/g, '_')
            .replace(/[^\w\-_.]/g, '');

    const sanitizeSheetName = (name) => {
        let cleaned = String(name || '').replace(/[\\/?*\[\]:]/g, ' ');
        cleaned = cleaned.substring(0, 31);
        if (!cleaned.trim()) cleaned = 'Hoja';
        return cleaned;
    };

    /**
     * PDF
     *
     * - Valida tipo de reporte, período y unidad.
     * - Llama a:
     *      GET /api/primera-matriz-actualizados/ultima-version  (opción 1)
     *      GET /api/segunda-matriz-actualizados/ultima-version  (opción 2)
     * - Usa el último elemento de `data.historial` como `ultimo`.
     * - Llama al generador correspondiente:
     *      GenerarReporteMatricesDesdeUltimo(ultimo, ...)
     *      GenerarReporteAnexo2DesdeUltimo(ultimo, ...)
     */
    const handleGenerarPDF = async () => {
        if (!reporteTitulo || !periodo || !unidad) {
            mostrarAlerta(
                'Debe seleccionar el tipo de reporte, el período y la dirección antes de generar el PDF.'
            );
            return;
        }

        const cfg = mapTituloToConfig(reporteTitulo);
        if (!cfg) {
            mostrarAlerta('Seleccione un tipo de reporte válido.');
            return;
        }

        try {
            setLoading(true);

            const { data } = await apiClient.get(cfg.apiPath, {
                params: { periodo, unidad },
            });

            const ultimo = obtenerUltimoDelHistorial(data);

            if (!ultimo) {
                mostrarAlerta('No se encontró historial para la combinación seleccionada.', 'error');
                return;
            }

            const periodoTexto = getPeriodoTexto();
            const unidadTexto = getUnidadTexto();
            const nombreArchivoBase = buildNombreArchivoBase(cfg.nombreBase, periodoTexto);
            const nombreArchivo = `${nombreArchivoBase}.pdf`;

            if (cfg.tipo === 'A1') {
                // Primera matriz: control interno y gobernanza
                GenerarReporteMatricesDesdeUltimo(
                    ultimo,
                    periodoTexto,
                    logoBase64,
                    unidadTexto,
                    nombreArchivo
                );
            } else {
                // Segunda matriz: riesgos de fraude/corrupción
                GenerarReporteAnexo2DesdeUltimo(
                    ultimo,
                    periodoTexto,
                    logoBase64,
                    unidadTexto,
                    nombreArchivo
                );
            }
        } catch (err) {
            console.error('Error generando PDF de matrices:', err);
            mostrarAlerta('Ocurrió un error obteniendo la información para el PDF.', 'error');
        } finally {
            setLoading(false);
        }
    };

    /**
     * WORD
     *
     * - Usa la misma data de historial.
     * - Genera un .docx con:
     *      * Título general
     *      * Período y unidad
     *      * Sección por cada matriz con su tabla (headers + filas).
     */
    const handleGenerarWord = async () => {
        if (!reporteTitulo || !periodo || !unidad) {
            mostrarAlerta(
                'Debe seleccionar el tipo de reporte, el período y la dirección antes de exportar a Word.'
            );
            return;
        }

        const cfg = mapTituloToConfig(reporteTitulo);
        if (!cfg) {
            mostrarAlerta('Seleccione un tipo de reporte válido.');
            return;
        }

        try {
            setLoading(true);

            const { data } = await apiClient.get(cfg.apiPath, {
                params: { periodo, unidad },
            });

            const ultimo = obtenerUltimoDelHistorial(data);
            if (!ultimo) {
                mostrarAlerta('No se encontró historial para la combinación seleccionada.', 'error');
                return;
            }

            const matrices = extraerMatrices(ultimo);
            if (!matrices.length) {
                mostrarAlerta('No hay matrices para exportar a Word.', 'warning');
                return;
            }

            const periodoTexto = getPeriodoTexto();
            const unidadTexto = getUnidadTexto();
            const nombreArchivoBase = buildNombreArchivoBase(cfg.nombreBase, periodoTexto);
            const fileName = `${nombreArchivoBase}.docx`;

            const tituloReporte = reporteTitulo.replace(/^\d+\.\s*/, '');

            const docChildren = [];

            // Título principal
            docChildren.push(
                new Paragraph({
                    text: tituloReporte,
                    heading: HeadingLevel.HEADING1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                })
            );

            docChildren.push(
                new Paragraph({
                    text: `Período: ${periodoTexto}`,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 50 },
                })
            );

            docChildren.push(
                new Paragraph({
                    text: `Unidad: ${unidadTexto}`,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                })
            );

            matrices.forEach((m) => {
                const headers = Array.isArray(m?.columnas?.headers) ? m.columnas.headers : [];
                const filas = Array.isArray(m?.filas) ? m.filas : [];

                // Separación entre matrices
                docChildren.push(
                    new Paragraph({
                        text: '',
                        spacing: { before: 200, after: 80 },
                    })
                );

                // Título de la matriz
                docChildren.push(
                    new Paragraph({
                        text: `Matriz ${m.matriz} - ${m.titulo}`,
                        heading: HeadingLevel.HEADING2,
                        spacing: { after: 120 },
                    })
                );

                if (headers.length || filas.length) {
                    const headerRow = new TableRow({
                        children: headers.map(
                            (h) =>
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [new TextRun({ text: String(h), bold: true })],
                                        }),
                                    ],
                                })
                        ),
                    });

                    const bodyRows = filas.map(
                        (fila) =>
                            new TableRow({
                                children: (Array.isArray(fila) ? fila : []).map(
                                    (c) =>
                                        new TableCell({
                                            children: [new Paragraph(String(c ?? ''))],
                                        })
                                ),
                            })
                    );

                    const tabla = new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: headers.length ? [headerRow, ...bodyRows] : bodyRows,
                    });

                    docChildren.push(tabla);
                }

                if (m.observaciones) {
                    docChildren.push(
                        new Paragraph({
                            spacing: { before: 120 },
                            children: [
                                new TextRun({ text: 'Observaciones: ', bold: true }),
                                new TextRun({ text: String(m.observaciones) }),
                            ],
                        })
                    );
                }
            });

            const doc = new Document({
                sections: [{ children: docChildren }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, fileName);
        } catch (err) {
            console.error('Error generando Word de matrices:', err);
            mostrarAlerta('Ocurrió un error generando el Word. Revise la consola.', 'error');
        } finally {
            setLoading(false);
        }
    };

    /**
     * EXCEL
     *
     * - Hoja 1: "Resumen_matrices" con número, título, obligatorio, observaciones.
     * - Hoja por matriz:
     *      * Nombre de pestaña: "matriz x - título de la matriz" (recortado a 31 chars)
     *      * Encabezado con título, período y unidad
     *      * Tabla con headers y filas.
     */
    const handleGenerarExcel = async () => {
        if (!reporteTitulo || !periodo || !unidad) {
            mostrarAlerta(
                'Debe seleccionar el tipo de reporte, el período y la unidad antes de exportar a Excel.'
            );
            return;
        }

        const cfg = mapTituloToConfig(reporteTitulo);
        if (!cfg) {
            mostrarAlerta('Seleccione un tipo de reporte válido.');
            return;
        }

        try {
            setLoading(true);

            const { data } = await apiClient.get(cfg.apiPath, {
                params: { periodo, unidad },
            });

            const ultimo = obtenerUltimoDelHistorial(data);
            if (!ultimo) {
                mostrarAlerta('No se encontró historial para la combinación seleccionada.', 'error');
                return;
            }

            const matrices = extraerMatrices(ultimo);
            if (!matrices.length) {
                mostrarAlerta('No hay matrices para exportar a Excel.', 'warning');
                return;
            }

            const periodoTexto = getPeriodoTexto();
            const unidadTexto = getUnidadTexto();
            const nombreArchivoBase = buildNombreArchivoBase(cfg.nombreBase, periodoTexto);
            const fileName = `${nombreArchivoBase}.xlsx`;

            const wb = new ExcelJS.Workbook();

            /* ===== Hoja 1: Resumen de matrices ===== */
            const resumen = wb.addWorksheet('Resumen_matrices');

            const headerResumen = ['Matriz', 'Título', 'Obligatorio', 'Observaciones'];
            resumen.addRow(headerResumen);
            const headerRowResumen = resumen.getRow(1);
            headerRowResumen.font = { bold: true };
            headerRowResumen.alignment = { horizontal: 'center' };

            matrices.forEach((m) => {
                resumen.addRow([
                    m.matriz,
                    m.titulo || '',
                    m.obligatorio ? 'Sí' : 'No',
                    m.observaciones || '',
                ]);
            });

            // Auto ancho para resumen
            for (let i = 1; i <= headerResumen.length; i++) {
                let max = headerResumen[i - 1].length;
                resumen.eachRow((row) => {
                    const cell = row.getCell(i);
                    let val = cell.value;
                    if (val && typeof val === 'object' && 'text' in val) {
                        val = val.text;
                    }
                    const str = val == null ? '' : String(val);
                    if (str.length > max) max = str.length;
                });
                resumen.getColumn(i).width = Math.min(Math.max(max + 2, 10), 60);
            }

            /* ===== Hoja por matriz ===== */
            matrices.forEach((m) => {
                const headers = Array.isArray(m?.columnas?.headers) ? m.columnas.headers : [];
                const filas = Array.isArray(m?.filas) ? m.filas : [];

                const sheetNameRaw = `matriz ${m.matriz} - ${m.titulo || ''}`;
                const sheetName = sanitizeSheetName(sheetNameRaw);
                const ws = wb.addWorksheet(sheetName);

                const colCount =
                    headers.length || (Array.isArray(filas[0]) ? filas[0].length : 1) || 1;

                // Fila 1: título de la matriz
                const rowTitulo = ws.addRow([`Matriz ${m.matriz} - ${m.titulo || ''}`]);
                rowTitulo.font = { bold: true, size: 14 };
                rowTitulo.alignment = { horizontal: 'center' };
                if (colCount > 1) {
                    ws.mergeCells(1, 1, 1, colCount);
                }

                // Fila 2: período y unidad
                const rowInfo = ws.addRow([`Período: ${periodoTexto} | Dirección: ${unidadTexto}`]);
                rowInfo.alignment = { horizontal: 'center' };
                if (colCount > 1) {
                    ws.mergeCells(2, 1, 2, colCount);
                }

                // Fila 3: en blanco
                ws.addRow([]);

                // Fila 4: headers de la matriz
                const headerRowIndex = 4;
                if (headers.length) {
                    ws.getRow(headerRowIndex).values = headers;
                } else {
                    const genericos = Array.from({ length: colCount }, (_, i) => `Col ${i + 1}`);
                    ws.getRow(headerRowIndex).values = genericos;
                }
                const headerRow = ws.getRow(headerRowIndex);
                headerRow.font = { bold: true };
                headerRow.alignment = { horizontal: 'center' };

                // Filas de datos a partir de la fila 5
                filas.forEach((fila) => {
                    ws.addRow(Array.isArray(fila) ? fila : []);
                });

                // Auto ancho de columnas
                for (let i = 1; i <= colCount; i++) {
                    let max = 10;
                    ws.eachRow((row) => {
                        const cell = row.getCell(i);
                        let val = cell.value;
                        if (val && typeof val === 'object' && 'text' in val) {
                            val = val.text;
                        }
                        const str = val == null ? '' : String(val);
                        if (str.length > max) max = str.length;
                    });
                    ws.getColumn(i).width = Math.min(Math.max(max + 2, 10), 80);
                }

                // Congelar encabezado (hasta la fila de headers)
                ws.views = [{ state: 'frozen', ySplit: headerRowIndex }];
            });

            const buffer = await wb.xlsx.writeBuffer();
            saveAs(
                new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }),
                fileName
            );
        } catch (err) {
            console.error('Error generando Excel de matrices:', err);
            mostrarAlerta('Ocurrió un error generando el Excel. Revise la consola.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardHeader title="Matrices de control interno y fraude por dirección" />
            <CardContent>
                <AlertaMensaje
                    open={alerta.open}
                    setOpen={(v) => setAlerta((prev) => ({ ...prev, open: v }))}
                    tipo={alerta.tipo}
                    mensaje={alerta.mensaje}
                />

                <Grid container spacing={2}>
                    {/* Tipo de reporte */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel shrink>Tipo de reporte</InputLabel>
                            <Select
                                value={reporteTitulo}
                                onChange={(e) => setReporteTitulo(e.target.value)}
                                label="Tipo de reporte"
                                displayEmpty
                            >
                                <MenuItem value={''} sx={{ color: 'gray' }}>
                                    --- INGRESE UN TIPO DE REPORTE ---
                                </MenuItem>
                                <MenuItem value="1. Matriz de control interno y gobernanza">
                                    1. Matriz de control interno y gobernanza
                                </MenuItem>
                                <MenuItem value="2. Matriz de riesgos asociados al fraude o corrupción">
                                    2. Matriz de riesgos asociados al fraude o corrupción
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Período */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel shrink>Ingrese período</InputLabel>
                            <Select
                                value={periodo}
                                onChange={(e) => setPeriodo(e.target.value)}
                                label="Ingrese período"
                                displayEmpty
                            >
                                <MenuItem value={''} sx={{ color: 'gray' }}>
                                    --- INGRESE UN PERÍODO ---
                                </MenuItem>
                                {periodos.map((p) => (
                                    <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                        {p.FECINI} - {p.FECFIN} {p.CODIGO_PERIODO}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Dirección (obligatoria, una sola) */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel shrink>Ingrese Dirección</InputLabel>
                            <Select
                                value={unidad}
                                onChange={(e) => setUnidad(e.target.value)}
                                label="Ingrese unidad"
                                displayEmpty
                            >
                                <MenuItem value={''} sx={{ color: 'gray' }}>
                                    --- SELECCIONE UNA DIRECCIÓN ---
                                </MenuItem>
                                {unidades.map((u) => (
                                    <MenuItem key={u.CODIGO_ENTIDAD} value={u.CODIGO_ENTIDAD}>
                                        {u.NOMBRE}
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
                            <ButtonGroup variant="outlined" color="primary">
                                <Button onClick={handleGenerarPDF} disabled={loading}>
                                    {loading ? 'Generando…' : 'PDF'}
                                </Button>
                                <Button onClick={handleGenerarWord} disabled={loading}>
                                    {loading ? 'Generando…' : 'Word'}
                                </Button>
                                <Button onClick={handleGenerarExcel} disabled={loading}>
                                    {loading ? 'Generando…' : 'Excel'}
                                </Button>
                            </ButtonGroup>
                        </Grid>
                    </Grid>
                </Grid>

                {loading && <LinearProgress sx={{ mt: 2 }} />}
            </CardContent>
        </Card>
    );
}

export default ReportesControlFraudeUnidadCard;
