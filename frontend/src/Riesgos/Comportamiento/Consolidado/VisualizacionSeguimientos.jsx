/**
 * @fileoverview
 * Visualización consolidada de seguimientos por mes, control y responsable.
 *
 * @module Riesgos/Comportamiento/Consolidado/VisualizacionSeguimientos.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import apiClient from "api/apiClient";
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
    Tooltip
} from "@mui/material";
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import GridOn from "@mui/icons-material/GridOn";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { saveAs } from "file-saver";
import * as ExcelJS from "exceljs";
import { formatearHojaReporte } from "funciones/ExcelFormato";
import SeguimientoDetalleModal from "./SeguimientoDetalleModal";
import SeguimientoReportes from "./SeguimientoReportes";
import CargaArchivos from "Riesgos/Carga Documentos/CargaArchivos";
import SeguimientoDocsModal from "../Seguimiento/SeguimientoDocsModal";


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
 * Columnas en las que se divide el estatus dentro del reporte por mes.
 * Cada estatus se escribe y se colorea únicamente en la columna que le
 * corresponde: Cumple (verde), Ejecución (amarillo) y Pendiente (rojo).
 */
const ESTATUS_COLUMNAS = [
    { key: "estatus_cumple", etiqueta: "Cumple", kind: "done" },
    { key: "estatus_ejecucion", etiqueta: "Ejecución", kind: "doing" },
    { key: "estatus_pendiente", etiqueta: "Pendiente", kind: "pending" },
];

/**
 * Colores del rango de tolerancia, en la misma línea que los del estatus:
 * de 0 a 10 verde, de 10.1 a 15 amarillo y de 15.1 en adelante rojo.
 */
const TOLERANCIA_XLSX_FILL = [
    { hasta: 10, bg: "FF4CAF50", fg: "FFFFFFFF" },
    { hasta: 15, bg: "FFFFEB3B", fg: "FF000000" },
    { hasta: Infinity, bg: "FFF44336", fg: "FFFFFFFF" },
];

/**
 * Determina el color que corresponde a un rango de tolerancia.
 * Acepta valores numéricos ("12.5") y rangos ("10.1 a 15"); en los rangos manda
 * el límite superior. Si el valor no contiene números, no se colorea.
 *
 * @param {*} valor - Valor de la columna "Rango de tolerancia".
 * @returns {{bg:string, fg:string}|null}
 */
const colorTolerancia = (valor) => {
    const numeros = String(valor ?? "").replace(/,/g, ".").match(/[0-9]+(?:[.][0-9]+)?/g);
    if (!numeros?.length) return null;

    const tope = Math.max(...numeros.map(Number));
    if (!Number.isFinite(tope)) return null;

    return TOLERANCIA_XLSX_FILL.find((r) => tope <= r.hasta) ?? null;
};

/**
 * Colorea la celda del rango de tolerancia de una fila ya agregada.
 *
 * @param {Object} row - Fila de ExcelJS.
 * @param {*} valor - Valor del rango de tolerancia.
 */
const pintarTolerancia = (row, valor) => {
    const color = colorTolerancia(valor);
    if (!color) return;

    const cell = row.getCell("tolerancia");
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color.bg } };
    cell.font = { bold: true, color: { argb: color.fg } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
};

/**
 * Escribe el estatus de una fila en la columna que le corresponde y colorea
 * únicamente esa celda; las otras dos quedan vacías.
 *
 * @param {Object} row - Fila de ExcelJS.
 * @param {*} estatus - Estatus del riesgo.
 */
const pintarEstatusDividido = (row, estatus) => {
    const texto = String(estatus ?? "").trim();

    // Sin estatus registrado se considera pendiente (mismo criterio que usa el
    // consolidado por viceministerio).
    let kind = statusKind(texto);
    if (kind === "none") kind = "pending";

    const destino = ESTATUS_COLUMNAS.find((c) => c.kind === kind);

    ESTATUS_COLUMNAS.forEach((col) => {
        const cell = row.getCell(col.key);
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

        if (col !== destino) return;

        const { bg, fg } = STATUS_XLSX_FILL[kind] ?? STATUS_XLSX_FILL.none;
        cell.value = texto || col.etiqueta;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.font = { bold: true, color: { argb: fg } };
    });

    // Un estatus que no encaja en ninguna de las tres columnas se muestra en la
    // última con color neutro, para no perder la información.
    if (!destino) {
        const cell = row.getCell(ESTATUS_COLUMNAS[ESTATUS_COLUMNAS.length - 1].key);
        const { bg, fg } = STATUS_XLSX_FILL.other;
        cell.value = texto;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.font = { bold: true, color: { argb: fg } };
    }
};

/**
 * Prepara el encabezado de la columna de estatus: el título "Estatus" combinado
 * sobre las tres columnas y, justo debajo, la leyenda de colores que indica a
 * qué columna corresponde cada color.
 *
 * Debe llamarse inmediatamente después de definir ws.columns, antes de agregar
 * las filas de datos.
 *
 * @param {Object} ws - Hoja de ExcelJS.
 * @returns {number[]} Números de las tres columnas de estatus.
 */
