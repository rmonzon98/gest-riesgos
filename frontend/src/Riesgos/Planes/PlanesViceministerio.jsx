import { useEffect, useState } from 'react';
import { Alert, Box, Button, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import { saveAs } from 'file-saver';
import apiClient from 'api/apiClient';
import { generarExcelPlanesViceministerio } from './exportarPlanesViceministerio';
import { safefmt } from 'funciones/Fechas';
import { localeTextES } from 'theme/localeTextES';
import LineaCortes, { estadosCorte } from './LineaCortes';
import usePeriodosPlanes from './usePeriodosPlanes';

const fecha = value => safefmt(value?.slice(0, 10)) || '—';
const columnas = [
    { field: 'direccion', headerName: 'Dirección', flex: 1, minWidth: 160, valueGetter: ({ row }) => row.plan.riesgo.seguridadEntidad?.nombre || '—' },
    { field: 'ref', headerName: 'REF', width: 105, valueGetter: ({ row }) => row.plan.riesgo.ref || '—' },
    { field: 'plan', headerName: 'Plan', flex: 1, minWidth: 150, valueGetter: ({ row }) => row.plan.descripcion },
    { field: 'nombreResponsable', headerName: 'Responsable', flex: 1, minWidth: 150 },
    { field: 'inicio', headerName: 'Inicio', width: 105, valueGetter: ({ row }) => fecha(row.fechaInicio) },
    { field: 'fin', headerName: 'Fin', width: 105, valueGetter: ({ row }) => fecha(row.fechaFin) },
    { field: 'cortes', headerName: 'Cortes', flex: 1, minWidth: 170, sortable: false, renderCell: ({ row }) => <LineaCortes cortes={row.cortes} mini /> },
    { field: 'cumplimiento', headerName: 'Cumplimiento', width: 124, type: 'number', valueGetter: ({ row }) => row.resumen.porcentaje,
        valueFormatter: ({ value }) => value == null ? '—' : `${value}%` },
];

export default function PlanesViceministerio() {
    const { periodos, periodo, setPeriodo, cargandoPeriodos, errorPeriodos } = usePeriodosPlanes();
    const [datos, setDatos] = useState({ result: [], direcciones: [], viceministerio: '' });
    const [entidad, setEntidad] = useState('');
    const [estado, setEstado] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [exportando, setExportando] = useState(false);
    useEffect(() => {
        if (!periodo) return;
        const controller = new AbortController();
        setCargando(true);
        setError('');
        apiClient.get('/api/marn/planes-viceministerio', { params: { periodo, entidad, estado }, signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setDatos(data); })
            .catch(e => { if (!controller.signal.aborted) {
                setDatos(prev => ({ ...prev, result: [] }));
                setError(e.response?.data?.error || 'No se pudieron cargar los planes del viceministerio.');
            } }).finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [periodo, entidad, estado]);

    const exportar = async () => {
        setExportando(true);
        setError('');
        try {
            const archivo = await generarExcelPlanesViceministerio(datos, periodo, entidad, estado);
            saveAs(new Blob([archivo], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Planes-viceministerio-${periodo}.xlsx`);
        } catch { setError('No se pudo exportar el archivo Excel.'); }
        finally { setExportando(false); }
    };

    return <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Box><Typography component="h1" variant="h5" fontWeight={700}>Planes por viceministerio</Typography>
                    {datos.viceministerio && <Typography color="text.secondary">{datos.viceministerio}</Typography>}</Box>
                <Button variant="outlined" disabled={!datos.result.length || cargando || exportando} startIcon={<DownloadRounded />} onClick={exportar}>Exportar Excel</Button>
            </Stack>
            {(error || errorPeriodos) && <Alert severity="error">{error || errorPeriodos}</Alert>}
            {cargandoPeriodos && <LinearProgress />}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField select size="small" label="Periodo" value={periodo} onChange={e => setPeriodo(e.target.value)}
                    disabled={!periodos.length} sx={{ minWidth: 135 }}>
                    {periodos.map(row => <MenuItem key={row.CODIGO_PERIODO} value={row.CODIGO_PERIODO}>{row.CODIGO_PERIODO}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Dirección" value={entidad} onChange={e => setEntidad(e.target.value)} sx={{ minWidth: 190 }}>
                    <MenuItem value="">Todas las direcciones</MenuItem>
                    {datos.direcciones.map(row => <MenuItem key={row.codigoEntidad} value={row.codigoEntidad}>{row.nombre}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Estado de corte" value={estado} onChange={e => setEstado(e.target.value)} sx={{ minWidth: 165 }}>
                    <MenuItem value="">Todos los estados</MenuItem>
                    {Object.entries(estadosCorte).map(([value, item]) => <MenuItem key={value} value={value}>{item.etiqueta}</MenuItem>)}
                    <MenuItem value="observada">Con observaciones</MenuItem>
                </TextField>
            </Stack>
            <DataGrid autoHeight rows={datos.result} columns={columnas} getRowId={row => row.codigoResponsablePlan}
                loading={cargando} localeText={localeTextES} disableSelectionOnClick />
        </Stack>
    </Box>;
}
