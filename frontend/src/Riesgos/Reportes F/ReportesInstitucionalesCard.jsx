/**
 * @fileoverview
 * Reportes institucionales de riesgos: generación de reportes en PDF, Word y Excel.
 *
 * @module Reportes/Riesgos/ReportesInstitucionalesCard
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useState } from 'react';
import {
    Card, CardHeader, CardContent, Grid, FormControl, InputLabel, Select, MenuItem,
    Button, ButtonGroup, FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Stack, CircularProgress
} from '@mui/material';
import AlertaMensaje from '../Alerta F/AlertaMensaje';
import axios from 'axios';

import { ReportePrimeraMatrizInst } from './Institucionales/ReportePrimeraMatrizInst';
import { ReporteSegundaMatrizInst } from './Institucionales/ReporteSegundaMatrizInst';
import { MatrizEvaluacionInst } from './Institucionales/MatrizEvaluacionInst';
import { MapaCalorInst } from './Institucionales/MapaCalorInst';

import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import {
    Document, Packer, Paragraph, Table as DTable, TableRow as DTR, TableCell as DTC,
    HeadingLevel, AlignmentType, TextRun, WidthType, PageOrientation
} from 'docx';

/**
 * ReportesInstitucionalesCard
 *
 * Genera reportes de riesgos a nivel institucional en distintos formatos (PDF, Word, Excel).
 *
 * - Permite seleccionar tipo de reporte y período.
 * - Opción para dividir algunos reportes por unidad.
 * - Pide y utiliza la información del superior para firmar los reportes en PDF.
 * - Consume los endpoints institucionales y reutiliza la lógica de exportación existente.
 *
 * @component
 * @param {Object} props
 * @param {Array}  props.periodos   Lista de períodos disponibles.
 * @param {string} props.logoBase64 Logo institucional en base64 para incrustar en reportes.
 * @param {Object|string} props.institucion Información de la institución (nombre/tipo) usada en PDFs.
 * @returns {JSX.Element}
 */
