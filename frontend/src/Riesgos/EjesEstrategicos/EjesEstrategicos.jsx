import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddRounded from '@mui/icons-material/AddRounded';
import apiClient from 'api/apiClient';
import { localeTextES } from 'theme/localeTextES';

const endpoint = '/api/marn/ejes-estrategicos';
const mensajeError = error => error?.response?.data?.error || 'No se pudo completar la operación.';

export default function EjesEstrategicos() {
    const [rows, setRows] = useState([]);
    const [seleccion, setSeleccion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const cargar = async () => {
        setLoading(true);
        try { setRows((await apiClient.get(endpoint)).data.result); }
        catch (e) { setError(mensajeError(e)); }
        finally { setLoading(false); }
    };
    useEffect(() => { cargar(); }, []);
    const abrir = row => { setError(''); setNotice(''); setSeleccion(row); };
    const dato = (key, value) => setSeleccion(row => ({ ...row, [key]: value }));
    const ejecutar = async (write, message) => {
        setGuardando(true);
        setError('');
        setNotice('');
        try {
            await write();
            setSeleccion(null);
            setNotice(message);
            await cargar();
        } catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); }
    };
    const guardar = event => {
        event.preventDefault();
        const { codigoEje, nombre, descripcion, orden } = seleccion;
        const body = { nombre, descripcion, orden: Number(orden) };
        return ejecutar(() => codigoEje ? apiClient.put(`${endpoint}/${codigoEje}`, body) : apiClient.post(endpoint, body), 'Eje guardado.');
    };
    const columns = [
        { field: 'orden', headerName: 'Orden', type: 'number', width: 85 },
        { field: 'nombre', headerName: 'Nombre', flex: 1, minWidth: 160 },
        { field: 'descripcion', headerName: 'Descripción', flex: 2, minWidth: 240 },
        { field: 'estado', headerName: 'Estado', width: 105,
            renderCell: ({ value }) => <Chip size="small" label={value === '1' ? 'Activo' : 'Inactivo'} color={value === '1' ? 'success' : 'default'} /> },
        { field: 'acciones', headerName: 'Acciones', width: 185, sortable: false, filterable: false,
            renderCell: ({ row }) => <Stack direction="row" spacing={0.25}>
                <Button disabled={guardando} size="small" onClick={() => abrir(row)}>Editar</Button>
                <Button disabled={guardando} size="small" onClick={() => ejecutar(() => apiClient.patch(`${endpoint}/${row.codigoEje}/estado`, { activo: row.estado !== '1' }), 'Estado actualizado.')}>
                    {row.estado === '1' ? 'Desactivar' : 'Activar'}
                </Button>
            </Stack> },
    ];
    return <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                <Typography component="h1" variant="h5" fontWeight={700}>Ejes estratégicos</Typography>
                <Button variant="contained" startIcon={<AddRounded />} disabled={guardando} onClick={() => abrir({ nombre: '', descripcion: '', orden: Math.max(0, ...rows.map(row => row.orden)) + 1 })}>Nuevo eje</Button>
            </Stack>
            {error && !seleccion && <Alert severity="error">{error}</Alert>}
            {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
            <DataGrid autoHeight rows={rows} columns={columns} getRowId={row => row.codigoEje} loading={loading}
                localeText={localeTextES} disableSelectionOnClick />
        </Stack>
        {seleccion && <Dialog open onClose={() => !guardando && setSeleccion(null)} fullWidth maxWidth="sm">
            <form onSubmit={guardar}>
                <DialogTitle>{seleccion.codigoEje ? 'Editar eje estratégico' : 'Nuevo eje estratégico'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <TextField required label="Nombre" value={seleccion.nombre} onChange={e => dato('nombre', e.target.value)} inputProps={{ maxLength: 50 }} />
                        <TextField required multiline minRows={2} label="Descripción" value={seleccion.descripcion} onChange={e => dato('descripcion', e.target.value)} inputProps={{ maxLength: 500 }} />
                        <TextField required type="number" label="Orden" value={seleccion.orden} onChange={e => dato('orden', e.target.value)} inputProps={{ min: 0, max: 2147483647, step: 1 }} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={guardando} onClick={() => setSeleccion(null)}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={guardando || !seleccion.nombre.trim() || !seleccion.descripcion.trim()}>Guardar</Button>
                </DialogActions>
            </form>
        </Dialog>}
    </Box>;
}
