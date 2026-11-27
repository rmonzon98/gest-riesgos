import { useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import apiClient from 'api/apiClient';
import { safefmt } from 'funciones/Fechas';
import { localeTextES } from 'theme/localeTextES';
import DialogoEliminacion, { estadosEliminacion } from './DialogoEliminacion';

const base = '/api/marn/autorizaciones-eliminacion';
const columnas = [
    { field: 'fechaSolicitud', headerName: 'Fecha', width: 102, valueFormatter: ({ value }) => safefmt(value?.slice(0, 10)) },
    { field: 'direccion', headerName: 'Dirección', flex: 1, minWidth: 125, valueGetter: ({ row }) => row.riesgo.seguridadEntidad.nombre },
    { field: 'ref', headerName: 'REF', width: 90, valueGetter: ({ row }) => row.riesgo.ref || '—' },
    { field: 'solicitante', headerName: 'Solicitante', flex: 1, minWidth: 135 },
    { field: 'motivo', headerName: 'Motivo', flex: 1.3, minWidth: 160, renderCell: ({ value }) => <Typography variant="body2"
        title={value} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value}</Typography> },
    { field: 'estado', headerName: 'Estado', width: 104, valueFormatter: ({ value }) => estadosEliminacion[value] },
];

export default function AutorizacionesEliminacion() {
    const [estado, setEstado] = useState('P');
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [version, setVersion] = useState(0);
    const [dialogo, setDialogo] = useState(null);
    useEffect(() => {
        const controller = new AbortController();
        setCargando(true);
        setError('');
        setFilas([]);
        apiClient.get(base, { params: { estado }, signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setFilas(data.result); })
            .catch(e => { if (!controller.signal.aborted) setError(e.response?.data?.error || 'No se pudo cargar la bandeja.'); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [estado, version]);
    const acciones = { field: 'acciones', headerName: 'Acciones', width: 195, sortable: false, renderCell: ({ row }) =>
        row.estado === 'P' ? <Stack direction="row" spacing={0.5}>
            <Button size="small" onClick={() => setDialogo({ row, estado: 'A' })}>Autorizar</Button>
            <Button size="small" color="error" onClick={() => setDialogo({ row, estado: 'D' })}>Denegar</Button>
        </Stack> : null };
    return <Stack spacing={2} sx={{ p: { xs: 2, md: 3 } }}>
        <Typography component="h1" variant="h5" fontWeight={700}>Autorizaciones de eliminación</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField select label="Estado" size="small" value={estado} onChange={e => setEstado(e.target.value)} sx={{ maxWidth: 210 }}>
            <MenuItem value="">Todos los estados</MenuItem>
            {Object.entries(estadosEliminacion).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
        <DataGrid autoHeight getRowHeight={() => 'auto'} rows={filas} columns={[...columnas, acciones]} localeText={localeTextES}
            pageSize={10} rowsPerPageOptions={[10]} getRowId={row => row.codigoSolicitud} loading={cargando} disableSelectionOnClick
            sx={{ minHeight: 225, '& .MuiDataGrid-cell': { py: 1 } }} />
        {dialogo && <DialogoEliminacion titulo={dialogo.estado === 'A' ? 'Autorizar eliminación' : 'Denegar eliminación'}
            descripcion={`${dialogo.row.riesgo.ref || 'Riesgo'} · ${dialogo.row.riesgo.descripcion || ''}`}
            campo="Comentario" obligatorio={dialogo.estado === 'D'} onClose={() => setDialogo(null)}
            confirmar={async comentario => {
                await apiClient.patch(`${base}/${dialogo.row.codigoSolicitud}`, { estado: dialogo.estado, comentario });
                setVersion(value => value + 1);
            }} />}
    </Stack>;
}
