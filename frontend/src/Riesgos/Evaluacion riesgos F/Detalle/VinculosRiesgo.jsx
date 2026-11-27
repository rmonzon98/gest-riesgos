import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import LinkRounded from '@mui/icons-material/LinkRounded';
import apiClient from 'api/apiClient';
import { localeTextES } from 'theme/localeTextES';

const mensajeError = error => error?.response?.data?.error || 'No se pudo completar la operación.';

function FormVinculo({ entidad, onClose, guardar, error, guardando }) {
    const [direcciones, setDirecciones] = useState([]);
    const [areas, setAreas] = useState([]);
    const [codigoEntidadVinculada, setEntidad] = useState('');
    const [codigoAreaVinculada, setArea] = useState('');
    const [cargandoAreas, setCargandoAreas] = useState(false);
    const [errorCarga, setErrorCarga] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        apiClient.get('/api/direcciones-actualizados', { signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setDirecciones(data.result.filter(row => Number(row.CODIGO_ENTIDAD) !== Number(entidad))); })
            .catch(e => { if (!controller.signal.aborted) setErrorCarga(mensajeError(e)); });
        return () => controller.abort();
    }, [entidad]);
    useEffect(() => {
        if (!codigoEntidadVinculada) return;
        const controller = new AbortController();
        setCargandoAreas(true);
        setAreas([]);
        setErrorCarga('');
        apiClient.get('/api/areas-actualizados', { params: { entidad: codigoEntidadVinculada }, signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setAreas(data.result); })
            .catch(e => { if (!controller.signal.aborted) setErrorCarga(mensajeError(e)); })
            .finally(() => { if (!controller.signal.aborted) setCargandoAreas(false); });
        return () => controller.abort();
    }, [codigoEntidadVinculada]);
    const subir = e => {
        e.preventDefault();
        if (codigoEntidadVinculada) guardar({ codigoEntidadVinculada, codigoAreaVinculada: codigoAreaVinculada || null });
    };
    return <Dialog open fullWidth maxWidth="sm" onClose={() => !guardando && onClose()}>
        <form onSubmit={subir}>
            <DialogTitle>Vincular dirección</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {(error || errorCarga) && <Alert severity="error">{error || errorCarga}</Alert>}
                    <TextField select required label="Dirección" value={codigoEntidadVinculada}
                        onChange={e => { setEntidad(e.target.value); setArea(''); }}>
                        {direcciones.map(row => <MenuItem key={row.CODIGO_ENTIDAD} value={row.CODIGO_ENTIDAD}>{row.NOMBRE}</MenuItem>)}
                    </TextField>
                    <TextField select label="Área" disabled={!codigoEntidadVinculada || cargandoAreas} value={codigoAreaVinculada}
                        onChange={e => setArea(e.target.value)} InputLabelProps={{ shrink: true }}
                        SelectProps={{ displayEmpty: true }}>
                        <MenuItem value="">Sin especificar área</MenuItem>
                        {areas.map(row => <MenuItem key={row.CODIGO_AREA} value={row.CODIGO_AREA}>
                            {row.DESCRIPCION}{row.CODIGO_ENTIDAD == null ? ' (general)' : ''}
                        </MenuItem>)}
                    </TextField>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
                <Button variant="contained" type="submit" disabled={guardando || cargandoAreas || !codigoEntidadVinculada}>Vincular</Button>
            </DialogActions>
        </form>
    </Dialog>;
}

export default function VinculosRiesgo({ ruta, entidad, editable, refrescar }) {
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const endpoint = `${ruta}/vinculos`;
    const cargar = async signal => {
        const { data } = await apiClient.get(endpoint, { signal });
        if (!signal?.aborted) setRows(data.result);
    };
    useEffect(() => {
        const controller = new AbortController();
        cargar(controller.signal).catch(e => { if (!controller.signal.aborted) setError(mensajeError(e)); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [endpoint]);
    const ejecutar = async write => {
        setGuardando(true);
        setError('');
        try {
            await write();
            setModal(null);
            await Promise.all([cargar(), refrescar()]);
        } catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); }
    };
    const columnas = [
        { field: 'direccionVinculada', headerName: 'Dirección vinculada', flex: 1, minWidth: 170, valueGetter: ({ value }) => value?.nombre },
        { field: 'areaVinculada', headerName: 'Área', flex: 1, minWidth: 150, valueGetter: ({ value }) => value?.descripcion ?? 'Sin especificar' },
        ...(editable ? [{ field: 'acciones', headerName: 'Acciones', width: 120, sortable: false, renderCell: ({ row }) =>
            <Button color="error" size="small" disabled={guardando} onClick={() => { setError(''); setModal(row); }}>Desactivar</Button> }] : []),
    ];
    return <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
            <Typography color="text.secondary">Las direcciones vinculadas ven este riesgo en modo de solo lectura.</Typography>
            {editable && <Button variant="contained" startIcon={<LinkRounded />} onClick={() => { setError(''); setModal('nuevo'); }}>Vincular</Button>}
        </Stack>
        {error && !modal && <Alert severity="error">{error}</Alert>}
        <DataGrid autoHeight rows={rows} columns={columnas} getRowId={row => row.codigoVinculo}
            loading={cargando} localeText={localeTextES} disableSelectionOnClick />
        {modal === 'nuevo' && <FormVinculo entidad={entidad} guardando={guardando} error={error}
            onClose={() => { setError(''); setModal(null); }} guardar={body => ejecutar(() => apiClient.post(endpoint, body))} />}
        {modal?.codigoVinculo && <Dialog open onClose={() => !guardando && setModal(null)}>
            <DialogTitle>Desactivar vínculo</DialogTitle>
            <DialogContent>{error ? <Alert severity="error">{error}</Alert> : <Typography>¿Retirar el vínculo con {modal.direccionVinculada?.nombre}?</Typography>}</DialogContent>
            <DialogActions>
                <Button disabled={guardando} onClick={() => setModal(null)}>Cancelar</Button>
                <Button disabled={guardando} variant="contained" color="error" onClick={() => ejecutar(() => apiClient.delete(`${endpoint}/${modal.codigoVinculo}`))}>Desactivar</Button>
            </DialogActions>
        </Dialog>}
    </Stack>;
}
