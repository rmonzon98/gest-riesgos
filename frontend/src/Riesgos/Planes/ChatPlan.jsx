import { useEffect, useState } from 'react';
import { Alert, Box, Button, Drawer, IconButton, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import apiClient from 'api/apiClient';

export default function ChatPlan({ asignacion, codigoUsuario, onClose, onLeidos }) {
    const [mensajes, setMensajes] = useState([]);
    const [texto, setTexto] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const ruta = `/api/marn/asignaciones/${asignacion.codigoResponsablePlan}/chat`;

    const cargar = async signal => {
        const { data } = await apiClient.get(ruta, { signal });
        if (signal?.aborted) return;
        setMensajes(data.result);
        const ultimo = data.result.at(-1);
        if (!ultimo || !data.result.some(m => !m.leido && Number(m.codigoAutor) !== Number(codigoUsuario))) return;
        await apiClient.patch(`${ruta}/leidos`, { hasta: ultimo.codigoMensaje }, { signal });
        if (!signal?.aborted) onLeidos?.(asignacion.codigoResponsablePlan);
    };
    useEffect(() => {
        const controller = new AbortController();
        cargar(controller.signal).catch(e => {
            if (!controller.signal.aborted) setError(e.response?.data?.error || 'No se pudo cargar el chat.');
        }).finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [ruta]);

    const enviar = async event => {
        event.preventDefault();
        if (!texto.trim() || enviando) return;
        setEnviando(true);
        setError('');
        try {
            await apiClient.post(ruta, { mensaje: texto });
            setTexto('');
            await cargar();
        } catch (e) { setError(e.response?.data?.error || 'No se pudo enviar el mensaje.'); }
        finally { setEnviando(false); }
    };

    return <Drawer anchor="right" open onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}>
        <Stack sx={{ height: '100%', p: 2 }} spacing={2}>
            <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                <Box><Typography component="h2" variant="h6">Chat del plan</Typography>
                    <Typography variant="body2" color="text.secondary">{asignacion.plan?.descripcion}</Typography></Box>
                <IconButton onClick={onClose} aria-label="Cerrar chat"><CloseRounded /></IconButton>
            </Stack>
            {cargando && <LinearProgress aria-label="Cargando mensajes" />}
            {error && <Alert severity="error">{error}</Alert>}
            <Stack spacing={1.25} sx={{ flex: 1, overflowY: 'auto' }} role="log" aria-label="Mensajes del plan">
                {!cargando && !error && !mensajes.length && <Typography color="text.secondary" variant="body2">Aún no hay mensajes.</Typography>}
                {mensajes.map(mensaje => {
                    const propio = Number(mensaje.codigoAutor) === Number(codigoUsuario);
                    return <Paper variant="outlined" key={mensaje.codigoMensaje} sx={{ alignSelf: propio ? 'flex-end' : 'flex-start', maxWidth: '90%',
                        bgcolor: propio ? 'action.selected' : 'background.paper', p: 1.25 }}>
                        <Typography variant="caption" fontWeight={700}>{propio ? 'Tú' : mensaje.autor || 'Participante'}</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{mensaje.mensaje}</Typography>
                        <Typography variant="caption" color="text.secondary">{new Date(mensaje.fecha).toLocaleString('es-GT')}</Typography>
                    </Paper>;
                })}
            </Stack>
            <Stack component="form" onSubmit={enviar} direction="row" spacing={1} alignItems="flex-start">
                <TextField label="Mensaje" fullWidth multiline maxRows={4} size="small" value={texto} onChange={event => setTexto(event.target.value)} inputProps={{ maxLength: 2000 }} />
                <Button type="submit" variant="contained" disabled={!texto.trim() || enviando || cargando} aria-label="Enviar mensaje"><SendRounded /></Button>
            </Stack>
        </Stack>
    </Drawer>;
}
