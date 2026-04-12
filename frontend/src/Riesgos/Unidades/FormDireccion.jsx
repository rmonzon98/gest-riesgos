import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box
} from '@mui/material';
import axios from 'axios';

function FormDireccion({ showModal, id, onClose, onSuccess, onError }) {
    const [descripcion, setDescripcion] = useState('');
    const [abreviatura, setAbreviatura] = useState('');

    const MAX_DESC = 200;
    const MAX_ABR = 10;

    useEffect(() => {
        if (id && showModal) {
            axios.get(`/api/direcciones-actualizados/obtener-direccion`, {
                headers: { "x-access-token": localStorage.getItem('token') },
                params: { direccion: parseInt(id) }
            }).then((res) => {
                const data = res.data.result[0];
                setDescripcion(data.NOMBRE || '');
                setAbreviatura(data.SIGLAS || '');
            }).catch((err) => {
                console.error('Error al obtener dirección:', err);
            });
        } else {
            setDescripcion('');
            setAbreviatura('');
        }
    }, [id, showModal]);

    const handleSubmit = async () => {
        const payload = { descripcion, abreviatura };
        if (id) payload.id = id;

        try {
            if (id) {
                await axios.put(`/api/direcciones-actualizados`, payload, {
                    headers: { "x-access-token": localStorage.getItem('token') }
                }).catch((err) => { onError() });
            } else {
                await axios.post(`/api/direcciones-actualizados`, payload, {
                    headers: { "x-access-token": localStorage.getItem('token') }
                }).catch((err) => { onError() });
            }

            onSuccess ? onSuccess() : onClose();
        } catch (err) {
            console.error('Error guardando dirección:', err);
        }
    };

    return (
        <Dialog open={showModal} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{id ? 'Editar dirección' : 'Nueva dirección'}</DialogTitle>
            <DialogContent>
                <Box mt={2}>
                    <TextField
                        fullWidth
                        label="Descripción"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        inputProps={{ maxLength: MAX_DESC }}
                        helperText={`${descripcion.length}/${MAX_DESC} caracteres`}
                        margin="normal"
                        multiline
                    />

                    <TextField
                        fullWidth
                        label="Abreviatura"
                        value={abreviatura}
                        onChange={(e) => setAbreviatura(e.target.value)}
                        inputProps={{ maxLength: MAX_ABR }}
                        helperText={`${abreviatura.length}/${MAX_ABR} caracteres`}
                        margin="normal"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Cancelar
                </Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default FormDireccion;
