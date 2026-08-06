/**
 * @fileoverview 
 * Configuración de versiones de reportes de evaluación de riesgos.
 *
 * Permite:
 * - Definir qué propiedades se muestran en cada reporte:
 *   - Matriz de evaluación de riesgos.
 *   - Mapa de calor de riesgo residual.
 *   - Matriz de continuidad de evaluación.
 * - Crear nuevas versiones de configuración de reportes (con orden de columnas).
 * - Tomar una versión existente como base para una nueva.
 * - Copiar la versión por defecto del año anterior.
 * - Marcar una versión como defecto para el período.
 *
 * @module Riesgos/Evaluacion riesgos F/Mantenimiento/MantenimientoReportes.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useState } from "react";
import apiClient from "api/apiClient";
import {
    Box, Card, CardHeader, CardContent, Typography, Stack, Button, Chip, Alert, CircularProgress, TextField,
    Checkbox, IconButton, Paper, MenuItem, Select, FormControl, InputLabel, Divider
} from "@mui/material";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import StarBorderRounded from "@mui/icons-material/StarBorderRounded";
import { Autocomplete } from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

/** Base API */
const API_BASE = "/api/riesgos-variables-actualizados";

const maintenanceCardSx = {
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)"
};

/** Report IDs canónicos */
const REPORT_IDS = {
    MATRIZ: "matriz_evaluacion_riesgos",
    MAPA: "mapa_calor_riesgo_residual",
    CONTINUIDAD: "matriz_continuidad_evaluacion",
};

const PROPIEDADES_PREDEFINIDAS = [
    { key: "VARIABLE_MITIGACION", label: "A mitigar", source: "predefinida" },
    { key: "CODIGO_AREA", label: "Área evaluada", source: "predefinida" },
    { key: "CONTROL", label: "Control interno para mitigar", source: "predefinida" },
    { key: "DESCRIPCION", label: "Descripción del riesgo", source: "predefinida" },
    { key: "CAPACIDAD_MITIGACION", label: "Eficiencia del mitigador", source: "predefinida" },
    { key: "EVENTO", label: "Evento", source: "predefinida" },
    { key: "CODIGO_FRECUENCIA", label: "Frecuencia", source: "predefinida" },
    { key: "MONITOREO", label: "Método de monitoreo", source: "predefinida" },
    { key: "CODIGO_OBJETIVO", label: "Objetivo", source: "predefinida" },
    { key: "OBSERVACIONES", label: "Observaciones", source: "predefinida" }, // (se tolera alias OBSERVACIONES)
    { key: "CODIGO_PROBABILIDAD", label: "Probabilidad", source: "predefinida" },
    { key: "PROBABILIDAD_AJUSTADA", label: "Probabilidad ajustada", source: "predefinida" },
    { key: "REF", label: "Ref.", source: "predefinida" },
    { key: "RESPONSABLE", label: "Responsable", source: "predefinida" },
    { key: "RIESGO_INHERENTE", label: "Riesgo Inherente", source: "predefinida" },
    { key: "RIESGO_RESIDUAL", label: "Riesgo residual", source: "predefinida" },
    { key: "CODIGO_SEVERIDAD", label: "Severidad", source: "predefinida" },
    { key: "SEVERIDAD_NARRACION", label: "Severidad (narración)", source: "predefinida" },
    { key: "SEVERIDAD_AJUSTADA", label: "Severidad ajustada", source: "predefinida" },
    { key: "CODIGO_TIPO_OBJETIVO", label: "Tipo de objetivo", source: "predefinida" },
    { key: "CODIGO_TOLERANCIA", label: "Tolerancia", source: "predefinida" },
];

