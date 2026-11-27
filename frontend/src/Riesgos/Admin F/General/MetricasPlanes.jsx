import { Alert, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function Grafica({ titulo, datos, series }) {
    return <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0 }}>
        <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{titulo}</Typography>
        {!datos.length ? <Typography color="text.secondary">Sin registros para los filtros seleccionados.</Typography> :
            <ResponsiveContainer width="100%" height={Math.max(220, datos.length * 34 + 54)}>
                <BarChart data={datos} layout="vertical" margin={{ right: 18, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="nombre" width={144} tick={{ fontSize: 11 }}
                        tickFormatter={nombre => nombre.length > 24 ? nombre.slice(0, 22) + '…' : nombre} />
                    <Tooltip />
                    {series.length > 1 && <Legend />}
                    {series.map(item => <Bar key={item.campo} dataKey={item.campo} name={item.nombre} fill={item.color}
                        stackId="indicador" maxBarSize={26} />)}
                </BarChart>
            </ResponsiveContainer>}
    </Paper>;
}

export default function MetricasPlanes({ datos, cargando, error }) {
    if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
    if (cargando) return <LinearProgress aria-label="Cargando métricas de planes" sx={{ mb: 2 }} />;
    if (!datos) return null;
    return <Stack spacing={2} sx={{ mb: 3 }}>
        <Grid container spacing={2}>
            {[['Planes de acción activos', datos.totalPlanes], ['Eventos del riesgo', datos.totalEventos]].map(([titulo, valor]) =>
                <Grid key={titulo} item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography color="text.secondary">{titulo}</Typography>
                        <Typography variant="h5" fontWeight={700}>{valor}</Typography>
                    </Paper>
                </Grid>)}
        </Grid>
        <Grid container spacing={2}>
            <Grid item xs={12} lg={6}>
                <Grafica titulo="10 direcciones con más riesgos" datos={datos.topDirecciones}
                    series={[{ campo: 'riesgos', nombre: 'Riesgos', color: '#285e88' }]} />
            </Grid>
            <Grid item xs={12} lg={6}>
                <Grafica titulo="Cumplimiento de cortes por dirección" datos={datos.cumplimiento} series={[
                    { campo: 'cumplidos', nombre: 'Cumplidos', color: '#2e7d58' },
                    { campo: 'pendientes', nombre: 'Pendientes o por verificar', color: '#b97810' },
                    { campo: 'vencidos', nombre: 'Vencidos', color: '#b8433f' }
                ]} />
            </Grid>
        </Grid>
    </Stack>;
}
