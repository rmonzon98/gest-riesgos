/**
 * @fileoverview
 * Vista general de seguimiento consolidado por control y periodo.
 *
 * - Selección de período de trabajo.
 * - Consulta de relaciones base para generar el documento de seguimiento.
 * - Listado de meses que ya tienen seguimiento guardado.
 * - Acceso al asistente de elaboración/edición del documento.
 * - Acceso al gestor de documentos asociados a cada mes.
 * 
 * @module Riesgos/Comportamiento/Seguimiento/SeguimientoGeneral.jsx
 * @version 1.1
 * @author Equipo de Desarrollo
 */

import { useEffect, useMemo, useState } from "react";
import apiClient from "api/apiClient";
import {
    Box, Card, CardHeader, CardContent, Typography, Select, MenuItem, Stack,
    LinearProgress, Alert, Button, Divider, Grid, Paper, IconButton, Tooltip, Snackbar
} from "@mui/material";
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SeguimientoModal from "./SeguimientoModal";
import SeguimientoDocsModal from "./SeguimientoDocsModal";

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];


/**
 * SeguimientoGeneral
 *
 * Vista principal del submódulo de seguimiento de control interno.
 *
 * - Carga la información inicial de la unidad (entidad y períodos disponibles).
 * - Permite seleccionar un período de trabajo.
 * - Consulta la lista base de riesgos relacionada al período para alimentar el wizard de seguimiento.
 * - Consulta y muestra los meses que ya tienen seguimiento guardado en BD.
 * - Abre:
 *   - El asistente de seguimiento (SeguimientoModal) para crear/editar documentos.
 *   - El gestor de documentos asociados a un mes (SeguimientoDocsModal).
 *
 * @component
 * @returns {JSX.Element}
 */
