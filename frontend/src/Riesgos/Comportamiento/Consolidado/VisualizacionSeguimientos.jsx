/**
 * @fileoverview
 * Visualización consolidada de seguimientos por mes, control y responsable.
 *
 * @module Riesgos/Comportamiento/Consolidado/VisualizacionSeguimientos.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Stack,
    Grid,
    Typography,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    TextField,
    Button,
    Alert,
    LinearProgress,
    Switch,
    FormControlLabel,
    Paper,
    Chip,
    Snackbar,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Collapse,
    IconButton,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import GridOn from "@mui/icons-material/GridOn";
import { saveAs } from "file-saver";
import * as ExcelJS from "exceljs";
import SeguimientoDetalleModal from "./SeguimientoDetalleModal";
import SeguimientoReportes from "./SeguimientoReportes";
import CargaArchivos from "Riesgos/Carga Documentos/CargaArchivos";

const headers = () => ({ "x-access-token": localStorage.getItem("token") });

// ======== Meses ========
const MESES = [
    null,
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];
const mesNombre = (n) => {
    const x = Number(n);
    return Number.isInteger(x) && x >= 1 && x <= 12 ? MESES[x] : "—";
};

/**
 * Obtiene el número de mes desde una fila (propiedad `mes` o `codigo_mes`).
 */
const getMesNum = (row) => Number(row?.mes ?? row?.codigo_mes ?? 0);

const normalize = (s = "") =>
    String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const statusKind = (estatusRaw = "") => {
    const s = normalize(estatusRaw);
    if (!s) return "none";
    if (/(pendiente|sin avance|no iniciado)/.test(s)) return "pending";
    if (/(cumple|cumplido|completado|completo|finalizado|cerrado)/.test(s)) return "done";
    if (/(proceso|ejecucion|parcial|avance|en curso|andamiento|ejecuci[óo]n)/.test(s)) return "doing";
    return "other";
};

const STATUS_XLSX_FILL = {
    pending: { bg: "FFF44336", fg: "FFFFFFFF" }, // rojo, texto blanco
    doing: { bg: "FFFFEB3B", fg: "FF000000" }, // amarillo, texto negro
    done: { bg: "FF4CAF50", fg: "FFFFFFFF" }, // verde, texto blanco
    other: { bg: "FF90CAF9", fg: "FF000000" }, // azul claro, texto negro
    none: { bg: "FFBDBDBD", fg: "FF000000" }, // gris, texto negro
};

/**
 * VisualizacionSeguimientos
 * 
 * Vista de consulta y exportación de seguimientos por mes/control.
 *
 * @component
 */
