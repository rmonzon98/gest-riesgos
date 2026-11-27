import { useEffect, useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import apiClient from 'api/apiClient';
import { apiErrorMessage } from 'funciones/errors';
import { safefmt } from 'funciones/Fechas';
import { localeTextES } from 'theme/localeTextES';

const corto = fecha => fecha?.slice(0, 10) || '';
const hoy = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guatemala' }).format(new Date());
const columnas = [
    { field: 'direccion', headerName: 'Dirección', flex: 1, minWidth: 125, valueGetter: ({ row }) => row.direccion.nombre },
    { field: 'nombreCargo', headerName: 'Cargo', flex: 1.4, minWidth: 150 },
    { field: 'fechaPosesion', headerName: 'Posesión', width: 115, valueFormatter: ({ value }) => safefmt(corto(value)) },
    { field: 'fechaEntrega', headerName: 'Entrega', width: 115, valueFormatter: ({ value }) => value ? safefmt(corto(value)) : 'Vigente' }
];

export default function HistorialCargos({ persona, entidades, direccion }) {
    const [filas, setFilas] = useState([]);
    const [edicion, setEdicion] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [version, setVersion] = useState(0);
    const ruta = `/api/responsables-actualizados/${persona}/cargos`;
    useEffect(() => {
        const controller = new AbortController();
        setCargando(true);
        setError('');
        apiClient.get(ruta, { signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setFilas(data.result); })
            .catch(e => { if (!controller.signal.aborted) setError(apiErrorMessage(e)); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [ruta, version]);

    const guardar = async () => {
        setGuardando(true);
        setError('');
        try {
            if (edicion.codigoCargo) await apiClient.put(`${ruta}/${edicion.codigoCargo}`, edicion);
            else await apiClient.post(ruta, edicion);
            setEdicion(null);
            setVersion(value => value + 1);
        } catch (e) { setError(apiErrorMessage(e)); }
        finally { setGuardando(false); }
    };
    const cambiar = (campo, value) => setEdicion(prev => ({ ...prev, [campo]: value }));
    const acciones = { field: 'accion', headerName: 'Acción', width: 100, sortable: false, renderCell: ({ row }) =>
        <Button size="small" disabled={guardando} onClick={() => {
            setError('');
            setEdicion({ ...row, fechaPosesion: corto(row.fechaPosesion), fechaEntrega: corto(row.fechaEntrega) });
        }}>Corregir</Button> };
    return <Stack spacing={1.5} sx={{ mt: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }}>
            <Typography component="h3" variant="subtitle1" fontWeight={700}>Historial de cargos</Typography>
            <Button size="small" disabled={guardando} onClick={() => {
                setError('');
                setEdicion({ codigoEntidad: direccion || '', nombreCargo: '', fechaPosesion: hoy(), fechaEntrega: '' });
            }}>Registrar nuevo cargo</Button>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        <DataGrid autoHeight rows={filas} columns={[...columnas, acciones]} getRowId={row => row.codigoCargo}
            loading={cargando} localeText={localeTextES} disableSelectionOnClick pageSize={5} rowsPerPageOptions={[5]}
            sx={{ minHeight: 160 }} />
        {edicion && <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Stack spacing={1.25}>
                <TextField size="small" select required label="Dirección del cargo" value={edicion.codigoEntidad}
                    onChange={event => cambiar('codigoEntidad', event.target.value)}>
                    {!entidades.some(row => row.CODIGO_ENTIDAD === edicion.codigoEntidad) && edicion.codigoEntidad &&
                        <MenuItem value={edicion.codigoEntidad}>{edicion.direccion?.nombre || 'Dirección actual'}</MenuItem>}
                    {entidades.map(row => <MenuItem key={row.CODIGO_ENTIDAD} value={row.CODIGO_ENTIDAD}>{row.NOMBRE}</MenuItem>)}
                </TextField>
                <TextField size="small" required label="Nombre del cargo" value={edicion.nombreCargo}
                    inputProps={{ maxLength: 150 }} onChange={event => cambiar('nombreCargo', event.target.value)} />
                <TextField size="small" type="date" required label="Fecha de posesión" InputLabelProps={{ shrink: true }}
                    value={edicion.fechaPosesion} onChange={event => cambiar('fechaPosesion', event.target.value)} />
                {edicion.codigoCargo && <TextField size="small" type="date" label="Fecha de entrega" InputLabelProps={{ shrink: true }}
                    value={edicion.fechaEntrega} onChange={event => cambiar('fechaEntrega', event.target.value)} />}
                <Stack direction="row" spacing={1}>
                    <Button onClick={() => setEdicion(null)} disabled={guardando}>Cancelar</Button>
                    <Button variant="contained" onClick={guardar} disabled={guardando || !edicion.fechaPosesion ||
                        !edicion.codigoEntidad || !edicion.nombreCargo.trim()}>Guardar cargo</Button>
                </Stack>
            </Stack>
        </Box>}
    </Stack>;
}
