/**
 * @fileoverview 
 *
 * Pantalla de seguimiento de riesgos:
 * - Obtiene la unidad logueada y sus períodos de trabajo.
 * - Consulta los riesgos del período seleccionado con su riesgo residual.
 * - Permite abrir un modal de seguimiento detallado por riesgo.
 *
 * @module Riesgos/Comportamiento/Seguimiento/Seguimiento.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from "react";
import apiClient from "api/apiClient";
import { Box, Card, CardHeader, CardContent, Typography, Select, MenuItem, Stack, LinearProgress, Alert, Chip, } from "@mui/material";
import SeguimientoModal from "./SeguimientoModal";

/**
 * Seguimiento
 *
 * Pantalla principal para que la unidad registre y consulte el seguimiento
 * de los riesgos por período.
 *
 * - Carga la información inicial de la unidad (entidad) y los períodos disponibles.
 * - Consulta el listado de riesgos del período seleccionado, incluyendo el riesgo residual.
 * - Renderiza tarjetas por riesgo; al hacer clic abre el `SeguimientoModal`
 *   para registrar/editar el documento de seguimiento.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function Seguimiento() {
    const [entidad, setEntidad] = useState("");
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [riesgos, setRiesgos] = useState([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState({
        ref: "",
        descripcion: "",
        codigo_riesgo: null,
        codigo_entidad: null,
        codigo_periodo: null,
    });

    /**
     * nivelResidual
     *
     * Clasifica el valor del riesgo residual en un nivel textual.
     *
     * - Convierte el valor numérico en:
     *   - "alto"  si es >= 15
     *   - "medio" si es >= 10 y < 15
     *   - "bajo"  si es < 10
     *   - "desconocido" si el valor no es numérico
     *
     * @param {number|string} v Valor de riesgo residual.
     * @returns {"alto"|"medio"|"bajo"|"desconocido"} Nivel calculado.
     */
    const nivelResidual = (v) => {
        const n = Number(v);
        if (Number.isNaN(n)) return "desconocido";
        if (n >= 15) return "alto";
        if (n >= 10) return "medio";
        return "bajo";
    };

    const colorByNivel = (nivel, theme) => {
        switch (nivel) {
            case "alto":
                return { main: theme.palette.error.main };
            case "medio":
                return { main: theme.palette.warning.main };
            case "bajo":
                return { main: theme.palette.success.main };
            default:
                return { main: theme.palette.grey[400] };
        }
    };

    /**
     * fetchInfoInicial
     *
     * Carga la información base de la vista.
     *
     * - Llama al endpoint de info inicial, setea nombre de entidad y períodos.
     *
     * @route GET /api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos
     * @returns {Promise<void>} Actualiza estados `entidad` y `periodos`.
     */
    const fetchInfoInicial = async () => {
        try {
            setLoading(true);
            setError("");
            const { data } = await apiClient.get(
                "/api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos"
            );
            const { userInfo, periodos } = data || {};
            if (userInfo) setEntidad(`${userInfo.NOMBRE} (${userInfo.SIGLAS})`);
            setPeriodos(Array.isArray(periodos) ? periodos : []);
        } catch (err) {
            console.error("Error al obtener info inicial:", err);
            setError("No se pudo cargar la información inicial.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInfoInicial();
    }, []);

    /**
     * fetchRiesgos
     *
     * Obtiene la lista de riesgos asociados al período seleccionado.
     *
     * - Llama al endpoint de lista de riesgos con detalle.
     * - Combina los objetos `EXTRAS_ME`, `EXTRAS_MCE`, `EXTRAS_MC` en un solo plano.
     * - Actualiza el estado `riesgos` con la lista transformada.
     *
     * @route GET /api/riesgos-variables-actualizados/obtener-lista-riesgos-detalle
     * @query `periodo`
     * @returns {Promise<void>} 
     */
    const fetchRiesgos = async () => {
        if (!periodo) return;
        try {
            setLoading(true);
            setError("");
            const { data } = await apiClient.get(
                "/api/riesgos-variables-actualizados/obtener-lista-riesgos-detalle",
                { params: { periodo } }
            );

            const lista = Array.isArray(data?.valores) ? data.valores : [];

            const unidos = lista.map((r) => {
                const limpiarExtras = (obj) => {
                    if (!obj || typeof obj !== "object") return {};
                    const entries = Object.entries(obj).filter(
                        ([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
                    );
                    return Object.fromEntries(entries);
                };
                const extras = {
                    ...limpiarExtras(r.EXTRAS_ME),
                    ...limpiarExtras(r.EXTRAS_MCE),
                    ...limpiarExtras(r.EXTRAS_MC),
                };
                const base = { ...r };
                delete base.EXTRAS_ME;
                delete base.EXTRAS_MCE;
                delete base.EXTRAS_MC;
                return { ...base, ...extras };
            });

            setRiesgos(unidos);
        } catch (err) {
            console.error("Error al obtener lista de riesgos:", err);
            setError("No se pudo cargar la lista de riesgos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRiesgos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo]);

    const handleAbrirModal = (r) => {
        setModalData({
            ref: r?.["Ref."] ?? "Sin referencia",
            descripcion: r?.["Descripción del riesgo"] ?? "Sin descripción",
            codigo_riesgo: r?.CODIGO_RIESGO ?? null,
            codigo_entidad: r?.CODIGO_ENTIDAD ?? null,
            codigo_periodo: Number(periodo || r?.CODIGO_PERIODO) ?? null,
        });
        setModalOpen(true);
    };

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: "1.35rem", md: "1.5rem" } }}>
                Seguimiento de Riesgos
            </Typography>

            {/* Unidad y período */}
            <Card sx={{ borderRadius: 2, mb: 3 }}>
                <CardHeader
                    titleTypographyProps={{ sx: { fontWeight: 700, fontSize: { xs: "1rem", md: "1.1rem" } } }}
                    subheaderTypographyProps={{ sx: { fontSize: { xs: "0.9rem", md: "0.95rem" } } }}
                    title={entidad || "Unidad no identificada"}
                    subheader="Seleccione el período de seguimiento"
                />
                <CardContent>
                    <Stack spacing={2}>
                        <Select
                            fullWidth
                            size="small"
                            value={periodo}
                            displayEmpty
                            onChange={(e) => setPeriodo(e.target.value)}
                            disabled={loading}
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

            {/* Lista de riesgos (sin colapsable) */}
            <Card sx={{ borderRadius: 2 }}>
                <CardHeader
                    title="Detalle de Seguimiento"
                    titleTypographyProps={{ sx: { fontWeight: 700, fontSize: { xs: "1rem", md: "1.1rem" } } }}
                />
                <CardContent>
                    {!periodo && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.95rem", md: "1rem" } }}>
                            Seleccione un período para ver los riesgos registrados.
                        </Typography>
                    )}

                    {loading && <LinearProgress sx={{ mt: 1 }} />}

                    {!loading && periodo && riesgos.length === 0 && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                            No hay riesgos registrados para este período.
                        </Alert>
                    )}

                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {riesgos.map((r, idx) => {
                            const residual = r["Riesgo residual"];
                            const nivel = nivelResidual(residual);
                            return (
                                <Card
                                    key={idx}
                                    variant="outlined"
                                    onClick={() => handleAbrirModal(r)}
                                    sx={(theme) => {
                                        const c = colorByNivel(nivel, theme);
                                        return {
                                            borderRadius: 2,
                                            cursor: "pointer",
                                            borderLeft: `6px solid ${c.main}`,
                                            transition: "box-shadow 0.2s ease",
                                            "&:hover": { boxShadow: 3 },
                                        };
                                    }}
                                >
                                    <CardContent sx={{ pb: 1.5 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: { xs: "1rem", md: "1.05rem" } }}>
                                            {r["Ref."] || "Sin referencia"}
                                        </Typography>
                                        <Typography variant="body1" sx={{ mt: 0.25, fontSize: { xs: "0.98rem", md: "1.02rem" } }} color="text.primary">
                                            {r["Descripción del riesgo"] || "Sin descripción"}
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: "0.95rem", md: "1rem" } }}>
                                                Riesgo Residual:
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={residual ?? "—"}
                                                color={residual >= 15 ? "error" : residual >= 10 ? "warning" : "success"}
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Stack>
                </CardContent>
            </Card>

            {/* Modal de seguimiento (ahora hace el GET al presionar "Llenar plantilla") */}
            <SeguimientoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                refRiesgo={modalData.ref}
                descripcion={modalData.descripcion}
                codigo_riesgo={modalData.codigo_riesgo}
                codigo_entidad={modalData.codigo_entidad}
                codigo_periodo={modalData.codigo_periodo}
            />
        </Box>
    );
}