export default function VisualizacionSeguimientos() {
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState("");
    const [direcciones, setDirecciones] = useState([]);

    const [showFilters, setShowFilters] = useState(false);
    const [codigoEntidad, setCodigoEntidad] = useState("");
    const [mes, setMes] = useState("");
    const [mesInicio, setMesInicio] = useState("");
    const [mesFin, setMesFin] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [rows, setRows] = useState([]);

    const [open, setOpen] = useState(false);
    const [rowSel, setRowSel] = useState(null);
    const [rowLabels, setRowLabels] = useState({ direccionLabel: "", siglasLabel: "" });

    const [showResults, setShowResults] = useState(true);

    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
    const openSnack = (message, severity = "success") => setSnack({ open: true, message, severity });
    const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

    // --- Carga lista de períodos ---
    useEffect(() => {
        const cargarPeriodos = async () => {
            setError("");
            try {
                const r = await axios.get("/api/periodos-actualizados", { headers: headers() });
                const lista = (r.data?.result ?? []).map((p) => ({
                    value: Number(p.CODIGO_PERIODO),
                    label: String(p.CODIGO_PERIODO),
                    ini: p.PERIODO_INICIAL,
                    fin: p.PERIODO_FINAL,
                }));
                setPeriodos(lista);
            } catch {
                setError("No fue posible cargar los períodos.");
            }
        };
        cargarPeriodos();
    }, []);

    // --- Cargar direcciones ---
    useEffect(() => {
        const cargarDirecciones = async () => {
            setError("");
            try {
                const r = await axios.get("/api/direcciones-actualizados", { headers: headers() });
                const lista = (r.data?.result ?? []).map((d) => ({
                    value: Number(d.CODIGO_ENTIDAD),
                    label: String(d.NOMBRE || "").trim(),
                    siglas: String(d.SIGLAS || "").trim(),
                }));
                setDirecciones(lista);
            } catch {
                setDirecciones([]);
            }
        };
        cargarDirecciones();
    }, []);

    /**
     * Limita el valor numérico de mes a un rango válido (1-12).
     */
    const clampMes = (n) => {
        const x = Number(n);
        if (Number.isNaN(x) || x < 1 || x > 12) return "";
        return String(x);
    };

    const limpiarFiltros = () => {
        setCodigoEntidad("");
        setMes("");
        setMesInicio("");
        setMesFin("");
    };

    useEffect(() => {
        if (mes) {
            setMesInicio("");
            setMesFin("");
        }
    }, [mes]);

    useEffect(() => {
        if (mesInicio || mesFin) setMes("");
    }, [mesInicio, mesFin]);

    /**
     * Determina si hay suficientes filtros para ejecutar una búsqueda.
     */
    const puedeBuscar = useMemo(() => !!periodo && !loading, [periodo, loading]);

    // --- Helpers de datos/etiquetas ---
    const nombreDireccion = (codigo) =>
        direcciones.find((d) => d.value === Number(codigo))?.label || codigo;

    const siglasDireccion = (codigo) =>
        direcciones.find((d) => d.value === Number(codigo))?.siglas || "";

    // --- Consultar datos ---
    const buildParams = () => {
        const params = { codigo_periodo: periodo };
        if (codigoEntidad) params.codigo_entidad = codigoEntidad;
        if (mes) params.mes = mes;
        else {
            if (mesInicio) params.mes_inicio = mesInicio;
            if (mesFin) params.mes_fin = mesFin;
        }
        return params;
    };

    const buscar = async () => {
        if (!periodo) return;
        setLoading(true);
        setError("");
        setRows([]);

        try {
            const r = await axios.get("/api/seguimientos-actualizados/listar-direcciones", {
                headers: headers(),
                params: buildParams(),
            });
            const data = r.data?.data ?? [];
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(
                e?.response?.data?.msg || e?.message || "Ocurrió un error al consultar los seguimientos."
            );
        } finally {
            setLoading(false);
        }
    };

    // --- Agrupar por dirección ---
    const grupos = useMemo(() => {
        const byDir = new Map();
        for (const r of rows) {
            const key = String(r.codigo_entidad ?? "—");
            if (!byDir.has(key)) byDir.set(key, []);
            byDir.get(key).push(r);
        }
        for (const arr of byDir.values()) {
            arr.sort((a, b) => getMesNum(a) - getMesNum(b));
        }
        return byDir;
    }, [rows]);

    const direccionesConsideradas = useMemo(() => {
        if (codigoEntidad) {
            return direcciones.filter((d) => d.value === Number(codigoEntidad));
        }
        return direcciones;
    }, [direcciones, codigoEntidad]);

    const setPresentes = useMemo(() => {
        const s = new Set();
        for (const r of rows) s.add(Number(r?.codigo_entidad));
        return s;
    }, [rows]);

    const direccionesSinInfo = useMemo(
        () => direccionesConsideradas.filter((d) => !setPresentes.has(d.value)),
        [direccionesConsideradas, setPresentes]
    );

    const totalConsideradas = direccionesConsideradas.length;
    const totalConDatos = totalConsideradas - direccionesSinInfo.length;

    // --- Abrir/Cerrar modal ---
    const abrir = useCallback(
        (r) => {
            const direccionLabel = String(nombreDireccion(r.codigo_entidad));
            const siglasLabel = String(siglasDireccion(r.codigo_entidad));
            setRowLabels({ direccionLabel, siglasLabel });
            setRowSel(r);
            setOpen(true);
        },
        [direcciones]
    );

    const cerrar = useCallback(() => {
        setOpen(false);
        setRowSel(null);
        setRowLabels({ direccionLabel: "", siglasLabel: "" });
    }, []);

    const renderPeriodoLabel = (p) => `${p?.label ?? p?.value ?? ""}`;

    // ====== Resumen de filtros aplicados (chips) ======
    const FiltrosResumen = () => {
        const dirChip = codigoEntidad
            ? `${nombreDireccion(codigoEntidad)} (${siglasDireccion(codigoEntidad) || "s/ siglas"})`
            : "Todas";
        const tiempoChip = mes
            ? `Mes: ${mesNombre(mes)}`
            : mesInicio || mesFin
                ? `Rango: ${mesInicio ? mesNombre(mesInicio) : "—"} → ${mesFin ? mesNombre(mesFin) : "—"}`
                : "Sin filtro de mes";

        return (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip label={`Direcciones: ${dirChip}`} size="small" />
                <Chip label={tiempoChip} size="small" />
                <Chip label={`Período: ${periodo || "—"}`} size="small" />
                <Chip
                    label={`Direcciones con datos: ${totalConDatos} / ${totalConsideradas}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                />
            </Stack>
        );
    };

    /*
    *   EXCEL:
    *   - Hoja 1: Resumen filtros
    *  - Hojas por mes
    *   - Hoja final: Consolidado
    */

    const safe = (v) => (v === null || v === undefined ? "" : String(v));

    // S2 más reciente por riesgo dentro del registro mensual r
    const latestS2ByRisk = (r) => {
        const s2 = Array.isArray(r?.seccion2) ? r.seccion2 : [];
        const map = new Map();
        for (const x of s2) {
            const k = Number(x?.codigo_riesgo);
            if (!k) continue;
            const prev = map.get(k);
            if (!prev || Number(x?.periodo ?? 0) > Number(prev?.periodo ?? 0)) map.set(k, x);
        }
        return map;
    };

    // Responsable desde S3 (del mismo registro mensual r)
    const findResponsableInS3 = (r, codigo_riesgo) => {
        const bloques = Array.isArray(r?.seccion3) ? r.seccion3 : [];
        let best = { periodo: -1, resp: "" };
        for (const b of bloques) {
            const per = Number(b?.periodo ?? 0);
            const resultados = Array.isArray(b?.resultados) ? b.resultados : [];
            const match = resultados.find((z) => Number(z?.codigo_riesgo) === Number(codigo_riesgo));
            if (match && per >= best.periodo) {
                best = { periodo: per, resp: safe(match?.responsable) };
            }
        }
        return best.resp || "";
    };

    const latestEstatus = (r) => {
        const bloques = Array.isArray(r?.seccion3) ? r.seccion3 : [];
        return safe(
            bloques.reduce(
                (acc, x) => ((!acc || Number(x?.periodo ?? 0) > Number(acc?.periodo ?? 0)) ? x : acc),
                null
            )?.estatus
        );
    };

    /**
     * Aplica estilos a los encabezados de una hoja de Excel generada.
     */
    const styleHeaders = (ws, fromA = "A1", toCol = "Z1") => {
        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { vertical: "middle", wrapText: true };
        headerRow.height = 20;
        ws.autoFilter = { from: fromA, to: toCol };
        ws.views = [{ state: "frozen", ySplit: 1 }];
        ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true };
        });
    };

    const filenameSuffix = () => {
        const dir = codigoEntidad ? `_${siglasDireccion(codigoEntidad) || "DIR"}` : `_TODAS`;
        const time = mes
            ? `_MES-${String(mes).padStart(2, "0")}-${mesNombre(mes)}`
            : mesInicio || mesFin
                ? `_RANGO-${mesInicio || "??"}-${mesFin || "??"}`
                : `_MULTIMES`;
        return `_P${periodo}${dir}${time}`;
    };

    /**
     * Genera un archivo Excel con la información de seguimiento agrupada por mes.
     */
    const exportarPorMesXLSX = async () => {
        if (!rows.length) {
            openSnack("No hay datos para exportar.", "warning");
            return;
        }

        // Agrupar registros por mes presente en la respuesta
        const gruposMes = new Map(); // mes -> registros[]
        for (const r of rows) {
            const m = getMesNum(r);
            if (!Number.isFinite(m) || m < 1 || m > 12) continue;
            if (!gruposMes.has(m)) gruposMes.set(m, []);
            gruposMes.get(m).push(r);
        }

        if (!gruposMes.size) {
            openSnack("No se detectaron meses válidos en los datos.", "warning");
            return;
        }

        try {
            const wb = new ExcelJS.Workbook();

            // ====== Hoja 1: Resumen de filtros ======
            const dirResumen = codigoEntidad
                ? `${nombreDireccion(codigoEntidad)} (${siglasDireccion(codigoEntidad) || "s/ siglas"})`
                : "Todas";
            const tiempoResumen = mes
                ? `Mes: ${mesNombre(mes)}`
                : mesInicio || mesFin
                    ? `Rango: ${mesInicio ? mesNombre(mesInicio) : "—"} → ${mesFin ? mesNombre(mesFin) : "—"}`
                    : "Sin filtro de mes";

            const ahora = new Date();
            const fechaGeneracion = ahora.toLocaleString("es-GT", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });

            const wsResumen = wb.addWorksheet("Resumen");
            wsResumen.columns = [
                { header: "Campo", key: "campo", width: 30 },
                { header: "Valor", key: "valor", width: 90 },
            ];
            wsResumen.addRow({ campo: "Período seleccionado", valor: periodo || "—" });
            wsResumen.addRow({ campo: "Dirección", valor: dirResumen });
            wsResumen.addRow({ campo: "Filtro de tiempo", valor: tiempoResumen });
            wsResumen.addRow({
                campo: "Total direcciones consideradas",
                valor: String(totalConsideradas),
            });
            wsResumen.addRow({
                campo: "Direcciones con datos",
                valor: String(totalConDatos),
            });
            wsResumen.addRow({
                campo: "Direcciones sin información",
                valor: String(direccionesSinInfo.length),
            });
            wsResumen.addRow({
                campo: "Fecha y hora de generación",
                valor: fechaGeneracion,
            });

            styleHeaders(wsResumen, "A1", "B1");

            // ====== Hojas por mes + datos para consolidado ======
            const mesesOrdenados = Array.from(gruposMes.keys()).sort((a, b) => a - b);
            const registrosConsolidados = [];

            for (const m of mesesOrdenados) {
                const items = gruposMes.get(m) || [];
                const sheetName = `${String(m).padStart(2, "0")} - ${mesNombre(m)}`.slice(0, 31);
                const ws = wb.addWorksheet(sheetName);

                ws.columns = [
                    { header: "No.", key: "no", width: 6 },
                    { header: "Órgano", key: "organo", width: 28 },
                    { header: "Viceministerio", key: "viceministerio", width: 34 },
                    { header: "Dirección", key: "direccion", width: 42 },
                    { header: "Siglas", key: "siglas", width: 12 },
                    { header: "Período", key: "periodo_riesgo", width: 14 },
                    { header: "Objetivo", key: "objetivo", width: 40 },
                    { header: "Descripción del riesgo", key: "descripcion", width: 52 },
                    { header: "Ref.", key: "ref", width: 16 },
                    { header: "Rango de tolerancia", key: "tolerancia", width: 22 },
                    { header: "Severidad del riesgo", key: "severidad", width: 40 },
                    {
                        header: "Control interno para mitigar (gestionar) el riesgo",
                        key: "control",
                        width: 48,
                    },
                    { header: "Método de monitoreo", key: "monitoreo", width: 34 },
                    { header: "Frecuencia del monitoreo", key: "frecuencia", width: 24 },
                    { header: "Responsable", key: "responsable", width: 34 },
                    { header: "Estatus", key: "estatus", width: 16 },
                    { header: "Comentario", key: "comentario", width: 36 },
                ];

                const mesTexto = `${String(m).padStart(2, "0")} - ${mesNombre(m)}`;
                let i = 1;

                for (const r of items) {
                    const dirTxt = safe(nombreDireccion(r?.codigo_entidad));
                    const siglas = safe(siglasDireccion(r?.codigo_entidad));
                    const s1 = Array.isArray(r?.seccion1) ? r.seccion1 : [];
                    const mapS2 = latestS2ByRisk(r);
                    const estatusMes = latestEstatus(r);

                    for (const it of s1) {
                        const k = Number(it?.codigo_riesgo);
                        const s2 = mapS2.get(k);
                        const responsable = safe(it?.responsable) || findResponsableInS3(r, k);

                        const baseData = {
                            mes_num: m,
                            mes_texto: mesTexto,
                            mes_periodo: `${periodo || ""} - ${mesTexto}`.trim(),
                            organo: safe(it?.organo),
                            viceministerio: safe(it?.viceministerio),
                            direccion: dirTxt,
                            siglas,
                            periodo_riesgo: safe(it?.periodo),
                            objetivo: safe(it?.objetivo),
                            descripcion: safe(it?.descripcion),
                            ref: safe(it?.ref),
                            tolerancia: safe(it?.tolerancia),
                            severidad: safe(it?.severidad_narracion),
                            control: safe(s2?.control_interno ?? it?.control_interno),
                            monitoreo: safe(s2?.metodo_monitoreo ?? it?.metodo_monitoreo),
                            frecuencia: safe(s2?.frecuencia ?? it?.frecuencia),
                            responsable,
                            estatus: estatusMes,
                            comentario: "",
                        };

                        // Fila hoja mes
                        const row = ws.addRow({
                            no: i++,
                            organo: baseData.organo,
                            viceministerio: baseData.viceministerio,
                            direccion: baseData.direccion,
                            siglas: baseData.siglas,
                            periodo_riesgo: baseData.periodo_riesgo,
                            objetivo: baseData.objetivo,
                            descripcion: baseData.descripcion,
                            ref: baseData.ref,
                            tolerancia: baseData.tolerancia,
                            severidad: baseData.severidad,
                            control: baseData.control,
                            monitoreo: baseData.monitoreo,
                            frecuencia: baseData.frecuencia,
                            responsable: baseData.responsable,
                            estatus: baseData.estatus,
                            comentario: baseData.comentario,
                        });

                        const kind = statusKind(baseData.estatus);
                        const { bg, fg } = STATUS_XLSX_FILL[kind] ?? STATUS_XLSX_FILL.none;
                        const estatusCell = row.getCell("estatus");
                        estatusCell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: bg },
                        };
                        estatusCell.font = { bold: true, color: { argb: fg } };
                        estatusCell.alignment = {
                            vertical: "middle",
                            horizontal: "center",
                            wrapText: true,
                        };

                        registrosConsolidados.push(baseData);
                    }
                }

                styleHeaders(ws, "A1", "Q1");
            }

            // ====== Hoja final: Consolidado ======
            if (registrosConsolidados.length) {
                const wsAll = wb.addWorksheet("Consolidado");

                wsAll.columns = [
                    { header: "No.", key: "no", width: 6 },
                    { header: "Período - Mes", key: "mes", width: 24 },
                    { header: "Órgano", key: "organo", width: 28 },
                    { header: "Viceministerio", key: "viceministerio", width: 34 },
                    { header: "Dirección", key: "direccion", width: 42 },
                    { header: "Siglas", key: "siglas", width: 12 },
                    { header: "Período", key: "periodo_riesgo", width: 14 },
                    { header: "Objetivo", key: "objetivo", width: 40 },
                    { header: "Descripción del riesgo", key: "descripcion", width: 52 },
                    { header: "Ref.", key: "ref", width: 16 },
                    { header: "Rango de tolerancia", key: "tolerancia", width: 22 },
                    { header: "Severidad del riesgo", key: "severidad", width: 40 },
                    {
                        header: "Control interno para mitigar (gestionar) el riesgo",
                        key: "control",
                        width: 48,
                    },
                    { header: "Método de monitoreo", key: "monitoreo", width: 34 },
                    { header: "Frecuencia del monitoreo", key: "frecuencia", width: 24 },
                    { header: "Responsable", key: "responsable", width: 34 },
                    { header: "Estatus", key: "estatus", width: 16 },
                    { header: "Comentario", key: "comentario", width: 36 },
                ];

                registrosConsolidados.forEach((reg, idx) => {
                    const row = wsAll.addRow({
                        no: idx + 1,
                        mes: reg.mes_periodo || reg.mes_texto,
                        organo: reg.organo,
                        viceministerio: reg.viceministerio,
                        direccion: reg.direccion,
                        siglas: reg.siglas,
                        periodo_riesgo: reg.periodo_riesgo,
                        objetivo: reg.objetivo,
                        descripcion: reg.descripcion,
                        ref: reg.ref,
                        tolerancia: reg.tolerancia,
                        severidad: reg.severidad,
                        control: reg.control,
                        monitoreo: reg.monitoreo,
                        frecuencia: reg.frecuencia,
                        responsable: reg.responsable,
                        estatus: reg.estatus,
                        comentario: reg.comentario,
                    });

                    const kind = statusKind(reg.estatus);
                    const { bg, fg } = STATUS_XLSX_FILL[kind] ?? STATUS_XLSX_FILL.none;
                    const estatusCell = row.getCell("estatus");
                    estatusCell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: bg },
                    };
                    estatusCell.font = { bold: true, color: { argb: fg } };
                    estatusCell.alignment = {
                        vertical: "middle",
                        horizontal: "center",
                        wrapText: true,
                    };
                });

                styleHeaders(wsAll, "A1", "R1");
            }

            const buf = await wb.xlsx.writeBuffer();
            saveAs(
                new Blob([buf], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                }),
                `Seguimientos_POR_MES${filenameSuffix()}.xlsx`
            );
            openSnack("Excel por mes, resumen y consolidado generado correctamente.", "success");
        } catch (e) {
            console.error(e);
            openSnack("No fue posible generar el Excel por mes.", "error");
        }
    };

    return (
        <Box p={3}>
            <Typography
                variant="h5"
                sx={{ fontWeight: 800, mb: 2, fontSize: { xs: "1.35rem", md: "1.5rem" } }}
            >
                Seguimiento de control interno institucional
            </Typography>

            {/* Parámetros */}
            <Card sx={{ borderRadius: 2, mb: 3 }}>
                <CardHeader
                    titleTypographyProps={{
                        sx: { fontWeight: 700, fontSize: { xs: "1rem", md: "1.1rem" } },
                    }}
                    subheaderTypographyProps={{
                        sx: { fontSize: { xs: "0.9rem", md: "0.95rem" } },
                    }}
                    title="Parámetros de consulta"
                    subheader="Seleccione al menos el período. Los filtros son opcionales."
                />
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="periodo-label">Período</InputLabel>
                                <Select
                                    labelId="periodo-label"
                                    label="Período"
                                    value={periodo}
                                    onChange={(e) => setPeriodo(e.target.value)}
                                    disabled={loading}
                                >
                                    {periodos.map((p) => (
                                        <MenuItem key={p.value} value={p.value}>
                                            {renderPeriodoLabel(p)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid
                            item
                            xs={12}
                            md={6}
                            sx={{ display: "flex", alignItems: "center" }}
                        >
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={showFilters}
                                        onChange={(e) => setShowFilters(e.target.checked)}
                                    />
                                }
                                label="Mostrar filtros opcionales"
                            />
                        </Grid>
                    </Grid>

                    {showFilters && (
                        <Box
                            sx={{
                                mt: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                p: 2,
                                borderRadius: 2,
                            }}
                        >
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel id="entidad-label">Dirección</InputLabel>
                                        <Select
                                            labelId="entidad-label"
                                            label="Dirección"
                                            value={codigoEntidad}
                                            onChange={(e) => setCodigoEntidad(e.target.value)}
                                        >
                                            <MenuItem value="">
                                                <em>— Todas —</em>
                                            </MenuItem>
                                            {direcciones.map((d) => (
                                                <MenuItem key={d.value} value={d.value}>
                                                    {d.label} ({d.siglas}) — {d.value}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <TextField
                                        label="Mes"
                                        type="number"
                                        size="small"
                                        inputProps={{ min: 1, max: 12 }}
                                        value={mes}
                                        onChange={(e) => setMes(clampMes(e.target.value))}
                                        fullWidth
                                        helperText={
                                            mes
                                                ? mesNombre(mes)
                                                : "1-12. Si lo usas, ignora el rango."
                                        }
                                    />
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <TextField
                                        label="Mes inicial"
                                        type="number"
                                        size="small"
                                        inputProps={{ min: 1, max: 12 }}
                                        value={mesInicio}
                                        onChange={(e) =>
                                            setMesInicio(clampMes(e.target.value))
                                        }
                                        fullWidth
                                        disabled={!!mes}
                                        helperText={mesInicio ? mesNombre(mesInicio) : "1-12"}
                                    />
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <TextField
                                        label="Mes final"
                                        type="number"
                                        size="small"
                                        inputProps={{ min: 1, max: 12 }}
                                        value={mesFin}
                                        onChange={(e) =>
                                            setMesFin(clampMes(e.target.value))
                                        }
                                        fullWidth
                                        disabled={!!mes}
                                        helperText={mesFin ? mesNombre(mesFin) : "1-12"}
                                    />
                                </Grid>

                                <Grid
                                    item
                                    xs={12}
                                    md={12}
                                    sx={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                    }}
                                >
                                    <Button variant="outlined" onClick={limpiarFiltros}>
                                        Limpiar
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            onClick={buscar}
                            disabled={!puedeBuscar}
                        >
                            Buscar
                        </Button>
                        {!periodo && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    alignSelf: "center",
                                    fontSize: { xs: "0.95rem", md: "1rem" },
                                }}
                            >
                                Seleccione un período para habilitar la búsqueda.
                            </Typography>
                        )}
                    </Stack>

                    {loading && <LinearProgress sx={{ mt: 2 }} />}
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Documentos */}
            {
                periodo &&
                <CargaArchivos periodo={periodo} flag={6} />
            }

            {/* RESULTADOS (colapsable) */}
            {
                periodo &&
                <Card sx={{ borderRadius: 2 }}>
                    <CardHeader
                        titleTypographyProps={{
                            sx: { fontWeight: 700, fontSize: { xs: "1rem", md: "1.1rem" } },
                        }}
                        title="Resultados"
                        subheader="Revise las direcciones y despliegue su información mensual. El Excel se genera desde aquí."
                        action={
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                            >
                                <Button
                                    startIcon={<GridOn />}
                                    variant="outlined"
                                    onClick={exportarPorMesXLSX}
                                    disabled={!rows.length}
                                >
                                    Excel por mes + consolidado
                                </Button>
                                <IconButton
                                    aria-label={
                                        showResults
                                            ? "Ocultar resultados"
                                            : "Mostrar resultados"
                                    }
                                    onClick={() => setShowResults((v) => !v)}
                                    size="small"
                                >
                                    {showResults ? (
                                        <ExpandLessRounded />
                                    ) : (
                                        <ExpandMoreRounded />
                                    )}
                                </IconButton>
                            </Stack>
                        }
                    />
                    <Collapse in={showResults} unmountOnExit>
                        <CardContent>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <strong>Importante:</strong> las tarjetas resaltadas en verde
                                indican el <strong>mes más reciente por dirección</strong>.
                            </Alert>

                            <Box sx={{ mb: 2 }}>
                                <FiltrosResumen />
                            </Box>

                            {/* Acordeón de direcciones sin info */}
                            <Accordion disableGutters sx={{ mb: 2 }}>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{ alignItems: "center", pr: 2 }}
                                    >
                                        <Typography sx={{ fontWeight: 700 }}>
                                            Direcciones sin información
                                        </Typography>
                                        <Chip
                                            label={`${direccionesSinInfo.length} de ${totalConsideradas}`}
                                            size="small"
                                            color={
                                                direccionesSinInfo.length
                                                    ? "warning"
                                                    : "success"
                                            }
                                            variant="outlined"
                                        />
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {direccionesSinInfo.length === 0 ? (
                                        <Alert severity="success">
                                            Todas las direcciones consideradas tienen
                                            datos con los filtros actuales.
                                        </Alert>
                                    ) : (
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            sx={{ flexWrap: "wrap" }}
                                        >
                                            {direccionesSinInfo.map((d) => (
                                                <Chip
                                                    key={d.value}
                                                    label={`${d.label} (${d.siglas || "s/ siglas"
                                                        })`}
                                                    variant="outlined"
                                                />
                                            ))}
                                        </Stack>
                                    )}
                                </AccordionDetails>
                            </Accordion>

                            {/* Sin resultados */}
                            {rows.length === 0 && !loading && (
                                <Alert severity="info">
                                    No se encontraron items para los filtros aplicados.
                                    {direccionesSinInfo.length > 0 && (
                                        <>
                                            {" "}
                                            Revisa el acordeón{" "}
                                            <strong>
                                                “Direcciones sin información”
                                            </strong>{" "}
                                            arriba.
                                        </>
                                    )}
                                </Alert>
                            )}

                            {/* Lista por dirección */}
                            <Stack spacing={1.5}>
                                {[...grupos.entries()].map(([codigo, items]) => {
                                    const nombre = nombreDireccion(codigo);
                                    const siglas = siglasDireccion(codigo);
                                    const latestMes = items.reduce((m, it) => {
                                        const v = getMesNum(it);
                                        return Number.isFinite(v) && v > m ? v : m;
                                    }, 0);

                                    return (
                                        <Accordion key={codigo} disableGutters>
                                            <AccordionSummary expandIcon={<ExpandMore />}>
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    sx={{
                                                        alignItems: "center",
                                                        pr: 2,
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{ fontWeight: 700 }}
                                                    >
                                                        {nombre}
                                                    </Typography>
                                                    {siglas ? (
                                                        <Chip
                                                            label={siglas}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    ) : null}
                                                    <Chip
                                                        label={`${items.length} mes${items.length === 1
                                                            ? ""
                                                            : "es"
                                                            }`}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </Stack>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                <Grid container spacing={2}>
                                                    {items.map((r, idx) => {
                                                        const mNum = getMesNum(r);
                                                        const monthLabel =
                                                            mesNombre(mNum);
                                                        const isLatest =
                                                            mNum === latestMes;

                                                        return (
                                                            <Grid
                                                                item
                                                                key={`${codigo}-${idx}`}
                                                                xs={12}
                                                                sm={6}
                                                                md={3}
                                                            >
                                                                <Paper
                                                                    onClick={() =>
                                                                        abrir(r)
                                                                    }
                                                                    elevation={
                                                                        isLatest
                                                                            ? 6
                                                                            : 2
                                                                    }
                                                                    sx={{
                                                                        p: 2,
                                                                        borderRadius: 2,
                                                                        cursor: "pointer",
                                                                        transition:
                                                                            "transform .12s ease, box-shadow .12s ease, background-color .12s ease, border-color .12s ease",
                                                                        "&:hover": {
                                                                            transform:
                                                                                "translateY(-2px)",
                                                                            boxShadow:
                                                                                isLatest
                                                                                    ? 8
                                                                                    : 6,
                                                                        },
                                                                        display:
                                                                            "flex",
                                                                        flexDirection:
                                                                            "column",
                                                                        gap: 0.5,
                                                                        bgcolor:
                                                                            (theme) =>
                                                                                isLatest
                                                                                    ? theme
                                                                                        .palette
                                                                                        .success
                                                                                        .light
                                                                                    : "background.paper",
                                                                        border:
                                                                            (
                                                                                theme
                                                                            ) =>
                                                                                `2px solid ${isLatest
                                                                                    ? theme
                                                                                        .palette
                                                                                        .success
                                                                                        .main
                                                                                    : theme
                                                                                        .palette
                                                                                        .divider
                                                                                }`,
                                                                    }}
                                                                >
                                                                    <Stack
                                                                        direction="row"
                                                                        alignItems="center"
                                                                        justifyContent="space-between"
                                                                    >
                                                                        <Typography
                                                                            variant="h3"
                                                                            sx={{
                                                                                fontWeight: 900,
                                                                                lineHeight: 1,
                                                                                fontSize:
                                                                                {
                                                                                    xs: "1.8rem",
                                                                                    md: "2.25rem",
                                                                                },
                                                                            }}
                                                                        >
                                                                            {
                                                                                monthLabel
                                                                            }
                                                                        </Typography>

                                                                        {isLatest && (
                                                                            <Chip
                                                                                label="Más reciente"
                                                                                size="small"
                                                                                color="success"
                                                                                variant="filled"
                                                                                sx={{
                                                                                    fontWeight: 700,
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </Stack>

                                                                    <Typography
                                                                        variant="body2"
                                                                        color="text.secondary"
                                                                        sx={{
                                                                            whiteSpace:
                                                                                "nowrap",
                                                                            textOverflow:
                                                                                "ellipsis",
                                                                            overflow:
                                                                                "hidden",
                                                                        }}
                                                                    >
                                                                        Mes {mNum}
                                                                    </Typography>
                                                                </Paper>
                                                            </Grid>
                                                        );
                                                    })}
                                                </Grid>
                                            </AccordionDetails>
                                        </Accordion>
                                    );
                                })}
                            </Stack>
                        </CardContent>
                    </Collapse>
                </Card>
            }

            {/* ======= REPORTES ======= */}
            {
                periodo && <SeguimientoReportes periodo={periodo} />
            }

            {/* MODAL DETALLE */}
            <SeguimientoDetalleModal
                open={open}
                onClose={cerrar}
                row={rowSel}
                direccionLabel={rowLabels.direccionLabel}
                siglasLabel={rowLabels.siglasLabel}
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={4500}
                onClose={closeSnack}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
            >
                <Alert
                    onClose={closeSnack}
                    severity={snack.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
