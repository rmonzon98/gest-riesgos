/**
 * @fileoverview 
 * Mantenimiento de versiones de propiedades adicionales de riesgos.
 *
 * Permite:
 * - Listar versiones de propiedades extra por período.
 * - Crear nuevas versiones (desde cero o derivadas de otra).
 * - Copiar la versión por defecto del año anterior.
 * - Establecer una versión como defecto del período.
 *
 * @module Riesgos/Evaluacion riesgos F/Mantenimiento/MantenimientoRiesgosPropiedades.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Card, CardHeader, CardContent, Stack, Button,
    FormControl, InputLabel, Select, MenuItem, Alert, Chip,
    TextField, Paper, IconButton, Divider, Typography, Collapse
} from "@mui/material";
import {
    AddRounded, ContentCopyRounded, StarRounded, StarBorderRounded,
    DeleteRounded, SaveRounded, CloseRounded
} from "@mui/icons-material";
import apiClient from "api/apiClient";

/* ===================== Config / Helpers ===================== */
const API_BASE = "/api/riesgos-variables-actualizados";
const norm = (s) => (s ?? "").toString().trim().toLowerCase();

const maintenanceCardSx = {
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)"
};

/**
 * PropiedadesReadonly
 *Muestra en modo solo lectura la lista de propiedades de una versión.
 *
 * - Si no hay propiedades, muestra un mensaje informativo.
 * - Si existen, renderiza cada propiedad en una tarjeta sencilla.
 *
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.propsList
 * @returns {JSX.Element} 
 */
function PropiedadesReadonly({ propsList = [] }) {
    if (!propsList.length) {
        return (
            <Alert severity="info" variant="outlined">
                No hay propiedades para esta versión.
            </Alert>
        );
    }
    return (
        <Stack spacing={1.25}>
            {propsList.map((p, i) => (
                <Paper
                    key={p.CODIGO_PROPIEDAD ?? `${p.PROPIEDAD ?? ""}-${i}`}
                    elevation={0}
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 2, py: 1.25 }}
                >
                    <Typography variant="body2">{p.PROPIEDAD}</Typography>
                </Paper>
            ))}
        </Stack>
    );
}

/**
 * CrearPropiedadesEditor
 *
 * Es el editor de nombres de propiedades para una versión nueva o derivada.
 *
 * - Recibe una lista inicial de nombres de propiedades.
 * - Permite agregar, editar y eliminar nombres, validando duplicados y longitud.
 * - Al guardar, devuelve al padre únicamente el arreglo de nombres limpios.
 *
 * @component
 * @param {Object} props
 * @param {string[]} [props.initial=[]] Lista inicial de nombres de propiedades (solo texto).
 * @param {string} [props.title] Título a mostrar en el Card del editor.
 * @param {string} [props.subheader] Texto descriptivo debajo del título.
 * @param {string} [props.confirmText] Texto del botón de confirmación/guardado.
 * @param {Function} props.onCancel Callback al cancelar la edición.
 * @param {Function} props.onSave 
 * @returns {JSX.Element} 
 */
