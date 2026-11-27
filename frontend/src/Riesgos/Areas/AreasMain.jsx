import { useEffect, useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddRounded from '@mui/icons-material/AddRounded';
import apiClient from 'api/apiClient';
import { localeTextES } from 'theme/localeTextES';
import FormArea from './FormArea';

export default function AreasMain() {
    const [areas, setAreas] = useState([]);
    const [direcciones, setDirecciones] = useState([]);
    const [direccion, setDireccion] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [abreviatura, setAbreviatura] = useState('');
    const [formulario, setFormulario] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [guardado, setGuardado] = useState(false);

    const obtenerAreas = async () => {
        setLoading(true);
        try { setAreas((await apiClient.get('/api/areas-actualizados')).data.result); }
        catch { setError('No se pudieron cargar las áreas.'); }
        finally { setLoading(false); }
    };
    useEffect(() => {
        obtenerAreas();
        apiClient.get('/api/direcciones-actualizados')
            .then(({ data }) => setDirecciones(data.result))
            .catch(() => setError('No se pudieron cargar las direcciones.'));
    }, []);

    const nombres = new Map(direcciones.map(row => [row.CODIGO_ENTIDAD, row.NOMBRE]));
    const rows = areas.filter(row => row.DESCRIPCION.toLowerCase().includes(descripcion.toLowerCase()) &&
        (row.ABREVIATURA ?? '').toLowerCase().includes(abreviatura.toLowerCase()) &&
        (direccion === '' || (direccion === 'general' ? row.CODIGO_ENTIDAD == null : row.CODIGO_ENTIDAD === direccion)))
        .map(row => ({ ...row, DIRECCION: row.CODIGO_ENTIDAD == null ? 'General' : nombres.get(row.CODIGO_ENTIDAD) || `Dirección ${row.CODIGO_ENTIDAD}` }));
    const columns = [
        { field: 'DESCRIPCION', headerName: 'Descripción', flex: 1, minWidth: 180 },
        { field: 'ABREVIATURA', headerName: 'Abreviatura', width: 135 },
        { field: 'DIRECCION', headerName: 'Dirección', flex: 1, minWidth: 150 },
        { field: 'acciones', headerName: 'Acciones', width: 105, sortable: false, filterable: false,
            renderCell: ({ row }) => <Button size="small" onClick={() => setFormulario(row)}>Editar</Button> },
    ];

    return <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                <Typography component="h1" variant="h5" fontWeight={700}>Mantenimiento de áreas</Typography>
                <Button variant="contained" startIcon={<AddRounded />} onClick={() => setFormulario({})}>Nueva área</Button>
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
            {guardado && <Alert severity="success" onClose={() => setGuardado(false)}>Área guardada.</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Descripción" size="small" value={descripcion} onChange={event => setDescripcion(event.target.value)} />
                <TextField label="Abreviatura" size="small" value={abreviatura} onChange={event => setAbreviatura(event.target.value)} />
                <TextField select label="Dirección" size="small" value={direccion} onChange={event => setDireccion(event.target.value)} sx={{ minWidth: 180 }}>
                    <MenuItem value="">Todas las direcciones</MenuItem>
                    <MenuItem value="general">General</MenuItem>
                    {direcciones.map(row => <MenuItem key={row.CODIGO_ENTIDAD} value={row.CODIGO_ENTIDAD}>{row.NOMBRE}</MenuItem>)}
                </TextField>
            </Stack>
            <DataGrid autoHeight rows={rows} columns={columns} getRowId={row => row.CODIGO_AREA}
                loading={loading} localeText={localeTextES} disableSelectionOnClick />
        </Stack>
        {formulario && <FormArea area={formulario} direcciones={direcciones} onClose={() => setFormulario(null)}
            onSuccess={async () => { setFormulario(null); setGuardado(true); await obtenerAreas(); }} />}
    </Box>;
}
