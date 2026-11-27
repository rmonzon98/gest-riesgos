import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import apiClient from 'api/apiClient';

export default function FormArea({ area, direcciones, onClose, onSuccess }) {
    const [descripcion, setDescripcion] = useState(area.DESCRIPCION ?? '');
    const [abreviatura, setAbreviatura] = useState(area.ABREVIATURA ?? '');
    const [direccion, setDireccion] = useState(area.CODIGO_ENTIDAD ?? '');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const id = area.CODIGO_AREA;

    const guardar = async event => {
        event.preventDefault();
        setGuardando(true);
        setError('');
        const payload = { descripcion, abreviatura, ...(direccion !== (area.CODIGO_ENTIDAD ?? '') || !id ? { codigoEntidad: direccion || null } : {}) };
        try {
            if (id) await apiClient.put('/api/areas-actualizados', { ...payload, id });
            else await apiClient.post('/api/areas-actualizados', payload);
            await onSuccess();
        } catch (e) { setError(e?.response?.data?.error || 'No se pudo guardar el área.'); }
        finally { setGuardando(false); }
    };

    return <Dialog open fullWidth maxWidth="sm" onClose={() => !guardando && onClose()}>
        <form onSubmit={guardar}>
            <DialogTitle>{id ? 'Editar área' : 'Nueva área'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField required label="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} inputProps={{ maxLength: 200 }} />
                    <TextField label="Abreviatura" value={abreviatura} onChange={e => setAbreviatura(e.target.value)} inputProps={{ maxLength: 10 }} />
                    <TextField select label="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)}>
                        <MenuItem value="">General</MenuItem>
                        {direccion !== '' && !direcciones.some(row => row.CODIGO_ENTIDAD === direccion) &&
                            <MenuItem value={direccion} disabled>Dirección {direccion}</MenuItem>}
                        {direcciones.map(row => <MenuItem key={row.CODIGO_ENTIDAD} value={row.CODIGO_ENTIDAD}>{row.NOMBRE}</MenuItem>)}
                    </TextField>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={!descripcion.trim() || guardando}>Guardar</Button>
            </DialogActions>
        </form>
    </Dialog>;
}
