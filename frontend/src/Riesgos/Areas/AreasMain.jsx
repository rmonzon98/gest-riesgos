/**
 * @fileoverview
 * Panel principal de administración de áreas y módulos habilitados por área.
 *
 * @module Riesgos/Areas/AreasMain.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useState, useEffect } from "react";
import axios from "axios";
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
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import FormArea from "./FormArea";
import AlertaMensaje from "../Alerta F/AlertaMensaje"

function AreasMain() {

    const [alerta, setAlerta] = useState({
        open: false,
        tipo: 'success',
        mensaje: ''
    });
    const [listaAreas, setListaAreas] = useState([]);
    const [listaFiltrada, setListaFiltrada] = useState([]);
    const [filtroDescripcion, setFiltroDescripcion] = useState('');
    const [filtroAbreviatura, setFiltroAbreviatura] = useState('');
    const [showModal, setShowModal] = useState(false)
    const [id, setId] = useState('')

    /**
     * Consulta la lista de áreas configuradas en el sistema.
     */
    const obtenerAreas = async () => {
        try {
            const response = await axios.get('/api/areas-actualizados', {
                headers: { "x-access-token": localStorage.getItem('token') }
            });
            setListaAreas(response.data.result);
        } catch (error) {
            console.error('Error al obtener áreas:', error);
        }
    };

    useEffect(() => {
        obtenerAreas()
    }, []);

    useEffect(() => {
        /**
         * Aplica los filtros por texto de búsqueda sobre la lista de áreas.
         */
        const filtrado = listaAreas.filter(area =>
            area.DESCRIPCION.toLowerCase().includes(filtroDescripcion.toLowerCase()) &&
            area.ABREVIATURA.toLowerCase().includes(filtroAbreviatura.toLowerCase())
        );
        setListaFiltrada(filtrado);
    }, [listaAreas, filtroDescripcion, filtroAbreviatura]);

    const onClose = () => {
        setId('')
        setShowModal(false)
    }

    const onError = () => {
        setAlerta({ open: true, tipo: 'error', mensaje: 'Error al realizar la acción' });
    }

    const mostrarAlerta = (tipo, mensaje) => {
        setAlerta({ open: true, tipo, mensaje });
    };

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Mantenimiento de áreas
            </Typography>

            <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => {
                    setShowModal(true)
                }}
                sx={{ mb: 2 }}
            >
                Nueva área
            </Button>

            <Paper elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Opción</strong></TableCell>
                            <TableCell><strong>Descripción</strong></TableCell>
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
                                                <IconButton>
                                                    <SearchIcon />
                                                </IconButton>
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
                                                <IconButton>
                                                    <SearchIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {listaFiltrada.map((value) => (
                            <TableRow key={value.CODIGO}>
                                <TableCell>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<EditIcon />}
                                        onClick={() => {
                                            setShowModal(true)
                                            setId(value.CODIGO_AREA)
                                        }}
                                    >
                                        Editar
                                    </Button>
                                </TableCell>
                                <TableCell>{value.DESCRIPCION}</TableCell>
                                <TableCell>{value.ABREVIATURA}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
            <FormArea showModal={showModal} id={id} onClose={onClose} onSuccess={() => {
                obtenerAreas(); onClose(); mostrarAlerta('success', 'Guardado exitosamente');
            }}
                onError={onError} />
            <AlertaMensaje
                open={alerta.open}
                tipo={alerta.tipo}
                mensaje={alerta.mensaje}
                setOpen={() => setAlerta(prev => ({ ...prev, open: false }))}
            />
        </Box>
    );
}

export default AreasMain;
