import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Dialog,
    DialogActions, DialogContent, DialogTitle, Divider, IconButton, LinearProgress,
    Paper, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import apiClient from 'api/apiClient';
import { colorTolerancia } from 'funciones/CalculoRiesgo';
import ModalIngresoRiesgosPropiedades from '../Componentes/ModalIngresoRiesgosPropiedades';
import { cargarObjetivosRiesgo, mapCatsInicial, safeArr } from '../Componentes/catalogosRiesgo';
import PlanesRiesgo from './PlanesRiesgo';
import VinculosRiesgo from './VinculosRiesgo';
import DialogoEliminacion, { estadosEliminacion } from 'Riesgos/Administracion/DialogoEliminacion';
import RecorridoGuiado from 'funciones/RecorridoGuiado';
import recorridoDetalle from 'Riesgos/Recorridos/riesgo-detalle';

const tabs = ['Datos', 'Eventos', 'Planes y responsables', 'Vínculos', 'Historial'];
const targetsTabs = ['datos', 'eventos', 'planes', 'vinculos', 'historial'];
const estados = [
    { texto: 'Pendiente', color: 'warning' },
    { texto: 'Aprobado', color: 'success' },
    { texto: 'Rechazado', color: 'error' }
];
const nombreAccion = { 1: 'Creación', 2: 'Actualización', 3: 'Eliminación' };
const mensajeError = error => error?.response?.data?.error || 'No se pudo completar la operación.';

function listaCambios(informacion) {
    try {
        const { antes, despues, registro } = JSON.parse(informacion);
        if (antes && despues) return Object.keys(despues)
            .filter(key => antes[key] !== despues[key]).map(key => [key, antes[key], despues[key]]);
        return Object.entries(registro ?? {}).filter(([, value]) => value != null).map(([key, value]) => [key, null, value]);
    } catch { return []; }
}

function Historial({ historia }) {
    if (!historia.length) return <Typography color="text.secondary">Todavía no hay registros en la bitácora.</Typography>;
    return historia.map(item => {
        const cambios = listaCambios(item.informacion);
        return <Accordion key={item.codigoLog} disableGutters elevation={0} variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 2 }}>
                    <Typography fontWeight={600}>{nombreAccion[item.accion]} de {item.tabla === 'riesgos_riesgo_evento' ? 'evento' : 'riesgo'}</Typography>
                    <Typography color="text.secondary">{item.autor || 'Sistema'} · {item.fecha ? new Date(item.fecha).toLocaleString('es-GT') : '—'}</Typography>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                {cambios.length ? <Box component="dl" sx={{ m: 0, overflowWrap: 'anywhere' }}>
                    {cambios.map(([campo, anterior, actual]) => <Box key={campo} sx={{ py: 0.5 }}>
                        <Typography component="dt" variant="caption" color="text.secondary">{campo.replaceAll('_', ' ')}</Typography>
                        <Typography component="dd" variant="body2" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
                            {anterior == null ? '' : `${anterior} → `}{actual ?? '—'}
                        </Typography>
                    </Box>)}
                </Box> : <Typography color="text.secondary">Sin cambios de valores registrados.</Typography>}
            </AccordionDetails>
        </Accordion>;
    });
}

function SolicitudesEliminacion({ solicitudes, cancelar }) {
    if (!solicitudes.length) return null;
    return <>
        <Typography component="h2" variant="subtitle1" fontWeight={700}>Solicitudes de eliminación</Typography>
        {solicitudes.map(solicitud => <Paper key={solicitud.codigoSolicitud} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1} alignItems="flex-start">
                <Chip label={estadosEliminacion[solicitud.estado]} color={solicitud.estado === 'P' ? 'warning' : 'default'} size="small" />
                <Typography variant="body2" color="text.secondary">{solicitud.solicitante} · {new Date(solicitud.fechaSolicitud).toLocaleString('es-GT')}</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{solicitud.motivo}</Typography>
                {solicitud.resolutor && <Typography variant="body2" color="text.secondary">
                    {solicitud.resolutor} · {new Date(solicitud.fechaResolucion).toLocaleString('es-GT')}
                </Typography>}
                {solicitud.comentarioResolucion && <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {solicitud.comentarioResolucion}
                </Typography>}
                {solicitud.puedeCancelar && <Button size="small" color="error" onClick={() => cancelar(solicitud.codigoSolicitud)}>Cancelar solicitud</Button>}
            </Stack>
        </Paper>)}
        <Divider />
    </>;
}

