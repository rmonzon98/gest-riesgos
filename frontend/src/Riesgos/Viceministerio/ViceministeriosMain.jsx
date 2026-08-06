import { useState, useEffect } from "react";
import apiClient from "api/apiClient";
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    IconButton,
    InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import FormViceministerio from "./FormViceministerio";
import AlertaMensaje from "../Alerta F/AlertaMensaje";


export default function ViceministeriosMain() {
    const [alerta, setAlerta] = useState({
        open: false,
        tipo: "success",
        mensaje: "",
    });

    const [lista, setLista] = useState([]);
    const [listaFiltrada, setListaFiltrada] = useState([]);
    const [filtroNombre, setFiltroNombre] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [codigoViceministerio, setCodigoViceministerio] = useState("");

    const mostrarAlerta = (tipo, mensaje) =>
        setAlerta({ open: true, tipo, mensaje });

    const obtener = async (q = "") => {
        try {
            const { data } = await apiClient.get("/api/viceministerios", {
                params: q ? { q } : {},
            });
            const arr = Array.isArray(data?.viceministerios)
                ? data.viceministerios
                : [];
            setLista(arr);
        } catch (e) {
            console.error("obtener viceministerios:", e);
            mostrarAlerta("error", "No se pudieron cargar los viceministerios.");
        }
    };

    useEffect(() => {
        obtener();
    }, []);

    useEffect(() => {
        const f = (lista || []).filter((x) =>
            String(x.NOMBRE || "")
                .toLowerCase()
                .includes(filtroNombre.toLowerCase())
        );
        setListaFiltrada(f);
    }, [lista, filtroNombre]);

    const onClose = () => {
        setCodigoViceministerio("");
        setShowModal(false);
    };

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Mantenimiento de viceministerios
            </Typography>

            <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => setShowModal(true)}
                sx={{ mb: 2 }}
            >
                Nuevo viceministerio
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
                                    size="small"
                                    placeholder="Búsqueda por nombre"
                                    value={filtroNombre}
                                    onChange={(e) => setFiltroNombre(e.target.value)}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => obtener(filtroNombre)}>
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
                        {(listaFiltrada || []).map((it) => (
                            <TableRow
                                key={`${it.CODIGO_CIA}-${it.CODIGO_VICEMINISTERIO}`}
                                hover
                            >
                                <TableCell>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<EditIcon />}
                                        onClick={() => {
                                            setCodigoViceministerio(it.CODIGO_VICEMINISTERIO);
                                            setShowModal(true);
                                        }}
                                    >
                                        Editar
                                    </Button>
                                </TableCell>
                                <TableCell>{it.NOMBRE}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <FormViceministerio
                showModal={showModal}
                codigoViceministerio={codigoViceministerio}
                onClose={onClose}
                onSuccess={() => {
                    obtener();
                    onClose();
                    mostrarAlerta("success", "Guardado exitosamente");
                }}
                onError={(e) => mostrarAlerta("error", e?.response?.data?.mensaje || "Ocurrió un error.")}
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
