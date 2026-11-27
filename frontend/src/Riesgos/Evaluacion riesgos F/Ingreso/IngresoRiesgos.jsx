/**
 * @fileoverview 
 * Pantalla de ingreso y mantenimiento de riesgos por período, con generación de reportes.
 *
 * Permite:
 * - Cargar catálogos iniciales (áreas, tipos de objetivo, probabilidades, severidades, etc.).
 * - Listar riesgos de la unidad conectada para un período y tipo de matriz (ME/MC/MCE).
 * - Crear, editar, eliminar y restablecer riesgos.
 * - Adjuntar documentos relacionados al período/tipo.
 * - Generar reportes PDF (matriz de evaluación, continuidad/monitoreo o mapa de calor)
 *   confirmando previamente los datos del responsable que firma.
 *
 * @module Riesgos/Evaluacion riesgos F/Ingreso/IngresoRiesgos.jsx
 * @version 1.1
 * @author Equipo
 */

import { useEffect, useState, useCallback } from "react";
import apiClient from "api/apiClient";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cargarObjetivosRiesgo, mapCatsInicial, safeArr } from "../Componentes/catalogosRiesgo";
import {
    Box, Card, CardHeader, CardContent, Typography, Stack, Select, MenuItem, LinearProgress, Alert, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, TextField, Snackbar
} from "@mui/material";
import TablaRiesgosBasica from "./TablaRiesgosBasica";
import DialogoEliminacion from "Riesgos/Administracion/DialogoEliminacion";
import RecorridoGuiado from "funciones/RecorridoGuiado";
import recorridoIngreso from "Riesgos/Recorridos/riesgos-ingreso";
import CargaArchivos from "Riesgos/Carga Documentos/CargaArchivos";
import ModalIngresoRiesgosPropiedades from "../Componentes/ModalIngresoRiesgosPropiedades";
import { MatrizEvaluacion } from "./../../Reportes F/Riesgos/MatrizEvaluacion";
import { GenerarMapaCalor } from "./../../Reportes F/Riesgos/GenerarMapaCalor";

/**
 * IngresoRiesgos
 *
 * Es la vista principal para que la unidad ingrese y administre sus riesgos
 * (Matriz de Evaluación, Mapa de Calor o Matriz de Continuidad/Monitoreo),
 * así como para generar los reportes PDF correspondientes.
 *
 * @component
 * @param {'ME'|'MC'|'MCE'} props.tipo Tipo de vista/matriz a operar.
 * @param {string} props.titulo Título visible de la pantalla.
 * @returns {JSX.Element}
 */
