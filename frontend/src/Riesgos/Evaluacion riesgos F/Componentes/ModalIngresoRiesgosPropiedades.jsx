/**
 * @fileoverview
 * Modal para editar propiedades avanzadas del riesgo durante el ingreso.
 *
 * @module Riesgos/Evaluacion riesgos F/Componentes/ModalIngresoRiesgosPropiedades.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from "react";
import apiClient from "api/apiClient";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Grid, Button, Stack, Alert, IconButton, Snackbar,
    Divider, Typography, Select, MenuItem, FormControl,
    InputLabel, Chip, LinearProgress,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ModalRiesgoPeriodoAnterior from "./ModalRiesgoPeriodoAnterior";

/* ===================== Helpers ===================== */
const len = (v) => (v ? String(v).length : 0);
const helper = (v, max) => `${len(v)}/${max}`;
const riskBg = (v) => (!v ? "transparent" : v <= 10 ? "success.light" : v <= 15 ? "warning.light" : "error.light");

/**
 * Modal de propiedades de riesgo.
 *
 * Se utiliza desde el ingreso de riesgos para ajustar propiedades avanzadas.
 *
 * @component
 */
function ModalIngresoRiesgosPropiedades({
    open, onClose, entidad = '', cats, initialData, periodo, siglas = '',
    propiedadesDef, propiedadesExt,
    onRequestSave,
    saving = false,
}) {

    const isEdit = Boolean(initialData?.CODIGO_RIESGO);

    const [objetivos, setObjetivos] = useState([]); // [{CODIGO, DESCRIPCION}]
    const [loadingObj, setLoadingObj] = useState(false);

    /* ===== formulario ===== */
    const [form, setForm] = useState({
        VICEMINISTERIO: "",
        ORGANO: "",

        TIPO_CODIGO: "",
        REF_NUM: "",
        REF: "",
        OBJETIVO: "",
        AREA: "",
        DESCRIPCION: "",
        PROBABILIDAD: "",
        SEVERIDAD: "",
        TOLERANCIA: "",
        CAPACIDAD_MITIGACION: "",
        VARIABLE_MITIGACION: "",
        PROBABILIDAD_AJUSTADA: "",
        SEVERIDAD_AJUSTADA: "",
        RIESGO_INHERENTE: "",
        RIESGO_RESIDUAL: "",
        SEVERIDAD_NARRACION: "",
        EVENTO: "",
        CONTROL: "",
        MONITOREO: "",
        FRECUENCIA: "",
        RESPONSABLE: "",
        OBSERVACIONES: ""
    });

    const handleClose = () => {
        setForm({
            VICEMINISTERIO: "",
            ORGANO: "",

            TIPO_CODIGO: "",
            REF_NUM: "",
            REF: "",
            OBJETIVO: "",
            AREA: "",
            DESCRIPCION: "",
            PROBABILIDAD: "",
            SEVERIDAD: "",
            TOLERANCIA: "",
            CAPACIDAD_MITIGACION: "",
            VARIABLE_MITIGACION: "",
            PROBABILIDAD_AJUSTADA: "",
            SEVERIDAD_AJUSTADA: "",
            RIESGO_INHERENTE: "",
            RIESGO_RESIDUAL: "",
            SEVERIDAD_NARRACION: "",
            EVENTO: "",
            CONTROL: "",
            MONITOREO: "",
            FRECUENCIA: "",
            RESPONSABLE: "",
            OBSERVACIONES: ""
        });
        onClose();
    };

    const [extraValues, setExtraValues] = useState({});
    const [error, setError] = useState("");
    const [triedSave, setTriedSave] = useState(false);

    // ===== estados para “Riesgo periodo anterior” =====
    const [prevLoading, setPrevLoading] = useState(false);
    const [prevMsg, setPrevMsg] = useState({ open: false, text: "", severity: "info" });
    const [prevModalOpen, setPrevModalOpen] = useState(false);
    const [prevRiesgo, setPrevRiesgo] = useState(null);
    const periodoAnterior = (Number(periodo) || 0) > 0 ? (Number(periodo) - 1) : null;

    const [keysSet, setKeysSet] = useState(new Set());
    const [keysSetExtra, setKeysSetExtra] = useState(new Set());

    /* ===================== Carga de objetivos por tipo ===================== */
    const fetchObjetivos = async (tipoCodigo) => {
        if (!tipoCodigo) { setObjetivos([]); return; }
        setLoadingObj(true);
        try {
            const { data } = await apiClient.get(
                "/api/objetivos-actualizados",
                { params: { tipoObjetivo: tipoCodigo } }
            );
            const list = Array.isArray(data?.result) ? data.result : [];
            setObjetivos(list);
        } finally {
            setLoadingObj(false);
        }
    };

    const recomputeRef = (tipoCodigo, refNum) => {
        const s = siglas;
        const code = tipoCodigo;
        const num = (refNum || "").toString().trim();
        return s && code && num ? `${s} ${code} - ${num}` : "";
    };

    const handleTipoChange = async (tipoCodigo) => {
        await fetchObjetivos(tipoCodigo);
        setForm((s) => ({ ...s, TIPO_CODIGO: tipoCodigo, OBJETIVO: "", REF: recomputeRef(tipoCodigo, s.REF_NUM) }));
    };

    const extractExtrasObject = (val) => {
        if (!val) return {};
        if (typeof val === "string") {
            try {
                const parsed = JSON.parse(val);
                return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
            } catch {
                return {};
            }
        }
        return (typeof val === "object" && !Array.isArray(val)) ? (val || {}) : {};
    };

    const actualizarAlAbrir = async () => {
        setError("");
        setTriedSave(false);

        // Construir sets de visibilidad con las props actuales
        const defSet = new Set((propiedadesDef || []).filter(Boolean).map(it => it.key));
        const extSet = new Set((propiedadesExt || []).filter(Boolean).map(it => it.key));
        setKeysSet(defSet);
        setKeysSetExtra(extSet);

        if (isEdit && initialData) {
            const d = initialData;
            const tipo = d?.CODIGO_TIPO_OBJETIVO;
            await fetchObjetivos(tipo);

            const refNum = (() => {
                const m = /-\s*(\d+)\s*$/.exec(d?.REF ?? "");
                return m?.[1] || "";
            })();

            const capMitCodigo = (d?.CODIGO_MITIGACION != null)
                ? d.CODIGO_MITIGACION
                : (Number.isFinite(d?.CAPACIDAD_MITIGACION) ? Number(d.CAPACIDAD_MITIGACION) + 1 : "");

            setForm({
                VICEMINISTERIO: d?.VICEMINISTERIO ?? "",
                ORGANO: d?.ORGANO ?? "",

                TIPO_CODIGO: tipo || "",
                REF_NUM: refNum,
                REF: d?.REF ?? recomputeRef(tipo, refNum),
                OBJETIVO: d?.CODIGO_OBJETIVO ?? "",
                AREA: d?.CODIGO_AREA ?? "",
                DESCRIPCION: d?.DESCRIPCION ?? "",
                PROBABILIDAD: d?.CODIGO_PROBABILIDAD ?? d?.PROBABILIDAD ?? "",
                SEVERIDAD: d?.CODIGO_SEVERIDAD ?? d?.SEVERIDAD ?? "",
                TOLERANCIA: d?.CODIGO_TOLERANCIA ?? "",
                CAPACIDAD_MITIGACION: capMitCodigo,
                VARIABLE_MITIGACION: d?.VARIABLE_MITIGACION ?? "",
                PROBABILIDAD_AJUSTADA: d?.PROBABILIDAD_AJUSTADA ?? "",
                SEVERIDAD_AJUSTADA: d?.SEVERIDAD_AJUSTADA ?? "",
                RIESGO_INHERENTE: d?.RIESGO_INHERENTE ?? "",
                RIESGO_RESIDUAL: d?.RIESGO_RESIDUAL ?? "",
                SEVERIDAD_NARRACION: d?.SEVERIDAD_NARRACION ?? "",
                EVENTO: d?.EVENTO ?? "",
                CONTROL: d?.CONTROL ?? "",
                MONITOREO: d?.MONITOREO ?? "",
                FRECUENCIA: d?.CODIGO_FRECUENCIA ?? "",
                RESPONSABLE: d?.RESPONSABLE ?? "",
                OBSERVACIONES: d?.OBSERVACIONES ?? ""
            });

            const extrasObj = extractExtrasObject(d?.EXTRAS_JSON);

            const initMap = {};
            (propiedadesExt || []).filter(Boolean).forEach((p) => {
                const key = p?.key ?? String(p);
                const val = extrasObj?.[key];
                initMap[key] = (val == null) ? "" : String(val);
            });
            setExtraValues(initMap);
        } else {
            setObjetivos([]);
            setForm((s) => ({
                ...s,
                VICEMINISTERIO: "",
                ORGANO: "",
                TIPO_CODIGO: "",
                OBJETIVO: "",
                REF_NUM: "",
                REF: ""
            }));
            setExtraValues({});
        }
    };

    useEffect(() => {
        if (!open) return;
        actualizarAlAbrir();
    }, [open]);

    useEffect(() => {
        const prob = Number(form.PROBABILIDAD || 0);
        const sev = Number(form.SEVERIDAD || 0);
        const capEff = Math.max(0, Number(form.CAPACIDAD_MITIGACION || 0) - 1);
        const varMit = (form.VARIABLE_MITIGACION || "").toUpperCase();

        const sevAdj = varMit === "S" ? Math.max(1, sev - capEff) : (sev || "");
        const probAdj = varMit === "P" ? Math.max(1, prob - capEff) : (prob || "");

        const inh = prob && sev ? prob * sev : "";
        const res = probAdj && sevAdj ? probAdj * sevAdj : "";

        setForm((prev) => ({
            ...prev,
            PROBABILIDAD_AJUSTADA: probAdj || "",
            SEVERIDAD_AJUSTADA: sevAdj || "",
            RIESGO_INHERENTE: inh || "",
            RIESGO_RESIDUAL: res || ""
        }));
    }, [form.PROBABILIDAD, form.SEVERIDAD, form.CAPACIDAD_MITIGACION, form.VARIABLE_MITIGACION]);

    const isEmptyStr = (v) => (v == null || String(v).trim() === "");

    const show = (k) => keysSet.has(k);

    const getPrevExtras = () => {
        if (!isEdit) return {};
        const raw = initialData?.EXTRAS_JSON;
        try {
            if (!raw) return {};
            if (typeof raw === "string") {
                const parsed = JSON.parse(raw);
                return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
            }
            return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
        } catch {
            return {};
        }
    };

    const buildExtrasMerged = () => {
        const prev = getPrevExtras();
        const out = { ...prev };
        keysSetExtra.forEach((k) => {
            const v = (extraValues?.[k] ?? "");
            if (String(v).trim() !== "") out[k] = v;
            else if (!isEdit) delete out[k];
        });
        return out;
    };

    const extrasMissing = Array.from(keysSetExtra).some((k) => isEmptyStr(extraValues?.[k]));
    const valid =
        (!show("CODIGO_TIPO_OBJETIVO") || !isEmptyStr(form.TIPO_CODIGO)) &&
        (!show("REF") || (!isEmptyStr(form.REF_NUM) && !isEmptyStr(form.REF))) &&
        (!show("CODIGO_AREA") || !isEmptyStr(form.AREA)) &&
        (!show("CODIGO_OBJETIVO") || !isEmptyStr(form.OBJETIVO)) &&
        (!show("DESCRIPCION") || (form.DESCRIPCION || "").trim().length >= 5) &&
        (!show("CODIGO_PROBABILIDAD") || Number(form.PROBABILIDAD) > 0) &&
        (!show("CODIGO_SEVERIDAD") || Number(form.SEVERIDAD) > 0) &&
        (!show("CODIGO_TOLERANCIA") || !isEmptyStr(form.TOLERANCIA)) &&
        (!show("VARIABLE_MITIGACION") || !isEmptyStr(form.VARIABLE_MITIGACION)) &&
        (!show("CAPACIDAD_MITIGACION") || !isEmptyStr(form.CAPACIDAD_MITIGACION)) &&
        (!show("SEVERIDAD_NARRACION") || !isEmptyStr(form.SEVERIDAD_NARRACION)) &&
        (!show("EVENTO") || !isEmptyStr(form.EVENTO)) &&
        (!show("CONTROL") || !isEmptyStr(form.CONTROL)) &&
        (!show("MONITOREO") || !isEmptyStr(form.MONITOREO)) &&
        (!show("CODIGO_FRECUENCIA") || !isEmptyStr(form.FRECUENCIA)) &&
        (!show("RESPONSABLE") || !isEmptyStr(form.RESPONSABLE)) &&
        !extrasMissing;

    const fieldError = (cond) => triedSave && Boolean(cond);

    const handleSaveClick = () => {
        setTriedSave(true);
        if (!valid) {
            setError("Faltan campos obligatorios. Revisa los marcados en rojo.");
            return;
        }
        setError("");
        const payload = buildPayload();
        onRequestSave?.(payload, isEdit);
    };

    // construir sets de visibilidad cuando cambian props
    useEffect(() => {
        setKeysSet(new Set((propiedadesDef || []).filter(Boolean).map(it => it.key)));
    }, [propiedadesDef]);

    useEffect(() => {
        setKeysSetExtra(new Set((propiedadesExt || []).filter(Boolean).map(it => it.key)));
    }, [propiedadesExt]);

    /* ===================== buildPayload conservando ocultos (EDICIÓN) ===================== */
    const buildPayload = () => {
        const prev = initialData || {};
        const capCodigo = Number(form.CAPACIDAD_MITIGACION) || 0;      // 1..N en UI
        const capEfectiva = Math.max(0, capCodigo - 1);                // 0..N-1 en payload

        const pick = (visible, valForm, valPrev = null) =>
            visible ? (valForm ?? null) : (isEdit ? (valPrev ?? null) : null);

        const prevProb = prev?.CODIGO_PROBABILIDAD ?? prev?.PROBABILIDAD ?? null;
        const prevSev = prev?.CODIGO_SEVERIDAD ?? prev?.SEVERIDAD ?? null;

        const prevCapCodigo = prev?.CODIGO_MITIGACION ?? (Number.isFinite(prev?.CAPACIDAD_MITIGACION) ? (Number(prev.CAPACIDAD_MITIGACION) + 1) : null);
        const prevCapEfect = prevCapCodigo != null ? Math.max(0, Number(prevCapCodigo) - 1) : null;

        return {
            codigoPeriodo: Number(periodo) || null,

            // NUEVOS
            viceministerioCodigo: form.VICEMINISTERIO || (isEdit ? prev?.VICEMINISTERIO : null) || null,
            organoCodigo: form.ORGANO || (isEdit ? prev?.ORGANO : null) || null,

            // Códigos
            tipoObjetivoCodigo: pick(keysSet.has("CODIGO_TIPO_OBJETIVO"), form.TIPO_CODIGO || null, prev?.CODIGO_TIPO_OBJETIVO ?? null),
            areaCodigo: pick(keysSet.has("CODIGO_AREA"), form.AREA || null, prev?.CODIGO_AREA ?? null),
            toleranciaCodigo: pick(keysSet.has("CODIGO_TOLERANCIA"), form.TOLERANCIA || null, prev?.CODIGO_TOLERANCIA ?? null),
            frecuenciaCodigo: pick(keysSet.has("CODIGO_FRECUENCIA"), form.FRECUENCIA || null, prev?.CODIGO_FRECUENCIA ?? null),
            objetivoCodigo: pick(keysSet.has("CODIGO_OBJETIVO"), form.OBJETIVO || null, prev?.CODIGO_OBJETIVO ?? null),

            // Textos
            descripcion: pick(keysSet.has("DESCRIPCION"), (form.DESCRIPCION || "").trim() || null, prev?.DESCRIPCION ?? null),
            ref: pick(keysSet.has("REF"), form.REF || null, prev?.REF ?? null),
            severidadNarracion: pick(keysSet.has("SEVERIDAD_NARRACION"), (form.SEVERIDAD_NARRACION || "").trim() || null, prev?.SEVERIDAD_NARRACION ?? null),
            evento: pick(keysSet.has("EVENTO"), (form.EVENTO || "").trim() || null, prev?.EVENTO ?? null),
            control: pick(keysSet.has("CONTROL"), (form.CONTROL || "").trim() || null, prev?.CONTROL ?? null),
            monitoreo: pick(keysSet.has("MONITOREO"), (form.MONITOREO || "").trim() || null, prev?.MONITOREO ?? null),
            responsable: pick(keysSet.has("RESPONSABLE"), (form.RESPONSABLE || "").trim() || null, prev?.RESPONSABLE ?? null),
            observaciones: pick(keysSet.has("OBSERVACIONES"), (form.OBSERVACIONES || "").trim() || null, prev?.OBSERVACIONES ?? null),

            // Números base/ajustados
            probabilidad: pick(keysSet.has("CODIGO_PROBABILIDAD"), Number(form.PROBABILIDAD) || null, Number(prevProb) || null),
            severidad: pick(keysSet.has("CODIGO_SEVERIDAD"), Number(form.SEVERIDAD) || null, Number(prevSev) || null),
            capacidadMitigacion: pick(keysSet.has("CAPACIDAD_MITIGACION"), capEfectiva, prevCapEfect),
            variableMitigacion: pick(keysSet.has("VARIABLE_MITIGACION"), (form.VARIABLE_MITIGACION || "").toUpperCase() || null, (prev?.VARIABLE_MITIGACION || null)),
            probabilidadAjustada: pick(keysSet.has("PROBABILIDAD_AJUSTADA"), Number(form.PROBABILIDAD_AJUSTADA) || null, Number(prev?.PROBABILIDAD_AJUSTADA) || null),
            severidadAjustada: pick(keysSet.has("SEVERIDAD_AJUSTADA"), Number(form.SEVERIDAD_AJUSTADA) || null, Number(prev?.SEVERIDAD_AJUSTADA) || null),
            riesgoInherente: pick(keysSet.has("RIESGO_INHERENTE"), Number(form.RIESGO_INHERENTE) || null, Number(prev?.RIESGO_INHERENTE) || null),
            riesgoResidual: pick(keysSet.has("RIESGO_RESIDUAL"), Number(form.RIESGO_RESIDUAL) || null, Number(prev?.RIESGO_RESIDUAL) || null),

            // EXTRA: merge de prev + visibles editados
            extras: buildExtrasMerged(),

            // Para editar
            codigoRiesgo: isEdit ? initialData?.CODIGO_RIESGO : undefined
        };
    };

    /* ===================== Handler: Riesgo periodo anterior (abre modal) ===================== */
    const handleFetchRiesgoPeriodoAnterior = async () => {
        try {
            setPrevLoading(true);

            const params = {
                periodo: periodoAnterior ?? 0,
                codigo_riesgo: initialData?.CODIGO_RIESGO || null,
                // Si tu endpoint no requiere "tipo", puedes omitirlo; lo incluyo por compatibilidad:
                tipo: form.TIPO_CODIGO || initialData?.CODIGO_TIPO_OBJETIVO || ""
            };

            if (!params.codigo_riesgo || !params.periodo) {
                setPrevMsg({
                    open: true,
                    text: "No hay datos suficientes (período o código de riesgo) para consultar el período anterior.",
                    severity: "warning"
                });
                return;
            }

            const { data } = await apiClient.get(
                "/api/riesgos-variables-actualizados/riesgo-por-id-periodo-anterior",
                {
                    params,
                }
            );

            const riesgoPrev = data?.riesgo || null;
            if (!riesgoPrev) {
                setPrevMsg({
                    open: true,
                    text: "No se encontró información del período anterior.",
                    severity: "warning"
                });
                return;
            }
            setPrevRiesgo(riesgoPrev);
            setPrevModalOpen(true);
            setPrevMsg({
                open: true,
                text: "Consulta realizada. Mostrando el riesgo del período anterior.",
                severity: "success"
            });
        } catch (e) {
            console.error("Error consultando riesgo período anterior:", e, e.response);
            setPrevMsg({
                open: true,
                text: e.response.data.message,
                severity: "info"
            });
        } finally {
            setPrevLoading(false);
        }
    };

    /* ===================== Derivados para tabla rápida ===================== */
    const probNum = Number(form.PROBABILIDAD || 0);
    const sevNum = Number(form.SEVERIDAD || 0);
    const capCodigo = Number(form.CAPACIDAD_MITIGACION || 0);
    const capEfectiva = Math.max(0, capCodigo - 1);
    const varMit = (form.VARIABLE_MITIGACION || "").toUpperCase();
    const probAdjNum = Number(form.PROBABILIDAD_AJUSTADA || 0);
    const sevAdjNum = Number(form.SEVERIDAD_AJUSTADA || 0);
    const inhNum = Number(form.RIESGO_INHERENTE || 0);
    const resNum = Number(form.RIESGO_RESIDUAL || 0);

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ pr: 6 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2" color="text.secondary">
                            {entidad || "Dirección"}
                        </Typography>
                        <Chip size="small" label={`Período ${periodo ?? ""}`} />
                    </Stack>
                    <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700 }}>
                        {isEdit ? `Editar riesgo` : "Nuevo riesgo"}
                    </Typography>
                    <IconButton onClick={handleClose} sx={{ position: "absolute", right: 8, top: 8 }}>
                        <CloseRounded />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {loadingObj && <LinearProgress sx={{ mb: 2 }} />}

                    <Stack spacing={2}>
                        {!!error && <Alert severity="error">{error}</Alert>}

                        {/* ======= Viceministerio / Órgano (tomados de cats) ======= */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Viceministerio</InputLabel>
                                    <Select
                                        label="Viceministerio"
                                        value={form.VICEMINISTERIO}
                                        onChange={(e) => setForm(s => ({ ...s, VICEMINISTERIO: e.target.value }))}
                                    >
                                        {(cats?.viceministerios || []).map(v => (
                                            <MenuItem key={v.CODIGO_VICEMINISTERIO} value={v.CODIGO_VICEMINISTERIO}>
                                                {v.NOMBRE}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Órgano</InputLabel>
                                    <Select
                                        label="Órgano"
                                        value={form.ORGANO}
                                        onChange={(e) => setForm(s => ({ ...s, ORGANO: e.target.value }))}
                                    >
                                        {(cats?.organos || []).map(o => (
                                            <MenuItem key={o.CODIGO_ORGANO} value={o.CODIGO_ORGANO}>
                                                {o.NOMBRE}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <Divider />

                        {/* 1) Área / Tipo objetivo / REF */}
                        <Grid container spacing={2}>
                            {keysSet.has('CODIGO_AREA') && (
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small" required error={fieldError(!form.AREA)}>
                                        <InputLabel>Área de evaluación</InputLabel>
                                        <Select
                                            label="Área de evaluación"
                                            value={form.AREA}
                                            onChange={(e) => setForm((s) => ({ ...s, AREA: e.target.value }))}
                                        >
                                            {(cats.areas || []).map((a) => (
                                                <MenuItem key={a.CODIGO} value={a.CODIGO}>{a.DESCRIPCION}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {keysSet.has('CODIGO_TIPO_OBJETIVO') && (
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small" required error={fieldError(!form.TIPO_CODIGO)}>
                                        <InputLabel>Tipo de objetivo</InputLabel>
                                        <Select
                                            label="Tipo de objetivo"
                                            value={form.TIPO_CODIGO}
                                            onChange={(e) => handleTipoChange(e.target.value)}
                                        >
                                            {(cats.tiposObjetivo || []).map((t) => (
                                                <MenuItem key={t.CODIGO} value={t.CODIGO}>
                                                    {t.CODIGO} — {t.DESCRIPCION}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {keysSet.has('REF') && (
                                <>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            required
                                            label="Consecutivo REF"
                                            value={form.REF_NUM}
                                            onChange={(e) => {
                                                const v = e.target.value.replace(/\D/g, "");
                                                setForm((s) => ({ ...s, REF_NUM: v, REF: recomputeRef(s.TIPO_CODIGO, v) }));
                                            }}
                                            fullWidth size="small"
                                            inputProps={{
                                                inputMode: "numeric", pattern: "[0-9]*",
                                                maxLength: 9,
                                            }}
                                            helperText={helper(form.REF_NUM, 9)}
                                            error={fieldError(!form.REF_NUM)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            required
                                            label="Ref. (auto)"
                                            value={form.REF}
                                            fullWidth size="small"
                                            InputProps={{ readOnly: true }}
                                            helperText={`${len(form.REF)}/35`}
                                            error={fieldError(!form.REF)}
                                        />
                                    </Grid>
                                </>
                            )}
                        </Grid>

                        {/* 2) Objetivo / Descripción */}
                        <Grid container spacing={2}>
                            {keysSet.has('CODIGO_OBJETIVO') && (
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small" required error={fieldError(!form.OBJETIVO)}>
                                        <InputLabel>Objetivo</InputLabel>
                                        <Select
                                            label="Objetivo"
                                            value={form.OBJETIVO}
                                            onChange={(e) => setForm((s) => ({ ...s, OBJETIVO: e.target.value }))}
                                            disabled={!form.TIPO_CODIGO}
                                        >
                                            {(objetivos || []).map((o) => (
                                                <MenuItem key={o.CODIGO} value={o.CODIGO}>{o.DESCRIPCION}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {keysSet.has('DESCRIPCION') && (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        required
                                        label="Descripción del riesgo"
                                        value={form.DESCRIPCION}
                                        onChange={(e) => setForm((s) => ({ ...s, DESCRIPCION: e.target.value }))}
                                        fullWidth size="small" multiline minRows={2}
                                        inputProps={{ maxLength: 999 }}
                                        helperText={helper(form.DESCRIPCION, 999)}
                                        error={fieldError((form.DESCRIPCION || "").trim().length < 5)}
                                    />
                                </Grid>
                            )}
                        </Grid>

                        {/* 3) Variables base y mitigación */}
                        <Grid container spacing={2}>
                            {keysSet.has('CODIGO_PROBABILIDAD') && (
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small" required error={fieldError(!(Number(form.PROBABILIDAD) > 0))}>
                                        <InputLabel>Probabilidad</InputLabel>
                                        <Select
                                            label="Probabilidad"
                                            value={form.PROBABILIDAD}
                                            onChange={(e) => setForm((s) => ({ ...s, PROBABILIDAD: e.target.value }))}
                                        >
                                            {(cats.probabilidad || []).map((it) => (
                                                <MenuItem key={it.CODIGO} value={it.CODIGO}>{it.CODIGO} — {it.DESCRIPCION}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {keysSet.has('CODIGO_SEVERIDAD') && (
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small" required error={fieldError(!(Number(form.SEVERIDAD) > 0))}>
                                        <InputLabel>Severidad</InputLabel>
                                        <Select
                                            label="Severidad"
                                            value={form.SEVERIDAD}
                                            onChange={(e) => setForm((s) => ({ ...s, SEVERIDAD: e.target.value }))}
                                        >
                                            {(cats.severidad || []).map((it) => (
                                                <MenuItem key={it.CODIGO} value={it.CODIGO}>{it.CODIGO} — {it.DESCRIPCION}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {keysSet.has('CAPACIDAD_MITIGACION') && (
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small" required error={fieldError(!form.CAPACIDAD_MITIGACION)}>
                                        <InputLabel>Eficiencia del mitigador</InputLabel>
                                        <Select
                                            label="Eficiencia del mitigador"
                                            value={form.CAPACIDAD_MITIGACION}
                                            onChange={(e) => setForm((s) => ({ ...s, CAPACIDAD_MITIGACION: e.target.value }))}
                                        >
                                            {(cats.capacidadMitigacion || []).map((it) => (
                                                <MenuItem key={it.CODIGO} value={it.CODIGO}>
                                                    {it.DESCRIPCION} (nivel {it.CODIGO})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {keysSet.has('VARIABLE_MITIGACION') && (
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small" required error={fieldError(!form.VARIABLE_MITIGACION)}>
                                        <InputLabel>A mitigar</InputLabel>
                                        <Select
                                            label="A mitigar"
                                            value={form.VARIABLE_MITIGACION}
                                            onChange={(e) => setForm((s) => ({ ...s, VARIABLE_MITIGACION: e.target.value }))}
                                        >
                                            <MenuItem value="S">S — Severidad</MenuItem>
                                            <MenuItem value="P">P — Probabilidad</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}
                        </Grid>

                        {/* Tabla de cálculo */}
                        {(keysSet.has('CODIGO_PROBABILIDAD') || keysSet.has('CODIGO_SEVERIDAD') || keysSet.has('PROBABILIDAD_AJUSTADA')
                            || keysSet.has('SEVERIDAD_AJUSTADA') || keysSet.has('RIESGO_INHERENTE') || keysSet.has('RIESGO_RESIDUAL')) && (
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TableContainer sx={{ border: "1px solid #e0e0e0", borderRadius: 1 }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        {keysSet.has('CODIGO_PROBABILIDAD') && <TableCell>Probabilidad</TableCell>}
                                                        {keysSet.has('CODIGO_SEVERIDAD') && <TableCell>Severidad</TableCell>}
                                                        {keysSet.has('VARIABLE_MITIGACION') && <TableCell>A mitigar</TableCell>}
                                                        {keysSet.has('CAPACIDAD_MITIGACION') && <TableCell>Capacidad de mitigación</TableCell>}
                                                        {(keysSet.has('RIESGO_INHERENTE') || (keysSet.has('CODIGO_PROBABILIDAD') && keysSet.has('CODIGO_SEVERIDAD')))
                                                            && <TableCell>Riesgo inherente</TableCell>}
                                                        {keysSet.has('PROBABILIDAD_AJUSTADA') && <TableCell>Probabilidad ajustada</TableCell>}
                                                        {keysSet.has('SEVERIDAD_AJUSTADA') && <TableCell>Severidad ajustada</TableCell>}
                                                        {(keysSet.has('RIESGO_RESIDUAL') || (keysSet.has('PROBABILIDAD_AJUSTADA') && keysSet.has('SEVERIDAD_AJUSTADA')))
                                                            && <TableCell>Riesgo residual</TableCell>}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    <TableRow hover>
                                                        {keysSet.has('CODIGO_PROBABILIDAD') && <TableCell>{probNum || "-"}</TableCell>}
                                                        {keysSet.has('CODIGO_SEVERIDAD') && <TableCell>{sevNum || "-"}</TableCell>}
                                                        {keysSet.has('VARIABLE_MITIGACION') && <TableCell>{varMit || "-"}</TableCell>}
                                                        {keysSet.has('CAPACIDAD_MITIGACION') && <TableCell>{capEfectiva || "-"}</TableCell>}
                                                        {(keysSet.has('RIESGO_INHERENTE') || (keysSet.has('CODIGO_PROBABILIDAD') && keysSet.has('CODIGO_SEVERIDAD')))
                                                            && <TableCell sx={{ bgcolor: riskBg(inhNum) }}>{inhNum || "-"}</TableCell>}
                                                        {keysSet.has('PROBABILIDAD_AJUSTADA') && <TableCell>{probAdjNum || "-"}</TableCell>}
                                                        {keysSet.has('SEVERIDAD_AJUSTADA') && <TableCell>{sevAdjNum || "-"}</TableCell>}
                                                        {(keysSet.has('RIESGO_RESIDUAL') || (keysSet.has('PROBABILIDAD_AJUSTADA') && keysSet.has('SEVERIDAD_AJUSTADA')))
                                                            && <TableCell sx={{ bgcolor: riskBg(resNum) }}>{resNum || "-"}</TableCell>}
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Grid>
                                </Grid>
                            )}

                        {/* 4) Resto de campos */}
                        <Grid container spacing={2}>
                            {keysSet.has('CODIGO_TOLERANCIA') && (
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small" required error={fieldError(!form.TOLERANCIA)}>
                                        <InputLabel>Tolerancia</InputLabel>
                                        <Select
                                            label="Tolerancia"
                                            value={form.TOLERANCIA}
                                            onChange={(e) => setForm((s) => ({ ...s, TOLERANCIA: e.target.value }))}
                                        >
                                            {(cats.tolerancia || []).map((it) => (
                                                <MenuItem key={it.CODIGO} value={it.CODIGO}>{it.DESCRIPCION}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {keysSet.has('SEVERIDAD_NARRACION') && (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        required
                                        label="Severidad (narración)"
                                        value={form.SEVERIDAD_NARRACION}
                                        onChange={(e) => setForm((s) => ({ ...s, SEVERIDAD_NARRACION: e.target.value }))}
                                        fullWidth size="small" multiline minRows={2}
                                        inputProps={{ maxLength: 999 }}
                                        helperText={helper(form.SEVERIDAD_NARRACION, 999)}
                                        error={fieldError(!form.SEVERIDAD_NARRACION)}
                                    />
                                </Grid>
                            )}

                            {keysSet.has('EVENTO') && (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        required
                                        label="Evento"
                                        value={form.EVENTO}
                                        onChange={(e) => setForm((s) => ({ ...s, EVENTO: e.target.value }))}
                                        fullWidth size="small" multiline minRows={2}
                                        inputProps={{ maxLength: 999 }}
                                        helperText={helper(form.EVENTO, 999)}
                                        error={fieldError(!form.EVENTO)}
                                    />
                                </Grid>
                            )}

                            {keysSet.has('CONTROL') && (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        required
                                        label="Control interno para mitigar"
                                        value={form.CONTROL}
                                        onChange={(e) => setForm((s) => ({ ...s, CONTROL: e.target.value }))}
                                        fullWidth size="small" multiline minRows={2}
                                        inputProps={{ maxLength: 999 }}
                                        helperText={helper(form.CONTROL, 999)}
                                        error={fieldError(!form.CONTROL)}
                                    />
                                </Grid>
                            )}

                            {keysSet.has('MONITOREO') && (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        required
                                        label="Método de monitoreo"
                                        value={form.MONITOREO}
                                        onChange={(e) => setForm((s) => ({ ...s, MONITOREO: e.target.value }))}
                                        fullWidth size="small" multiline minRows={2}
                                        inputProps={{ maxLength: 999 }}
                                        helperText={helper(form.MONITOREO, 999)}
                                        error={fieldError(!form.MONITOREO)}
                                    />
                                </Grid>
                            )}

                            {keysSet.has('CODIGO_FRECUENCIA') && (
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small" required error={fieldError(!form.FRECUENCIA)}>
                                        <InputLabel>Frecuencia</InputLabel>
                                        <Select
                                            label="Frecuencia"
                                            value={form.FRECUENCIA}
                                            onChange={(e) => setForm((s) => ({ ...s, FRECUENCIA: e.target.value }))}
                                        >
                                            {(cats.frecuencia || []).map((f) => (
                                                <MenuItem key={f.CODIGO} value={f.CODIGO}>{f.DESCRIPCION}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {keysSet.has('RESPONSABLE') && (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        required
                                        label="Responsable"
                                        value={form.RESPONSABLE}
                                        onChange={(e) => setForm((s) => ({ ...s, RESPONSABLE: e.target.value }))}
                                        fullWidth size="small"
                                        inputProps={{ maxLength: 250 }}
                                        helperText={`${(form.RESPONSABLE || "").length}/250`}
                                        error={fieldError(!form.RESPONSABLE)}
                                    />
                                </Grid>
                            )}
                        </Grid>

                        {/* Extras (propiedadesExt) */}
                        {Array.isArray(propiedadesExt) && propiedadesExt.length > 0 && (
                            <>
                                <Divider />
                                <Grid container spacing={2}>
                                    {propiedadesExt.filter(Boolean).map((p) => {
                                        const key = p.key ?? String(p);
                                        const etiqueta = p.label ?? key;
                                        if (!keysSetExtra.has(key)) return null;
                                        const val = extraValues?.[key] ?? "";
                                        return (
                                            <Grid key={key} item xs={12} md={6}>
                                                <TextField
                                                    required
                                                    fullWidth
                                                    size="small"
                                                    label={etiqueta}
                                                    value={val}
                                                    onChange={(e) =>
                                                        setExtraValues((s) => ({ ...s, [key]: e.target.value }))
                                                    }
                                                    inputProps={{ maxLength: 300 }}
                                                    helperText={helper(val, 300)}
                                                    error={triedSave && val === ""}
                                                />
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </>
                        )}

                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Observaciones (opcional)"
                                    value={form.OBSERVACIONES}
                                    onChange={(e) => setForm((s) => ({ ...s, OBSERVACIONES: e.target.value }))}
                                    fullWidth size="small"
                                    inputProps={{ maxLength: 999 }}
                                    helperText={helper(form.OBSERVACIONES, 999)}
                                />
                            </Grid>
                        </Grid>
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleClose} disabled={saving}>Cancelar</Button>

                    {/* Nuevo botón: Riesgo período anterior */}
                    <Button
                        variant="outlined"
                        onClick={handleFetchRiesgoPeriodoAnterior}
                        disabled={saving || prevLoading}
                    >
                        {prevLoading ? "Consultando..." : "Riesgo período anterior"}
                    </Button>

                    <Button variant="contained" onClick={handleSaveClick} disabled={saving}>
                        {isEdit ? "Guardar cambios" : "Crear riesgo"}
                    </Button>
                </DialogActions>

                <Snackbar
                    open={prevMsg.open}
                    autoHideDuration={4000}
                    onClose={() => setPrevMsg(s => ({ ...s, open: false }))}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={() => setPrevMsg(s => ({ ...s, open: false }))}
                        severity={prevMsg.severity}
                        variant="filled"
                        sx={{ width: '100%' }}
                    >
                        {prevMsg.text}
                    </Alert>
                </Snackbar>
            </Dialog>

            {/* Modal de visualización del riesgo del período anterior */}
            <ModalRiesgoPeriodoAnterior
                open={prevModalOpen}
                onClose={() => setPrevModalOpen(false)}
                riesgo={prevRiesgo || {}}
                cats={cats}
                periodoAnterior={periodoAnterior}
                siglas={siglas}
            />
        </>
    );
}

export default ModalIngresoRiesgosPropiedades;