function CrearPropiedadesEditor({
    initial = [],
    title = "Nueva versión de propiedades",
    subheader = "Ingresa los nombres de las propiedades (solo texto).",
    confirmText = "Guardar",
    onCancel,
    onSave
}) {
    const [items, setItems] = useState(() => initial.map(n => ({ nombre: n })));
    useEffect(() => { setItems(initial.map(n => ({ nombre: n }))); }, [initial]);

    const [nuevo, setNuevo] = useState("");
    const [errorNuevo, setErrorNuevo] = useState("");
    const [errorGeneral, setErrorGeneral] = useState("");

    const hasDuplicate = (name) => items.some((it) => norm(it.nombre) === norm(name));

    const handleAdd = () => {
        const name = (nuevo || "").trim();
        if (!name) { setErrorNuevo("Ingresa un nombre."); return; }
        if (hasDuplicate(name)) { setErrorNuevo("Ya existe una propiedad con ese nombre."); return; }
        setItems((prev) => [...prev, { nombre: name.slice(0, 60) }]);
        setNuevo("");
        setErrorNuevo("");
    };

    const handleDelete = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

    const handleChange = (idx, value) => {
        const v = (value ?? "").slice(0, 60);
        setItems((prev) => { const copy = [...prev]; copy[idx] = { nombre: v }; return copy; });
    };

    const handleSave = () => {
        setErrorGeneral("");
        const nombres = items.map((it) => (it.nombre || "").trim()).filter(Boolean);
        if (!nombres.length) { setErrorGeneral("Agrega al menos una propiedad."); return; }
        const seen = new Set();
        for (const n of nombres.map(norm)) {
            if (seen.has(n)) { setErrorGeneral("Hay nombres duplicados. Corrige antes de guardar."); return; }
            seen.add(n);
        }
        onSave?.(nombres);
    };

    return (
        <Card sx={maintenanceCardSx}>
            <CardHeader title={title} subheader={subheader} />
            <CardContent>
                <Stack spacing={2} sx={{ mb: 2 }}>
                    <Alert severity="info" variant="outlined">Puedes agregar, editar o eliminar propiedades.</Alert>
                    {errorGeneral && <Alert severity="error">{errorGeneral}</Alert>}
                </Stack>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>Agregar nueva</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField
                            label="Nombre de la nueva propiedad"
                            value={nuevo}
                            onChange={(e) => { setNuevo(e.target.value); if (errorNuevo) setErrorNuevo(""); }}
                            error={Boolean(errorNuevo)}
                            helperText={errorNuevo || "Ej.: 'Fuente de riesgo', 'Observaciones', etc."}
                            inputProps={{ maxLength: 60 }}
                            fullWidth
                        />
                        <Button variant="contained" onClick={handleAdd} startIcon={<AddRounded />}>Agregar</Button>
                    </Stack>
                </Box>

                <Divider sx={{ my: 2 }} />

                {items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Aún no has agregado propiedades.</Typography>
                ) : (
                    <Stack spacing={1.25}>
                        {items.map((it, idx) => (
                            <Paper key={`${it.nombre}-${idx}`} elevation={0}
                                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1 }}>
                                <TextField label="Nombre" size="small" value={it.nombre} onChange={(e) => handleChange(idx, e.target.value)} fullWidth inputProps={{ maxLength: 60 }} />
                                <IconButton aria-label="Eliminar" onClick={() => handleDelete(idx)} size="small" color="error"><DeleteRounded fontSize="small" /></IconButton>
                            </Paper>
                        ))}
                    </Stack>
                )}

                <Stack direction="row" spacing={1.5} sx={{ mt: 3 }} justifyContent="flex-end">
                    <Button variant="text" onClick={onCancel} startIcon={<CloseRounded />}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSave} startIcon={<SaveRounded />}>{confirmText}</Button>
                </Stack>
            </CardContent>
        </Card>
    );
}

/**
 * MantenimientoRiesgosPropiedades
 *
 * Gestiona las versiones de propiedades adicionales de riesgos para un período.
 *
 * - Consulta las versiones existentes para el período seleccionado.
 * - Permite ver las propiedades de una versión específica.
 * - Crea nuevas versiones desde cero o derivadas de una versión existente.
 * - Copia la versión por defecto del año anterior.
 * - Marca una versión como "defecto" para el período.
 *
 * @component
 * @param {Object} props
 * @param {string|number} [props.periodo=""]
 * @returns {JSX.Element} 
 */
