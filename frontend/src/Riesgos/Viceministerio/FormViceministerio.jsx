import { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
} from "@mui/material";
import axios from "axios";

const headers = () => ({ "x-access-token": localStorage.getItem("token") });

/**
 * FormViceministerio
 * Props:
 * - showModal: boolean
 * - codigoViceministerio?: number (si viene => edición)
 * - onClose: () => void
 * - onSuccess?: () => void
 * - onError?: () => void
 */
export default function FormViceministerio({
    showModal,
    codigoViceministerio,
    onClose,
    onSuccess,
    onError,
}) {
    const [nombre, setNombre] = useState("");
    const MAX_NOMBRE = 100;

    // Cargar en edición
    useEffect(() => {
        if (showModal && codigoViceministerio) {
            axios
                .get("/api/viceministerios/obtener-viceministerio", {
                    headers: headers(),
                    params: { codigo_viceministerio: Number(codigoViceministerio) },
                })
                .then(({ data }) => {
                    const v = data?.viceministerio || {};
                    setNombre(v.NOMBRE || "");
                })
                .catch((e) => {
                    console.error("cargar viceministerio:", e);
                    onError && onError();
                });
        } else if (showModal) {
            setNombre("");
        }
    }, [showModal, codigoViceministerio]);

    const guardar = async () => {
        try {
            const body = { nombre: nombre.trim() };
            if (!body.nombre) {
                onError && onError();
                return;
            }

            if (codigoViceministerio) {
                await axios.put(
                    "/api/viceministerios",
                    { ...body, codigo_viceministerio: Number(codigoViceministerio) },
                    { headers: headers() }
                );
            } else {
                await axios.post("/api/viceministerios", body, { headers: headers() });
            }

            onSuccess ? onSuccess() : onClose();
        } catch (e) {
            console.error("guardar viceministerio:", e);
            onError && onError(e);
        }
    };

    return (
        <Dialog open={!!showModal} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                {codigoViceministerio ? "Editar viceministerio" : "Nuevo viceministerio"}
            </DialogTitle>
            <DialogContent>
                <Box mt={2}>
                    <TextField
                        fullWidth
                        label="Nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        inputProps={{ maxLength: MAX_NOMBRE }}
                        helperText={`${nombre.length}/${MAX_NOMBRE} caracteres`}
                        margin="normal"
                        autoFocus
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Cancelar
                </Button>
                <Button onClick={guardar} variant="contained">
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