const prepararEncabezadoEstatus = (ws) => {
    const inicio = ws.getColumn(ESTATUS_COLUMNAS[0].key).number;
    const fin = inicio + ESTATUS_COLUMNAS.length - 1;

    ws.mergeCells(1, inicio, 1, fin);
    ws.getCell(1, inicio).value = "Estatus";

    ESTATUS_COLUMNAS.forEach((col, i) => {
        const celda = ws.getCell(2, inicio + i);
        const { bg, fg } = STATUS_XLSX_FILL[col.kind];

        celda.value = col.etiqueta;
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        celda.font = { bold: true, size: 10, color: { argb: fg } };
        celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    return ESTATUS_COLUMNAS.map((_, i) => inicio + i);
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

    //Documentos
    const [openDocs, setOpenDocs] = useState(false);
    const [entidadNombre, setEntidadNombre] = useState("");
    const [docsMes, setDocsMes] = useState("");
    const [entidadId, setEntidadId] = useState(null);

    // Abrir gestor de documentos 
    const abrirDocs = (mes, entidad, id) => {
        setDocsMes(mes);
        setOpenDocs(true);
        setEntidadNombre(entidad);
        setEntidadId(id);
    };

    // --- Carga lista de períodos ---
    useEffect(() => {
        const cargarPeriodos = async () => {
            setError("");
            try {
                const r = await apiClient.get("/api/periodos-actualizados");
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
                const r = await apiClient.get("/api/direcciones-actualizados");
                const lista = (r.data?.result ?? []).map((d) => ({
                    value: Number(d.CODIGO_ENTIDAD),
                    label: String(d.NOMBRE || "").trim(),
                    siglas: String(d.SIGLAS || "").trim(),
                    viceministerio: String(d.NOMBRE_VICEMINISTERIO || "").trim(),
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
            const r = await apiClient.get("/api/seguimientos-actualizados/listar-direcciones", {
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

    const numberOrNull = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    };

    const firstValue = (obj, keys = [], fallback = null) => {
        for (const key of keys) {
            const value = obj?.[key];
            if (value !== undefined && value !== null && value !== "") return value;
        }
        return fallback;
    };

    const getPeriodoRaizFila = (row, fallback = null) =>
        numberOrNull(
            firstValue(
                row,
                ["periodo_raiz", "Periodo raíz", "PERIODO_RAIZ", "periodo", "Periodo", "CODIGO_PERIODO"],
                fallback
            )
        );

    const getPeriodoInfoFila = (row, fallback = null) =>
        numberOrNull(
            firstValue(
                row,
                ["periodo_informacion", "Periodo información", "PERIODO_INFORMACION", "periodo", "Periodo", "CODIGO_PERIODO"],
                fallback
            )
        );

    const getCodigoRiesgoPrincipal = (row, fallback = null) =>
        numberOrNull(
            firstValue(
                row,
                ["codigo_riesgo_seleccionado", "Riesgo seleccionado", "CODIGO_RIESGO_SELECCIONADO", "codigo_riesgo", "CODIGO_RIESGO"],
                fallback
            )
        );

    const getCodigoRiesgoInfo = (row, fallback = null) =>
        numberOrNull(
            firstValue(
                row,
                ["codigo_riesgo_informacion", "Riesgo información", "CODIGO_RIESGO_INFORMACION", "codigo_riesgo", "CODIGO_RIESGO"],
                fallback
            )
        );

    const getDescripcionFila = (row) =>
        safe(
            firstValue(
                row,
                ["descripcion", "Descripción del riesgo", "DESCRIPCION", "Descripcion"],
                ""
            )
        ).trim();

    const getRefFila = (row) =>
        safe(firstValue(row, ["ref", "Ref.", "REF", "Ref"], "")).trim();

    const getRiesgoRaizFila = (row, fallback = null) =>
        numberOrNull(
            firstValue(
                row,
                ["riesgo_raiz", "Riesgo raíz", "RIESGO_RAIZ", "codigo_riesgo_seleccionado", "codigo_riesgo", "CODIGO_RIESGO"],
                fallback
            )
        );

    const getRiskStrictKeys = (row) => {
        const ref = getRefFila(row);
        const desc = getDescripcionFila(row);
        const codPrincipal = getCodigoRiesgoPrincipal(row);
        const codInfo = getCodigoRiesgoInfo(row);
        const periodoRaiz = getPeriodoRaizFila(row);
        const periodoInfo = getPeriodoInfoFila(row);
        const riesgoRaiz = getRiesgoRaizFila(row, codPrincipal ?? codInfo);

        return Array.from(new Set([
            periodoRaiz && codPrincipal ? `SEL:${periodoRaiz}:${codPrincipal}` : "",
            periodoInfo && codInfo ? `INFO:${periodoInfo}:${codInfo}` : "",
            periodoRaiz && riesgoRaiz ? `ROOT:${periodoRaiz}:${riesgoRaiz}` : "",
            periodoRaiz && ref ? `REF:${periodoRaiz}:${ref}` : "",
            periodoInfo && ref ? `REFINFO:${periodoInfo}:${ref}` : "",
            periodoRaiz && ref && desc ? `REFDESC:${periodoRaiz}:${ref}::${desc}` : "",
            periodoInfo && ref && desc ? `REFDESCINFO:${periodoInfo}:${ref}::${desc}` : "",
        ].filter(Boolean)));
    };

    const getRiskLooseKeys = (row) => {
        const ref = getRefFila(row);
        const desc = getDescripcionFila(row);
        const codPrincipal = getCodigoRiesgoPrincipal(row);
        const codInfo = getCodigoRiesgoInfo(row);

        return Array.from(new Set([
            ref && desc ? `REFDESC:${ref}::${desc}` : "",
            ref ? `REF:${ref}` : "",
            codPrincipal ? `COD:${codPrincipal}` : "",
            codInfo ? `COD:${codInfo}` : "",
        ].filter(Boolean)));
    };

    const getRiskAliases = (row) => ([
        ...getRiskStrictKeys(row),
        ...getRiskLooseKeys(row),
    ]);

    const matchScoreRiesgo = (base, candidato) => {
        if (!base || !candidato) return 0;

        const baseStrict = new Set(getRiskStrictKeys(base));
        const candStrict = getRiskStrictKeys(candidato);

        if (candStrict.some((key) => baseStrict.has(key))) {
            return 100;
        }

        const baseLoose = new Set(getRiskLooseKeys(base));
        const candLoose = getRiskLooseKeys(candidato);
        const periodoBase = getPeriodoRaizFila(base, getPeriodoInfoFila(base));
        const periodoCand = getPeriodoRaizFila(candidato, getPeriodoInfoFila(candidato));

        const mismoPeriodo = periodoBase && periodoCand && Number(periodoBase) === Number(periodoCand);
        const mismoRef = getRefFila(base) && getRefFila(base) === getRefFila(candidato);
        const mismaDesc = getDescripcionFila(base) && getDescripcionFila(base) === getDescripcionFila(candidato);
        const mismoCodigoPrincipal =
            getCodigoRiesgoPrincipal(base) &&
            getCodigoRiesgoPrincipal(candidato) &&
            Number(getCodigoRiesgoPrincipal(base)) === Number(getCodigoRiesgoPrincipal(candidato));

        if (mismoPeriodo && mismoRef && mismaDesc) return 90;
        if (mismoPeriodo && mismoRef) return 80;
        if (mismoPeriodo && mismoCodigoPrincipal) return 70;

        if (candLoose.some((key) => baseLoose.has(key))) {
            if (mismoPeriodo) return 55;
            if (mismoRef && mismaDesc) return 45;
            if (mismoRef) return 35;
            return 15;
        }

        return 0;
    };

    const buscarMejorPorRiesgo = (items = [], itemBase) => {
        let mejor = null;
        let mejorScore = 0;

        for (const candidato of items) {
            const score = matchScoreRiesgo(itemBase, candidato);

            if (score > mejorScore) {
                mejor = candidato;
                mejorScore = score;
            }
        }

        return mejorScore > 0 ? mejor : null;
    };

    // S2 compatible por riesgo dentro del registro mensual.
    // Soporta formato nuevo, formato anterior y meses mezclados.
    const latestS2ByRisk = (r) => {
        return Array.isArray(r?.seccion2) ? r.seccion2 : [];
    };

    const buscarPorRiesgo = (items, item) => {
        return buscarMejorPorRiesgo(Array.isArray(items) ? items : [], item);
    };

    const buscarResultadoEnS3 = (r, item) => {
        const bloques = Array.isArray(r?.seccion3) ? r.seccion3 : [];

        let best = null;
        let bestScore = 0;

        for (const b of bloques) {
            const periodoBloque = numberOrNull(b?.periodo_raiz ?? b?.periodo);
            const resultados = Array.isArray(b?.resultados) ? b.resultados : [];

            for (const resultado of resultados) {
                const candidatoNormalizado = {
                    ...resultado,
                    periodo: resultado?.periodo ?? periodoBloque,
                    periodo_raiz: resultado?.periodo_raiz ?? periodoBloque,
                    periodo_informacion: resultado?.periodo_informacion ?? resultado?.periodo ?? periodoBloque,
                };

                const score = matchScoreRiesgo(item, candidatoNormalizado);

                if (score > bestScore) {
                    best = { bloque: b, resultado: candidatoNormalizado };
                    bestScore = score;
                }
            }
        }

        return bestScore > 0 ? best : null;
    };

    // Responsable desde S3 si no viene en S1.
    const findResponsableInS3 = (r, item) => {
        const encontrado = buscarResultadoEnS3(r, item);
        return safe(encontrado?.resultado?.responsable);
    };

    // Estatus correspondiente al riesgo / período raíz.
    const findEstatusInS3 = (r, item) => {
        const encontrado = buscarResultadoEnS3(r, item);
        if (encontrado?.bloque?.estatus) return safe(encontrado.bloque.estatus);

        const periodoRaiz = getPeriodoRaizFila(item, getPeriodoInfoFila(item));
        const bloques = Array.isArray(r?.seccion3) ? r.seccion3 : [];

        const porPeriodo = bloques.find((b) =>
            Number(b?.periodo_raiz ?? b?.periodo) === Number(periodoRaiz)
        );

        if (porPeriodo?.estatus) return safe(porPeriodo.estatus);

        return safe(
            bloques.reduce(
                (acc, x) => ((!acc || Number(x?.periodo ?? 0) > Number(acc?.periodo ?? 0)) ? x : acc),
                null
            )?.estatus
        );
    };

    /**
     * Aplica el formato institucional a una hoja ya poblada: encabezado con
     * color, bordes marcados, filas alternas e impresión en oficio horizontal
     * con las columnas ajustadas a una sola página.
     *
     * @param {Object} ws - Hoja de ExcelJS.
     * @param {Object} [opciones]
     * @param {string} [opciones.tituloImpresion] - Texto del pie de página.
     * @param {number[]} [opciones.filasTotales] - Filas de totales a resaltar.
     * @param {number|null} [opciones.filaSubEncabezado] - Segunda fila de encabezado (leyenda de estatus).
     * @param {number[]} [opciones.columnasConSubEncabezado] - Columnas con sub-encabezado propio.
     */
    const styleHeaders = (ws, opciones = {}) => {
        const {
            tituloImpresion = "",
            filasTotales = [],
            filaSubEncabezado = null,
            columnasConSubEncabezado = [],
        } = opciones;

        formatearHojaReporte(ws, {
            filaEncabezado: 1,
            filaSubEncabezado,
            columnasConSubEncabezado,
            ultimaFilaDatos: ws.rowCount,
            ultimaColumna: ws.columnCount,
            recalcularAnchos: false, // los anchos ya vienen definidos en ws.columns
            filasTotales,
            tituloImpresion,
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
     * Genera un archivo Excel con la información de seguimientos faltantes por mes, control y responsable.
     */

    const exportarSeguimientosXLSX = async () => {
        if (!rows.length) {
            openSnack("No hay datos para exportar.", "warning");
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

            styleHeaders(wsResumen, {
                tituloImpresion: `Resumen de filtros — Período ${periodo || "—"}`,
            });


            // ============================================================
            // REPORTE DE CUMPLIMIENTO DE SEGUIMIENTOS POR DIRECCIÓN
            // ============================================================

            const anioActual = new Date().getFullYear();
            const mesActual = new Date().getMonth() + 1;

            let ultimoMesEvaluado;

            // Si el período es anterior al año actual,
            // se evalúa todo el año.
            if (Number(periodo) < anioActual) {
                ultimoMesEvaluado = 12;
            }
            // Si es el año actual,
            // solo se evalúa hasta el mes anterior.
            else if (Number(periodo) === anioActual) {
                ultimoMesEvaluado = mesActual - 1;
            }
            // Si por alguna razón es un período futuro,
            // no se deberían generar meses.
            else {
                ultimoMesEvaluado = 0;
            }


            // ============================================================
            // CREAR HOJA
            // ============================================================

            const wsReporte = wb.addWorksheet(
                "Control de Seguimientos"
            );


            // ============================================================
            // COLUMNAS
            // ============================================================

            const columnas = [
                {
                    header: "No.",
                    key: "no",
                    width: 6
                },

                {
                    header: "Dirección",
                    key: "direccion",
                    width: 55
                }
            ];


            // Agregar meses
            for (let mes = 1; mes <= ultimoMesEvaluado; mes++) {

                columnas.push({
                    header: mesNombre(mes),
                    key: `mes_${mes}`,
                    width: 18
                });
            }


            // Columnas resumen
            columnas.push(
                {
                    header: "Meses faltantes",
                    key: "meses_faltantes",
                    width: 35
                },
                {
                    header: "Sin documento de soporte",
                    key: "sin_soporte",
                    width: 35
                },
                {
                    header: "Estado",
                    key: "estado",
                    width: 18
                }
            );


            wsReporte.columns = columnas;


            // ============================================================
            // MAPA DE SEGUIMIENTOS
            //
            // DIRECCIÓN → MES → REGISTRO
            // ============================================================

            const mapaSeguimientos = new Map();


            for (const r of rows) {

                const codigoEntidad =
                    String(
                        r?.CODIGO_ENTIDAD ??
                        r?.codigo_entidad ??
                        ""
                    ).trim();


                const mes =
                    Number(
                        r?.MES ??
                        r?.mes
                    );


                if (!codigoEntidad || !mes) {
                    continue;
                }


                if (!mapaSeguimientos.has(codigoEntidad)) {

                    mapaSeguimientos.set(
                        codigoEntidad,
                        new Map()
                    );
                }


                mapaSeguimientos
                    .get(codigoEntidad)
                    .set(mes, r);
            }


            // ============================================================
            // AGREGAR TODAS LAS DIRECCIONES
            //
            // Esto es importante:
            // aunque una dirección no tenga seguimientos,
            // igualmente aparecerá.
            // ============================================================

            let numero = 1;


            for (const direccion of direcciones) {

                const codigoEntidad =
                    String(
                        direccion?.value ??
                        direccion?.codigo_entidad ??
                        ""
                    ).trim();


                if (!codigoEntidad) {
                    continue;
                }


                const nombre =
                    safe(
                        direccion?.label ??
                        direccion?.nombre ??
                        nombreDireccion(codigoEntidad)
                    ) || "Sin dirección";


                const seguimientos =
                    mapaSeguimientos.get(codigoEntidad)
                    || new Map();


                // ========================================================
                // DATOS DE LA FILA
                // ========================================================

                const data = {

                    no: numero++,

                    direccion: nombre,

                    meses_faltantes: [],

                    sin_soporte: [],

                    estado: "COMPLETO"
                };


                // ========================================================
                // REVISAR CADA MES
                // ========================================================

                for (
                    let mes = 1;
                    mes <= ultimoMesEvaluado;
                    mes++
                ) {

                    const seguimiento =
                        seguimientos.get(mes);


                    // ----------------------------------------------------
                    // NO EXISTE SEGUIMIENTO
                    // ----------------------------------------------------

                    if (!seguimiento) {

                        data[`mes_${mes}`] =
                            "—";

                        data.meses_faltantes.push(
                            mesNombre(mes)
                        );

                        continue;
                    }


                    // ----------------------------------------------------
                    // EXISTE SEGUIMIENTO
                    // ----------------------------------------------------

                    const tieneDocumentos =
                        Number(
                            seguimiento?.tiene_documentos ?? 0
                        );


                    // ----------------------------------------------------
                    // TIENE DOCUMENTO
                    // ----------------------------------------------------

                    if (tieneDocumentos === 1) {

                        data[`mes_${mes}`] =
                            "✓";

                    }

                    // ----------------------------------------------------
                    // NO TIENE DOCUMENTO
                    // ----------------------------------------------------

                    else {

                        data[`mes_${mes}`] =
                            "⚠";

                        data.sin_soporte.push(
                            mesNombre(mes)
                        );
                    }
                }


                // ========================================================
                // DETERMINAR ESTADO GENERAL
                // ========================================================

                if (data.meses_faltantes.length > 0) {

                    data.estado =
                        "PENDIENTE";

                }
                else if (data.sin_soporte.length > 0) {

                    data.estado =
                        "SIN SOPORTE";

                }
                else {

                    data.estado =
                        "COMPLETO";
                }


                // ========================================================
                // CONVERTIR ARRAYS A TEXTO
                // ========================================================

                data.meses_faltantes =
                    data.meses_faltantes.length > 0
                        ? data.meses_faltantes.join(", ")
                        : "—";


                data.sin_soporte =
                    data.sin_soporte.length > 0
                        ? data.sin_soporte.join(", ")
                        : "—";


                // ========================================================
                // AGREGAR FILA
                // ========================================================

                const row =
                    wsReporte.addRow(data);


                // ========================================================
                // ESTILO DE MESES
                // ========================================================

                for (
                    let mes = 1;
                    mes <= ultimoMesEvaluado;
                    mes++
                ) {

                    const cell =
                        row.getCell(`mes_${mes}`);


                    cell.alignment = {
                        horizontal: "center",
                        vertical: "middle"
                    };


                    if (cell.value === "✓") {

                        cell.font = {
                            bold: true,
                            color: {
                                argb: "FF008000"
                            }
                        };

                    }
                    else if (cell.value === "⚠") {

                        cell.font = {
                            bold: true,
                            color: {
                                argb: "FFFF9900"
                            }
                        };

                    }
                    else {

                        cell.font = {
                            color: {
                                argb: "FF808080"
                            }
                        };
                    }
                }


                // ========================================================
                // ESTADO
                // ========================================================

                const estadoCell =
                    row.getCell("estado");


                estadoCell.font = {
                    bold: true
                };


                estadoCell.alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };


                if (data.estado === "COMPLETO") {

                    estadoCell.font = {
                        bold: true,
                        color: {
                            argb: "FF008000"
                        }
                    };

                }
                else if (data.estado === "SIN SOPORTE") {

                    estadoCell.font = {
                        bold: true,
                        color: {
                            argb: "FFFF9900"
                        }
                    };

                }
                else {

                    estadoCell.font = {
                        bold: true,
                        color: {
                            argb: "FFC00000"
                        }
                    };
                }
            }


            // ============================================================
            // HEADER
            // ============================================================

            const ultimaColumna =
                wsReporte.columnCount;


            const headerRow =
                wsReporte.getRow(1);


            headerRow.height = 35;


            for (
                let col = 1;
                col <= ultimaColumna;
                col++
            ) {

                const cell =
                    headerRow.getCell(col);


                cell.font = {
                    bold: true,
                    color: {
                        argb: "FFFFFFFF"
                    }
                };


                cell.alignment = {
                    horizontal: "center",
                    vertical: "middle",
                    wrapText: true
                };


                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                        argb: "FF1F4E78"
                    }
                };


                cell.border = {

                    top: {
                        style: "thin",
                        color: {
                            argb: "FFFFFFFF"
                        }
                    },

                    bottom: {
                        style: "thin",
                        color: {
                            argb: "FFFFFFFF"
                        }
                    },

                    left: {
                        style: "thin",
                        color: {
                            argb: "FFFFFFFF"
                        }
                    },

                    right: {
                        style: "thin",
                        color: {
                            argb: "FFFFFFFF"
                        }
                    }
                };
            }


            // ============================================================
            // BORDES Y ALINEACIÓN
            // ============================================================

            for (
                let i = 2;
                i <= wsReporte.rowCount;
                i++
            ) {

                const row =
                    wsReporte.getRow(i);


                row.alignment = {
                    vertical: "middle",
                    wrapText: true
                };


                row.height = 25;


                for (
                    let col = 1;
                    col <= wsReporte.columnCount;
                    col++
                ) {

                    row.getCell(col).border = {

                        top: {
                            style: "thin",
                            color: {
                                argb: "FFD9D9D9"
                            }
                        },

                        bottom: {
                            style: "thin",
                            color: {
                                argb: "FFD9D9D9"
                            }
                        },

                        left: {
                            style: "thin",
                            color: {
                                argb: "FFD9D9D9"
                            }
                        },

                        right: {
                            style: "thin",
                            color: {
                                argb: "FFD9D9D9"
                            }
                        }
                    };
                }
            }


            // ============================================================
            // CONGELAR HEADER
            // ============================================================

            wsReporte.views = [
                {
                    state: "frozen",
                    ySplit: 1
                }
            ];


            // ============================================================
            // FILTRO AUTOMÁTICO
            // ============================================================

            wsReporte.autoFilter = {
                from: "A1",
                to: `${wsReporte.getColumn(wsReporte.columnCount).letter}1`
            };

            styleHeaders(wsReporte, {
                tituloImpresion: `Seguimientos por dirección — ${mesNombre(mes)} ${periodo || ""}`.trim()
            });

            // ESCRIBIR EXCEL

            const buf = await wb.xlsx.writeBuffer();
            saveAs(
                new Blob([buf], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                }),
                `ReporteSeguimientos_POR_MES${filenameSuffix()}.xlsx`
            );
            openSnack("Excel por mes, resumen y consolidado generado correctamente.", "success");
        } catch (e) {
            console.error(e);
            openSnack("No fue posible generar el Excel por mes.", "error");
        }

    }

    /**
     * Genera un archivo Excel con la información de riesgos por estructura organizacional.
     */

    const exportarEstructuraXLSX = async () => {
        if (!rows.length) {
            openSnack("No hay datos para exportar.", "warning");
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

            styleHeaders(wsResumen, {
                tituloImpresion: `Resumen de filtros — Período ${periodo || "—"}`,
            });

            // ====== Hojas por mes + datos para consolidado ======

            // Viceministerios que SIEMPRE deben aparecer
            const VICEMINISTERIOS = [
                "Viceministerio de Inversión y Competencia",
                "Viceministerio de Asuntos Registrales",
                "Viceministerio de Integración y Comercio Exterior",
                "Viceministerio de Desarrollo de la Microempresa, Pequeña y Mediana Empresa",
                "Viceministerio Administrativo y Financiero",
                "Despacho Superior"
            ];


            // ==========================================
            // 1. Agrupar: MES → VICEMINISTERIO → registros
            // ==========================================

            const gruposPorMes = new Map();

            for (const direccion of direcciones) {

                const vice = String(direccion.viceministerio ?? "—").trim();
                const entidad = String(direccion.value ?? "—").trim();

                const registros = grupos.get(entidad);

                if (!registros?.length) continue;

                for (const row of registros) {

                    const mes = getMesNum(row);

                    if (!mes) continue;

                    // Crear mes
                    if (!gruposPorMes.has(mes)) {
                        gruposPorMes.set(mes, new Map());
                    }

                    const gruposPorVice = gruposPorMes.get(mes);

                    // Crear viceministerio usando EL NOMBRE como llave
                    if (!gruposPorVice.has(vice)) {
                        gruposPorVice.set(vice, []);
                    }

                    gruposPorVice.get(vice).push(row);
                }
            }


            // ==========================================
            // 2. Ordenar meses
            // ==========================================

            const gruposM = new Map(
                [...gruposPorMes.entries()]
                    .sort(([mesA], [mesB]) => Number(mesA) - Number(mesB))
            );


            // ==========================================
            // 3. Crear una hoja por cada mes
            // ==========================================

            for (const [mes, gruposPorVice] of gruposM) {

                const sheetName = `${String(mes).padStart(2, "0")} - ${mesNombre(mes)}`
                    .slice(0, 31);

                const ws = wb.addWorksheet(sheetName);


                // ==========================================
                // COLUMNAS
                // ==========================================

                ws.columns = [
                    {
                        header: "Descripción",
                        key: "descripcion",
                        width: 65
                    },
                    {
                        header: "Total riesgos",
                        key: "totalR",
                        width: 20
                    },
                    {
                        header: "Baja Severidad - Cumple (Tolerable)",
                        key: "severidadb",
                        width: 30
                    },
                    {
                        header: "Severidad Media - Ejecución (Tolerable)",
                        key: "severidadm",
                        width: 30
                    },
                    {
                        header: "Alta Severidad - Pendiente",
                        key: "severidada",
                        width: 30
                    }
                ];

                // ==========================================
                // TOTALES DEL MES
                // ==========================================

                let totalMes = 0;
                let cumpleMes = 0;
                let ejecucionMes = 0;
                let pendienteMes = 0;


                // ==========================================
                // RECORRER SIEMPRE LOS 6 VICEMINISTERIOS
                // ==========================================

                for (const vice of VICEMINISTERIOS) {

                    // IMPORTANTE:
                    // gruposPorVice utiliza el NOMBRE como llave
                    const registros = gruposPorVice.get(vice) ?? [];


                    let totalVice = 0;
                    let cumpleVice = 0;
                    let ejecucionVice = 0;
                    let pendienteVice = 0;


                    // ==========================================
                    // PROCESAR REGISTROS
                    // ==========================================

                    for (const registro of registros) {

                        if (!Array.isArray(registro.seccion3)) {
                            continue;
                        }


                        for (const seccion of registro.seccion3) {

                            if (!Array.isArray(seccion.resultados)) {
                                continue;
                            }


                            const cantidad = seccion.resultados.length;

                            totalVice += cantidad;


                            const estatus = String(
                                seccion.estatus ?? ""
                            )
                                .trim()
                                .toLowerCase();


                            if (estatus === "cumple") {

                                cumpleVice += cantidad;

                            }
                            else if (
                                estatus === "ejecución" ||
                                estatus === "ejecucion"
                            ) {

                                ejecucionVice += cantidad;

                            }
                            else if (
                                estatus === "pendiente" ||
                                estatus === ""
                            ) {

                                pendienteVice += cantidad;
                            }
                        }
                    }


                    // ==========================================
                    // TOTALES DEL MES
                    // ==========================================

                    totalMes += totalVice;
                    cumpleMes += cumpleVice;
                    ejecucionMes += ejecucionVice;
                    pendienteMes += pendienteVice;


                    // ==========================================
                    // AGREGAR VICEMINISTERIO
                    // ==========================================

                    const fila = ws.addRow({
                        descripcion: vice,
                        totalR: totalVice,
                        severidadb: cumpleVice,
                        severidadm: ejecucionVice,
                        severidada: pendienteVice
                    });


                    fila.font = {
                        bold: true
                    };
                }


                // ==========================================
                // TOTAL DEL MES
                // ==========================================

                const filaTotal = ws.addRow({
                    descripcion: "TOTAL",
                    totalR: totalMes,
                    severidadb: cumpleMes,
                    severidadm: ejecucionMes,
                    severidada: pendienteMes
                });


                filaTotal.font = {
                    bold: true
                };


                // ==========================================
                // FORMATO E IMPRESIÓN (oficio horizontal)
                // ==========================================

                styleHeaders(ws, {
                    tituloImpresion: `Seguimientos por viceministerio — ${mesNombre(mes)} ${periodo || ""}`.trim(),
                    filasTotales: [filaTotal.number],
                });
            }

            // ESCRIBIR EXCEL

            const buf = await wb.xlsx.writeBuffer();
            saveAs(
                new Blob([buf], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                }),
                `SeguimientosPorEstructura_POR_MES${filenameSuffix()}.xlsx`
            );
            openSnack("Excel por mes, resumen y consolidado generado correctamente.", "success");
        } catch (e) {
            console.error(e);
            openSnack("No fue posible generar el Excel por mes.", "error");
        }

    }

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

            styleHeaders(wsResumen, {
                tituloImpresion: `Resumen de filtros — Período ${periodo || "—"}`,
            });

            // ====== Hojas por mes + datos para consolidado ======
            // ============================================================
            // HOJAS POR MES
            // ============================================================

            const mesesOrdenados = Array.from(gruposMes.keys())
                .sort((a, b) => Number(a) - Number(b));

            const registrosConsolidados = [];


            // ============================================================
            // MAPA: CODIGO_ENTIDAD → VICEMINISTERIO
            // ============================================================

            const mapaViceministerios = new Map();

            for (const direccion of direcciones) {

                const codigoEntidad = String(
                    direccion?.value ?? ""
                ).trim();

                const viceministerio = String(
                    direccion?.viceministerio ?? ""
                ).trim();

                if (codigoEntidad) {
                    mapaViceministerios.set(
                        codigoEntidad,
                        viceministerio || "Sin viceministerio"
                    );
                }
            }


            // DEBUG
            /* console.log(
                "MAPA DE VICEMINISTERIOS:",
                [...mapaViceministerios.entries()]
            ); */


            // ============================================================
            // RECORRER MESES
            // ============================================================

            for (const m of mesesOrdenados) {

                const items = gruposMes.get(m) || [];

                const sheetName =
                    `${String(m).padStart(2, "0")} - ${mesNombre(m)}`
                        .slice(0, 31);

                const ws = wb.addWorksheet(sheetName);


                // ========================================================
                // COLUMNAS
                // ========================================================

                ws.columns = [

                    {
                        header: "No.",
                        key: "no",
                        width: 6
                    },

                    {
                        header: "Objetivo",
                        key: "objetivo",
                        width: 35
                    },

                    {
                        header: "Descripción del riesgo",
                        key: "descripcion",
                        width: 35
                    },

                    {
                        header: "Período",
                        key: "periodo_riesgo",
                        width: 10
                    },

                    {
                        header: "Ref.",
                        key: "ref",
                        width: 10
                    },

                    {
                        header: "Rango de tolerancia",
                        key: "tolerancia",
                        width: 15
                    },

                    {
                        header: "Severidad del riesgo",
                        key: "severidad",
                        width: 35
                    },

                    {
                        header: "Control interno para mitigar (gestionar) el riesgo",
                        key: "control",
                        width: 35
                    },

                    {
                        header: "Método de monitoreo",
                        key: "monitoreo",
                        width: 30
                    },

                    {
                        header: "Frecuencia del monitoreo",
                        key: "frecuencia",
                        width: 20
                    },

                    {
                        header: "Responsable",
                        key: "responsable",
                        width: 20
                    },

                    // El estatus se divide en tres columnas (Cumple / Ejecución /
                    // Pendiente); el título combinado y la leyenda de colores los
                    // arma prepararEncabezadoEstatus.
                    {
                        header: "Estatus",
                        key: "estatus_cumple",
                        width: 11
                    },

                    {
                        header: "",
                        key: "estatus_ejecucion",
                        width: 11
                    },

                    {
                        header: "",
                        key: "estatus_pendiente",
                        width: 11
                    },

                    {
                        header: "Comentario",
                        key: "comentario",
                        width: 30
                    }
                ];


                const columnasEstatus = prepararEncabezadoEstatus(ws);


                const mesTexto =
                    `${String(m).padStart(2, "0")} - ${mesNombre(m)}`;


                let numero = 1;


                // ========================================================
                // AGRUPAR LOS REGISTROS DEL MES POR VICEMINISTERIO
                // ========================================================

                const gruposPorViceministerio = new Map();


                for (const r of items) {

                    const codigoEntidad = String(
                        r?.codigo_entidad ?? ""
                    ).trim();


                    // Buscar viceministerio por código de entidad
                    const viceministerio =
                        mapaViceministerios.get(codigoEntidad)
                        || "Sin viceministerio";


                    if (!gruposPorViceministerio.has(viceministerio)) {

                        gruposPorViceministerio.set(
                            viceministerio,
                            []
                        );
                    }


                    gruposPorViceministerio
                        .get(viceministerio)
                        .push(r);
                }


                // ========================================================
                // DEBUG
                // ========================================================

                /* console.log(
                    `MES ${m} - GRUPOS:`,
                    [...gruposPorViceministerio.entries()]
                        .map(([vice, registros]) => ({
                            viceministerio: vice,
                            registros: registros.length
                        }))
                ); */


                // ========================================================
                // RECORRER CADA VICEMINISTERIO
                // ========================================================

                for (
                    const [viceministerio, registros]
                    of gruposPorViceministerio
                ) {


                    // ====================================================
                    // FILA DEL VICEMINISTERIO
                    // ====================================================

                    const filaVice = ws.addRow([]);

                    const numeroFilaVice = filaVice.number;


                    // Combinar toda la fila
                    ws.mergeCells(
                        numeroFilaVice,
                        1,
                        numeroFilaVice,
                        ws.columnCount
                    );


                    const celdaVice =
                        ws.getCell(numeroFilaVice, 1);


                    celdaVice.value =
                        viceministerio;


                    celdaVice.font = {
                        bold: true,
                        size: 12,
                        color: {
                            argb: "FFFFFFFF"
                        }
                    };


                    celdaVice.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {
                            argb: "FF1F4E78"
                        }
                    };


                    celdaVice.alignment = {
                        vertical: "middle",
                        horizontal: "center",
                        wrapText: true
                    };


                    filaVice.height = 28;


                    // ====================================================
                    // PROCESAR REGISTROS DEL VICEMINISTERIO
                    // ====================================================

                    // ====================================================
                    // AGRUPAR REGISTROS POR DIRECCIÓN
                    // ====================================================

                    const gruposPorDireccion = new Map();

                    for (const r of registros) {

                        const codigoEntidad = String(
                            r?.codigo_entidad ?? ""
                        ).trim();

                        const direccion =
                            safe(
                                nombreDireccion(codigoEntidad)
                            ) || "Sin dirección";


                        if (!gruposPorDireccion.has(direccion)) {

                            gruposPorDireccion.set(
                                direccion,
                                []
                            );
                        }


                        gruposPorDireccion
                            .get(direccion)
                            .push(r);
                    }


                    // ====================================================
                    // RECORRER DIRECCIONES
                    // ====================================================

                    for (
                        const [direccion, registrosDireccion]
                        of gruposPorDireccion
                    ) {


                        // ==================================================
                        // FILA DE DIRECCIÓN
                        // ==================================================

                        const filaDireccion =
                            ws.addRow([]);

                        const numeroFilaDireccion =
                            filaDireccion.number;


                        // Combinar toda la fila
                        ws.mergeCells(
                            numeroFilaDireccion,
                            1,
                            numeroFilaDireccion,
                            ws.columnCount
                        );


                        const celdaDireccion =
                            ws.getCell(
                                numeroFilaDireccion,
                                1
                            );


                        celdaDireccion.value =
                            direccion;


                        // Estilo diferente al viceministerio
                        celdaDireccion.font = {
                            bold: true,
                            size: 11,
                            color: {
                                argb: "FF1F1F1F"
                            }
                        };


                        celdaDireccion.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: {
                                argb: "FFD9E2F3"
                            }
                        };


                        celdaDireccion.alignment = {
                            vertical: "middle",
                            horizontal: "center",
                            wrapText: true
                        };


                        filaDireccion.height = 24;


                        // Aplicar fondo a toda la fila
                        for (
                            let col = 1;
                            col <= ws.columnCount;
                            col++
                        ) {

                            const cell =
                                filaDireccion.getCell(col);

                            cell.fill = {
                                type: "pattern",
                                pattern: "solid",
                                fgColor: {
                                    argb: "FFD9E2F3"
                                }
                            };

                            cell.border = {
                                bottom: {
                                    style: "thin",
                                    color: {
                                        argb: "FF9EADBF"
                                    }
                                }
                            };
                        }


                        // ==================================================
                        // PROCESAR RIESGOS DE LA DIRECCIÓN
                        // ==================================================

                        for (
                            const r of registrosDireccion
                        ) {

                            const dirTxt =
                                safe(
                                    nombreDireccion(
                                        r?.codigo_entidad
                                    )
                                );


                            const siglas =
                                safe(
                                    siglasDireccion(
                                        r?.codigo_entidad
                                    )
                                );


                            const s1 =
                                Array.isArray(r?.seccion1)
                                    ? r.seccion1
                                    : [];


                            const mapS2 =
                                latestS2ByRisk(r);


                            // ==============================================
                            // RECORRER RIESGOS
                            // ==============================================

                            for (const it of s1) {

                                const s2 =
                                    buscarPorRiesgo(
                                        mapS2,
                                        it
                                    );


                                const responsable =
                                    safe(it?.responsable)
                                    ||
                                    findResponsableInS3(
                                        r,
                                        it
                                    );


                                const estatusRiesgo =
                                    findEstatusInS3(
                                        r,
                                        it
                                    );


                                // ==========================================
                                // DATOS
                                // ==========================================

                                const baseData = {

                                    mes_num: m,

                                    mes_texto: mesTexto,

                                    mes_periodo:
                                        `${periodo || ""} - ${mesTexto}`
                                            .trim(),

                                    organo:
                                        safe(it?.organo),

                                    viceministerio:
                                        viceministerio,

                                    direccion:
                                        dirTxt,

                                    siglas,

                                    periodo_riesgo:
                                        safe(
                                            getPeriodoRaizFila(
                                                it,
                                                it?.periodo
                                            )
                                        ),

                                    objetivo:
                                        safe(it?.objetivo),

                                    descripcion:
                                        safe(it?.descripcion),

                                    ref:
                                        safe(it?.ref),

                                    tolerancia:
                                        safe(it?.tolerancia),

                                    severidad:
                                        safe(
                                            it?.severidad_narracion
                                        ),

                                    control:
                                        safe(
                                            s2?.control_interno
                                            ??
                                            it?.control_interno
                                        ),

                                    monitoreo:
                                        safe(
                                            s2?.metodo_monitoreo
                                            ??
                                            it?.metodo_monitoreo
                                        ),

                                    frecuencia:
                                        safe(
                                            s2?.frecuencia
                                            ??
                                            it?.frecuencia
                                        ),

                                    responsable,

                                    estatus:
                                        estatusRiesgo,

                                    comentario: ""
                                };


                                // ==========================================
                                // FILA DEL RIESGO
                                // ==========================================

                                const row =
                                    ws.addRow({

                                        no:
                                            numero++,

                                        objetivo:
                                            baseData.objetivo,

                                        descripcion:
                                            baseData.descripcion,

                                        periodo_riesgo:
                                            baseData.periodo_riesgo,

                                        ref:
                                            baseData.ref,

                                        tolerancia:
                                            baseData.tolerancia,

                                        severidad:
                                            baseData.severidad,

                                        control:
                                            baseData.control,

                                        monitoreo:
                                            baseData.monitoreo,

                                        frecuencia:
                                            baseData.frecuencia,

                                        responsable:
                                            baseData.responsable,

                                        comentario:
                                            baseData.comentario
                                    });


                                // ==========================================
                                // ESTILO ESTATUS
                                // (solo se colorea la columna que corresponde)
                                // ==========================================

                                pintarEstatusDividido(
                                    row,
                                    baseData.estatus
                                );


                                // ==========================================
                                // ESTILO RANGO DE TOLERANCIA
                                // ==========================================

                                pintarTolerancia(
                                    row,
                                    baseData.tolerancia
                                );


                                // ==========================================
                                // CONSOLIDADO
                                // ==========================================

                                registrosConsolidados.push(
                                    baseData
                                );
                            }
                        }
                    }
                }


                // ========================================================
                // ESTILO DEL HEADER
                // ========================================================

                styleHeaders(ws, {
                    tituloImpresion:
                        `Seguimientos ${mesTexto} — Período ${periodo || "—"}`,
                    filaSubEncabezado: 2,
                    columnasConSubEncabezado: columnasEstatus
                });
            }


            // ====== Hoja final: Consolidado ======
            if (registrosConsolidados.length) {

                const wsAll = wb.addWorksheet("Consolidado");

                wsAll.columns = [
                    { header: "No.", key: "no", width: 6 },
                    { header: "Período - Mes", key: "mes", width: 24 },
                    /* { header: "Órgano", key: "organo", width: 28 }, */
                    /* { header: "Viceministerio", key: "viceministerio", width: 34 }, */
                    /* { header: "Dirección", key: "direccion", width: 42 }, */
                    /* { header: "Siglas", key: "siglas", width: 12 }, */
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
                    // El estatus se divide en tres columnas (Cumple / Ejecución /
                    // Pendiente); el título combinado y la leyenda de colores los
                    // arma prepararEncabezadoEstatus.
                    { header: "Estatus", key: "estatus_cumple", width: 12 },
                    { header: "", key: "estatus_ejecucion", width: 12 },
                    { header: "", key: "estatus_pendiente", width: 12 },
                    { header: "Comentario", key: "comentario", width: 36 },
                ];


                const columnasEstatus = prepararEncabezadoEstatus(wsAll);


                // =========================================================
                // ORDENAR
                // VICEMINISTERIO → DIRECCIÓN → MES
                // =========================================================

                const registrosOrdenados = [...registrosConsolidados].sort((a, b) => {

                    const viceA = String(a.viceministerio ?? "");
                    const viceB = String(b.viceministerio ?? "");

                    const cmpVice = viceA.localeCompare(
                        viceB,
                        "es",
                        { sensitivity: "base" }
                    );

                    if (cmpVice !== 0) {
                        return cmpVice;
                    }


                    const dirA = String(a.direccion ?? "");
                    const dirB = String(b.direccion ?? "");

                    const cmpDir = dirA.localeCompare(
                        dirB,
                        "es",
                        { sensitivity: "base" }
                    );

                    if (cmpDir !== 0) {
                        return cmpDir;
                    }


                    return Number(a.mes_num ?? 0) -
                        Number(b.mes_num ?? 0);
                });


                // =========================================================
                // VARIABLES DE CONTROL
                // =========================================================

                let numero = 1;

                let ultimoViceministerio = null;
                let ultimaDireccion = null;


                // =========================================================
                // RECORRER REGISTROS
                // =========================================================

                for (const reg of registrosOrdenados) {

                    const viceministerio =
                        String(reg.viceministerio ?? "Sin viceministerio").trim();

                    const direccion =
                        String(reg.direccion ?? "Sin dirección").trim();


                    // =====================================================
                    // CAMBIO DE VICEMINISTERIO
                    // =====================================================

                    if (viceministerio !== ultimoViceministerio) {

                        // Reiniciar dirección
                        ultimaDireccion = null;


                        // Agregar fila de Viceministerio
                        const filaVice = wsAll.addRow({
                            no: "",
                            mes: "",
                            organo: reg.organo || "",
                            viceministerio: viceministerio,
                            direccion: "",
                            siglas: "",
                            periodo_riesgo: "",
                            objetivo: "",
                            descripcion: "",
                            ref: "",
                            tolerancia: "",
                            severidad: "",
                            control: "",
                            monitoreo: "",
                            frecuencia: "",
                            responsable: "",
                            estatus: "",
                            comentario: "",
                        });


                        // Combinar toda la fila
                        wsAll.mergeCells(
                            filaVice.number,
                            1,
                            filaVice.number,
                            wsAll.columnCount
                        );


                        const cellVice =
                            filaVice.getCell(1);

                        cellVice.value =
                            `VICEMINISTERIO: ${viceministerio}`;


                        cellVice.font = {
                            bold: true,
                            size: 12,
                            color: {
                                argb: "FFFFFFFF"
                            }
                        };


                        cellVice.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: {
                                argb: "FF1F4E78"
                            }
                        };


                        cellVice.alignment = {
                            vertical: "middle",
                            horizontal: "center"
                        };


                        filaVice.height = 28;


                        ultimoViceministerio =
                            viceministerio;
                    }


                    // =====================================================
                    // CAMBIO DE DIRECCIÓN
                    // =====================================================

                    if (direccion !== ultimaDireccion) {

                        const filaDireccion = wsAll.addRow({
                            no: "",
                            mes: "",
                            organo: "",
                            viceministerio: "",
                            direccion: direccion,
                            siglas: "",
                            periodo_riesgo: "",
                            objetivo: "",
                            descripcion: "",
                            ref: "",
                            tolerancia: "",
                            severidad: "",
                            control: "",
                            monitoreo: "",
                            frecuencia: "",
                            responsable: "",
                            estatus: "",
                            comentario: "",
                        });


                        // Combinar desde Dirección hasta el final
                        wsAll.mergeCells(
                            filaDireccion.number,
                            1,
                            filaDireccion.number,
                            wsAll.columnCount
                        );


                        const cellDireccion =
                            filaDireccion.getCell(4);

                        cellDireccion.value =
                            `DIRECCIÓN: ${direccion}`;


                        cellDireccion.font = {
                            bold: true,
                            italic: true,
                            size: 11,
                            color: {
                                argb: "FF1F1F1F"
                            }
                        };


                        cellDireccion.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: {
                                argb: "FFD9EAF7"
                            }
                        };


                        cellDireccion.alignment = {
                            vertical: "middle",
                            horizontal: "center"
                        };


                        filaDireccion.height = 24;


                        ultimaDireccion =
                            direccion;
                    }


                    // =====================================================
                    // FILA NORMAL DEL RIESGO
                    // =====================================================

                    const row = wsAll.addRow({
                        no: numero++,
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
                        comentario: reg.comentario,
                    });


                    // =====================================================
                    // ALINEACIÓN GENERAL
                    // (antes de los colores, porque row.alignment afecta a
                    //  todas las celdas de la fila)
                    // =====================================================

                    row.alignment = {
                        vertical: "middle",
                        wrapText: true
                    };


                    // =====================================================
                    // ESTILO DEL ESTATUS
                    // (solo se colorea la columna que corresponde)
                    // =====================================================

                    pintarEstatusDividido(row, reg.estatus);


                    // =====================================================
                    // ESTILO DEL RANGO DE TOLERANCIA
                    // =====================================================

                    pintarTolerancia(row, reg.tolerancia);


                    /* row.height = 30; */
                }


                // =========================================================
                // HEADER
                // =========================================================

                styleHeaders(wsAll, {
                    tituloImpresion:
                        `Consolidado de seguimientos — Período ${periodo || "—"}`,
                    filaSubEncabezado: 2,
                    columnasConSubEncabezado: columnasEstatus,
                });
            }

            const buf = await wb.xlsx.writeBuffer();
            saveAs(
                new Blob([buf], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                }),
                `CONSOLIDADO_POR_MES${filenameSuffix()}.xlsx`
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
                                    startIcon={< FactCheckIcon />}
                                    variant="outlined"
                                    onClick={exportarSeguimientosXLSX}
                                    disabled={!rows.length}
                                >
                                    Seguimientos completos y faltantes
                                </Button>
                                <Button
                                    startIcon={< AccountTreeIcon />}
                                    variant="outlined"
                                    onClick={exportarEstructuraXLSX}
                                    disabled={!rows.length}
                                >
                                    Riesgos por estructura organizacional
                                </Button>
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

                                                                        {/* Botón Documentos: evitar abrir el seguimiento */}
                                                                        <Tooltip title="Gestionar documentos del mes">
                                                                            <span>
                                                                                <IconButton
                                                                                    size="medium"
                                                                                    onClick={(e) => { e.stopPropagation(); abrirDocs(mNum, nombre, codigo); }}
                                                                                >
                                                                                    <AttachFileRounded fontSize="medium" />
                                                                                </IconButton>
                                                                            </span>
                                                                        </Tooltip>
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

            {/* Modal de Documentos (componente nuevo) */}
            <SeguimientoDocsModal
                open={openDocs}
                onClose={() => setOpenDocs(false)}
                entidadNombre={entidadNombre}
                periodo={Number(periodo) || null}
                mes={docsMes}
                viewOnly={true}
                entidadId={entidadId}
            />
        </Box>
    );
}
