import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Stack,
    Tab, Tabs, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import apiClient from 'api/apiClient';
import { localeTextES } from 'theme/localeTextES';
import { safefmt } from 'funciones/Fechas';
import LineaCortes from './LineaCortes';
import VistaAdjunto, { descargarAdjunto } from './VistaAdjunto';
import ChatPlan from './ChatPlan';
import usePeriodosPlanes from './usePeriodosPlanes';
import RecorridoGuiado from 'funciones/RecorridoGuiado';
import recorridoVerificacion from 'Riesgos/Recorridos/verificacion-actividades';

const base = '/api/marn/verificacion';
const vacio = { result: [], sinSuperior: [], puedeConsultarSinSuperior: false, puedeVerificar: false };
const errorApi = (e, fallback) => e.response?.data?.error || fallback;
const columnasBase = [
    { field: 'fechaActividad', headerName: 'Fecha', width: 114, valueFormatter: ({ value }) => safefmt(value?.slice(0, 10)) || '—' },
    { field: 'responsable', headerName: 'Responsable', flex: 1, minWidth: 170 },
    { field: 'ref', headerName: 'REF', width: 115, valueGetter: ({ row }) => row.plan.riesgo.ref || '—' },
    { field: 'accion', headerName: 'Plan', flex: 1, minWidth: 135, valueGetter: ({ row }) => row.plan.descripcion },
    { field: 'corte', headerName: 'Corte', width: 82, valueFormatter: ({ value }) => value || '—' },
    { field: 'descripcion', headerName: 'Descripción', flex: 1.25, minWidth: 170 },
];