const KEY_ALIASES = {
    "OBJETIVO": "CODIGO_OBJETIVO",
    "TIPO_DE_OBJETIVO": "CODIGO_TIPO_OBJETIVO",
    "REFERENCIA": "REF",
    "DESCRIPCION": "DESCRIPCION", 
    "DESCRIPCION_DEL_RIESGO": "DESCRIPCION",
    "PROBABILIDAD": "CODIGO_PROBABILIDAD",
    "SEVERIDAD": "CODIGO_SEVERIDAD",
    "RIESGO_INHERENTE": "RIESGO_INHERENTE",
    "EFICIENCIA_DEL_MITIGADOR": "CAPACIDAD_MITIGACION",
    "A_MITIGAR": "VARIABLE_MITIGACION",
    "PROBABILIDAD_AJUSTADA": "PROBABILIDAD_AJUSTADA",
    "SEVERIDAD_AJUSTADA": "SEVERIDAD_AJUSTADA",
    "RIESGO_RESIDUAL": "RIESGO_RESIDUAL",
    "CONTROL_INTERNO_PARA_MITIGAR": "CONTROL",
    "OBSERVACIONES": "OBSERVACIONES",
    "EVENTO": "EVENTO",
    "TOLERANCIA": "CODIGO_TOLERANCIA",
    "SEVERIDAD_NARRACION": "SEVERIDAD_NARRACION",
    "CONTROL_INTERNO": "CONTROL",
    "METODO_DE_MONITOREO": "MONITOREO",
    "FRECUENCIA": "CODIGO_FRECUENCIA",
    "RESPONSABLE": "RESPONSABLE",
    "REF": "REF"
};

const DEFAULT_KEYS = {
    [REPORT_IDS.MATRIZ]: [
        "OBJETIVO",
        "TIPO_DE_OBJETIVO",
        "CODIGO_AREA",
        "REF",
        "EVENTO",
        "DESCRIPCION_DEL_RIESGO",
        "PROBABILIDAD",
        "SEVERIDAD",
        "RIESGO_INHERENTE",
        "EFICIENCIA_DEL_MITIGADOR",
        "A_MITIGAR",
        "PROBABILIDAD_AJUSTADA",
        "SEVERIDAD_AJUSTADA",
        "RIESGO_RESIDUAL",
        "CONTROL_INTERNO_PARA_MITIGAR",
        "OBSERVACIONES",
    ],
    [REPORT_IDS.MAPA]: [
        "DESCRIPCION_DEL_RIESGO",
        "PROBABILIDAD_AJUSTADA",
        "SEVERIDAD_AJUSTADA",
        "RIESGO_RESIDUAL",
        "REF", 
    ],
    [REPORT_IDS.CONTINUIDAD]: [
        "OBJETIVO",
        "DESCRIPCION",
        "REF",
        "TOLERANCIA",
        "SEVERIDAD_NARRACION",
        "CONTROL_INTERNO",
        "METODO_DE_MONITOREO",
        "FRECUENCIA",
        "RESPONSABLE",
    ],
};


/**
 * parseJsonArray
 *
 * Asegura convertir un valor (string o arreglo) a un arreglo JSON válido.
 *
 * - Si el valor es string intenta hacer `JSON.parse`.
 * - Si el resultado es un arreglo, lo devuelve.
 * - En cualquier otro caso (o error) devuelve `[]`.
 *
 * @param {string|any[]} val Valor a parsear.
 * @returns {any[]} Arreglo resultante o arreglo vacío si el parse falla.
 */
const parseJsonArray = (val) => {
    try {
        const v = typeof val === "string" ? JSON.parse(val) : val;
        return Array.isArray(v) ? v : [];
    } catch { return []; }
};

const SELECT_ALL_OPT = { key: "*ALL*", label: "Seleccionar todas", source: "especial" };

/**
 * MantenimientoReportes
 *
 * Es el módulo de mantenimiento de versiones de reportes de evaluación de riesgos.
 *
 * - Carga las versiones configuradas para un período (Matriz, Mapa, Continuidad).
 * - Permite:
 *   - Ver el detalle (solo lectura) de una versión seleccionada.
 *   - Crear una nueva versión desde cero usando propiedades predefinidas y extras.
 *   - Tomar una versión existente como base y derivar una nueva.
 *   - Copiar la versión por defecto del año pasado.
 *   - Establecer una versión como defecto para el período actual.
 * - Gestiona la selección, orden y tipo de propiedades que cada reporte mostrará.
 *
 * @component
 * @param {Object} props
 * @param {string|number} props.periodo Período para el cual se configuran las versiones de reportes.
 * @returns {JSX.Element}
 */
