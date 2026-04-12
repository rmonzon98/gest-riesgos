import { useEffect, useMemo, useState } from "react";
import {
    Box, Typography, Select, MenuItem, InputLabel,
    FormControl, Table, TableHead, TableRow,
    TableCell, TableBody, Button, Paper, Stack,
    TextField, IconButton, Tooltip, TableContainer
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import axios from "axios";
import AlertaMensaje from "../Alerta F/AlertaMensaje";
import FormObjetivo from "./FormObjetivo";

function ObjetivosMain() {
    const [tipos, setTipos] = useState([]);
    const [objetivos, setObjetivos] = useState([]);
    const [codigoTipo, setCodigoTipo] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [codigoEditar, setCodigoEditar] = useState(null);
    const [alerta, setAlerta] = useState({
        open: false,
        tipo: 'success',
        mensaje: ''
    });

    // Filtros por columna
    const [filters, setFilters] = useState({
        descripcion: "",
        abreviatura: ""
    });

    const normalize = (str = "") =>
        str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const obtenerTipos = async () => {
        try {
            const res = await axios.get("/api/tipo-objetivo-actualizados", {
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            setTipos(res.data.result || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        obtenerTipos();
    }, []);

    const obtenerObjetivos = async () => {
        if (!codigoTipo) return;
        try {
            const res = await axios.get("/api/objetivos-actualizados", {
                params: { tipoObjetivo: codigoTipo },
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            setObjetivos(res.data.result || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        obtenerObjetivos();
    }, [codigoTipo]);

    const handleClose = () => {
        setShowModal(false);
        setCodigoEditar(null);
    };

    const handleSuccess = () => {
        obtenerObjetivos();
        mostrarAlerta("success", "Guardado exitosamente");
        handleClose();
    };

    const mostrarAlerta = (tipo, mensaje) => {
        setAlerta({ open: true, tipo, mensaje });
    };

    const clearFilters = () => {
        setFilters({ descripcion: "", abreviatura: "" });
    };

    const filteredObjetivos = useMemo(() => {
        const fDesc = normalize(filters.descripcion);
        const fAbr = normalize(filters.abreviatura);

        return objetivos.filter((o) => {
            const oDesc = normalize(o.DESCRIPCION || "");
            const oAbr = normalize(o.ABREVIATURA || "");
            const matchDesc = !fDesc || oDesc.includes(fDesc);
            const matchAbr = !fAbr || oAbr.includes(fAbr);
            return matchDesc && matchAbr;
        });
    }, [objetivos, filters]);

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Mantenimiento de Objetivos
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="tipo-select-label">Tipo de Objetivo</InputLabel>
                <Select
                    labelId="tipo-select-label"
                    value={codigoTipo}
                    label="Tipo de Objetivo"
                    onChange={(e) => setCodigoTipo(e.target.value)}
                >
                    {tipos.map((tipo) => (
                        <MenuItem key={tipo.CODIGO_TIPO_OBJETIVO} value={tipo.CODIGO_TIPO_OBJETIVO}>
                            {tipo.DESCRIPCION}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {codigoTipo && (
                <>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setCodigoEditar(null);
                                setShowModal(true);
                            }}
                        >
                            Agregar
                        </Button>

                        <Stack direction="row" alignItems="center" gap={1}>
                            <Tooltip title="Limpiar filtros">
                                <IconButton onClick={clearFilters} color="default">
                                    <ClearIcon />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>

                    <Paper elevation={3}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width={140}>Acciones</TableCell>
                                        <TableCell>Descripción</TableCell>
                                        <TableCell>Abreviatura</TableCell>
                                    </TableRow>
                                    {/* Fila de filtros */}
                                    <TableRow>
                                        <TableCell />
                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="Buscar descripción…"
                                                value={filters.descripcion}
                                                onChange={(e) => setFilters({ ...filters, descripcion: e.target.value })}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="Buscar abreviatura…"
                                                value={filters.abreviatura}
                                                onChange={(e) => setFilters({ ...filters, abreviatura: e.target.value })}
                                            />
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredObjetivos.map((obj) => (
                                        <TableRow key={obj.CODIGO} hover>
                                            <TableCell>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<EditIcon />}
                                                    size="small"
                                                    onClick={() => {
                                                        setCodigoEditar(obj.CODIGO);
                                                        setShowModal(true);
                                                    }}
                                                >
                                                    Editar
                                                </Button>
                                            </TableCell>
                                            <TableCell>{obj.DESCRIPCION}</TableCell>
                                            <TableCell>{obj.ABREVIATURA}</TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredObjetivos.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center">
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
                </>
            )}

            <FormObjetivo
                open={showModal}
                onClose={handleClose}
                onSuccess={handleSuccess}
                tipo={codigoTipo}
                id={codigoEditar}
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

export default ObjetivosMain;
