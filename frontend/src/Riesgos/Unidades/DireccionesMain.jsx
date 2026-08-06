import { useState, useEffect } from "react";
import apiClient from "api/apiClient";

import {
    Box,
    Typography,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    IconButton,
    Paper,
    InputAdornment
} from "@mui/material";
import AlertaMensaje from "../Alerta F/AlertaMensaje";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import FormDireccion from "./FormDireccion";

function DireccionesMain() {
    const [alerta, setAlerta] = useState({
        open: false,
        tipo: "success",
        mensaje: ""
    });
    const [listaDirecciones, setListaDirecciones] = useState([]);
    const [listaFiltrada, setListaFiltrada] = useState([]);
    const [filtroDescripcion, setFiltroDescripcion] = useState("");
    const [filtroAbreviatura, setFiltroAbreviatura] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [id, setId] = useState("");

    const obtenerDirecciones = async () => {
        try {
            const response = await apiClient.get("/api/direcciones-actualizados");
            setListaDirecciones(response.data?.result || []);
        } catch (error) {
            console.error("Error al obtener direcciones:", error);
            setAlerta({
                open: true,
                tipo: "error",
                mensaje: "Error al obtener direcciones"
            });
        }
    };

    useEffect(() => {
        obtenerDirecciones();
    }, []);

    useEffect(() => {
        const filtrado = listaDirecciones.filter((unidad) =>
            (unidad.NOMBRE || "").toLowerCase().includes(filtroDescripcion.toLowerCase()) &&
            (unidad.SIGLAS || "").toLowerCase().includes(filtroAbreviatura.toLowerCase())
        );
        setListaFiltrada(filtrado);
    }, [listaDirecciones, filtroDescripcion, filtroAbreviatura]);

    const onClose = () => {
        setId("");
        setShowModal(false);
    };

    const onError = () => {
        setAlerta({ open: true, tipo: "error", mensaje: "Error al realizar la acción" });
    };

    const mostrarAlerta = (tipo, mensaje) => {
        setAlerta({ open: true, tipo, mensaje });
    };

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Mantenimiento de direcciones
            </Typography>

            <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => setShowModal(true)}
                sx={{ mb: 2 }}
            >
                Nueva dirección
            </Button>

            <Paper elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Opción</strong></TableCell>
                            <TableCell><strong>Nombre</strong></TableCell>
                            <TableCell><strong>Abreviatura</strong></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Buscar</TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    placeholder="Búsqueda por descripción"
                                    value={filtroDescripcion}
                                    onChange={(e) => setFiltroDescripcion(e.target.value)}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton><SearchIcon /></IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    placeholder="Búsqueda por abreviatura"
                                    value={filtroAbreviatura}
                                    onChange={(e) => setFiltroAbreviatura(e.target.value)}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton><SearchIcon /></IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {listaFiltrada.map((dir) => (
                            <TableRow key={dir.CODIGO_ENTIDAD}>
                                <TableCell>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<EditIcon />}
                                        onClick={() => {
                                            setShowModal(true);
                                            setId(dir.CODIGO_ENTIDAD);
                                        }}
                                    >
                                        Editar
                                    </Button>
                                </TableCell>
                                <TableCell>{dir.NOMBRE}</TableCell>
                                <TableCell>{dir.SIGLAS}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <FormDireccion
                showModal={showModal}
                id={id}
                onClose={onClose}
                onSuccess={() => {
                    obtenerDirecciones();
                    onClose();
                    mostrarAlerta("success", "Guardado exitosamente");
                }}
                onError={onError}
            />

            <AlertaMensaje
                open={alerta.open}
                tipo={alerta.tipo}
                mensaje={alerta.mensaje}
                setOpen={() => setAlerta((prev) => ({ ...prev, open: false }))}
            />
        </Box>
    );
}

export default DireccionesMain;