export default function SeguimientoGeneral() {
    const [entidadNombre, setEntidadNombre] = useState("");
    const [codigoEntidad, setCodigoEntidad] = useState(null);
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [filas, setFilas] = useState([]);
    const [openWizard, setOpenWizard] = useState(false);

    const [mesesGuardados, setMesesGuardados] = useState([]);
    const [loadingMeses, setLoadingMeses] = useState(false);
    const [errorMeses, setErrorMeses] = useState("");

    const [prefill, setPrefill] = useState(null);

    const [openDocs, setOpenDocs] = useState(false);
    const [docsMes, setDocsMes] = useState(null);

    // Snackbar
    const [snack, setSnack] = useState({
        open: false,
        msg: "",
        sev: "info",
    });

    const showSnack = (msg, sev = "info") => {
        setSnack({ open: true, msg, sev });
    };

    const handleSnackClose = (_event, reason) => {
        if (reason === "clickaway") return;
        setSnack(prev => ({ ...prev, open: false }));
    };

    /**
     * Genera encabezados HTTP con autenticación para las consultas generales.
     */
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                /**
                 * Obtener información inicial para la vista de riesgos/seguimiento.
                 *
                 * - userInfo: datos de la entidad/logueado (NOMBRE, SIGLAS, CODIGO_ENTIDAD, etc.).
                 * - periodos: períodos de trabajo disponibles para la entidad.
                 *
                 * @route GET /api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos
                 * @returns {200|500} `{ userInfo, periodos }`.
                 */
                const { data } = await apiClient.get(
                    "/api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos",
                    {}
                );
                const { userInfo, periodos } = data || {};
                if (userInfo) {
                    const nombre = `${userInfo.NOMBRE ?? ""}${userInfo.SIGLAS ? ` (${userInfo.SIGLAS})` : ""}`.trim();
                    setEntidadNombre(nombre || "Unidad no identificada");
                    setCodigoEntidad(userInfo.CODIGO_ENTIDAD ?? userInfo.codigo_entidad ?? userInfo.ENTIDAD ?? null);
                }
                setPeriodos(Array.isArray(periodos) ? periodos : []);
            } catch (err) {
                console.error(err);
                setError("No se pudo cargar la información inicial.");
                showSnack("No se pudo cargar la información inicial.", "error");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const puedeConsultar = useMemo(
        () => Boolean(codigoEntidad && periodo),
        [codigoEntidad, periodo]
    );

    // Cargar lista base por período (para modal de seguimiento)
    useEffect(() => {
        if (!puedeConsultar) {
            setFilas([]);
            return;
        }
        (async () => {
            try {
                setLoading(true);
                setError("");
                /**
                 * Obtener relaciones base para construir el documento de seguimiento.
                 *
                 * - data.datos: registros de riesgos asociados al período y entidad,
                 *   ya enriquecidos para poder alimentar directamente el SeguimientoModal.
                 *
                 * @route GET /api/seguimientos-actualizados/obtener-relaciones-general
                 * @query `codigo_entidad`, `codigo_periodo`
                 * @returns {200|500} `{ datos:[...riesgos...] }`.
                 */
                const { data } = await apiClient.get(
                    "/api/seguimientos-actualizados/obtener-relaciones-general",
                    {
                        params: {
                            codigo_entidad: Number(codigoEntidad),
                            codigo_periodo: Number(periodo),
                        },
                            }
                );
                const datos = Array.isArray(data?.datos) ? data.datos.slice() : [];
                datos.sort((a, b) => {
                    const pa = Number(a?.Periodo ?? a?.CODIGO_PERIODO ?? 0);
                    const pb = Number(b?.Periodo ?? b?.CODIGO_PERIODO ?? 0);
                    if (pa !== pb) return pa - pb;
                    const ra = (a?.["Ref."] ?? "").toString();
                    const rb = (b?.["Ref."] ?? "").toString();
                    return ra.localeCompare(rb, "es", { numeric: true, sensitivity: "base" });
                });
                setFilas(datos);
            } catch (err) {
                console.error(err);
                setError("No fue posible obtener los riesgos del período.");
                setFilas([]);
                showSnack("No fue posible obtener los riesgos del período.", "error");
            } finally {
                setLoading(false);
            }
        })();
    }, [puedeConsultar, periodo, codigoEntidad]);

    // Cargar meses guardados
    useEffect(() => {
        if (!puedeConsultar) {
            setMesesGuardados([]);
            return;
        }
        (async () => {
            try {
                setLoadingMeses(true);
                setErrorMeses("");

                /**
                 * Obtener meses con seguimiento guardado para el período seleccionado.
                 *
                 * - data.meses: arreglo de números de mes (1–12) que ya tienen seguimiento.
                 *
                 * @route GET /api/seguimientos-actualizados
                 * @query `codigo_periodo`
                 * @returns {200|500} `{ meses:[1,3,5,...] }`.
                 */
                const { data } = await apiClient.get("/api/seguimientos-actualizados", {
                    params: { codigo_periodo: Number(periodo) },
                    });
                const meses = Array.isArray(data?.meses) ? data.meses : [];
                const limpios = meses
                    .map((m) => Number(m))
                    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
                    .sort((a, b) => a - b);
                setMesesGuardados(limpios);
            } catch (err) {
                console.error(err);
                setErrorMeses("No fue posible obtener los meses con seguimiento guardado.");
                setMesesGuardados([]);
                showSnack("No fue posible obtener los meses con seguimiento guardado.", "error");
            } finally {
                setLoadingMeses(false);
            }
        })();
    }, [puedeConsultar, periodo]);

    const abrirMes = async (mes) => {
        try {
            /**
             * abrirMes
             * 
             * Carga desde backend el seguimiento ya guardado para un mes específico
             *   y abrir el wizard en modo edición (prefill).
             *
             * @param {number} mes Número de mes (1–12) a abrir.
             * @route GET /api/seguimientos-actualizados/periodo-mes
             * @query `codigo_periodo`, `mes`
             * @returns {200|404|500} `{ ok, seccion1, seccion2, seccion3, seccion4, subtitulo, organo, viceministerio }`.
             */
            const { data } = await apiClient.get("/api/seguimientos-actualizados/periodo-mes", {
                params: { codigo_periodo: Number(periodo), mes: Number(mes) },
            });
            if (data?.ok) {
                setPrefill({
                    mes: Number(mes),
                    seccion1: data.seccion1 ?? [],
                    seccion2: data.seccion2 ?? [],
                    seccion3: data.seccion3 ?? [],
                    seccion4: data.seccion4 ?? {},
                    subtitulo: data.subtitulo,
                    organo: data.organo,
                    viceministerio: data.viceministerio
                });
                setOpenWizard(true);
                showSnack(`Seguimiento del mes ${MESES[mes - 1]} cargado correctamente.`, "success");
            } else {
                showSnack("No se encontró información del mes seleccionado.", "warning");
            }
        } catch (e) {
            console.error(e);
            showSnack("Error al cargar el seguimiento del mes.", "error");
        }
    };

    const abrirNuevo = () => {
        setPrefill(null);
        setOpenWizard(true);
    };

    // Abrir gestor de documentos 
    const abrirDocs = (mes) => {
        setDocsMes(mes);
        setOpenDocs(true);
    };

    return (
        <>
            <Box p={3}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                    Seguimiento
                </Typography>

                {/* Período */}
                <Card sx={{ borderRadius: 2, mb: 3 }}>
                    <CardHeader
                        title={entidadNombre || "Unidad no identificada"}
                        subheader="Seleccione el período de trabajo"
                        titleTypographyProps={{ sx: { fontWeight: 700 } }}
                    />
                    <CardContent>
                        <Stack spacing={2}>
                            <Select
                                fullWidth
                                size="small"
                                value={periodo}
                                displayEmpty
                                onChange={(e) => setPeriodo(e.target.value)}
                                disabled={loading || !codigoEntidad}
                            >
                                <MenuItem value="">
                                    <em>Seleccione un período</em>
                                </MenuItem>
                                {periodos.map((p) => (
                                    <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                        {p.FECINI} - {p.FECFIN} del {p.CODIGO_PERIODO}
                                    </MenuItem>
                                ))}
                            </Select>

                            {loading && <LinearProgress />}
                            {error && <Alert severity="error">{error}</Alert>}
                        </Stack>
                    </CardContent>
                </Card>

                {/* Meses con seguimiento guardado */}
                <Card sx={{ borderRadius: 2, mb: 3 }}>
                    <CardHeader
                        title="Meses con seguimiento guardado"
                        titleTypographyProps={{ sx: { fontWeight: 700 } }}
                        subheader={periodo ? `Período ${periodo}` : "Seleccione un período"}
                        action={
                            <Tooltip title="Actualizar lista de meses">
                                <span>
                                    <IconButton
                                        onClick={() => {
                                            if (!periodo) return;
                                            (async () => {
                                                try {
                                                    setLoadingMeses(true);
                                                    const { data } = await apiClient.get("/api/seguimientos-actualizados", {
                                                        params: { codigo_periodo: Number(periodo) },
                                                                                            });
                                                    const meses = Array.isArray(data?.meses) ? data.meses : [];
                                                    const limpios = meses
                                                        .map((m) => Number(m))
                                                        .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
                                                        .sort((a, b) => a - b);
                                                    setMesesGuardados(limpios);
                                                    showSnack("Meses actualizados correctamente.", "success");
                                                } catch (e) {
                                                    console.error(e);
                                                    setErrorMeses("No fue posible actualizar los meses.");
                                                    showSnack("No fue posible actualizar los meses.", "error");
                                                } finally {
                                                    setLoadingMeses(false);
                                                }
                                            })();
                                        }}
                                        disabled={!periodo || loadingMeses}
                                    >
                                        <RefreshRounded />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        }
                    />
                    <CardContent>
                        {!periodo && (
                            <Typography color="text.secondary">
                                Seleccione un período para ver los meses guardados.
                            </Typography>
                        )}

                        {loadingMeses && <LinearProgress sx={{ mb: 2 }} />}

                        {!loadingMeses && periodo && mesesGuardados.length === 0 && !errorMeses && (
                            <Alert severity="info">Aún no hay meses con seguimiento guardado.</Alert>
                        )}

                        {errorMeses && <Alert severity="error">{errorMeses}</Alert>}

                        {mesesGuardados.length > 0 && (
                            <Grid container spacing={2}>
                                {mesesGuardados.map((m) => (
                                    <Grid item xs={12} sm={6} md={4} lg={3} key={m}>
                                        <Paper
                                            onClick={() => abrirMes(m)}
                                            elevation={2}
                                            sx={{
                                                p: 2,
                                                cursor: "pointer",
                                                borderRadius: 2,
                                                border: "1px solid",
                                                borderColor: "divider",
                                                "&:hover": { boxShadow: 4, borderColor: "primary.light" },
                                                position: "relative",
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                                <Box>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                        {MESES[m - 1]}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Mes {m}
                                                    </Typography>
                                                </Box>

                                                {/* Botón Documentos: evitar abrir el seguimiento */}
                                                <Tooltip title="Gestionar documentos del mes">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); abrirDocs(m); }}
                                                        >
                                                            <AttachFileRounded fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        )}

                        <Divider sx={{ my: 2 }} />
                        <Button variant="contained" onClick={abrirNuevo} disabled={!periodo}>
                            Iniciar documento de seguimiento
                        </Button>
                    </CardContent>
                </Card>

                {/* Modal de Seguimiento */}
                <SeguimientoModal
                    open={openWizard}
                    onClose={() => setOpenWizard(false)}
                    periodoSeleccionado={Number(periodo) || null}
                    entidadNombre={entidadNombre}
                    filasBase={filas}
                    prefill={prefill}
                />

                {/* Modal de Documentos (componente nuevo) */}
                <SeguimientoDocsModal
                    open={openDocs}
                    onClose={() => setOpenDocs(false)}
                    entidadNombre={entidadNombre}
                    periodo={Number(periodo) || null}
                    mes={docsMes}
                />
            </Box>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={handleSnackClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={handleSnackClose}
                    severity={snack.sev}
                    sx={{ width: "100%" }}
                    variant="filled"
                >
                    {snack.msg}
                </Alert>
            </Snackbar>
        </>
    );
}
