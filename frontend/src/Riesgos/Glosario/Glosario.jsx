import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
    Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddRounded from '@mui/icons-material/AddRounded';
import apiClient from 'api/apiClient';
import { apiErrorMessage } from 'funciones/errors';
import { localeTextES } from 'theme/localeTextES';

const ruta = '/api/marn/glosario';
const vacio = { titulo: '', descripcion: '', destacar: true, estado: '1' };
const columnas = [
    { field: 'titulo', headerName: 'Término', flex: 0.6, minWidth: 155 },
    { field: 'descripcion', headerName: 'Descripción', flex: 1.45, minWidth: 230, renderCell: ({ value }) =>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value}</Typography> },
    { field: 'destacar', headerName: 'Destacado', width: 110, valueFormatter: ({ value }) => Number(value) === 1 ? 'Sí' : 'No' },
    { field: 'estado', headerName: 'Estado', width: 105, renderCell: ({ value }) =>
        <Chip size="small" label={value === '1' ? 'Activo' : 'Inactivo'} color={value === '1' ? 'success' : 'default'} variant="outlined" /> }
];

export default function Glosario() {
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [version, setVersion] = useState(0);
    const [termino, setTermino] = useState(null);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState('');
    const [errorDialogo, setErrorDialogo] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        setCargando(true);
        setError('');
        apiClient.get(ruta, { signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setFilas(data.result); })
            .catch(e => { if (!controller.signal.aborted) setError(apiErrorMessage(e)); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [version]);

    const abrir = datos => { setTermino(datos); setErrorDialogo(''); };
    const editar = (campo, valor) => setTermino(prev => ({ ...prev, [campo]: valor }));
    const guardar = async event => {
        event.preventDefault();
        setOcupado(true);
        setErrorDialogo('');
        try {
            if (termino.codigoTermino) await apiClient.put(`${ruta}/${termino.codigoTermino}`, termino);
            else await apiClient.post(ruta, termino);
            setTermino(null);
            setVersion(val => val + 1);
        } catch (e) { setErrorDialogo(apiErrorMessage(e)); }
        finally { setOcupado(false); }
    };
    const acciones = { field: 'editar', headerName: 'Acción', width: 95, sortable: false, renderCell: ({ row }) =>
        <Button size="small" onClick={() => abrir({ ...row, destacar: Boolean(row.destacar) })}>Editar</Button> };

    return <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                <Typography component="h1" variant="h5" fontWeight={700}>Glosario</Typography>
                <Button startIcon={<AddRounded />} variant="contained" onClick={() => abrir({ ...vacio })}>Nuevo término</Button>
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
            <DataGrid autoHeight rows={filas} columns={[...columnas, acciones]} getRowId={row => row.codigoTermino}
                getRowHeight={() => 'auto'} loading={cargando} localeText={localeTextES} disableSelectionOnClick
                pageSize={10} rowsPerPageOptions={[10]} sx={{ minHeight: 225, '& .MuiDataGrid-cell': { py: 1 } }} />
        </Stack>
        <Dialog open={Boolean(termino)} fullWidth maxWidth="sm" onClose={ocupado ? undefined : () => setTermino(null)}>
            <form onSubmit={guardar}>
                <DialogTitle>{termino?.codigoTermino ? 'Editar término' : 'Nuevo término'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                        {errorDialogo && <Alert severity="error">{errorDialogo}</Alert>}
                        <TextField required autoFocus label="Título" value={termino?.titulo || ''} inputProps={{ maxLength: 150 }}
                            onChange={event => editar('titulo', event.target.value)} disabled={ocupado} />
                        <TextField required multiline minRows={3} label="Descripción" value={termino?.descripcion || ''}
                            inputProps={{ maxLength: 2000 }} onChange={event => editar('descripcion', event.target.value)} disabled={ocupado} />
                        <FormControlLabel label="Destacar en inicio" control={<Checkbox checked={Boolean(termino?.destacar)}
                            onChange={event => editar('destacar', event.target.checked)} disabled={ocupado} />} />
                        <TextField select label="Estado" size="small" value={termino?.estado || '1'}
                            onChange={event => editar('estado', event.target.value)} disabled={ocupado}>
                            <MenuItem value="1">Activo</MenuItem>
                            <MenuItem value="0">Inactivo</MenuItem>
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={ocupado} onClick={() => setTermino(null)}>Cancelar</Button>
                    <Button disabled={ocupado || !termino?.titulo.trim() || !termino?.descripcion.trim()}
                        variant="contained" type="submit">Guardar</Button>
                </DialogActions>
            </form>
        </Dialog>
    </Box>;
}
