import { useEffect, useMemo, useState } from "react";
import {
    Button, Typography, Box, Table, TableHead, TableRow,
    TableCell, TableBody, Paper, TextField, IconButton,
    Tooltip, TableContainer
} from "@mui/material";
import axios from "axios";
import FormPeriodo from "./FormPeriodo";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ClearIcon from "@mui/icons-material/Clear";
import AlertaMensaje from "../Alerta F/AlertaMensaje";

function PeriodosMain() {
    const [alerta, setAlerta] = useState({ open: false, tipo: 'success', mensaje: '' });
    const [data, setData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [id, setId] = useState(null);

    // Filtros por columna
    const [filters, setFilters] = useState({
        anio: "",
        fechaInicialDesde: "",
        fechaFinalHasta: ""
    });

    const normalize = (str = "") =>
        str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const obtenerPeriodos = async () => {
        try {
            const res = await axios.get("/api/periodos-actualizados", {
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            setData(res.data.result || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        obtenerPeriodos();
    }, []);

    const handleClose = () => {
        setShowModal(false);
        setId(null);
    };

    const handleSuccess = () => {
        handleClose();
        obtenerPeriodos();
        mostrarAlerta('success', 'Guardado exitosamente');
    };

    const onError = (mensaje = 'Error al realizar la acción') => {
        setAlerta({ open: true, tipo: 'error', mensaje });
    };

    const mostrarAlerta = (tipo, mensaje) => {
        setAlerta({ open: true, tipo, mensaje });
    };

    const toISODate = (value) => {
        // admite "YYYY-MM-DD" o ISO string; retorna "YYYY-MM-DD" o ""
        if (!value) return "";
        try {
            // si ya viene como "YYYY-MM-DD"
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            // si viene ISO, tomar primeros 10
            return value.substring(0, 10);
        } catch {
            return "";
        }
    };

    const filteredData = useMemo(() => {
        const fYear = normalize(filters.anio);
        const fIni = filters.fechaInicialDesde; // "YYYY-MM-DD" o ""
        const fFin = filters.fechaFinalHasta;   // "YYYY-MM-DD" o ""

        return (data || []).filter((row) => {
            const year = normalize((row.CODIGO_PERIODO ?? "").toString());
            const ini = toISODate(row.PERIODO_INICIAL);
            const fin = toISODate(row.PERIODO_FINAL);

            const matchYear = !fYear || year.includes(fYear);
            const matchIni = !fIni || (ini && ini >= fIni); // ini >= filtro
            const matchFin = !fFin || (fin && fin <= fFin); // fin <= filtro

            return matchYear && matchIni && matchFin;
        });
    }, [data, filters]);

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Mantenimiento de períodos
            </Typography>

            <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => setShowModal(true)}
                sx={{ mb: 2 }}
            >
                Nuevo Periodo
            </Button>

            <Paper elevation={3}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell width={140}>Acciones</TableCell>
                                <TableCell>Año</TableCell>
                                <TableCell>Fecha Inicial</TableCell>
                                <TableCell>Fecha Final</TableCell>
                            </TableRow>
                            {/* Fila de filtros */}
                            <TableRow>
                                <TableCell>
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth size="small" placeholder="Buscar año…"
                                        value={filters.anio}
                                        onChange={(e) => setFilters({ ...filters, anio: e.target.value })}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth size="small" type="date" label="Desde"
                                        InputLabelProps={{ shrink: true }}
                                        value={filters.fechaInicialDesde}
                                        onChange={(e) => setFilters({ ...filters, fechaInicialDesde: e.target.value })}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth size="small" type="date" label="Hasta"
                                        InputLabelProps={{ shrink: true }}
                                        value={filters.fechaFinalHasta}
                                        onChange={(e) => setFilters({ ...filters, fechaFinalHasta: e.target.value })}
                                    />
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredData.map((row) => (
                                <TableRow key={row.CODIGO_PERIODO} hover>
                                    <TableCell>
                                        <Button
                                            variant="outlined"
                                            startIcon={<EditIcon />}
                                            size="small"
                                            onClick={() => {
                                                setId(row.CODIGO_PERIODO);
                                                setShowModal(true);
                                            }}
                                        >
                                            Editar
                                        </Button>
                                    </TableCell>
                                    <TableCell>{row.CODIGO_PERIODO}</TableCell>
                                    <TableCell>{toISODate(row.PERIODO_INICIAL)}</TableCell>
                                    <TableCell>{toISODate(row.PERIODO_FINAL)}</TableCell>
                                </TableRow>
                            ))}

                            {filteredData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                            No hay resultados con los filtros actuales.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <FormPeriodo
                showModal={showModal}
                id={id}
                onClose={handleClose}
                onSuccess={handleSuccess}
                onError={onError}
            />

            <AlertaMensaje
                open={alerta.open}
                tipo={alerta.tipo}
                mensaje={alerta.mensaje}
                setOpen={() => setAlerta(prev => ({ ...prev, open: false }))}
            />
        </Box>
    );
}

export default PeriodosMain;
