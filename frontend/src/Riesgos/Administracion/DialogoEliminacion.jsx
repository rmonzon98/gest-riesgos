import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';

export const estadosEliminacion = { P: 'Pendiente', A: 'Autorizada', D: 'Denegada', C: 'Cancelada' };

export default function DialogoEliminacion({ titulo, campo, obligatorio, descripcion, onClose, confirmar }) {
    const [valor, setValor] = useState('');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const enviar = async event => {
        event.preventDefault();
        setError('');
        setGuardando(true);
        try {
            await confirmar(valor.trim());
            onClose();
        } catch (e) { setError(e.response?.data?.error || 'No se pudo completar la operación.'); }
        finally { setGuardando(false); }
    };
    return <Dialog open onClose={guardando ? undefined : onClose} fullWidth maxWidth="sm">
        <form onSubmit={enviar}>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogContent>
                {descripcion && <DialogContentText>{descripcion}</DialogContentText>}
                {error && <Alert severity="error">{error}</Alert>}
                {campo && <TextField autoFocus fullWidth multiline minRows={3} margin="dense" label={campo}
                    required={obligatorio} inputProps={{ maxLength: 1000 }} value={valor} disabled={guardando}
                    onChange={event => setValor(event.target.value)} />}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={guardando}>Cerrar</Button>
                <Button type="submit" color="error" variant="contained" disabled={guardando || (obligatorio && !valor.trim())}>{titulo}</Button>
            </DialogActions>
        </form>
    </Dialog>;
}
