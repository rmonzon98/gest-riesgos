import { useState, useEffect } from "react";
import apiClient from "api/apiClient";
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, TextField, Paper, InputAdornment } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import FormTipoObjetivo from "./FormTipoObjetivo";
import AlertaMensaje from "../Alerta F/AlertaMensaje";

function TipoObjetivoMain() {
    const [alerta, setAlerta] = useState({
        open: false,
        tipo: "success",
        mensaje: "",
    });
    const [lista, setLista] = useState([]);
    const [listaFiltrada, setListaFiltrada] = useState([]);
    const [filtroCodigo, setFiltroCodigo] = useState("");
    const [filtroDescripcion, setFiltroDescripcion] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [id, setId] = useState("");

    const obtenerDatos = async () => {
        try {
            const res = await apiClient.get("/api/tipo-objetivo-actualizados");
            setLista(res.data.result || []);
        } catch (err) {
            console.error("Error:", err);
        }
    };

    useEffect(() => { obtenerDatos(); }, []);

    useEffect(() => {
        const filtro = lista.filter((item) =>
            item.CODIGO_TIPO_OBJETIVO?.toLowerCase().includes(filtroCodigo.toLowerCase()) &&
            item.DESCRIPCION?.toLowerCase().includes(filtroDescripcion.toLowerCase())
        );
        setListaFiltrada(filtro);
    }, [lista, filtroCodigo, filtroDescripcion]);

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
                Mantenimiento de tipos de objetivo
            </Typography>
            <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => setShowModal(true)}
                sx={{ mb: 2 }}
            >
                Nuevo Tipo de Objetivo
            </Button>

            <Paper elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Opción</strong></TableCell>
                            <TableCell><strong>Código</strong></TableCell>
                            <TableCell><strong>Descripción</strong></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Buscar</TableCell>
                            <TableCell>
                                <TextField
                                    value={filtroCodigo}
                                    onChange={(e) => setFiltroCodigo(e.target.value)}
                                    size="small"
                                    fullWidth
                                    placeholder="Código"
                                    InputProps={{ endAdornment: (<InputAdornment position="end"><SearchIcon /></InputAdornment>) }}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    value={filtroDescripcion}
                                    onChange={(e) => setFiltroDescripcion(e.target.value)}
                                    size="small"
                                    fullWidth
                                    placeholder="Descripción"
                                    InputProps={{ endAdornment: (<InputAdornment position="end"><SearchIcon /></InputAdornment>) }}
                                />
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {listaFiltrada.map((item) => (
                            <TableRow key={item.CODIGO_TIPO_OBJETIVO}>
                                <TableCell>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<EditIcon />}
                                        onClick={() => {
                                            setId(item.CODIGO_TIPO_OBJETIVO);
                                            setShowModal(true);
                                        }}
                                    >
                                        Editar
                                    </Button>
                                </TableCell>
                                <TableCell>{item.CODIGO_TIPO_OBJETIVO}</TableCell>
                                <TableCell>{item.DESCRIPCION}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <FormTipoObjetivo
                showModal={showModal}
                id={id}
                onClose={onClose}
                onSuccess={() => {
                    obtenerDatos();
                    onClose();
                    mostrarAlerta("success", "Guardado exitosamente");
                }}
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

export default TipoObjetivoMain;
