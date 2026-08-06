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
    InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import FormOrgano from "./FormOrgano";
import AlertaMensaje from "../Alerta F/AlertaMensaje";


export default function OrganosMain() {
    const [alerta, setAlerta] = useState({
        open: false,
        tipo: "success",
        mensaje: "",
    });

    const [lista, setLista] = useState([]);
    const [listaFiltrada, setListaFiltrada] = useState([]);
    const [filtroNombre, setFiltroNombre] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [codigoOrgano, setCodigoOrgano] = useState("");

    const mostrarAlerta = (tipo, mensaje) =>
        setAlerta({ open: true, tipo, mensaje });

    const obtenerOrganos = async (q = "") => {
        try {
            const { data } = await apiClient.get("/api/organos", {
                params: q ? { q } : {},
            });
            setLista(Array.isArray(data?.organos) ? data.organogos ?? data.organos : []);
        } catch (err) {
            console.error("Error al obtener órganos:", err);
            mostrarAlerta("error", "No se pudieron cargar los órganos.");
        }
    };

    useEffect(() => {
        obtenerOrganos();
    }, []);

    // Filtro en cliente (además del ?q del backend por si lo quieres usar)
    useEffect(() => {
        const f = (lista || []).filter((o) =>
            String(o.NOMBRE || "")
                .toLowerCase()
                .includes(filtroNombre.toLowerCase())
        );
        setListaFiltrada(f);
    }, [lista, filtroNombre]);

    const onClose = () => {
        setCodigoOrgano("");
        setShowModal(false);
    };

    const onError = () => {
        mostrarAlerta("error", "Error al realizar la acción.");
    };

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Mantenimiento de órganos
            </Typography>

            <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => setShowModal(true)}
                sx={{ mb: 2 }}
            >
                Nuevo órgano
            </Button>

            <Paper elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Opción</strong></TableCell>
                            <TableCell><strong>Nombre</strong></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Buscar</TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    placeholder="Búsqueda por nombre"
                                    value={filtroNombre}
                                    onChange={(e) => setFiltroNombre(e.target.value)}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => obtenerOrganos(filtroNombre)}>
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
                        {(listaFiltrada || []).map((o) => (
                            <TableRow key={`${o.CODIGO_CIA}-${o.CODIGO_ORGANO}`}>
                                <TableCell>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<EditIcon />}
                                        onClick={() => {
                                            setCodigoOrgano(o.CODIGO_ORGANO);
                                            setShowModal(true);
                                        }}
                                    >
                                        Editar
                                    </Button>
                                </TableCell>
                                <TableCell>{o.NOMBRE}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <FormOrgano
                showModal={showModal}
                codigoOrgano={codigoOrgano}
                onClose={onClose}
                onSuccess={() => {
                    obtenerOrganos();
                    onClose();
                    mostrarAlerta("success", "Guardado exitosamente");
                }}
                onError={onError}
            />

            <AlertaMensaje
                open={alerta.open}
                tipo={alerta.tipo}
                mensaje={alerta.mensaje}
                setOpen={() => setAlerta((p) => ({ ...p, open: false }))}
            />
        </Box>
    );
}
