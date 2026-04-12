/**
 * @fileoverview
 * Gestión de continuidad de riesgos entre periodos y su trazabilidad.
 *
 * @module Riesgos/Comportamiento/Relaciones riesgos/Continuidad.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from "react";
import axios from "axios";
import {
    Box, Card, CardHeader, CardContent, Typography, Select, MenuItem,
    Stack, LinearProgress, Alert, Divider, Chip, Collapse, Button, Grid,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LayersIcon from "@mui/icons-material/Layers";
import ModalRelacionarRiesgo from "./ModalRelacionarRiesgo";
import ModalContinuarRiesgo from "./ModalContinuarRiesgo";

/**
 * Vista de continuidad de riesgos entre periodos.
 *
 * Permite decidir si un riesgo continúa, se fusiona o se cierra.
 *
 * @component
 */
export default function Continuidad() {
    const [entidad, setEntidad] = useState("");
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [riesgos, setRiesgos] = useState([]);
    const [openIdx, setOpenIdx] = useState(null);

    const [openRelacionar, setOpenRelacionar] = useState(false);
    const [openContinuar, setOpenContinuar] = useState(false);
    const [riesgoSeleccionado, setRiesgoSeleccionado] = useState(null);

    /**
     * Encabezados HTTP reutilizados por las operaciones de continuidad de riesgos.
     */
    const headers = () => ({ "x-access-token": localStorage.getItem("token") });

    /**
     * Devuelve el color de representación de un nivel de riesgo (inherente o residual).
     */
    const nivelColor = (valor) => {
        const n = Number(valor);
        if (isNaN(n)) return "transparent";
        if (n >= 15) return "#f44336";
        if (n >= 10) return "#ff9800";
        if (n >= 5) return "#4caf50";
        return "#81c784";
    };

    useEffect(() => {
        /**
         * Carga la información inicial necesaria para trabajar la continuidad de riesgos.
         */
        const fetchInfoInicial = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(
                    "/api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos",
                    { headers: headers() }
                );
                const { userInfo, periodos } = data || {};
                if (userInfo) setEntidad(`${userInfo.NOMBRE} (${userInfo.SIGLAS})`);
                setPeriodos(Array.isArray(periodos) ? periodos : []);
            } catch (err) {
                console.error(err);
                setError("No se pudo cargar la información inicial.");
            } finally {
                setLoading(false);
            }
        };
        fetchInfoInicial();
    }, []);

    /**
     * Recupera los riesgos candidatos a continuidad para el periodo seleccionado.
     */
    const fetchRiesgos = async () => {
        if (!periodo) return;
        try {
            setLoading(true);
            setError("");
            const { data } = await axios.get(
                "/api/riesgos-variables-actualizados/obtener-lista-riesgos-detalle",
                { params: { periodo }, headers: headers() }
            );
            const lista = Array.isArray(data?.valores) ? data.valores : [];
            const limpiar = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([_, v]) => v));
            const normalizados = lista.map((r) => ({
                ...r,
                ...(limpiar(r.EXTRAS_ME)),
                ...(limpiar(r.EXTRAS_MCE)),
                ...(limpiar(r.EXTRAS_MC))
            }));
            setRiesgos(normalizados);
            setOpenIdx(null);
        } catch (err) {
            console.error(err);
            setError("No se pudo cargar la lista de riesgos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRiesgos();
    }, [periodo]);

    /**
     * Abre el modal para relacionar el riesgo actual con otros riesgos.
     */
    const handleAbrirRelacionar = (r) => {
        setRiesgoSeleccionado(r);
        setOpenRelacionar(true);
    };

    /**
     * Abre el modal para definir cómo continuará el riesgo en el siguiente periodo.
     */
    const handleAbrirContinuar = (r) => {
        setRiesgoSeleccionado(r);
        setOpenContinuar(true);
    };

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                Continuidad
            </Typography>

            {/* Unidad y período */}
            <Card sx={{ borderRadius: 2, mb: 3 }}>
                <CardHeader
                    title={entidad || "Unidad no identificada"}
                    subheader="Seleccione el período de continuidad"
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

            {/* Lista de riesgos */}
            <Card sx={{ borderRadius: 2 }}>
                <CardHeader
                    title="Riesgos del período"
                    titleTypographyProps={{ sx: { fontWeight: 700 } }}
                />
                <CardContent>
                    {!periodo && (
                        <Typography color="text.secondary">
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
                        {riesgos.map((r, idx) => (
                            <Card
                                key={idx}
                                variant="outlined"
                                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                                sx={{
                                    borderLeft: "6px solid #17a589",
                                    borderRadius: 2,
                                    cursor: "pointer",
                                    "&:hover": { boxShadow: 3 }
                                }}
                            >
                                <CardContent sx={{ pb: 1.5 }}>
                                    <Typography sx={{ fontWeight: 800 }}>
                                        {r["Ref."] || "Sin referencia"}
                                    </Typography>
                                    <Typography sx={{ mb: 1 }}>
                                        {r["Descripción del riesgo"] || "Sin descripción"}
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography sx={{ fontWeight: 700 }}>
                                            Riesgo Residual:
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={r["Riesgo residual"] ?? "—"}
                                            color={
                                                r["Riesgo residual"] >= 15
                                                    ? "error"
                                                    : r["Riesgo residual"] >= 10
                                                        ? "warning"
                                                        : "success"
                                            }
                                        />
                                    </Stack>
                                </CardContent>

                                <Collapse in={openIdx === idx} timeout="auto" unmountOnExit>
                                    <Divider sx={{ my: 1 }} />
                                    <CardContent>
                                        {/* Tabla visual estilo matriz */}
                                        <TableContainer component={Paper} sx={{ mb: 2 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        {[
                                                            "Probabilidad",
                                                            "Severidad",
                                                            "Riesgo inherente",
                                                            "A mitigar",
                                                            "Capacidad de mitigación",
                                                            "Probabilidad ajustada",
                                                            "Severidad ajustada",
                                                            "Riesgo residual",
                                                        ].map((h) => (
                                                            <TableCell
                                                                key={h}
                                                                sx={{ fontWeight: 700, textAlign: "center" }}
                                                            >
                                                                {h}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell align="center">{r.Probabilidad ?? "—"}</TableCell>
                                                        <TableCell align="center">{r.Severidad ?? "—"}</TableCell>
                                                        <TableCell
                                                            align="center"
                                                            sx={{ backgroundColor: nivelColor(r["Riesgo Inherente"]) }}
                                                        >
                                                            {r["Riesgo Inherente"] ?? "—"}
                                                        </TableCell>
                                                        <TableCell align="center">{r["A mitigar"] ?? "—"}</TableCell>
                                                        <TableCell align="center">{r["Eficiencia del mitigador"] ?? "—"}</TableCell>
                                                        <TableCell align="center">{r["Probabilidad ajustada"] ?? "—"}</TableCell>
                                                        <TableCell align="center">{r["Severidad ajustada"] ?? "—"}</TableCell>
                                                        <TableCell
                                                            align="center"
                                                            sx={{ backgroundColor: nivelColor(r["Riesgo residual"]) }}
                                                        >
                                                            {r["Riesgo residual"] ?? "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<LinkIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAbrirRelacionar(r);
                                                }}
                                            >
                                                Relacionar con un riesgo del año pasado
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                color="success"
                                                startIcon={<ArrowForwardIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAbrirContinuar(r);
                                                }}
                                            >
                                                Continuar para el año siguiente
                                            </Button>
                                            <Button
                                                variant="text"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenIdx(null);
                                                }}
                                            >
                                                Cerrar
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Collapse>
                            </Card>
                        ))}
                    </Stack>
                </CardContent>
            </Card>

            {/* Modales */}
            <ModalRelacionarRiesgo
                open={openRelacionar}
                onClose={() => setOpenRelacionar(false)}
                riesgo={riesgoSeleccionado}
                periodo={periodo}
            />

            <ModalContinuarRiesgo
                open={openContinuar}
                onClose={() => setOpenContinuar(false)}
                riesgo={riesgoSeleccionado}
            />
        </Box>
    );
}