function ReportesInstitucionalesCard({ periodos = [], logoBase64, institucion = {} }) {
    const [tipo, setTipo] = useState('');
    const [periodo, setPeriodo] = useState('');
    const [mostrarUnidades, setMostrarUnidades] = useState(false);
    const [alerta, setAlerta] = useState({ open: false, tipo: 'warning', mensaje: '' });

    const [openSup, setOpenSup] = useState(false);
    const [supNombre, setSupNombre] = useState('');
    const [supPuesto, setSupPuesto] = useState('');
    const [loadingSup, setLoadingSup] = useState(false);
    const [confirmingPDF, setConfirmingPDF] = useState(false);

    const headers = () => ({ 'x-access-token': localStorage.getItem('token') });
    const mostrarAlerta = (mensaje, tipo = 'warning') => setAlerta({ open: true, tipo, mensaje });

    /**
     * safe
     *
     * Normaliza valores nulos/vacíos a guion largo.
     *
     * @param {*} v Valor original.
     * @returns {string} Valor seguro para mostrar en tablas/celdas.
     */
    const safe = (v) => (v === null || v === undefined || v === '') ? '—' : String(v);
  
    /**
     * getCellValue
     *
     * Obtiene el valor de una celda según la definición de la propiedad:
     * - Si `source` es "extra", busca en `row.EXTRAS`.
     * - En caso contrario, prioriza `label` y luego `key` dentro del registro.
     *
     * @param {Object} row  Registro de datos.
     * @param {Object} prop Definición de columna ({label, key, source}).
     * @returns {string} Valor en formato seguro.
     */
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

    const candidateKeys = (meta = {}) => ([
        meta?.groupKey,
        'Nombre unidad',
        'Unidad', 'Unidad organizacional', 'NOMBRE_UNIDAD',
        'Dirección', 'Direccion', 'DIRECCION',
        'Dirección evaluada', 'Dirección / Unidad',
        'Área evaluada'
    ].filter(Boolean));

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
        const getG = (row) => gk ? safe(row[gk]) : 'Institucional';
        const grupos = {};
        (rows ?? []).forEach(r => {
            const g = getG(r);
            if (!grupos[g]) grupos[g] = [];
            grupos[g].push(r);
        });
        const names = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        return { groupKey: gk, groups: grupos, order: names };
    };

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

    /**
     * toCol
     *
     * Convierte un índice numérico a la etiqueta de columna de Excel.
     * Ej: 1 → A, 26 → Z, 27 → AA.
     *
     * @param {number} n Índice de columna.
     * @returns {string} Etiqueta de columna de Excel.
     */
    const toCol = (n) => {
        let s = '', t = n;
        while (t > 0) {
            const m = (t - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            t = Math.floor((t - 1) / 26);
        }
        return s;
    };

    /**
     * sanitizeSheetName
     *
     * Limpia y recorta un nombre de hoja para que sea válido en Excel.
     *
     * @param {string} name Nombre original.
     * @returns {string} Nombre seguro y con longitud máxima de 31 caracteres.
     */
    const sanitizeSheetName = (name) =>
        (name || 'Hoja')
            .replace(/[\*\?:\\\/\[\]]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 31) || 'Hoja';

    /**
     * parseMaybeJSON
     *
     * Intenta parsear un valor a JSON si es string.
     *
     * @param {*} v Valor original.
     * @returns {any|null} Objeto parseado o null si falla.
     */
    const parseMaybeJSON = (v) => {
        if (v == null) return null;
        if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
        return v;
    };

    /**
     * normalizeMatrices
     *
     * Convierte la lista de matrices crudas en una estructura uniforme.
     *
     * @param {Object[]} list Lista de matrices desde backend.
     * @returns {{matriz:number|string, titulo:string, columnas:Object, filas:Array[]}[]}
     */
    const normalizeMatrices = (list = []) =>
        list.map((m, i) => {
            const columnas = parseMaybeJSON(m.columnas ?? m.COLUMNAS) ?? { headers: [] };
            const filas = parseMaybeJSON(m.filas ?? m.FILAS) ?? [];
            return {
                matriz: m.matriz ?? m.MATRIZ ?? i + 1,
                titulo: (m.titulo ?? m.TITULO ?? '').toString(),
                columnas, filas,
            };
        });

    /**
     * fetchPrimeraMatriz
     *
     * Obtiene la información de la primera matriz institucional (control interno y gobernanza).
     *
     * @param {number|string} p Código de período.
     * @returns {Promise<{ matrices: Array, institucion: any }>}
     */
    const fetchPrimeraMatriz = async (p) => {
        const { data } = await axios.get('/api/institucion-actualizados/primera-matriz', {
            headers: headers(),
            params: { periodo: p, tipo: 1 }
        });
        const arr =
            Array.isArray(data?.matrices) ? normalizeMatrices(data.matrices)
                : Array.isArray(data?.MATRICES) ? normalizeMatrices(data.MATRICES)
                    : Array.isArray(data?.respuesta?.matrices) ? normalizeMatrices(data.respuesta.matrices)
                        : [];
        return { matrices: arr, institucion: data?.institucion };
    };

    /**
     * fetchSegundaMatriz
     *
     * Obtiene la información de la segunda matriz institucional (fraude/corrupción).
     *
     * @param {number|string} p Código de período.
     * @returns {Promise<{ matrices: Array, institucion: any }>}
     */
    const fetchSegundaMatriz = async (p) => {
        const { data } = await axios.get('/api/institucion-actualizados/segunda-matriz', {
            headers: headers(),
            params: { periodo: p, tipo: 2 }
        });
        const arr =
            Array.isArray(data?.matrices) ? normalizeMatrices(data.matrices)
                : Array.isArray(data?.MATRICES) ? normalizeMatrices(data.MATRICES)
                    : [];
        return { matrices: arr, institucion: data?.institucion };
    };

    /**
     * fetchInstME_MC_MCE
     *
     * Obtiene datos institucionales para:
     * - ME  → Matriz de evaluación de riesgos.
     * - MC  → Mapa de calor.
     * - MCE → Matriz de continuidad/evaluación.
     *
     * @param {"ME"|"MC"|"MCE"} categoria Tipo de reporte a solicitar.
     * @returns {Promise<Object>} Payload con {propiedades, valores, institucion}.
     */
    const fetchInstME_MC_MCE = async (categoria) => {
        const { data } = await axios.get('/api/reportes-actualizados/matriz-evaluacion-riesgos-inst', {
            headers: headers(),
            params: { periodo, categoria }
        });
        return data;
    };

    /**
     * fetchSuperior
     *
     * Obtiene desde backend el superior responsable (nombre y puesto)
     * para precargar el diálogo de firma institucional.
     *
     * @returns {Promise<void>}
     */
    const fetchSuperior = async () => {
        setLoadingSup(true);
        try {
            const { data } = await axios.get('/api/reportes-actualizados/obtener-superior', { headers: headers() });
            // API devuelve { nombre, puesto }
            if (data?.nombre) setSupNombre(String(data.nombre));
            if (data?.puesto) setSupPuesto(String(data.puesto));
        } catch (e) {
            console.error('No se pudo obtener el superior', e);
        } finally {
            setLoadingSup(false);
        }
    };

    const handleOpenSupModal = () => {
        if (!tipo || !periodo) {
            mostrarAlerta('Debe seleccionar tipo y período.');
            return;
        }
        setOpenSup(true);
        fetchSuperior();
    };

    const handleCloseSupModal = () => setOpenSup(false);

    const handleConfirmPDF = async () => {
        if (!supNombre.trim() || !supPuesto.trim()) {
            mostrarAlerta('Completa nombre y puesto del superior.');
            return;
        }
        setConfirmingPDF(true);
        try {
            await handleGenerarPDF({
                nombre: supNombre.trim(),
                puesto: supPuesto.trim()
            });
            setOpenSup(false);
        } finally {
            setConfirmingPDF(false);
        }
    };

    /**
     * handleGenerarPDF
     *
     * Genera el PDF institucional según el tipo seleccionado:
     * - 1: Primera matriz (control interno y gobernanza).
     * - 2: Segunda matriz (fraude/corrupción).
     * - 3: Matriz de evaluación de riesgos institucional.
     * - 4: Mapa de calor residual institucional.
     * - 5: Matriz de continuidad y evaluación institucional.
     *
     * Reutiliza los generadores de PDF ya existentes y les pasa el responsable.
     *
     * @param {{nombre:string, puesto:string}} superior Datos del superior que firma el reporte.
     * @returns {Promise<void>}
     */
    const handleGenerarPDF = async (superior) => {
        try {
            const responsable = { nombre: superior?.nombre ?? '', puesto: superior?.puesto ?? '' };

            if (tipo === 1) {
                const { matrices } = await fetchPrimeraMatriz(periodo);
                if (!matrices.length) return mostrarAlerta('No hay versión guardada', 'info');
                ReportePrimeraMatrizInst({
                    matrices,
                    periodoSeleccionado: periodo,
                    logoBase64,
                    unidad: institucion,
                    includeEmpty: true,
                    responsable
                });
            } else if (tipo === 2) {
                const { matrices, institucion: inst } = await fetchSegundaMatriz(periodo);
                if (!matrices.length) return mostrarAlerta('No hay versión guardada', 'info');
                const tipoInst = inst?.TIPO;
                ReporteSegundaMatrizInst(
                    matrices,
                    periodo,
                    logoBase64,
                    institucion,
                    `Segunda_Matriz_${periodo}.pdf`,
                    tipoInst,
                    responsable
                );
            } else if (tipo === 3) {
                const data = await fetchInstME_MC_MCE('ME');
                MatrizEvaluacionInst(
                    { propiedades: data.propiedades, valores: data.valores },
                    logoBase64,
                    {
                        titulo: `Matriz de evaluación institucional ${periodo}`,
                        periodo,
                        dividirPorUnidad: mostrarUnidades,
                        pageSize: 'LEGAL',
                        nombre: data.institucion?.[0]?.NOMBRE,
                        tipo: data.institucion?.[0]?.TIPO,
                        responsable
                    }
                );
            } else if (tipo === 4) {
                const data = await fetchInstME_MC_MCE('MC');
                MapaCalorInst(
                    { propiedades: data.propiedades, valores: data.valores },
                    logoBase64,
                    {
                        titulo: `Mapa de calor residual ${periodo}`,
                        periodo,
                        dividirPorUnidad: mostrarUnidades,
                        pageSize: 'LEGAL',
                        nombre: data.institucion?.[0]?.NOMBRE,
                        tipo: data.institucion?.[0]?.TIPO,
                        responsable
                    }
                );
            } else if (tipo === 5) {
                const data = await fetchInstME_MC_MCE('MCE');
                MatrizEvaluacionInst(
                    { propiedades: data.propiedades, valores: data.valores },
                    logoBase64,
                    {
                        titulo: `Matriz de continuidad y evaluación ${periodo}`,
                        periodo,
                        dividirPorUnidad: mostrarUnidades,
                        pageSize: 'LEGAL',
                        nombre: data.institucion?.[0]?.NOMBRE,
                        tipo: data.institucion?.[0]?.TIPO,
                        responsable
                    }
                );
            }
        } catch (e) {
            console.error(e);
            mostrarAlerta('Ocurrió un error generando el PDF. Revisa la consola.', 'error');
        }
    };

    /**
     * handleGenerarWord
     *
     * Construye un documento Word institucional:
     * - Para matrices 1/2: sección principal + una sección por cada matriz.
     * - Para ME/MC/MCE: secciones en orientación horizontal y agrupadas por unidad (si aplica).
     *
     * @returns {Promise<void>}
     */
    const handleGenerarWord = async () => {
        if (!tipo || !periodo) {
            mostrarAlerta('Debe seleccionar tipo y período.');
            return;
        }

        try {
            const tituloPorTipo = (t) => {
                if (t === 1) return 'Matriz de evaluación de la eficiencia del control interno y gobernanza';
                if (t === 2) return 'Matriz de riesgos de fraude o corrupción';
                if (t === 3) return 'Matriz de Evaluación de Riesgos (Institucional)';
                if (t === 4) return 'Mapa de Calor de Riesgos (Residual) Institucional';
                if (t === 5) return 'Matriz de Continuidad y Evaluación (Institucional)';
                return 'Reporte';
            };
            const nombreBase = (t) => {
                if (t === 1) return `Primera_Matriz_${periodo}`;
                if (t === 2) return `Segunda_Matriz_${periodo}`;
                if (t === 3) return `Matriz_Evaluacion_${periodo}`;
                if (t === 4) return `Mapa_de_calor_de_riesgos_${periodo}`;
                if (t === 5) return `Matriz_Continuidad_Y_Monitoreo_${periodo}`;
                return `Reporte_${periodo}`;
            };

            const periodoTexto = `Periodo ${periodo}`;
            const sections = [];

            const mkTitleBlocks = (titulo) => ([
                new Paragraph({
                    text: titulo,
                    heading: HeadingLevel.HEADING1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    text: periodoTexto,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                })
            ]);

            if (tipo === 1 || tipo === 2) {
                const { matrices } = (tipo === 1) ? await fetchPrimeraMatriz(periodo) : await fetchSegundaMatriz(periodo);
                if (!matrices.length) return mostrarAlerta('No hay versión guardada', 'info');

                sections.push({
                    properties: { page: { size: { orientation: PageOrientation.PORTRAIT } } },
                    children: mkTitleBlocks(tituloPorTipo(tipo))
                });

                matrices.forEach((m) => {
                    const headers = Array.isArray(m?.columnas?.headers) ? m.columnas.headers : [];
                    const headerRow = new DTR({
                        children: headers.map(h =>
                            new DTC({ children: [new Paragraph({ children: [new TextRun({ text: safe(h), bold: true })] })] })
                        )
                    });

                    const bodyRows = (m.filas ?? []).map((filaArr) =>
                        new DTR({
                            children: (Array.isArray(filaArr) ? filaArr : []).map((cellVal) =>
                                new DTC({ children: [new Paragraph(safe(cellVal))] })
                            )
                        })
                    );

                    const tabla = new DTable({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [headerRow, ...bodyRows]
                    });

                    const subt = m.titulo ? `${m.matriz}. ${m.titulo}` : `Matriz ${m.matriz}`;
                    sections.push({
                        properties: { page: { size: { orientation: PageOrientation.PORTRAIT } } },
                        children: [
                            new Paragraph({ text: ' ' }),
                            new Paragraph({ text: subt, heading: HeadingLevel.HEADING2, spacing: { after: 120 } }),
                            tabla
                        ]
                    });
                });
            } else {
                const categoria = (tipo === 3) ? 'ME' : (tipo === 4) ? 'MC' : 'MCE';
                const payload = await fetchInstME_MC_MCE(categoria);
                const { propiedades, rows } = normalizeColumns(payload);
                if (!propiedades.length || !rows.length) {
                    return mostrarAlerta('No hay datos para exportar a Word.', 'info');
                }

                const { groups, order } = mostrarUnidades
                    ? groupByUnidad(rows, {})
                    : { groups: { 'Institucional': rows }, order: ['Institucional'] };

                sections.push({
                    properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
                    children: mkTitleBlocks(tituloPorTipo(tipo))
                });

                order.forEach((gName) => {
                    const headerRow = new DTR({
                        children: [
                            new DTC({ children: [new Paragraph({ children: [new TextRun({ text: 'No.', bold: true })] })] }),
                            ...propiedades.map(p =>
                                new DTC({ children: [new Paragraph({ children: [new TextRun({ text: (p?.label ?? p?.key ?? '—'), bold: true })] })] })
                            )
                        ]
                    });

                    const bodyRows = groups[gName].map((r, i) => new DTR({
                        children: [
                            new DTC({ children: [new Paragraph(String(i + 1))] }),
                            ...propiedades.map(p => new DTC({ children: [new Paragraph(getCellValue(r, p))] }))
                        ]
                    }));

                    const tabla = new DTable({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [headerRow, ...bodyRows]
                    });

                    sections.push({
                        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
                        children: [
                            new Paragraph({ text: ' ' }),
                            new Paragraph({
                                text: `Unidad: ${safe(gName)}`,
                                heading: HeadingLevel.HEADING2,
                                spacing: { after: 120 }
                            }),
                            new Paragraph({ text: `Período: ${safe(periodoTexto)}`, spacing: { after: 120 } }),
                            tabla
                        ]
                    });
                });
            }

            const doc = new Document({ sections });
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${nombreBase(tipo)}.docx`);
        } catch (e) {
            console.error(e);
            mostrarAlerta('Ocurrió un error generando el Word. Revisa la consola.', 'error');
        }
    };

    /**
     * handleGenerarExcel
     *
     * Genera un archivo Excel institucional:
     * - Para matrices 1/2: una hoja por matriz.
     * - Para ME/MC/MCE: hoja por unidad (o solo institucional) con ficha + tabla de datos.
     *
     * @returns {Promise<void>}
     */
    const handleGenerarExcel = async () => {
        if (!tipo || !periodo) {
            mostrarAlerta('Debe seleccionar tipo y período.');
            return;
        }

        try {
            const wb = new ExcelJS.Workbook();
            const periodoTexto = `Periodo ${periodo}`;

            if (tipo === 1 || tipo === 2) {
                const { matrices } = (tipo === 1) ? await fetchPrimeraMatriz(periodo) : await fetchSegundaMatriz(periodo);
                if (!matrices.length) return mostrarAlerta('No hay versión guardada', 'info');

                matrices.forEach((m) => {
                    const base = (m.titulo ? `${m.matriz}.${m.titulo}` : `Matriz ${m.matriz}`);
                    const sheetName = sanitizeSheetName(base);
                    const ws = wb.addWorksheet(sheetName || 'Matriz');

                    const headersX = Array.isArray(m?.columnas?.headers) ? m.columnas.headers : [];
                    const colCount = Math.max(headersX.length, 1);
                    const endCol = toCol(colCount || 1);

                    ws.mergeCells(`A1:${endCol}1`);
                    ws.getCell('A1').value = (m.titulo ? `${m.matriz}. ${m.titulo}` : `Matriz ${m.matriz}`);
                    ws.getCell('A1').font = { bold: true, size: 14 };
                    ws.getCell('A1').alignment = { horizontal: 'center' };

                    ws.mergeCells(`A2:${endCol}2`);
                    ws.getCell('A2').value = periodoTexto;
                    ws.getCell('A2').alignment = { horizontal: 'center' };

                    const headerRowIndex = 4;
                    ws.getRow(headerRowIndex).values = headersX;
                    ws.getRow(headerRowIndex).font = { bold: true };
                    ws.getRow(headerRowIndex).alignment = { horizontal: 'center' };

                    (m.filas ?? []).forEach((filaArr, i) => {
                        const arr = Array.isArray(filaArr) ? filaArr.map(safe) : [];
                        ws.getRow(headerRowIndex + 1 + i).values = arr;
                    });

                    for (let i = 1; i <= colCount; i++) {
                        let max = (headersX[i - 1] ?? '').toString().length;
                        for (let r = headerRowIndex + 1; r <= headerRowIndex + (m.filas ?? []).length; r++) {
                            const v = ws.getRow(r).getCell(i).value;
                            const s = (v == null ? '' : String(v));
                            if (s.length > max) max = s.length;
                        }
                        ws.getColumn(i).width = Math.min(Math.max(max + 2, 10), 60);
                    }
                    ws.views = [{ state: 'frozen', ySplit: headerRowIndex }];
                });

                const blob = await wb.xlsx.writeBuffer();
                saveAs(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                    (tipo === 1 ? `Primera_Matriz_${periodo}` : `Segunda_Matriz_${periodo}`) + '.xlsx');
                return;
            }

            const categoria = (tipo === 3) ? 'ME' : (tipo === 4) ? 'MC' : 'MCE';
            const payload = await fetchInstME_MC_MCE(categoria);
            const { propiedades, rows } = normalizeColumns(payload);
            if (!propiedades.length || !rows.length) return mostrarAlerta('No hay datos para exportar a Excel.', 'info');

            const { groups, order } = mostrarUnidades ? groupByUnidad(rows, {}) : { groups: { 'Institucional': rows }, order: ['Institucional'] };

            const tituloDoc =
                (tipo === 3 && 'Matriz de Evaluación de Riesgos (Institucional)') ||
                (tipo === 4 && 'Mapa de Calor de Riesgos (Residual) Institucional') ||
                'Matriz de Continuidad y Evaluación (Institucional)';

            const colCount = Math.max(propiedades.length + 1, 2);
            const endCol = toCol(colCount);

            order.forEach((gName) => {
                const ws = wb.addWorksheet(sanitizeSheetName(String(gName).trim() || 'Institucional'));

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
                const headersX = ['No.', ...propiedades.map(p => p?.label ?? p?.key ?? '—')];
                ws.getRow(headerRowIndex).values = headersX;
                ws.getRow(headerRowIndex).font = { bold: true };
                ws.getRow(headerRowIndex).alignment = { horizontal: 'center' };

                groups[gName].forEach((r, i) => {
                    const arr = [String(i + 1), ...propiedades.map(p => getCellValue(r, p))];
                    ws.getRow(headerRowIndex + 1 + i).values = arr;
                });

                for (let i = 1; i <= colCount; i++) {
                    let max = (headersX[i - 1] ?? '').toString().length;
                    for (let r = headerRowIndex + 1; r <= headerRowIndex + groups[gName].length; r++) {
                        const v = ws.getRow(r).getCell(i).value;
                        const s = (v == null ? '' : String(v));
                        if (s.length > max) max = s.length;
                    }
                    ws.getColumn(i).width = Math.min(Math.max(max + 2, 10), 60);
                }
                ws.views = [{ state: 'frozen', ySplit: headerRowIndex }];
            });

            const blob = await wb.xlsx.writeBuffer();
            const nombre =
                (tipo === 3 && `Matriz_Evaluacion_${periodo}`) ||
                (tipo === 4 && `Mapa_de_calor_de_riesgos_${periodo}`) ||
                `Matriz_Continuidad_Y_Monitoreo_${periodo}`;
            saveAs(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                `${nombre}.xlsx`);
        } catch (e) {
            console.error(e);
            mostrarAlerta('Ocurrió un error generando el Excel. Revisa la consola.', 'error');
        }
    };

    const handleLimpiar = () => {
        setTipo('');
        setPeriodo('');
        setMostrarUnidades(false);
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardHeader title="Reportes institucionales" />
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
                            <Select label='Tipo de reporte' value={tipo} onChange={(e) => setTipo(e.target.value)} displayEmpty>
                                <MenuItem value={''}>--- INGRESE UN TIPO DE REPORTE ---</MenuItem>
                                <MenuItem value={1}>Matriz de evaluación de la eficiencia del control interno y gobernanza</MenuItem>
                                <MenuItem value={2}>Matriz de riesgos de fraude o corrupción</MenuItem>
                                <MenuItem value={3}>Matriz de evaluación de riesgos</MenuItem>
                                <MenuItem value={4}>Mapa de calor de riesgos residual</MenuItem>
                                <MenuItem value={5}>Matriz de continuidad de evaluación de riesgos</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Período */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel shrink>Período</InputLabel>
                            <Select label='Período' value={periodo} onChange={(e) => setPeriodo(e.target.value)} displayEmpty>
                                <MenuItem value={''}>--- INGRESE UN PERIODO ---</MenuItem>
                                {periodos.map((p) => (
                                    <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                        {p.FECINI} - {p.FECFIN} de {p.CODIGO_PERIODO}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Dividir por unidades (solo ME/MC/MCE) */}
                    {(tipo === 3 || tipo === 4 || tipo === 5) && (
                        <Grid item xs={12} md={6}>
                            <FormControlLabel
                                control={<Checkbox checked={mostrarUnidades} onChange={(e) => setMostrarUnidades(e.target.checked)} />}
                                label="Dividir por unidades"
                            />
                        </Grid>
                    )}

                    {/* Acciones */}
                    <Grid item xs={12} container justifyContent="flex-end" spacing={2}>
                        <Grid item>
                            <Button variant="outlined" onClick={handleLimpiar}>Limpiar</Button>
                        </Grid>
                        <Grid item>
                            <ButtonGroup variant="outlined" color="primary">
                                <Button onClick={handleOpenSupModal} disabled={!tipo || !periodo}>PDF</Button>
                                <Button onClick={handleGenerarWord} disabled={!tipo || !periodo}>Word</Button>
                                <Button onClick={handleGenerarExcel} disabled={!tipo || !periodo}>Excel</Button>
                            </ButtonGroup>
                        </Grid>
                    </Grid>
                </Grid>
            </CardContent>

            {/* Modal información del superior (sin fecha) */}
            <Dialog open={openSup} onClose={handleCloseSupModal} fullWidth maxWidth="sm">
                <DialogTitle>Información del superior para el reporte</DialogTitle>
                <DialogContent dividers>
                    {loadingSup ? (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 1 }}>
                            <CircularProgress size={20} /> Cargando datos del superior…
                        </Stack>
                    ) : null}
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Nombre del superior"
                            value={supNombre}
                            onChange={(e) => setSupNombre(e.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Puesto"
                            value={supPuesto}
                            onChange={(e) => setSupPuesto(e.target.value)}
                            fullWidth
                            required
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSupModal}>Cancelar</Button>
                    <Button onClick={handleConfirmPDF} variant="contained" disabled={confirmingPDF}>
                        {confirmingPDF ? 'Generando…' : 'Generar PDF'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
}

export default ReportesInstitucionalesCard;