function IngresoRiesgos({ tipo, titulo }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Datos básicos
    const [entidad, setEntidad] = useState("");
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState(() => Number(searchParams.get("periodo")) || "");
    const [siglas, setSiglas] = useState("");
    const [propiedades, setPropiedades] = useState([]);

    // Lista y propiedades extra
    const [riesgos, setRiesgos] = useState([]);
    const [permisosEliminacion, setPermisosEliminacion] = useState({});
    const [solicitud, setSolicitud] = useState(null);
    const [propiedadesExtra, setPropiedadesExtra] = useState([]);
    const [loadingLista, setLoadingLista] = useState(false);
    const [errorLista, setErrorLista] = useState("");

    // Detalle para editar
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [errorDetalle, setErrorDetalle] = useState("");

    // Catálogos
    const [cats, setCats] = useState({
        areas: [], tiposObjetivo: [], probabilidad: [], severidad: [],
        capacidadMitigacion: [], tolerancia: [], frecuencia: [], objetivos: [],
        viceministerios: [], organos: []
    });

    const [loadingCats, setLoadingCats] = useState(false);
    const [catsError, setCatsError] = useState("");

    // Modal crear/editar
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportPayload, setReportPayload] = useState(null);
    const [reportCategory, setReportCategory] = useState(null);
    const [reportSoloNuevos, setReportSoloNuevos] = useState(false);
    const [respNombre, setRespNombre] = useState("");
    const [respPuesto, setRespPuesto] = useState("");
    const [loadingReportData, setLoadingReportData] = useState(false);
    const [reportError, setReportError] = useState("");
    const [generatingReport, setGeneratingReport] = useState(false);

    // Snackbar
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
    const openSnack = (message, severity = "info") =>
        setSnack({ open: true, message, severity });
    const closeSnack = () =>
        setSnack((prev) => ({ ...prev, open: false }));

    const obtenerCatalogos = async () => {
        try {
            const [initRes, objetivos] = await Promise.all([
                apiClient.get("/api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos"),
                cargarObjetivosRiesgo(),
            ]);

            const init = initRes.data || {};

            if (init?.userInfo) {
                const { NOMBRE, SIGLAS } = init.userInfo;
                setEntidad(`${NOMBRE} (${SIGLAS})`);
                setSiglas(SIGLAS);
            }
            setPeriodos(safeArr(init?.periodos));

            const normal = mapCatsInicial(init);
            setCats({ ...normal, objetivos });
        } catch (err) {
            console.error("Error al cargar catálogos iniciales", err);
            setCatsError("No se pudieron cargar los catálogos iniciales.");
            setPeriodos([]);
            setCats({
                areas: [], tiposObjetivo: [], probabilidad: [], severidad: [],
                capacidadMitigacion: [], tolerancia: [], frecuencia: [], objetivos: [],
                viceministerios: [], organos: []
            });
        } finally {
            setLoadingCats(false);
        }
    };

    useEffect(() => {
        (async () => {
            setLoadingCats(true);
            setCatsError("");
            obtenerCatalogos();
        })();
    }, []);

    const cargarListaRiesgos = async (codigoPeriodo) => {
        try {
            const { data } = await apiClient.get(
                "/api/riesgos-variables-actualizados/obtener-lista",
                { params: { periodo: codigoPeriodo, tipo: tipo } }
            );
            setRiesgos(Array.isArray(data?.riesgos) ? data.riesgos : []);
            setPermisosEliminacion({ directo: data.puedeEliminarDirecto, solicitar: data.puedeSolicitarEliminacion });
        } catch (err) {
            console.error("Error al cargar la lista de riesgos", err);
            setErrorLista("No se pudo obtener la lista de riesgos para el período seleccionado.");
            setRiesgos([]);
            setPermisosEliminacion({});
            setPropiedadesExtra([]);
        } finally {
            setLoadingLista(false);
        }
    };

    const cargarLista = useCallback(async (codigoPeriodo) => {
        if (!codigoPeriodo) return;
        setLoadingLista(true);
        setErrorLista("");
        cargarListaRiesgos(codigoPeriodo);
    }, []);

    const obtenerPropiedades = async (p) => {
        try {
            const { data } = await apiClient.get(
                "/api/riesgos-variables-actualizados/obtener-propiedades",
                { params: { periodo: p, tipo: tipo === 'ME' ? 1 : tipo === 'MC' ? 2 : 3 } }
            );
            setPropiedades(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            console.error(err);
            setPropiedades([]);
        }
    };

    useEffect(() => {
        if (periodo) {
            cargarLista(periodo);
            obtenerPropiedades(periodo);
        }
    }, [periodo, cargarLista]);

    // soloNuevos=true genera el reporte únicamente con los riesgos nuevos de la unidad (excluidos del reporte normal)
    const handleReporte = async (soloNuevos = false) => {
        if (!periodo) return;
        setReportError("");
        setLoadingReportData(true);
        try {
            const { data } = await apiClient.get('/api/reportes-actualizados/informacion-riesgos', {
                params: { periodo, categoria: tipo, unidad: 'propia', ...(soloNuevos ? { nuevos: 1 } : {}) }
            });

            if (soloNuevos && !(data?.valores || []).length) {
                openSnack("No hay riesgos identificados en el período para esta unidad.", "info");
                return;
            }

            const sup = data?.superior || {};
            setRespNombre(sup?.nombre || "");
            setRespPuesto(sup?.puesto || "");
            setReportPayload({ propiedades: data.propiedades, valores: data.valores });
            setReportCategory(tipo);
            setReportSoloNuevos(soloNuevos);
            setReportModalOpen(true);
        } catch (error) {
            console.error('Error fetching data', error);
            setReportError("No se pudo obtener la información para generar el reporte.");
        } finally {
            setLoadingReportData(false);
        }
    };

    const doGenerateReport = async (opts = { useEditedFields: true }) => {
        if (!reportPayload || !reportCategory) return;
        setGeneratingReport(true);
        try {
            const responsable = {
                nombre: opts.useEditedFields ? respNombre : (respNombre || ""),
                puesto: opts.useEditedFields ? respPuesto : (respPuesto || "")
            };
            const prefijoTitulo = reportSoloNuevos ? 'Riesgos identificados en el período - ' : '';
            const prefijoArchivo = reportSoloNuevos ? 'Riesgos_identificados_periodo_' : '';
            if (reportCategory === 'MCE' || reportCategory === 'ME') {
                MatrizEvaluacion(
                    { propiedades: reportPayload.propiedades, valores: reportPayload.valores },
                    null,
                    {
                        titulo: prefijoTitulo + (reportCategory === 'ME' ? 'Matriz de Evaluación' : 'Matriz de continuidad y monitoreo'),
                        pageSize: 'LEGAL',
                        subtitulo: `Periodo ${periodo}`,
                        responsable
                    },
                    `${prefijoArchivo}${reportCategory === 'ME' ? 'Matriz_evaluacion' : 'Matriz_Continuidad_Monitoreo'}_${periodo}.pdf`
                );
            } else {
                GenerarMapaCalor(
                    { propiedades: reportPayload.propiedades, valores: reportPayload.valores },
                    null,
                    {
                        titulo: prefijoTitulo + 'Mapa de Calor de Riesgos',
                        pageSize: 'LEGAL',
                        subtitulo: `Periodo ${periodo}`,
                        responsable
                    },
                    `${prefijoArchivo}Mapa_residual_${periodo}.pdf`
                );
            }
            setReportModalOpen(false);
            setReportPayload(null);
            setReportCategory(null);
            setReportSoloNuevos(false);
            openSnack("Reporte generado correctamente.", "success");
        } catch (e) {
            console.error("Error al generar el reporte", e);
            setReportError("Ocurrió un error al generar el PDF.");
            openSnack("Ocurrió un error al generar el PDF.", "error");
        } finally {
            setGeneratingReport(false);
        }
    };

    const handleCrear = () => {
        setEditing(null);
        setModalOpen(true);
        setSaveError("");
    };

    // EDITAR: trae el detalle desde /base/riesgo-por-id
    const handleEditar = async (row) => {
        if (!periodo || !row?.CODIGO_RIESGO) return;
        if (tipo === 'ME') {
            navigate(`/riesgos/riesgo/${row.CODIGO_ENTIDAD}/${periodo}/${row.CODIGO_RIESGO}`);
            return;
        }
        setErrorDetalle("");
        setLoadingDetalle(true);
        try {
            const { data } = await apiClient.get("/api/riesgos-variables-actualizados/riesgo-por-id", {
                params: { periodo, riesgo: row.CODIGO_RIESGO, tipo: tipo },
            });
            setEditing(data?.riesgo ?? null);
            setModalOpen(true);
            setSaveError("");
        } catch (err) {
            console.error("Error al cargar el riesgo por id", err);
            setErrorDetalle("No se pudo cargar el riesgo seleccionado.");
        } finally {
            setLoadingDetalle(false);
        }
    };

    const handleSaved = async () => {
        setModalOpen(false);
        await cargarLista(periodo);
    };

    const handleSaveRiesgo = async (payload, isEdit) => {
        setSaving(true);
        setSaveError("");
        payload.tipo = tipo;
        try {
            if (isEdit) {
                await apiClient.put("/api/riesgos-variables-actualizados", payload);
            } else {
                const { data } = await apiClient.post("/api/riesgos-variables-actualizados", payload);
                if (tipo === 'ME' && data?.data?.codigoRiesgo) {
                    const riesgo = data.data;
                    navigate(`/riesgos/riesgo/${riesgo.codigo_entidad}/${riesgo.codigoPeriodo}/${riesgo.codigoRiesgo}`);
                    return;
                }
            }
            await handleSaved();
            openSnack(isEdit ? "Riesgo actualizado correctamente." : "Riesgo creado correctamente.", "success");
        } catch (e) {
            console.error(e);
            // Las validaciones del backend (409) traen un mensaje explicativo
            const msg = e?.response?.data?.error || "No se pudo guardar el riesgo. Intenta nuevamente.";
            setSaveError(msg);
            openSnack(msg, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRiesgo = async (row) => {
        if (!permisosEliminacion.directo) {
            if (permisosEliminacion.solicitar && !row.ELIMINACION_SOLICITADA) setSolicitud(row);
            return;
        }
        if (!window.confirm("¿Seguro que deseas eliminar este riesgo?")) return;
        try {
            await apiClient.put(
                "/api/riesgos-variables-actualizados/eliminar",
                { codigo_riesgo: row.CODIGO_RIESGO, codigo_entidad: row.CODIGO_ENTIDAD, periodo, tipo }
            );
            await cargarLista(periodo);
            openSnack("Riesgo eliminado correctamente.", "success");
        } catch (err) {
            console.error("Error al eliminar riesgo:", err);
            openSnack("No se pudo eliminar el riesgo.", "error");
        }
    };

    const handleRestoreRiesgo = async (row) => {
        if (!window.confirm("¿Deseas restablecer este riesgo eliminado?")) return;
        try {
            await apiClient.put(
                "/api/riesgos-variables-actualizados/restablecer",
                { codigo_riesgo: row.CODIGO_RIESGO, periodo, tipo }
            );
            await cargarLista(periodo);
            openSnack("Riesgo restablecido correctamente.", "success");
        } catch (err) {
            console.error("Error al restablecer riesgo:", err);
            openSnack("No se pudo restablecer el riesgo.", "error");
        }
    };

    return (
        <Box p={3}>
            {/* Título */}
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 2 }}>
                <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }} data-tour="riesgos-ingreso-titulo">{titulo}</Typography>
                {tipo === 'ME' && <RecorridoGuiado pantalla="riesgos-ingreso" pasos={recorridoIngreso} habilitado={!loadingCats && !modalOpen} />}
            </Stack>

            {/* Card: Dirección + Selección de período */}
            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader
                    title={entidad || "Dirección"}
                    subheader="Seleccione el período de trabajo"
                />
                <CardContent>
                    <Stack spacing={2}>
                        <Box data-tour="riesgos-ingreso-periodo">
                            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Período</Typography>
                            <Select
                                fullWidth
                                size="small"
                                value={periodo}
                                displayEmpty
                                onChange={(e) => setPeriodo(e.target.value)}
                                disabled={loadingCats}
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
                        </Box>

                        {(loadingLista || loadingDetalle) && <LinearProgress />}
                        {!!errorLista && <Alert severity="error">{errorLista}</Alert>}
                        {!!errorDetalle && <Alert severity="error">{errorDetalle}</Alert>}
                        {!!catsError && <Alert severity="error">{catsError}</Alert>}
                        {!!saveError && <Alert severity="error">{saveError}</Alert>}
                        {!!reportError && <Alert severity="error">{reportError}</Alert>}
                        {loadingReportData && <LinearProgress />}

                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "stretch", sm: "center" }}
                        >
                            {/* Botón para crear: los riesgos solo se crean desde la entrada de evaluación y gestión (ME) */}
                            {tipo === 'ME' && (
                                <Button data-tour="riesgos-ingreso-nuevo" variant="contained" onClick={handleCrear} disabled={!periodo || loadingCats}>
                                    Nuevo riesgo
                                </Button>
                            )}

                            {/* Botón para reporte (abre modal luego de fetch) */}
                            <Button
                                data-tour="riesgos-ingreso-reporte"
                                variant="contained"
                                onClick={() => handleReporte(false)}
                                disabled={!periodo || loadingCats || loadingReportData}
                            >
                                Generar reporte
                            </Button>

                            {/* Reporte aparte de los riesgos nuevos (no se incluyen en el reporte anterior) */}
                            <Button
                                variant="outlined"
                                onClick={() => handleReporte(true)}
                                disabled={
                                    !periodo || loadingCats || loadingReportData ||
                                    !riesgos.some((r) => Number(r.ES_NUEVO) === 1 && !r.ELIMINADO)
                                }
                            >
                                Reporte de identificados en el período
                            </Button>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {periodo && <CargaArchivos flag={tipo === 'ME' ? 3 : tipo === 'MCE' ? 4 : 5} periodo={periodo} />}

            {/* Tabla */}
            <Box sx={{ mt: 2 }} data-tour="riesgos-ingreso-tabla">
                <TablaRiesgosBasica
                    rows={riesgos}
                    permisosEliminacion={permisosEliminacion}
                    urlDetalle={tipo === 'ME' ? riesgo => `/riesgos/riesgo/${riesgo.CODIGO_ENTIDAD}/${periodo}/${riesgo.CODIGO_RIESGO}` : undefined}
                    onEdit={handleEditar}
                    onDelete={handleDeleteRiesgo}
                    onRestore={handleRestoreRiesgo}
                />
            </Box>
            {solicitud && <DialogoEliminacion titulo="Solicitar eliminación" campo="Motivo" obligatorio onClose={() => setSolicitud(null)}
                confirmar={async motivo => {
                    await apiClient.post(`/api/marn/riesgo/${solicitud.CODIGO_ENTIDAD}/${periodo}/${solicitud.CODIGO_RIESGO}/solicitudes-eliminacion`, { motivo });
                    await cargarLista(periodo);
                    openSnack("Solicitud de eliminación enviada.", "success");
                }} />}

            {/* Modal crear/editar */}
            <ModalIngresoRiesgosPropiedades
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                entidad={entidad}
                cats={cats}
                initialData={editing}
                periodo={periodo}
                siglas={siglas}
                onRequestSave={handleSaveRiesgo}
                saving={saving}
                basico={tipo === 'ME' && !editing}
                propiedadesDef={
                    (propiedades || [])
                        .filter(p => p?.source === "predefinida")
                        .map((propiedad) => ({ key: propiedad.key, label: propiedad.label }))
                }
                propiedadesExt={
                    (propiedades || [])
                        .filter(p => p?.source !== "predefinida")
                        .map((propiedad) => ({ key: propiedad.key, label: propiedad.label }))
                }
                tipo={tipo}
            />

            {/* Modal de espera para catálogos iniciales */}
            <Dialog open={loadingCats} fullWidth maxWidth="xs" disableEscapeKeyDown onClose={() => { }}>
                <DialogTitle sx={{ pb: 0 }}>Cargando catálogos…</DialogTitle>
                <DialogContent sx={{ display: "flex", gap: 2, alignItems: "center", pt: 2 }}>
                    <CircularProgress />
                    <Typography>Obteniendo información inicial. No cierres esta pestaña.</Typography>
                </DialogContent>
                <DialogActions>
                    <Typography variant="caption" sx={{ opacity: 0.7, pr: 1 }}>
                        No cierres ni recargues la página.
                    </Typography>
                </DialogActions>
            </Dialog>

            {/* ===== Modal de confirmación de responsable (previo a PDF) ===== */}
            <Dialog
                open={reportModalOpen}
                onClose={() => !generatingReport && setReportModalOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Confirmar responsable para la firma</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        <Alert severity="info">
                            Verifica o ajusta el nombre y el puesto que irán en el reporte.
                        </Alert>
                        {reportSoloNuevos && (
                            <Alert severity="warning">
                                Este reporte incluye únicamente los riesgos identificados en el período.
                            </Alert>
                        )}
                        <TextField
                            label="Nombre del responsable"
                            fullWidth
                            size="small"
                            value={respNombre}
                            onChange={(e) => setRespNombre(e.target.value)}
                            disabled={generatingReport}
                        />
                        <TextField
                            label="Puesto del responsable"
                            fullWidth
                            size="small"
                            value={respPuesto}
                            onChange={(e) => setRespPuesto(e.target.value)}
                            disabled={generatingReport}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={() => setReportModalOpen(false)}
                        disabled={generatingReport}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => doGenerateReport({ useEditedFields: true })}
                        disabled={generatingReport}
                    >
                        {generatingReport ? "Generando…" : "Confirmar"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar global */}
            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={closeSnack}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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

export default IngresoRiesgos;
