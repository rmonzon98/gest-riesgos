import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Drawer,
    IconButton, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import AttachFileRounded from '@mui/icons-material/AttachFileRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import { saveAs } from 'file-saver';
import apiClient from 'api/apiClient';
import { safefmt } from 'funciones/Fechas';

const ESTADOS = { P: ['Por verificar', 'warning'], O: ['Observada', 'error'], V: ['Verificada', 'success'] };
const fecha = value => safefmt(value?.slice(0, 10)) || '—';
const errorApi = (e, fallback) => e.response?.data?.error || fallback;
const diaEnRango = (hoy, inicio, fin) => hoy < inicio ? inicio : hoy > fin ? fin : hoy;

function FormActividad({ registro, desde, hasta, hoy, onClose, guardar, guardando, error }) {
    const [dia, setDia] = useState(registro?.fechaActividad?.slice(0, 10) ?? diaEnRango(hoy, desde, hasta));
    const [descripcion, setDescripcion] = useState(registro?.descripcion ?? '');
    const [documento, setDocumento] = useState(registro?.documentoGenerado ?? '');
    const [files, setFiles] = useState([]);
    const [errorArchivo, setErrorArchivo] = useState('');
    const [arrastrando, setArrastrando] = useState(false);
    const agregar = lista => {
        if (files.length + lista.length > 10) return setErrorArchivo('Puede adjuntar hasta 10 archivos.');
        if (lista.some(file => file.size > 50 * 1024 * 1024)) return setErrorArchivo('Cada archivo puede pesar hasta 50 MB.');
        setErrorArchivo('');
        setFiles([...files, ...lista]);
    };
    const enviar = event => {
        event.preventDefault();
        if (registro) return guardar({ fechaActividad: dia, descripcion, documentoGenerado: documento });
        const payload = new FormData();
        payload.append('fechaActividad', dia);
        payload.append('descripcion', descripcion);
        payload.append('documentoGenerado', documento);
        for (const file of files) payload.append('files[]', file);
        return guardar(payload);
    };
    return <Dialog open fullWidth maxWidth="sm" onClose={() => !guardando && onClose()}>
        <form onSubmit={enviar}>
            <DialogTitle>{registro ? 'Editar actividad' : 'Registrar actividad'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {(error || errorArchivo) && <Alert severity="error">{error || errorArchivo}</Alert>}
                    {registro?.estado === 'O' && registro.comentarioVerificador && <Alert severity="warning">{registro.comentarioVerificador}</Alert>}
                    <TextField label="Fecha de actividad" type="date" required InputLabelProps={{ shrink: true }}
                        inputProps={{ min: desde, max: hasta }} value={dia} onChange={e => setDia(e.target.value)} />
                    <TextField label="Descripción" required multiline minRows={3} inputProps={{ maxLength: 2000 }}
                        value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                    <TextField label="Documento generado" inputProps={{ maxLength: 500 }} value={documento} onChange={e => setDocumento(e.target.value)} />
                    {!registro && <Stack spacing={1}>
                        <Stack spacing={0.5} alignItems="center" onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
                            onDragLeave={() => setArrastrando(false)} onDrop={e => { e.preventDefault(); setArrastrando(false); agregar([...e.dataTransfer.files]); }}
                            sx={{ p: 1.5, border: '1px dashed', borderColor: arrastrando ? 'primary.main' : 'divider', borderRadius: 1.5,
                                bgcolor: arrastrando ? 'action.selected' : 'action.hover' }}>
                            <Button component="label" startIcon={<AttachFileRounded />}>
                                Seleccionar archivos
                                <input type="file" multiple hidden onChange={e => { agregar([...e.target.files]); e.target.value = ''; }} />
                            </Button>
                            <Typography variant="caption" color="text.secondary">O arrástrelos aquí. Hasta 10 archivos de 50 MB.</Typography>
                        </Stack>
                        {files.map((file, index) => <Chip key={`${file.name}/${index}`} label={file.name}
                            onDelete={() => { setFiles(files.filter((_, i) => i !== index)); setErrorArchivo(''); }} />)}
                    </Stack>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={guardando || !descripcion.trim() || !dia || dia < desde || dia > hasta}>Guardar</Button>
            </DialogActions>
        </form>
    </Dialog>;
}

export default function ActividadesPlan({ asignacion, corte, hoy, abrirRegistro, refrescar, onClose }) {
    const [actividades, setActividades] = useState([]);
    const [registro, setRegistro] = useState(abrirRegistro ? {} : null);
    const [desactivar, setDesactivar] = useState(null);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const ruta = `/api/marn/asignaciones/${asignacion.codigoResponsablePlan}/actividades`;
    const cargar = async signal => {
        const { data } = await apiClient.get(ruta, { params: { corte: corte?.indice }, signal });
        if (!signal?.aborted) setActividades(data.result);
    };
    useEffect(() => {
        const controller = new AbortController();
        cargar(controller.signal).catch(e => { if (!controller.signal.aborted) setError(errorApi(e, 'No se pudieron cargar las actividades.')); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [ruta, corte?.indice]);

    const ejecutar = async write => {
        setGuardando(true);
        setError('');
        try {
            await write();
            setRegistro(null);
            setDesactivar(null);
            await Promise.all([cargar(), refrescar()]);
        } catch (e) { setError(errorApi(e, 'No se pudo guardar la actividad.')); }
        finally { setGuardando(false); }
    };
    const descargar = async (actividad, documento) => {
        try {
            const { data } = await apiClient.get(`${ruta}/${actividad.codigoActividad}/documentos/${documento.codigoDoc}`, { responseType: 'blob' });
            saveAs(data, documento.nombre);
        } catch (e) { setError(errorApi(e, 'No se pudo descargar el archivo.')); }
    };
    const desde = corte?.desde ?? asignacion.fechaInicio.slice(0, 10);
    const hasta = corte?.hasta ?? asignacion.fechaFin.slice(0, 10);
    const editando = registro?.codigoActividad != null;
    return <Drawer anchor="right" open onClose={() => !guardando && onClose()} PaperProps={{ sx: { width: { xs: '100%', sm: 510 } } }}>
        <Stack spacing={2} sx={{ p: 2, minHeight: '100%' }}>
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                <Box><Typography component="h2" variant="h6">{corte ? `Actividades · ${corte.etiqueta}` : 'Actividades del plan'}</Typography>
                    <Typography color="text.secondary" variant="body2">{fecha(desde)} al {fecha(hasta)}</Typography></Box>
                <IconButton onClick={onClose} aria-label="Cerrar actividades" disabled={guardando}><CloseRounded /></IconButton>
            </Stack>
            <Button variant="contained" startIcon={<AddRounded />} sx={{ alignSelf: 'flex-start' }} onClick={() => { setError(''); setRegistro({}); }}>Registrar actividad</Button>
            {cargando && <LinearProgress aria-label="Cargando actividades" />}
            {error && !registro && !desactivar && <Alert severity="error">{error}</Alert>}
            {!cargando && !error && actividades.length === 0 && <Typography color="text.secondary">No hay actividades registradas.</Typography>}
            {actividades.map(row => {
                const [estado, color] = ESTADOS[row.estado] ?? ESTADOS.P;
                return <Paper key={row.codigoActividad} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                            <Typography variant="subtitle2">{fecha(row.fechaActividad)}</Typography>
                            <Chip size="small" color={color} label={estado} />
                            {row.fueraDePlazo && <Chip size="small" variant="outlined" color="warning" label="Fuera de plazo" />}
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.descripcion}</Typography>
                        {row.documentoGenerado && <Typography variant="body2" color="text.secondary">Documento: {row.documentoGenerado}</Typography>}
                        {row.comentarioVerificador && <Alert severity={row.estado === 'O' ? 'warning' : 'info'}>{row.comentarioVerificador}</Alert>}
                        {row.documentos.map(doc => <Button key={doc.codigoDoc} size="small" onClick={() => descargar(row, doc)}
                            startIcon={<DownloadRounded />} sx={{ alignSelf: 'flex-start', textAlign: 'left' }}>{doc.nombre}</Button>)}
                        {row.estado !== 'V' && <Stack direction="row" spacing={1}>
                            <Button size="small" onClick={() => { setError(''); setRegistro(row); }}>Editar</Button>
                            <Button size="small" color="error" onClick={() => { setError(''); setDesactivar(row); }}>Desactivar</Button>
                        </Stack>}
                    </Stack>
                </Paper>;
            })}
        </Stack>
        {registro && <FormActividad registro={editando ? registro : null} desde={editando ? asignacion.fechaInicio.slice(0, 10) : desde}
            hasta={editando ? asignacion.fechaFin.slice(0, 10) : hasta} hoy={hoy} error={error} guardando={guardando}
            onClose={() => { setError(''); setRegistro(null); }} guardar={payload => ejecutar(() => editando
                ? apiClient.put(`${ruta}/${registro.codigoActividad}`, payload) : apiClient.post(ruta, payload))} />}
        {desactivar && <Dialog open onClose={() => !guardando && setDesactivar(null)}>
            <DialogTitle>Desactivar actividad</DialogTitle>
            <DialogContent>{error ? <Alert severity="error">{error}</Alert> : <Typography>¿Desactivar la actividad del {fecha(desactivar.fechaActividad)}?</Typography>}</DialogContent>
            <DialogActions>
                <Button onClick={() => { setError(''); setDesactivar(null); }} disabled={guardando}>Cancelar</Button>
                <Button variant="contained" color="error" disabled={guardando} onClick={() => ejecutar(() => apiClient.delete(`${ruta}/${desactivar.codigoActividad}`))}>Desactivar</Button>
            </DialogActions>
        </Dialog>}
    </Drawer>;
}
