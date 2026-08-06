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
import {
    Box, Card, CardHeader, CardContent, Typography, Stack, Select, MenuItem, LinearProgress, Alert, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, TextField, Snackbar
} from "@mui/material";
import TablaRiesgosBasica from "./TablaRiesgosBasica";
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

    // Datos básicos
    const [entidad, setEntidad] = useState("");
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState("");
    const [siglas, setSiglas] = useState("");
    const [propiedades, setPropiedades] = useState([]);

    // Lista y propiedades extra
    const [riesgos, setRiesgos] = useState([]);
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

    // Helpers de normalización
    const safeArr = (a) => (Array.isArray(a) ? a : []);

    const mapCatsInicial = (data) => ({
        areas: safeArr(data?.areas).map((x) => ({ CODIGO: x.ID, DESCRIPCION: x.NOMBRE })),
        tiposObjetivo: safeArr(data?.tipoObjetivos).map((x) => ({ CODIGO: x.CODIGO_TIPO_OBJETIVO, DESCRIPCION: x.DESCRIPCION })),
        probabilidad: safeArr(data?.probabilidad).map((x) => ({ CODIGO: x.CODIGO, DESCRIPCION: x.DESCRIPCION })),
        severidad: safeArr(data?.severidad).map((x) => ({ CODIGO: x.CODIGO, DESCRIPCION: x.DESCRIPCION })),
        capacidadMitigacion: safeArr(data?.mitigacion).map((x) => ({ CODIGO: x.CODIGO, DESCRIPCION: x.DESCRIPCION })),
        tolerancia: safeArr(data?.tolerancia).map((x) => ({ CODIGO: x.CODIGO, DESCRIPCION: x.DESCRIPCION })),
        frecuencia: safeArr(data?.frecuencia).map((x) => ({ CODIGO: x.CODIGO_FRECUENCIA, DESCRIPCION: x.DESCRIPCION })),

        viceministerios: safeArr(data?.viceminsiterios).map(v => ({
            CODIGO_VICEMINISTERIO: v.CODIGO_VICEMINISTERIO, NOMBRE: v.NOMBRE
        })),
        organos: safeArr(data?.organos).map(o => ({
            CODIGO_ORGANO: o.CODIGO_ORGANO, NOMBRE: o.NOMBRE
        })),
    });

    const obtenerCatalogos = async () => {
        try {
            const [initRes, objetivosRes] = await Promise.all([
                apiClient.get("/api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos"),
                apiClient.get("/api/riesgos-variables-actualizados/lista-objetivos"),
            ]);

            const init = initRes.data || {};
            const objetivosRaw = safeArr(objetivosRes.data.objetivos);
            const objetivos = objetivosRaw.map((o) => ({
                CODIGO: o.CODIGO_OBJETIVO,
                TIPO: o.CODIGO_TIPO_OBJETIVO,
                DESCRIPCION: o.DESCRIPCION,
            }));

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
        } catch (err) {
            console.error("Error al cargar la lista de riesgos", err);
            setErrorLista("No se pudo obtener la lista de riesgos para el período seleccionado.");
            setRiesgos([]);
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

    const handleReporte = async () => {
        if (!periodo) return;
        setReportError("");
        setLoadingReportData(true);
        try {
            const { data } = await apiClient.get('/api/reportes-actualizados/informacion-riesgos', {
                params: { periodo, categoria: tipo, unidad: 'propia' }
            });

            const sup = data?.superior || {};
            setRespNombre(sup?.nombre || "");
            setRespPuesto(sup?.puesto || "");
            setReportPayload({ propiedades: data.propiedades, valores: data.valores });
            setReportCategory(tipo);
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
            if (reportCategory === 'MCE' || reportCategory === 'ME') {
                MatrizEvaluacion(
                    { propiedades: reportPayload.propiedades, valores: reportPayload.valores },
                    null,
                    {
                        titulo: reportCategory === 'ME' ? 'Matriz de Evaluación' : 'Matriz de continuidad y monitoreo',
                        pageSize: 'LEGAL',
                        subtitulo: `Periodo ${periodo}`,
                        responsable
                    },
                    `${reportCategory === 'ME' ? 'Matriz_evaluacion' : 'Matriz_Continuidad_Monitoreo'}_${periodo}.pdf`
                );
            } else {
                GenerarMapaCalor(
                    { propiedades: reportPayload.propiedades, valores: reportPayload.valores },
                    null,
                    {
                        titulo: 'Mapa de Calor de Riesgos',
                        pageSize: 'LEGAL',
                        subtitulo: `Periodo ${periodo}`,
                        responsable
                    },
                    `Mapa_residual_${periodo}.pdf`
                );
            }
            setReportModalOpen(false);
            setReportPayload(null);
            setReportCategory(null);
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
                await apiClient.post("/api/riesgos-variables-actualizados", payload);
            }
            await handleSaved();
            openSnack(isEdit ? "Riesgo actualizado correctamente." : "Riesgo creado correctamente.", "success");
        } catch (e) {
            console.error(e);
            setSaveError("No se pudo guardar el riesgo. Intenta nuevamente.");
            openSnack("No se pudo guardar el riesgo. Intenta nuevamente.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRiesgo = async (row) => {
        if (!window.confirm("¿Seguro que deseas eliminar este riesgo?")) return;
        try {
            await apiClient.put(
                "/api/riesgos-variables-actualizados/eliminar",
                { codigo_riesgo: row.CODIGO_RIESGO, periodo, tipo }
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
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                {titulo}
            </Typography>

            {/* Card: Dirección + Selección de período */}
            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader
                    title={entidad || "Dirección"}
                    subheader="Seleccione el período de trabajo"
                />
                <CardContent>
                    <Stack spacing={2}>
                        <Box>
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
                            {/* Botón para crear */}
                            <Button variant="contained" onClick={handleCrear} disabled={!periodo || loadingCats}>
                                Nuevo riesgo
                            </Button>

                            {/* Botón para reporte (abre modal luego de fetch) */}
                            <Button
                                variant="contained"
                                onClick={handleReporte}
                                disabled={!periodo || loadingCats || loadingReportData}
                            >
                                Generar reporte
                            </Button>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {periodo && <CargaArchivos flag={tipo === 'ME' ? 3 : tipo === 'MCE' ? 4 : 5} periodo={periodo} />}

            {/* Tabla */}
            <Box sx={{ mt: 2 }}>
                <TablaRiesgosBasica
                    rows={riesgos}
                    onEdit={handleEditar}
                    onDelete={handleDeleteRiesgo}
                    onRestore={handleRestoreRiesgo}
                />
            </Box>

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