export default function MantenimientoReportes({ periodo }) {
    const [versiones, setVersiones] = useState([]);
    const [versionSeleccionada, setVersionSeleccionada] = useState("");

    const [modo, setModo] = useState("none");

    const [propsPredefinidas, setPropsPredefinidas] = useState([]);
    const [baseExtras, setBaseExtras] = useState([]);
    const [propsExtra, setPropsExtra] = useState([]);

    const [selMatriz, setSelMatriz] = useState([]);
    const [selMapa, setSelMapa] = useState([]);
    const [selContinuidad, setSelContinuidad] = useState([]);

    const [detalle, setDetalle] = useState({ me: [], mc: [], mce: [] });
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    const [loading, setLoading] = useState(false);
    const [creatingVersion, setCreatingVersion] = useState(false);
    const [error, setError] = useState("");
    const [okMsg, setOkMsg] = useState("");
    const [estableciendo, setEstableciendo] = useState(false);
    const [copiando, setCopiando] = useState(false);

    const puedeAccionar = Boolean(periodo);
    const allOptionsBase = [...propsPredefinidas, ...propsExtra];
    const allOptions = [SELECT_ALL_OPT, ...allOptionsBase];

    const byKey = (list = []) => {
        const map = new Map();
        list.forEach(o => map.set(o.key, o));
        return map;
    };
    const catalogoMap = () => byKey(allOptionsBase);

    const resolveKey = (humanKeyOrReal) => {
        const upper = String(humanKeyOrReal || "").toUpperCase();
        return KEY_ALIASES[upper] || humanKeyOrReal;
    };

    const findOptionByKey = (k) => {
        const map = catalogoMap();
        return map.get(k) || null;
    };

    const sanitizeNoDuplicates = (arr) => {
        const seen = new Set();
        const clean = [];
        for (const it of arr) {
            const key = typeof it === "string" ? it : it?.key;
            if (!key || key === SELECT_ALL_OPT.key || seen.has(key)) continue;
            const opt = findOptionByKey(key) || it;
            seen.add(key);
            clean.push(opt);
        }
        return clean;
    };

    const getReportList = (report) =>
        report === REPORT_IDS.MATRIZ ? selMatriz : report === REPORT_IDS.MAPA ? selMapa : selContinuidad;

    const setReportList = (report, list) => {
        if (report === REPORT_IDS.MATRIZ) setSelMatriz(list);
        else if (report === REPORT_IDS.MAPA) setSelMapa(list);
        else setSelContinuidad(list);
    };

    const buildReportPayload = (list) =>
        list.map((it, idx) => ({
            key: it.key ?? null,
            label: it.label ?? null,
            source: it.source ?? null,
            codigo_propiedad: it.codigo_propiedad ?? null,
            codigo_version: it.codigo_version ?? null,
            propiedad: it.propiedad ?? null,
            orden: idx + 1,
        }));

    const loadExtrasDefectoPeriodo = async () => {
        const { data } = await apiClient.get(`${API_BASE}/propiedades-riesgos-defecto`, {
            params: { periodo },
        });
        const rows = Array.isArray(data?.data) ? data.data : [];
        const opts = rows.map((r) => ({
            key: String(r.PROPIEDAD),
            label: String(r.PROPIEDAD),
            source: "extra",
            propiedad: r.PROPIEDAD,
            codigo_propiedad: r.CODIGO_PROPIEDAD,
            codigo_version: r.CODIGO_VERSION,
        }));
        setBaseExtras(opts);
        setPropsExtra(opts);
    };

    const loadVersionesReportes = async () => {
        const { data } = await apiClient.get(`${API_BASE}/versiones-propiedades-reportes`, {
            params: { periodo },
        });
        const rows = Array.isArray(data?.data) ? data.data : [];
        const parsed = rows.map((r) => ({
            value: String(r.CODIGO_VERSION),
            numero: r.CODIGO_VERSION,
            esDefecto: r.DEFECTO === "S",
        }));
        setVersiones(parsed);
    };

    const loadData = async () => {
        setError(""); setOkMsg(""); setLoading(true);
        try {
            setPropsPredefinidas(PROPIEDADES_PREDEFINIDAS);
            await loadExtrasDefectoPeriodo();
            await loadVersionesReportes();
            setVersionSeleccionada("");
            setModo("none");
            setSelMatriz([]); setSelMapa([]); setSelContinuidad([]);
            setDetalle({ me: [], mc: [], mce: [] });
        } catch {
            setError("No se pudo cargar la información inicial.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (periodo) loadData(); }, [periodo]);

    // ---------- Detalle de la versión (solo lectura) ----------
    const fetchDetalleVersion = async (codigoVersion) => {
        if (!periodo || !codigoVersion) return;
        try {
            setLoadingDetalle(true);
            const { data } = await apiClient.get(`${API_BASE}/versiones-propiedades-reportes`, {
                params: { periodo, codigo_version: codigoVersion },
            });
            const row = Array.isArray(data?.data) ? data.data[0] : null;
            const me = row ? parseJsonArray(row.PROPIEDADES_ME) : [];
            const mc = row ? parseJsonArray(row.PROPIEDADES_MC) : [];
            const mce = row ? parseJsonArray(row.PROPIEDADES_MCE) : [];
            setDetalle({ me: me.map((x) => ({ ...x })), mc: mc.map((x) => ({ ...x })), mce: mce.map((x) => ({ ...x })) });
            setModo("view");
        } catch (e) {
            console.error("Error al cargar detalle de la versión:", e);
            setError("No se pudo cargar el detalle de la versión seleccionada.");
            setDetalle({ me: [], mc: [], mce: [] });
            setModo("none");
        } finally {
            setLoadingDetalle(false);
        }
    };

    useEffect(() => {
        if (versionSeleccionada) fetchDetalleVersion(versionSeleccionada);
        else { setDetalle({ me: [], mc: [], mce: [] }); if (modo === "view") setModo("none"); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [versionSeleccionada]);

    /** 
     * Arma la lista de defaults para un reporte, resolviendo alias,
     *  tomando del catálogo actual (predefinidas + extras) y preservando el orden pedido.
     */
    const buildDefaultsFromCatalog = (reportId) => {
        const requested = DEFAULT_KEYS[reportId] || [];
        const result = [];
        const used = new Set();
        for (const human of requested) {
            const realKey = resolveKey(human);
            const opt = findOptionByKey(realKey);
            if (opt && !used.has(opt.key)) {
                used.add(opt.key);
                result.push(opt);
            }
        }
        return result;
    };

    const handleCrearNueva = () => {
        setModo("crear");
        setSelMatriz(buildDefaultsFromCatalog(REPORT_IDS.MATRIZ));
        setSelMapa(buildDefaultsFromCatalog(REPORT_IDS.MAPA));
        setSelContinuidad(buildDefaultsFromCatalog(REPORT_IDS.CONTINUIDAD));
    };

    // abre modo crear con la versión seleccionada
    const handleTomarComoBase = async () => {
        if (!versionSeleccionada) return;

        // Asegura que el detalle esté cargado
        if (!detalle.me.length && !detalle.mc.length && !detalle.mce.length) {
            await fetchDetalleVersion(versionSeleccionada);
        }

        const preKeys = new Set(PROPIEDADES_PREDEFINIDAS.map((x) => x.key));
        const from = [...detalle.me, ...detalle.mc, ...detalle.mce];
        const extrasUsed = [];
        const seen = new Set();
        for (const it of from) {
            const k = it.key || it.propiedad;
            if (!k || preKeys.has(k)) continue;
            if (seen.has(k)) continue;
            seen.add(k);
            extrasUsed.push({
                key: k,
                label: it.label || it.propiedad || k,
                source: "extra",
                propiedad: it.propiedad ?? it.label ?? k,
                codigo_propiedad: it.codigo_propiedad ?? null,
                codigo_version: it.codigo_version ?? null,
            });
        }
        // Une extras base (si hubiera) con los de la versión seleccionada, sin duplicados
        const byK = new Map();
        [...baseExtras, ...extrasUsed].forEach((o) => byK.set(o.key, o));
        setPropsExtra(Array.from(byK.values()));

        setSelMatriz(detalle.me.map((x) => ({ ...x })));
        setSelMapa(detalle.mc.map((x) => ({ ...x })));
        setSelContinuidad(detalle.mce.map((x) => ({ ...x })));

        setModo("crear");
    };

    const crearVersionDesdeSeleccion = async () => {
        try {
            setError(""); setOkMsg(""); setCreatingVersion(true);
            const payload = {
                periodo,
                reportes: {
                    [REPORT_IDS.MATRIZ]: buildReportPayload(selMatriz),
                    [REPORT_IDS.MAPA]: buildReportPayload(selMapa),
                    [REPORT_IDS.CONTINUIDAD]: buildReportPayload(selContinuidad),
                },
            };
            await apiClient.post(`${API_BASE}/versiones-propiedades-reportes`, payload);
            setModo("none");
            setVersionSeleccionada("");
            setSelMatriz([]); setSelMapa([]); setSelContinuidad([]);
            await loadVersionesReportes();
            setOkMsg("Versión creada.");
        } catch {
            setError("No se pudo crear la versión.");
        } finally {
            setCreatingVersion(false);
        }
    };

    // Establecer como defecto (PUT) y copiar por defecto del año pasado (POST)
    const handleEstablecerDefecto = async () => {
        if (!versionSeleccionada) return;
        try {
            setEstableciendo(true);
            setError(""); setOkMsg("");
            await apiClient.put(
                `${API_BASE}/versiones-establecer-defecto-reportes`,
                { periodo, codigo_version: Number(versionSeleccionada) }
            );
            await loadVersionesReportes();
            setOkMsg("Versión establecida como defecto.");
        } catch (e) {
            console.error(e);
            setError("No se pudo establecer la versión como defecto.");
        } finally {
            setEstableciendo(false);
        }
    };

    const handleCopiarDefectoAnioPasado = async () => {
        try {
            setCopiando(true);
            setError(""); setOkMsg("");
            await apiClient.post(
                `${API_BASE}/defecto-pasado-reportes`,
                { periodo }
            );
            await loadVersionesReportes();
            setOkMsg("Se copió la versión por defecto del año pasado.");
        } catch (e) {
            console.error(e);
            setError("No se pudo copiar la versión por defecto del año pasado.");
        } finally {
            setCopiando(false);
        }
    };


    /**
     * BloqueLectura
     *
     * Mostrar en modo solo lectura la lista de propiedades configuradas para un reporte.
     *
     * - Muestra el título/subtítulo del bloque.
     * - Si está cargando, indica el estado de carga.
     * - Si no hay propiedades, muestra un mensaje.
     * - Si hay propiedades, las lista en el orden configurado.
     *
     * @component
     * @param {string} props.title Título del bloque (nombre del reporte).
     * @param {string} [props.subtitle] Subtítulo (ej. período / versión).
     * @param {Array<Object>} props.items Lista de propiedades configuradas para el reporte.
     * @returns {JSX.Element}
     */
    const BloqueLectura = ({ title, subtitle, items }) => (
        <Card sx={{ ...maintenanceCardSx, mb: 2 }}>
            <CardHeader title={title} subheader={subtitle} />
            <CardContent>
                {loadingDetalle ? (
                    <Typography variant="body2" color="text.secondary">Cargando…</Typography>
                ) : items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No hay propiedades configuradas.</Typography>
                ) : (
                    <Stack spacing={1.25}>
                        {items
                            .slice()
                            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                            .map((it, idx) => (
                                <Paper
                                    key={`${it.key || it.propiedad || idx}-${idx}`}
                                    elevation={0}
                                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 2, py: 1.25, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                >
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip label={`${(it.orden ?? idx + 1)}.`} size="small" />
                                        <Typography variant="body2">
                                            {it.label || it.propiedad || it.key}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            [{it.source === "predefinida" ? "defecto" : "extra"}]
                                        </Typography>
                                    </Stack>
                                </Paper>
                            ))}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );

    /**
     * BloqueEdicion
     *
     * Editar la selección y el orden de propiedades para un reporte específico.
     *
     * - Permite seleccionar propiedades (predefinidas o extra) mediante Autocomplete,
     *   incluyendo la opción "Seleccionar todas".
     * - Muestra la lista actual de propiedades del reporte con posibilidad de:
     *   - Reordenar mediante drag & drop.
     *   - Eliminar propiedades individuales.
     * - Actualiza el estado de selección del reporte asociado.
     *
     * @component
     * @param {string} props.title Título descriptivo del reporte (ej. "Matriz de evaluación de riesgos").
     * @param {string} [props.subtitle] Subtítulo (ej. período actual).
     * @param {Array<Object>} props.value Lista de propiedades seleccionadas para el reporte.
     * @param {string} props.reportId Identificador interno del reporte (REPORT_IDS.*).
     * @returns {JSX.Element}
     */
    const BloqueEdicion = ({ title, subtitle, value, reportId }) => {
        const selected = value;
        const isSelected = (opt) => selected.some((s) => (s.key || s) === opt.key);

        const addManyToReport = (report, values) => {
            const current = getReportList(report);
            const includesAll = values.some((v) => (v.key || v) === SELECT_ALL_OPT.key);
            const sourceList = includesAll ? allOptionsBase : values.filter((v) => (v.key || v) !== SELECT_ALL_OPT.key);
            const merged = sanitizeNoDuplicates([...current, ...sourceList]);
            setReportList(report, merged);
        };

        const removeFromReporte = (report, key) => {
            const remove = (list) => list.filter((x) => (x.key || x) !== key);
            setReportList(report, remove(getReportList(report)));
        };

        return (
            <Card sx={{ ...maintenanceCardSx, mb: 2 }}>
                <CardHeader title={title} subheader={subtitle} />
                <CardContent>
                    <Stack spacing={2}>
                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={[SELECT_ALL_OPT, ...allOptionsBase]}
                            getOptionLabel={(o) => o.label || o.key}
                            value={[]}
                            onChange={(_, vals) => addManyToReport(reportId, vals)}
                            isOptionEqualToValue={(opt, val) => (opt.key || opt) === (val.key || val)}
                            renderOption={(props, option) => {
                                const checked = option.key === SELECT_ALL_OPT.key ? false : isSelected(option);
                                return (
                                    <li {...props} style={{ display: "flex", alignItems: "center" }}>
                                        <Checkbox checked={option.key === SELECT_ALL_OPT.key ? false : checked} tabIndex={-1} disableRipple />
                                        <span>
                                            {option.label}{" "}
                                            {option.key !== SELECT_ALL_OPT.key && (
                                                <Typography component="span" sx={{ ml: 1 }} color="text.secondary">
                                                    [{option.source === "predefinida" ? "defecto" : "extra"}]
                                                </Typography>
                                            )}
                                        </span>
                                    </li>
                                );
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label="Agregar propiedades (marca varias o 'Seleccionar todas')" placeholder="Buscar propiedad…" />
                            )}
                        />

                        <Typography variant="caption" color="text.secondary">
                            Arrastre las propiedades para cambiar el orden en el reporte.
                        </Typography>

                        <DragDropContext onDragEnd={(result) => {
                            if (!result.destination) return;
                            const items = Array.from(getReportList(reportId));
                            const [moved] = items.splice(result.source.index, 1);
                            items.splice(result.destination.index, 0, moved);
                            setReportList(reportId, items);
                        }}>
                            <Droppable droppableId={`drop-${reportId}`}>
                                {(provided) => (
                                    <Stack ref={provided.innerRef} {...provided.droppableProps} spacing={1.5} sx={{ minHeight: 8 }}>
                                        {selected.length === 0 && (
                                            <Typography variant="body2" color="text.secondary">No has agregado propiedades a este reporte.</Typography>
                                        )}
                                        {selected.map((it, index) => {
                                            const k = it.key || it;
                                            return (
                                                <Draggable draggableId={`${reportId}-${k}`} index={index} key={`${reportId}-${k}`}>
                                                    {(drag) => (
                                                        <Paper
                                                            ref={drag.innerRef}
                                                            {...drag.draggableProps}
                                                            {...drag.dragHandleProps}
                                                            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, borderRadius: 2 }}
                                                            elevation={1}
                                                        >
                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                <DragIndicatorRounded fontSize="small" />
                                                                <Chip label={`${index + 1}. ${it.label || k}`} size="small" />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    [{it.source === "predefinida" ? "defecto" : "extra"}]
                                                                </Typography>
                                                            </Stack>
                                                            <IconButton size="small" onClick={() => removeFromReporte(reportId, k)}>
                                                                <DeleteRounded fontSize="small" />
                                                            </IconButton>
                                                        </Paper>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </Stack>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </Stack>
                </CardContent>
            </Card>
        );
    };

    const showReportesCrear = modo === "crear";
    const showReportesView = modo === "view" && versionSeleccionada;

    return (
        <Box sx={{ mt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {okMsg && <Alert severity="success" sx={{ mb: 2 }}>{okMsg}</Alert>}

            {/* ====== Selector de versión ====== */}
            <Card sx={{ ...maintenanceCardSx, mb: 2 }}>
                <CardHeader title="Seleccione una versión (Reportes)" />
                <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
                        <Chip label={versionSeleccionada ? `Version ${versionSeleccionada}` : "Seleccione una version"} color={versionSeleccionada ? "primary" : "default"} variant={versionSeleccionada ? "filled" : "outlined"} />
                        <Chip label={`${versiones.length} version(es) registradas`} variant="outlined" />
                        <Chip label={modo === "crear" ? "Editando nueva version" : "Modo consulta"} variant="outlined" />
                    </Stack>
                    {loading ? (
                        <Typography variant="body2" color="text.secondary">Cargando…</Typography>
                    ) : versiones.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No hay versiones registradas para este período.
                        </Typography>
                    ) : (
                        <FormControl fullWidth>
                            <InputLabel id="version-rep-label">Versión</InputLabel>
                            <Select
                                labelId="version-rep-label"
                                label="Versión"
                                value={versionSeleccionada}
                                onChange={(e) => setVersionSeleccionada(e.target.value)}
                                renderValue={(val) => {
                                    const v = versiones.find(x => x.value === val);
                                    if (!v) return "";
                                    return (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <span>{`v${v.numero}`}</span>
                                            {v.esDefecto && <Chip size="small" label="Defecto" color="primary" />}
                                        </Stack>
                                    );
                                }}
                            >
                                {versiones.map((v) => (
                                    <MenuItem key={v.value} value={v.value}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <span>{`v${v.numero}`}</span>
                                            {v.esDefecto && <Chip size="small" label="Defecto" color="primary" />}
                                        </Stack>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </CardContent>
            </Card>

            {/* ====== Acciones ====== */}
            <Card sx={{ ...maintenanceCardSx, mb: 2 }}>
                <CardHeader title="Acciones" />
                <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Cree una configuracion nueva, reutilice una version existente o marque cual sera la configuracion por defecto del periodo.
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap={{ sm: "wrap" }}>
                        <Button
                            variant="contained"
                            disabled={!Boolean(periodo)}
                            onClick={handleCrearNueva}
                            sx={{ width: { xs: "100%", sm: "auto" } }}
                        >
                            Crear nueva versión
                        </Button>

                        <Button
                            variant="outlined"
                            disabled={!Boolean(periodo) || !versionSeleccionada}
                            onClick={handleTomarComoBase}
                            sx={{ width: { xs: "100%", sm: "auto" } }}
                        >
                            Tomar como base
                        </Button>

                        <Button
                            variant="outlined"
                            disabled={!Boolean(periodo) || copiando}
                            onClick={handleCopiarDefectoAnioPasado}
                            sx={{ width: { xs: "100%", sm: "auto" } }}
                            startIcon={copiando ? <CircularProgress size={16} /> : null}
                        >
                            Copiar versión por defecto del año pasado
                        </Button>

                        <Button
                            variant="outlined"
                            color="success"
                            disabled={!Boolean(periodo) || !versionSeleccionada || estableciendo}
                            onClick={handleEstablecerDefecto}
                            sx={{ width: { xs: "100%", sm: "auto" } }}
                            startIcon={
                                estableciendo
                                    ? <CircularProgress size={16} />
                                    : versionSeleccionada &&
                                    (versiones.find(v => v.value === versionSeleccionada)?.esDefecto
                                        ? <StarRounded />
                                        : <StarBorderRounded />)
                            }
                        >
                            {estableciendo ? "Estableciendo…" : "Establecer por defecto"}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* ====== Vista SOLO LECTURA de la versión seleccionada ====== */}
            {showReportesView && (
                <>
                    <BloqueLectura
                        title="Matriz de evaluación de riesgos"
                        subtitle={`Versión ${versionSeleccionada}`}
                        items={detalle.me}
                    />
                    <BloqueLectura
                        title="Mapa de calor de riesgo residual"
                        subtitle={`Versión ${versionSeleccionada}`}
                        items={detalle.mc}
                    />
                    <BloqueLectura
                        title="Matriz de continuidad de evaluación de riesgos"
                        subtitle={`Versión ${versionSeleccionada}`}
                        items={detalle.mce}
                    />
                </>
            )}

            {/* ====== Editor para CREAR nueva versión ====== */}
            {showReportesCrear && (
                <>
                    <BloqueEdicion
                        title="Matriz de evaluación de riesgos"
                        subtitle={periodo ? `Período: ${periodo}` : undefined}
                        value={selMatriz}
                        reportId={REPORT_IDS.MATRIZ}
                    />
                    <BloqueEdicion
                        title="Mapa de calor de riesgo residual"
                        subtitle={periodo ? `Período: ${periodo}` : undefined}
                        value={selMapa}
                        reportId={REPORT_IDS.MAPA}
                    />
                    <BloqueEdicion
                        title="Matriz de continuidad de evaluación de riesgos"
                        subtitle={periodo ? `Período: ${periodo}` : undefined}
                        value={selContinuidad}
                        reportId={REPORT_IDS.CONTINUIDAD}
                    />

                    <Stack direction="row" spacing={1.5} sx={{ mt: 1 }} justifyContent="flex-end">
                        <Button variant="text" onClick={() => { setModo("none"); setSelMatriz([]); setSelMapa([]); setSelContinuidad([]); }}>
                            Cancelar
                        </Button>
                        <Button
                            variant="contained"
                            onClick={crearVersionDesdeSeleccion}
                            startIcon={creatingVersion ? <CircularProgress size={16} /> : null}
                            disabled={!Boolean(periodo) || creatingVersion || (selMatriz.length === 0 && selMapa.length === 0 && selContinuidad.length === 0)}
                        >
                            Crear versión
                        </Button>
                    </Stack>
                </>
            )}
        </Box>
    );
}