export default function VerificacionActividades() {
    const { periodos, periodo, setPeriodo, cargandoPeriodos, errorPeriodos } = usePeriodosPlanes();
    const [datos, setDatos] = useState(vacio);
    const [colaboradores, setColaboradores] = useState([]);
    const [tab, setTab] = useState(0);
    const [filtro, setFiltro] = useState('todos');
    const [seleccion, setSeleccion] = useState([]);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [observacion, setObservacion] = useState(null);
    const [chat, setChat] = useState(null);
    const [archivos, setArchivos] = useState(null);
    const [vista, setVista] = useState(null);
    const refrescar = async signal => {
        const { data } = await apiClient.get(`${base}/pendientes`, { params: { periodo }, signal });
        if (!signal?.aborted) {
            setDatos(data);
            if (!data.puedeVerificar) setTab(0);
        }
    };
    useEffect(() => {
        if (!periodo) return;
        const controller = new AbortController();
        setCargando(true);
        refrescar(controller.signal).catch(e => { if (!controller.signal.aborted) setError(errorApi(e, 'No se pudo cargar la bandeja.')); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [periodo]);
    useEffect(() => {
        if (!periodo || tab !== 1 || !datos.puedeVerificar) return;
        const controller = new AbortController();
        setCargando(true);
        apiClient.get(`${base}/colaboradores`, { params: { periodo, filtro }, signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) setColaboradores(data.result);
        }).catch(e => { if (!controller.signal.aborted) setError(errorApi(e, 'No se pudieron cargar los colaboradores.')); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [periodo, filtro, tab, datos.puedeVerificar]);

    const resolver = async (op, body) => {
        setError('');
        setAviso('');
        setGuardando(true);
        try {
            const { data } = await apiClient.post(`${base}/${op}`, body);
            const completadas = new Set(data.result);
            setDatos(prev => ({ ...prev, result: prev.result.filter(row => !completadas.has(row.codigoActividad)) }));
            setSeleccion(prev => prev.filter(id => !completadas.has(id)));
            setObservacion(null);
            setAviso(op === 'observar' ? 'Observación enviada.' : data.result.length === 1 ? 'Actividad verificada.' : `${data.result.length} actividades verificadas.`);
            await refrescar();
        } catch (e) { setError(errorApi(e, 'No se pudo resolver la actividad.')); }
        finally { setGuardando(false); }
    };
    const columnasPendientes = [...columnasBase,
        { field: 'documentos', headerName: 'Archivos', width: 105, sortable: false, renderCell: ({ row }) => row.documentos.length > 0
            ? <Button size="small" onClick={() => setArchivos(row)}>Ver ({row.documentos.length})</Button> : '—' },
        { field: 'acciones', headerName: 'Acciones', width: 232, sortable: false, renderCell: ({ row }) => <Stack direction="row" spacing={0.25}>
            <Button size="small" disabled={guardando} onClick={() => resolver('verificar', { codigoActividad: row.codigoActividad })}>Verificar</Button>
            <Button size="small" disabled={guardando} onClick={() => { setError(''); setObservacion({ row, comentario: '' }); }}>Observar</Button>
            <Button size="small" onClick={() => setChat(row)}>Chat</Button>
        </Stack> },
    ];
    const columnasColaboradores = [
        { field: 'nombreResponsable', headerName: 'Responsable', flex: 1, minWidth: 180 },
        { field: 'ref', headerName: 'REF', width: 110, valueGetter: ({ row }) => row.plan.riesgo.ref || '—' },
        { field: 'accion', headerName: 'Plan', flex: 1, minWidth: 170, valueGetter: ({ row }) => row.plan.descripcion },
        { field: 'cortes', headerName: 'Cortes', flex: 1, minWidth: 190, sortable: false, renderCell: ({ row }) => <LineaCortes mini cortes={row.cortes} /> },
        { field: 'cumplimiento', headerName: 'Cumplimiento', width: 124, type: 'number', valueGetter: ({ row }) => row.resumen.porcentaje,
            valueFormatter: ({ value }) => value == null ? '—' : `${value}%` },
        { field: 'acciones', headerName: 'Acciones', width: 84, sortable: false, renderCell: ({ row }) => <Button size="small" onClick={() => setChat(row)}>Chat</Button> },
    ];
    const seleccionarPeriodo = event => {
        setDatos(vacio);
        setSeleccion([]);
        setColaboradores([]);
        setError('');
        setAviso('');
        setTab(0);
        setPeriodo(event.target.value);
    };
    return <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography component="h1" variant="h5" fontWeight={700} data-tour="verificacion-titulo">Verificación de actividades</Typography>
                    <RecorridoGuiado pantalla="verificacion-actividades" pasos={recorridoVerificacion} habilitado={!cargando && !cargandoPeriodos} />
                </Stack>
                <TextField data-tour="verificacion-periodo" select size="small" label="Periodo" value={periodo} onChange={seleccionarPeriodo}
                    disabled={guardando || !periodos.length} sx={{ minWidth: 150 }}>
                    {periodos.map(row => <MenuItem key={row.CODIGO_PERIODO} value={row.CODIGO_PERIODO}>{row.CODIGO_PERIODO}</MenuItem>)}
                </TextField>
            </Stack>
            {cargandoPeriodos && <LinearProgress />}
            {(errorPeriodos || (error && !observacion)) && <Alert severity="error">{errorPeriodos || error}</Alert>}
            {aviso && <Alert severity="success" onClose={() => setAviso('')}>{aviso}</Alert>}
            <Tabs data-tour="verificacion-bandejas" value={tab} aria-label="Bandejas de verificación" onChange={(_, next) => { setError(''); setTab(next); }}>
                <Tab value={0} label="Por verificar" id="tab-verificar" aria-controls="panel-verificar" />
                {datos.puedeVerificar && <Tab value={1} label="Mis colaboradores" id="tab-colaboradores" aria-controls="panel-colaboradores" />}
            </Tabs>
            {tab === 0 && <Stack data-tour="verificacion-contenido" spacing={2} role="tabpanel" id="panel-verificar" aria-labelledby="tab-verificar">
                {datos.puedeVerificar && <>
                    <Button data-tour="verificacion-lote" variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={guardando || !seleccion.length}
                        onClick={() => resolver('verificar', { codigoActividad: seleccion })}>Verificar seleccionadas ({seleccion.length})</Button>
                    <DataGrid autoHeight checkboxSelection disableSelectionOnClick getRowId={row => row.codigoActividad} selectionModel={seleccion}
                        onSelectionModelChange={setSeleccion} localeText={localeTextES} rows={datos.result} columns={columnasPendientes} loading={cargando} />
                </>}
                {datos.puedeConsultarSinSuperior && <>
                    <Typography component="h2" variant="h6" fontWeight={600}>Sin superior asignado</Typography>
                    <DataGrid autoHeight getRowId={row => row.codigoActividad} localeText={localeTextES} rows={datos.sinSuperior}
                        columns={columnasBase} loading={cargando} disableSelectionOnClick />
                </>}
            </Stack>}
            {tab === 1 && <Stack spacing={2} role="tabpanel" id="panel-colaboradores" aria-labelledby="tab-colaboradores">
                <TextField select size="small" label="Actividades" value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ width: { xs: '100%', sm: 220 } }}>
                    <MenuItem value="todos">Todos</MenuItem><MenuItem value="con">Con actividades</MenuItem><MenuItem value="sin">Sin actividades</MenuItem>
                </TextField>
                <DataGrid autoHeight getRowId={row => row.codigoResponsablePlan} localeText={localeTextES} rows={colaboradores}
                    columns={columnasColaboradores} loading={cargando} disableSelectionOnClick />
            </Stack>}
        </Stack>
        {observacion && <Dialog open onClose={() => !guardando && setObservacion(null)} fullWidth maxWidth="sm">
            <form onSubmit={e => { e.preventDefault(); resolver('observar', { codigoActividad: observacion.row.codigoActividad, comentario: observacion.comentario }); }}>
                <DialogTitle>Observar actividad</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ pt: 1 }}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <TextField label="Comentario" required multiline minRows={3} value={observacion.comentario} inputProps={{ maxLength: 1000 }}
                            onChange={e => setObservacion(prev => ({ ...prev, comentario: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={guardando} onClick={() => setObservacion(null)}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={guardando || !observacion.comentario.trim()}>Enviar observación</Button>
                </DialogActions>
            </form>
        </Dialog>}
        {archivos && !vista && <Dialog open fullWidth maxWidth="sm" onClose={() => setArchivos(null)}>
            <DialogTitle>Archivos de la actividad</DialogTitle>
            <DialogContent><Stack spacing={1}>
                {archivos.documentos.map(adjunto => <Stack key={adjunto.codigoDoc} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between">
                    <Typography sx={{ overflowWrap: 'anywhere' }}>{adjunto.nombre}</Typography>
                    <Stack direction="row" spacing={0.5}>
                        <Button size="small" onClick={() => setVista(adjunto)}>Vista previa</Button>
                        <Button size="small" onClick={() => descargarAdjunto(archivos, adjunto).catch(() => setError('No se pudo descargar el archivo.'))}>Descargar</Button>
                    </Stack>
                </Stack>)}
            </Stack></DialogContent>
            <DialogActions><Button onClick={() => setArchivos(null)}>Cerrar</Button></DialogActions>
        </Dialog>}
        {vista && <VistaAdjunto actividad={archivos} adjunto={vista} onClose={() => setVista(null)} />}
        {chat && <ChatPlan asignacion={chat} codigoUsuario={datos.codigoUsuario} onClose={() => setChat(null)} />}
    </Box>;
}