export default function MantenimientoRiesgosPropiedades({ periodo = "" }) {
    const [versionSel, setVersionSel] = useState("");
    const [versions, setVersions] = useState([]);
    const [loadingVersions, setLoadingVersions] = useState(false);

    const [propsList, setPropsList] = useState([]);
    const [loadingProps, setLoadingProps] = useState(false);

    const [modeCrear, setModeCrear] = useState(false);
    const [modeDerivar, setModeDerivar] = useState(false);

    const [info, setInfo] = useState("");
    const [error, setError] = useState("");
    const [settingDefault, setSettingDefault] = useState(false);
    const [copyingPrev, setCopyingPrev] = useState(false); // ← NUEVO

    const INFO_TIMEOUT = 4000;
    const ERROR_TIMEOUT = 6000;

    useEffect(() => { if (!info) return; const id = setTimeout(() => setInfo(""), INFO_TIMEOUT); return () => clearTimeout(id); }, [info]);
    useEffect(() => { if (!error) return; const id = setTimeout(() => setError(""), ERROR_TIMEOUT); return () => clearTimeout(id); }, [error]);
    useEffect(() => { setInfo(""); setError(""); }, [periodo, versionSel]);

    const fetchVersiones = useCallback(async () => {
        if (!periodo) { setVersions([]); setVersionSel(""); setPropsList([]); return; }
        try {
            setLoadingVersions(true); setError("");
            const { data } = await apiClient.get(`${API_BASE}/versiones-riesgos`, {
                params: { periodo }
            });
            const rows = Array.isArray(data) ? data : (data?.data ?? []);
            setVersions(rows);

            const codes = new Set(rows.map(r => String(r.CODIGO_VERSION)));
            if (versionSel && !codes.has(String(versionSel))) {
                setVersionSel("");
                setPropsList([]);
            }
        } catch (e) {
            console.error(e);
            setError("No se pudieron cargar las versiones.");
            setVersions([]); setVersionSel(""); setPropsList([]);
        } finally {
            setLoadingVersions(false);
        }
    }, [periodo, versionSel]);

    useEffect(() => { fetchVersiones(); }, [fetchVersiones]);

    const fetchPropiedades = useCallback(async () => {
        if (!periodo || !versionSel) { setPropsList([]); return; }
        try {
            setLoadingProps(true);
            const { data } = await apiClient.get(`${API_BASE}/propiedades-riesgos`, {
                params: { periodo, codigo_version: versionSel }
            });
            const rows = Array.isArray(data) ? data : (data?.data ?? []);
            const normalized = (rows || []).map(r => ({
                CODIGO_PROPIEDAD: r.CODIGO_PROPIEDAD ?? null,
                PROPIEDAD: r.PROPIEDAD ?? ""
            }));
            setPropsList(normalized);
        } catch (e) {
            console.error(e);
            setError("No se pudieron cargar las propiedades de la versión seleccionada.");
            setPropsList([]);
        } finally {
            setLoadingProps(false);
        }
    }, [periodo, versionSel]);

    useEffect(() => { fetchPropiedades(); }, [fetchPropiedades]);

    const hayVersiones = versions.length > 0;
    const selectedVersion = versions.find(v => String(v.CODIGO_VERSION) === String(versionSel));
    const selEsDefecto = selectedVersion?.ESTADO === "S";

    const handleGuardarNueva = async (propiedades) => {
        try {
            setError(""); setInfo("");
            await apiClient.post(`${API_BASE}/propiedades-riesgos`, { periodo, propiedades });
            setModeCrear(false);
            await fetchVersiones();
            setInfo("Versión creada correctamente.");
        } catch (e) {
            console.error(e);
            setError("No se pudo crear la nueva versión.");
        }
    };

    const handleGuardarDerivada = async (propiedades) => {
        try {
            setError(""); setInfo("");
            await apiClient.post(`${API_BASE}/propiedades-riesgos`, { periodo, propiedades });
            setModeDerivar(false);
            await fetchVersiones();
            setInfo("Nueva versión derivada creada correctamente.");
        } catch (e) {
            console.error(e);
            setError("No se pudo crear la versión derivada.");
        }
    };

    const handleEstablecerDefecto = async () => {
        if (!versionSel) return;
        try {
            setError(""); setInfo("");
            setSettingDefault(true);
            await apiClient.put(`${API_BASE}/defecto-riesgos`, { periodo, codigo_version: versionSel });
            await fetchVersiones();
            setInfo("Versión establecida como defecto.");
        } catch (e) {
            console.error(e);
            setError("No se pudo establecer la versión como defecto.");
        } finally {
            setSettingDefault(false);
        }
    };

    // ===== Copiar defecto del año pasado =====
    const handleCopiarDefectoAnioPasado = async () => {
        if (!periodo) return;
        try {
            setError(""); setInfo("");
            setCopyingPrev(true);
            await apiClient.post(
                `${API_BASE}/defecto-pasado-riesgo`,
                { periodo }
            );
            await fetchVersiones();
            setInfo("Se copió la versión por defecto del año pasado.");
        } catch (e) {
            console.error(e);
            setError("No se pudo copiar la versión por defecto del año pasado.");
        } finally {
            setCopyingPrev(false);
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Card sx={{ ...maintenanceCardSx, mb: 2 }}>
                <CardHeader
                    title="Versiones de propiedades extra de riesgos"
                    subheader={periodo ? `Período: ${periodo}` : undefined}
                    action={
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap" sx={{ maxWidth: { md: 820 } }}>
                            <Button
                                variant="contained"
                                startIcon={<AddRounded />}
                                onClick={() => { setModeCrear(true); setInfo(""); setError(""); }}
                                disabled={!periodo || loadingVersions}
                            >
                                Crear nueva versión
                            </Button>

                            <Button
                                variant="outlined"
                                startIcon={<ContentCopyRounded />}
                                onClick={() => { setModeDerivar(true); setInfo(""); setError(""); }}
                                disabled={!hayVersiones || !versionSel || loadingVersions || loadingProps}
                            >
                                Tomar como base
                            </Button>

                            <Button
                                variant="outlined"
                                startIcon={<ContentCopyRounded />}
                                onClick={handleCopiarDefectoAnioPasado}
                                disabled={!periodo || loadingVersions || copyingPrev}
                            >
                                {copyingPrev ? "Copiando…" : "Copiar defecto año pasado"}
                            </Button>

                            <Button
                                variant={selEsDefecto ? "outlined" : "contained"}
                                color={selEsDefecto ? "inherit" : "primary"}
                                startIcon={selEsDefecto ? <StarRounded /> : <StarBorderRounded />}
                                onClick={handleEstablecerDefecto}
                                disabled={!hayVersiones || !versionSel || loadingVersions || settingDefault}
                            >
                                {selEsDefecto ? "Es defecto" : (settingDefault ? "Estableciendo…" : "Establecer por defecto")}
                            </Button>
                        </Stack>
                    }
                />
                <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
                        <Chip label={versionSel ? `Version ${versionSel}` : "Seleccione una version"} color={versionSel ? "primary" : "default"} variant={versionSel ? "filled" : "outlined"} />
                        <Chip label={selEsDefecto ? "Version por defecto" : "No marcada como defecto"} variant="outlined" />
                        <Chip label={`${propsList.length} propiedad(es)`} variant="outlined" />
                    </Stack>

                    {/* Alerts con auto-dismiss */}
                    <Collapse in={Boolean(error)}>
                        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                    </Collapse>
                    <Collapse in={Boolean(info)}>
                        <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>
                    </Collapse>

                    {!hayVersiones ? (
                        <Alert severity="info" variant="outlined">
                            {loadingVersions ? "Cargando versiones…" : "No hay versiones para este período aún."}
                        </Alert>
                    ) : (
                        <>
                            {/* Selector de versión (no auto-selecciona) */}
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <FormControl size="small" sx={{ minWidth: 260 }}>
                                    <InputLabel>Versión</InputLabel>
                                    <Select
                                        label="Versión"
                                        value={versionSel || ""}
                                        onChange={(e) => setVersionSel(e.target.value)}
                                        disabled={loadingVersions}
                                    >
                                        {versions.map((v) => (
                                            <MenuItem key={v.CODIGO_VERSION} value={v.CODIGO_VERSION}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <span>{v.NOMBRE_VERSION ?? `Versión ${v.CODIGO_VERSION}`}</span>
                                                    {v.ESTADO === "S" ? <Chip size="small" label="Defecto" color="primary" /> : null}
                                                </Stack>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {versionSel && (
                                    <Typography variant="body2" color="text.secondary">
                                        {loadingProps ? "Cargando propiedades…" : `${propsList.length} propiedad(es)`}
                                    </Typography>
                                )}
                            </Stack>

                            {/* Lista de propiedades de la versión seleccionada */}
                            {versionSel && (
                                loadingProps ? (
                                    <Typography variant="body2" color="text.secondary">Cargando…</Typography>
                                ) : (
                                    <PropiedadesReadonly propsList={propsList} />
                                )
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Crear desde cero */}
            {modeCrear && (
                <Box sx={{ mt: 2 }}>
                    <CrearPropiedadesEditor
                        key="crear"
                        initial={[]}
                        title="Nueva versión de propiedades"
                        subheader="Ingresa los nombres de las propiedades (solo texto)."
                        confirmText="Guardar"
                        onCancel={() => setModeCrear(false)}
                        onSave={handleGuardarNueva}
                    />
                </Box>
            )}

            {/* Tomar como base (pre-cargado) */}
            {modeDerivar && (
                <Box sx={{ mt: 2 }}>
                    <CrearPropiedadesEditor
                        key={`derivar-${versionSel}-${propsList.length}`}
                        initial={(propsList || []).map(p => p.PROPIEDAD ?? "")}
                        title="Tomar como base"
                        subheader="Parte de las propiedades de la versión seleccionada. Puedes agregar, editar o eliminar antes de guardar."
                        confirmText="Crear versión derivada"
                        onCancel={() => setModeDerivar(false)}
                        onSave={handleGuardarDerivada}
                    />
                </Box>
            )}
        </Box>
    );
}