function Eventos({ eventos, editable, ruta, refrescar }) {
    const [dialogo, setDialogo] = useState(null);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState('');
    const ejecutar = async action => {
        setOcupado(true);
        setError('');
        try {
            await action();
            setDialogo(null);
            await refrescar();
        } catch (e) { setError(mensajeError(e)); }
        finally { setOcupado(false); }
    };
    const mover = (indice, paso) => {
        const orden = eventos.map(evento => evento.codigoEvento);
        const destino = indice + paso;
        [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
        return ejecutar(() => apiClient.put(`${ruta}/orden`, { eventos: orden }));
    };
    const guardar = () => ejecutar(() => dialogo.codigoEvento == null
        ? apiClient.post(ruta, { descripcion: dialogo.descripcion })
        : apiClient.put(`${ruta}/${dialogo.codigoEvento}`, { descripcion: dialogo.descripcion }));

    return <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
            <Typography color="text.secondary">La probabilidad y la severidad se califican en la pestaña Datos.</Typography>
            {editable && <Button startIcon={<AddRounded />} variant="contained" disabled={ocupado}
                onClick={() => { setError(''); setDialogo({ descripcion: '' }); }}>Agregar evento</Button>}
        </Stack>
        {error && !dialogo && <Alert severity="error">{error}</Alert>}
        {!eventos.length && <Typography color="text.secondary">No hay eventos activos.</Typography>}
        {eventos.map((evento, indice) => <Paper key={evento.codigoEvento} variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <Typography sx={{ flex: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{evento.descripcion}</Typography>
                {editable && <Box sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Subir"><span><IconButton aria-label={`Subir evento ${indice + 1}`} disabled={ocupado || indice === 0} onClick={() => mover(indice, -1)}><ArrowUpwardRounded fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="Bajar"><span><IconButton aria-label={`Bajar evento ${indice + 1}`} disabled={ocupado || indice === eventos.length - 1} onClick={() => mover(indice, 1)}><ArrowDownwardRounded fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="Editar"><IconButton aria-label={`Editar evento ${indice + 1}`} disabled={ocupado} onClick={() => { setError(''); setDialogo(evento); }}><EditOutlined fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Desactivar"><IconButton aria-label={`Desactivar evento ${indice + 1}`} color="error" disabled={ocupado}
                        onClick={() => ejecutar(() => apiClient.delete(`${ruta}/${evento.codigoEvento}`))}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
                </Box>}
            </Stack>
        </Paper>)}
        <Dialog open={Boolean(dialogo)} onClose={() => !ocupado && setDialogo(null)} fullWidth maxWidth="sm">
            <DialogTitle>{dialogo?.codigoEvento == null ? 'Agregar evento' : 'Editar evento'}</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TextField autoFocus fullWidth required margin="dense" label="Descripción" value={dialogo?.descripcion || ''}
                    inputProps={{ maxLength: 1000 }} onChange={event => setDialogo(value => ({ ...value, descripcion: event.target.value }))} />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDialogo(null)} disabled={ocupado}>Cancelar</Button>
                <Button onClick={guardar} variant="contained" disabled={ocupado || !dialogo?.descripcion.trim()}>Guardar</Button>
            </DialogActions>
        </Dialog>
    </Stack>;
}

export default function RiesgoDetalle() {
    const { entidad, periodo, codigo } = useParams();
    const ruta = `/api/marn/riesgo/${entidad}/${periodo}/${codigo}`;
    const [detalle, setDetalle] = useState(null);
    const [cats, setCats] = useState(null);
    const [tab, setTab] = useState(0);
    const [version, setVersion] = useState(0);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [eliminacion, setEliminacion] = useState(null);
    const refrescar = useCallback(async () => {
        const { data } = await apiClient.get(ruta);
        setDetalle(data.result);
    }, [ruta]);

    useEffect(() => {
        let vigente = true;
        setDetalle(null);
        setCats(null);
        setTab(0);
        setError('');
        setGuardado(false);
        setEliminacion(null);
        const raiz = '/api/riesgos-variables-actualizados';
        Promise.all([
            apiClient.get(ruta),
            apiClient.get(`${raiz}/obtener-info-inicial-vista-riesgos`),
            cargarObjetivosRiesgo(),
            apiClient.get('/api/areas-actualizados', { params: { entidad } })
        ]).then(([riesgo, catalogos, objetivos, areas]) => {
            if (!vigente) return;
            const result = riesgo.data.result;
            const asociaciones = safeArr(areas.data.result).map(row => ({ CODIGO: row.CODIGO_AREA, DESCRIPCION: row.DESCRIPCION }));
            const previa = result.riesgo.CODIGO_AREA;
            if (previa != null && !asociaciones.some(row => row.CODIGO === previa)) {
                asociaciones.push({ CODIGO: previa, DESCRIPCION: `Área registrada (${previa})`, anterior: true });
            }
            setCats({ ...mapCatsInicial(catalogos.data), areas: asociaciones, objetivos });
            setDetalle(result);
        }).catch(e => { if (vigente) setError(e.response?.status === 403 ? 'No tiene acceso a este riesgo.' : mensajeError(e)); });
        return () => { vigente = false; };
    }, [ruta, entidad]);

    const guardarDatos = async payload => {
        setGuardando(true);
        setGuardado(false);
        setError('');
        try {
            await apiClient.put('/api/riesgos-variables-actualizados', { ...payload, codigoEntidad: Number(entidad), tipo: 'ME' });
            await refrescar();
            setVersion(current => current + 1);
            setGuardado(true);
        } catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); }
    };
    const volver = `/riesgos/evaluacion-gestion-riesgos?periodo=${periodo}`;
    const riesgo = detalle?.riesgo;
    const propiedades = safeArr(detalle?.propiedades);
    const pendiente = detalle?.solicitudes.some(solicitud => solicitud.estado === 'P');
    const eliminar = async motivo => {
        if (eliminacion.tipo === 'cancelar') {
            await apiClient.patch(`/api/marn/solicitudes-eliminacion/${eliminacion.codigo}/cancelar`);
        } else if (eliminacion.tipo === 'solicitar') {
            await apiClient.post(`${ruta}/solicitudes-eliminacion`, { motivo });
        } else {
            await apiClient.put('/api/riesgos-variables-actualizados/eliminar', {
                codigo_riesgo: Number(codigo), codigo_entidad: Number(entidad), periodo: Number(periodo), tipo: 'ME'
            });
        }
        await refrescar();
    };

    return <Box sx={{ maxWidth: 1320, mx: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
        <Button component={Link} to={volver} startIcon={<ArrowBackRounded />} sx={{ mb: 2 }}>Lista de riesgos</Button>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!detalle && !error && <LinearProgress aria-label="Cargando riesgo" />}
        {detalle && cats && <>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2, borderTop: 3, borderTopColor: 'primary.main' }}>
                <Stack spacing={1.25}>
                    <Typography color="text.secondary" variant="subtitle2">{detalle.direccion?.nombre || 'Dirección'} · Período {periodo}</Typography>
                    {detalle.vinculado && <Chip size="small" color="primary" variant="outlined"
                        label={`Vinculado de ${detalle.direccion?.nombre || 'otra dirección'}`} sx={{ alignSelf: 'flex-start' }} />}
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography component="h1" variant="h5" fontWeight={700} data-tour="riesgo-detalle-identidad">
                            {riesgo.REF || `Riesgo ${codigo}`}
                        </Typography>
                        <RecorridoGuiado pantalla="riesgo-detalle" pasos={recorridoDetalle} />
                    </Stack>
                    {riesgo.DESCRIPCION && <Typography sx={{ overflowWrap: 'anywhere' }}>{riesgo.DESCRIPCION}</Typography>}
                    <Typography variant="body2" color="text.secondary">Dueño: {detalle.dueno || 'Sin asignar'}</Typography>
                    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
                        {pendiente && !riesgo.ELIMINADO && <Chip label="Eliminación solicitada" color="warning" size="small" />}
                        {['ME', 'MC', 'MCE'].map(tipo => {
                            const estado = estados[Number(riesgo[`ESTADO_${tipo}_SUPERIOR`])] ?? estados[0];
                            return <Chip key={tipo} size="small" variant="outlined" color={estado.color} label={`${tipo}: ${estado.texto}`} />;
                        })}
                        <Chip size="small" color={colorTolerancia(riesgo.RIESGO_INHERENTE)} label={`Inherente: ${riesgo.RIESGO_INHERENTE ?? '—'}`} />
                        <Chip size="small" color={colorTolerancia(riesgo.RIESGO_RESIDUAL)} label={`Residual: ${riesgo.RIESGO_RESIDUAL ?? '—'}`} />
                    </Stack>
                    {(detalle.puedeEliminarDirecto || (detalle.puedeSolicitarEliminacion && !pendiente)) &&
                        <Button color="error" size="small" sx={{ alignSelf: 'flex-start' }} startIcon={<DeleteOutlineRounded />}
                            onClick={() => setEliminacion({ tipo: detalle.puedeEliminarDirecto ? 'directa' : 'solicitar' })}>
                            {detalle.puedeEliminarDirecto ? 'Eliminar riesgo' : 'Solicitar eliminación'}
                        </Button>}
                </Stack>
            </Paper>
            {!detalle.editable && <Alert severity="info" sx={{ mb: 2 }}>Este riesgo está en modo de solo lectura.</Alert>}
            {guardado && <Alert severity="success" onClose={() => setGuardado(false)} sx={{ mb: 2 }}>Cambios guardados.</Alert>}
            <Paper variant="outlined">
                <Tabs value={tab} onChange={(_, next) => setTab(next)} variant="scrollable" scrollButtons="auto" aria-label="Detalle del riesgo">
                    {tabs.map((nombre, index) => <Tab key={nombre} id={`riesgo-tab-${index}`} aria-controls={`riesgo-panel-${index}`}
                        data-tour={`riesgo-detalle-${targetsTabs[index]}`} label={nombre} />)}
                </Tabs>
                <Divider />
                {tabs.map((nombre, index) => <Box key={nombre} hidden={tab !== index} role="tabpanel"
                    id={`riesgo-panel-${index}`} aria-labelledby={`riesgo-tab-${index}`} sx={{ p: { xs: 2, md: 3 } }}>
                    {index === 0 && <ModalIngresoRiesgosPropiedades key={`${ruta}/${version}`} open inline soloLectura={!detalle.editable}
                        initialData={riesgo} cats={cats} periodo={periodo} entidad={detalle.direccion?.nombre} siglas={detalle.direccion?.siglas}
                        ejes={detalle.ejes} puedeCambiarDueno={detalle.puedeCambiarDueno} saving={guardando} onRequestSave={guardarDatos}
                        propiedadesDef={propiedades.filter(prop => prop?.source === 'predefinida' || ['CODIGO_EJE', 'OBJETIVO_TEXTO'].includes(prop?.key))}
                        propiedadesExt={propiedades.filter(prop => prop?.source !== 'predefinida' && !['CODIGO_EJE', 'OBJETIVO_TEXTO'].includes(prop?.key))} />}
                    {index === 1 && <Eventos eventos={detalle.eventos} editable={detalle.editable} ruta={`${ruta}/eventos`} refrescar={refrescar} />}
                    {index === 2 && tab === 2 && <PlanesRiesgo ruta={ruta} editable={detalle.editable}
                        frecuencias={cats.frecuencia} anio={detalle.anioPeriodo} refrescar={refrescar} />}
                    {index === 3 && tab === 3 && <VinculosRiesgo ruta={ruta} editable={detalle.editable}
                        entidad={entidad} refrescar={refrescar} />}
                    {index === 4 && <Stack spacing={1}>
                        <SolicitudesEliminacion solicitudes={detalle.solicitudes} cancelar={codigo => setEliminacion({ tipo: 'cancelar', codigo })} />
                        <Historial historia={detalle.historia} />
                    </Stack>}
                </Box>)}
            </Paper>
        </>}
        {eliminacion && <DialogoEliminacion confirmar={eliminar} onClose={() => setEliminacion(null)}
            titulo={{ directa: 'Eliminar riesgo', solicitar: 'Solicitar eliminación', cancelar: 'Cancelar solicitud' }[eliminacion.tipo]}
            campo={eliminacion.tipo === 'solicitar' ? 'Motivo' : undefined} obligatorio={eliminacion.tipo === 'solicitar'}
            descripcion={eliminacion.tipo === 'directa' ? '¿Desea eliminar este riesgo?' :
                eliminacion.tipo === 'cancelar' ? 'La solicitud dejará de estar pendiente.' : undefined} />}
    </Box>;
}
