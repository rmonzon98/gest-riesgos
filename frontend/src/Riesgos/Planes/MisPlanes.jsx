import { useEffect, useState } from 'react';
import { Alert, Badge, Box, Button, Chip, IconButton, LinearProgress, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import apiClient from 'api/apiClient';
import { safefmt } from 'funciones/Fechas';
import LineaCortes, { estadosCorte } from './LineaCortes';
import RecorridoGuiado from 'funciones/RecorridoGuiado';
import recorridoMisPlanes from 'Riesgos/Recorridos/mis-planes';
import ActividadesPlan from './ActividadesPlan';
import ChatPlan from './ChatPlan';
import usePeriodosPlanes from './usePeriodosPlanes';

const tarjetas = [
    ['vencido', 'Cortes vencidos', 'error'], ['porVencer', 'Por vencer en 15 días', 'warning'],
    ['por_verificar', 'Por verificar', 'primary'], ['observadas', 'Con observaciones', 'error'],
];
const fecha = value => safefmt(value?.slice(0, 10)) || '—';

function Plan({ row, abrirActividades, abrirChat }) {
    return <Paper variant="outlined" sx={{ minWidth: 0, borderLeft: 3, borderLeftColor: row.resumen.vencido ? 'error.main' : 'primary.main', p: { xs: 1.5, md: 2.5 } }}>
        <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }} justifyContent="space-between">
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" color="primary.main" fontWeight={700}>{row.plan.riesgo.ref || `Riesgo ${row.plan.codigoRiesgo}`}</Typography>
                    <Typography component="h2" variant="h6" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{row.plan.descripcion}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{row.plan.riesgo.descripcion}</Typography>
                </Box>
                {row.nombreExterno && <Chip size="small" label={`Externo: ${row.nombreExterno}`} sx={{ alignSelf: 'flex-start', maxWidth: '100%' }} />}
            </Stack>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ color: 'text.secondary' }}>
                <Typography variant="body2">{row.frecuencia.descripcion}</Typography>
                <Typography variant="body2">{fecha(row.fechaInicio)} al {fecha(row.fechaFin)}</Typography>
                <Typography variant="body2">Superior: {row.superior?.nombre || 'Sin asignar'}</Typography>
                {row.resumen.porcentaje != null && <Typography variant="body2" fontWeight={600}>Cumplimiento: {row.resumen.porcentaje}%</Typography>}
            </Stack>
            <Box data-tour="mis-planes-cortes"><LineaCortes cortes={row.cortes} onSeleccion={corte => abrirActividades(row, corte, false)} /></Box>
            <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
                <Button startIcon={<AddRounded />} onClick={() => abrirActividades(row, null, true)}>Registrar actividad</Button>
                {!row.cortes.length && <Button onClick={() => abrirActividades(row, null, false)}>Ver actividades</Button>}
                <Tooltip title={row.superior ? 'Chat del plan' : 'Chat disponible al asignar un superior'}><span data-tour="mis-planes-chat">
                    <IconButton onClick={() => abrirChat(row)} disabled={!row.superior} aria-label={`Chat del plan, ${row.noLeidos} mensajes sin leer`}>
                        <Badge badgeContent={row.noLeidos} color="error"><ChatBubbleOutlineRounded /></Badge>
                    </IconButton>
                </span></Tooltip>
            </Stack>
        </Stack>
    </Paper>;
}

export default function MisPlanes() {
    const { periodos, periodo, setPeriodo, cargandoPeriodos, errorPeriodos } = usePeriodosPlanes();
    const [datos, setDatos] = useState({ result: [], hoy: '', codigoUsuario: null });
    const [panel, setPanel] = useState(null);
    const [chat, setChat] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const refrescar = async signal => {
        const { data } = await apiClient.get('/api/marn/mis-planes', { params: { periodo }, signal });
        if (!signal?.aborted) setDatos(data);
    };
    useEffect(() => {
        if (!periodo) return;
        const controller = new AbortController();
        setCargando(true);
        setError('');
        refrescar(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.response?.data?.error || 'No se pudieron cargar los planes.'); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [periodo]);
    const cambiarPeriodo = event => {
        setPanel(null);
        setChat(null);
        setDatos({ result: [], hoy: '', codigoUsuario: null });
        setPeriodo(event.target.value);
    };
    const abrirActividades = (asignacion, corte, abrirRegistro) => setPanel({ asignacion, corte, abrirRegistro });

    return <Box sx={{ maxWidth: 1160, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={2.25}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography component="h1" variant="h4" fontWeight={700} data-tour="mis-planes-titulo">Mis planes</Typography>
                    <RecorridoGuiado pantalla="mis-planes" pasos={recorridoMisPlanes} habilitado={!cargando && !cargandoPeriodos && !panel && !chat} />
                </Stack>
                <TextField data-tour="mis-planes-periodo" select size="small" label="Periodo" value={periodo} disabled={!periodos.length}
                    onChange={cambiarPeriodo} sx={{ minWidth: { sm: 160 } }}>
                    {periodos.map(row => <MenuItem value={row.CODIGO_PERIODO} key={row.CODIGO_PERIODO}>{row.CODIGO_PERIODO}</MenuItem>)}
                </TextField>
            </Stack>
            {(error || errorPeriodos) && <Alert severity="error">{error || errorPeriodos}</Alert>}
            {(cargando || cargandoPeriodos) && <LinearProgress aria-label="Cargando planes" />}
            <Box data-tour="mis-planes-resumen" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
                {tarjetas.map(([key, label, color]) => <Paper key={key} variant="outlined" sx={{ p: 1.5, borderTop: 2, borderTopColor: `${color}.main` }}>
                    <Typography color="text.secondary" variant="body2">{label}</Typography>
                    <Typography variant="h5" fontWeight={700}>{datos.result.reduce((total, row) => total + row.resumen[key], 0)}</Typography>
                </Paper>)}
            </Box>
            <Stack data-tour="mis-planes-leyenda" direction="row" spacing={0.75} useFlexGap flexWrap="wrap" aria-label="Estados de los cortes">
                {Object.values(estadosCorte).map(({ etiqueta, color }) => <Chip key={etiqueta} size="small" label={etiqueta} color={color} variant="outlined" />)}
                <Chip size="small" label="Punto rojo: con observación" color="error" variant="outlined" />
            </Stack>
            {!cargando && !cargandoPeriodos && !error && !errorPeriodos && !datos.result.length && <Alert severity="info">{periodo ? 'No hay planes asignados en este periodo.' : 'No hay periodos para consultar.'}</Alert>}
            {datos.result.map(row => <Plan key={row.codigoResponsablePlan} row={row} abrirActividades={abrirActividades} abrirChat={setChat} />)}
        </Stack>
        {panel && <ActividadesPlan {...panel} hoy={datos.hoy} refrescar={refrescar} onClose={() => setPanel(null)} />}
        {chat && <ChatPlan asignacion={chat} codigoUsuario={datos.codigoUsuario} onClose={() => setChat(null)} onLeidos={id => {
            setDatos(prev => ({ ...prev, result: prev.result.map(row => row.codigoResponsablePlan === id ? { ...row, noLeidos: 0 } : row) }));
        }} />}
    </Box>;
}
