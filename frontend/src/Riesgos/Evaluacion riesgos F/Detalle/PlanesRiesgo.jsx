import { useEffect, useId, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
    MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddRounded from '@mui/icons-material/AddRounded';
import apiClient from 'api/apiClient';
import { localeTextES } from 'theme/localeTextES';
import { safefmt } from 'funciones/Fechas';
import useBusquedaMarn from 'funciones/useBusquedaMarn';
import LineaCortes from 'Riesgos/Planes/LineaCortes';

const fechaCorta = fecha => safefmt(fecha?.slice(0, 10)) ?? '—';
const mensajeError = error => error?.response?.data?.error || 'No se pudo completar la operación.';
const etiquetaPersona = persona => [persona.nombre, persona.direccion, persona.cargo].filter(Boolean).join(' · ');

function FormPlan({ plan, onClose, guardar, guardando, error }) {
    const [descripcion, setDescripcion] = useState(plan?.descripcion ?? '');
    const [porcentaje, setPorcentaje] = useState(plan?.porcentajeMitigacion ?? '');
    return <Dialog open fullWidth maxWidth="sm" onClose={() => !guardando && onClose()}>
        <form onSubmit={event => { event.preventDefault(); guardar({ descripcion, porcentajeMitigacion: Number(porcentaje) }); }}>
            <DialogTitle>{plan ? 'Editar plan' : 'Nuevo plan de acción'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField label="Acción" required multiline minRows={2} value={descripcion}
                        onChange={e => setDescripcion(e.target.value)} inputProps={{ maxLength: 1000 }} />
                    <TextField label="Porcentaje de mitigación" required type="number" value={porcentaje}
                        onChange={e => setPorcentaje(e.target.value)} inputProps={{ min: 1, max: 100, step: 1 }} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={guardando || !descripcion.trim()}>Guardar plan</Button>
            </DialogActions>
        </form>
    </Dialog>;
}

function FormResponsable({ responsable, anio, frecuencias, onClose, guardar, guardando, error }) {
    const [tipo, setTipo] = useState(responsable && !responsable.codigoColaborador ? 'externo' : 'usuario');
    const [colaborador, setColaborador] = useState(responsable?.colaborador ?? null);
    const [busqueda, setBusqueda] = useState('');
    const [form, setForm] = useState({ nombreExterno: responsable?.nombreExterno ?? '', puestoExterno: responsable?.puestoExterno ?? '',
        codigoFrecuencia: responsable?.codigoFrecuencia ?? '', metodo: responsable?.metodo ?? '', recurso: responsable?.recurso ?? 'I',
        fechaInicio: responsable?.fechaInicio?.slice(0, 10) ?? `${anio}-01-01`, fechaFin: responsable?.fechaFin?.slice(0, 10) ?? `${anio}-12-31` });
    const opciones = useBusquedaMarn(tipo === 'usuario' ? '/api/marn/usuarios' : null, busqueda);
    const cambiar = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    const completa = tipo === 'usuario' ? Boolean(colaborador) : Boolean(form.nombreExterno.trim() && form.puestoExterno.trim());
    const fechasValidas = form.fechaInicio && form.fechaFin && form.fechaInicio <= form.fechaFin
        && form.fechaInicio.startsWith(`${anio}-`) && form.fechaFin.startsWith(`${anio}-`);
    const enviar = event => {
        event.preventDefault();
        if (!completa || !fechasValidas) return;
        const { nombreExterno, puestoExterno, ...comunes } = form;
        guardar({ ...comunes, tipo, ...(tipo === 'usuario' ? { codigoColaborador: colaborador.codigoColaborador } : { nombreExterno, puestoExterno }) });
    };
    return <Dialog open fullWidth maxWidth="sm" onClose={() => !guardando && onClose()}>
        <form onSubmit={enviar}>
            <DialogTitle>{responsable ? 'Editar responsable' : 'Agregar responsable'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField select label="Tipo de responsable" value={tipo} onChange={e => setTipo(e.target.value)}>
                        <MenuItem value="usuario">Usuario</MenuItem>
                        <MenuItem value="externo">Externo</MenuItem>
                    </TextField>
                    {tipo === 'usuario' ? <Autocomplete options={opciones} value={colaborador} onChange={(_, value) => setColaborador(value)}
                        onInputChange={(_, value) => setBusqueda(value)} filterOptions={options => options} getOptionLabel={etiquetaPersona}
                        isOptionEqualToValue={(a, b) => a.codigoColaborador === b.codigoColaborador}
                        noOptionsText={busqueda.trim().length < 3 ? 'Escriba al menos tres caracteres' : 'Sin resultados'}
                        renderInput={params => <TextField {...params} label="Buscar usuario" />} /> : <>
                        <TextField required label="Nombre externo" value={form.nombreExterno} onChange={e => cambiar('nombreExterno', e.target.value)} inputProps={{ maxLength: 150 }} />
                        <TextField required label="Puesto externo" value={form.puestoExterno} onChange={e => cambiar('puestoExterno', e.target.value)} inputProps={{ maxLength: 150 }} />
                    </>}
                    <TextField required select label="Frecuencia" value={form.codigoFrecuencia} onChange={e => cambiar('codigoFrecuencia', e.target.value)}>
                        {form.codigoFrecuencia !== '' && !frecuencias.some(row => row.CODIGO === form.codigoFrecuencia) &&
                            <MenuItem value={form.codigoFrecuencia} disabled>{responsable?.frecuencia?.descripcion || 'Frecuencia inactiva'}</MenuItem>}
                        {frecuencias.map(row => <MenuItem key={row.CODIGO} value={row.CODIGO}>{row.DESCRIPCION}</MenuItem>)}
                    </TextField>
                    <TextField required label="Método" value={form.metodo} onChange={e => cambiar('metodo', e.target.value)} inputProps={{ maxLength: 500 }} />
                    <TextField select label="Recurso" value={form.recurso} onChange={e => cambiar('recurso', e.target.value)}>
                        <MenuItem value="I">Interno</MenuItem><MenuItem value="E">Externo</MenuItem>
                    </TextField>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        {[['fechaInicio', 'Inicio'], ['fechaFin', 'Fin']].map(([key, label]) => <TextField key={key} required fullWidth type="date" label={label}
                            InputLabelProps={{ shrink: true }} value={form[key]} onChange={e => cambiar(key, e.target.value)}
                            inputProps={{ min: `${anio}-01-01`, max: `${anio}-12-31` }} />)}
                    </Stack>
                    {!fechasValidas && <Alert severity="warning">Las fechas deben estar ordenadas y dentro del año {anio}.</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={guardando || !completa || !fechasValidas || !form.codigoFrecuencia || !form.metodo.trim()}>
                    Guardar responsable
                </Button>
            </DialogActions>
        </form>
    </Dialog>;
}

export default function PlanesRiesgo({ ruta, editable, anio, frecuencias, refrescar }) {
    const [planes, setPlanes] = useState([]);
    const [expandido, setExpandido] = useState(null);
    const [modal, setModal] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const panelId = useId();
    const endpoint = `${ruta}/planes`;
    const cargar = async signal => {
        const { data } = await apiClient.get(endpoint, { signal });
        if (!signal?.aborted) setPlanes(data.result);
    };
    useEffect(() => {
        const controller = new AbortController();
        cargar(controller.signal).catch(e => { if (!controller.signal.aborted) setError(mensajeError(e)); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [endpoint]);
    const abrir = dialogo => { setError(''); setModal(dialogo); };
    const ejecutar = async write => {
        setError('');
        setGuardando(true);
        try {
            await write();
            setModal(null);
            await Promise.all([cargar(), refrescar()]);
        } catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); }
    };
    const planActivo = planes.find(plan => plan.codigoPlan === expandido);
    const urlResponsable = (plan, row) => `${endpoint}/${plan.codigoPlan}/responsables${row ? `/${row.codigoResponsablePlan}` : ''}`;
    const columnas = [
        { field: 'descripcion', headerName: 'Acción', flex: 1, minWidth: 180 },
        { field: 'porcentajeMitigacion', headerName: 'Mitigación', width: 115, type: 'number', valueFormatter: ({ value }) => `${value}%` },
        { field: 'responsables', headerName: 'Responsables', width: 145, sortable: false, renderCell: ({ row }) =>
            <Button size="small" aria-expanded={expandido === row.codigoPlan} aria-controls={panelId}
                onClick={() => setExpandido(current => current === row.codigoPlan ? null : row.codigoPlan)}>
                {expandido === row.codigoPlan ? 'Ocultar' : 'Ver'} ({row.responsables.length})
            </Button> },
        { field: 'cumplimiento', headerName: 'Cumplimiento', width: 125, type: 'number',
            valueFormatter: ({ value }) => value == null ? '—' : `${value}%` },
        ...(editable ? [{ field: 'acciones', headerName: 'Acciones', width: 175, sortable: false, renderCell: ({ row }) =>
            <Stack direction="row">
                <Button size="small" disabled={guardando} onClick={() => abrir({ tipo: 'plan', plan: row })}>Editar</Button>
                <Button size="small" disabled={guardando} color="error" onClick={() => abrir({ tipo: 'bajaPlan', plan: row })}>Desactivar</Button>
            </Stack> }] : [])
    ];
    const columnasResponsables = [
        { field: 'nombre', headerName: 'Responsable', flex: 1, minWidth: 180,
            valueGetter: ({ row }) => row.colaborador?.nombre || `Externo: ${row.nombreExterno}` },
        { field: 'direccion', headerName: 'Dirección', flex: 1, minWidth: 145, valueGetter: ({ row }) => row.colaborador?.direccion || '—' },
        { field: 'frecuencia', headerName: 'Frecuencia', width: 115, valueGetter: ({ value }) => value?.descripcion ?? '—' },
        { field: 'metodo', headerName: 'Método', width: 130 },
        { field: 'recurso', headerName: 'Recurso', width: 95, valueFormatter: ({ value }) => value === 'I' ? 'Interno' : 'Externo' },
        { field: 'fechaInicio', headerName: 'Inicio', width: 115, valueFormatter: ({ value }) => fechaCorta(value) },
        { field: 'fechaFin', headerName: 'Fin', width: 115, valueFormatter: ({ value }) => fechaCorta(value) },
        { field: 'cortes', headerName: 'Cortes', flex: 1, minWidth: 180, sortable: false,
            renderCell: ({ row }) => <LineaCortes cortes={row.cortes} mini /> },
        ...(editable ? [{ field: 'acciones', headerName: 'Acciones', width: 175, sortable: false, renderCell: ({ row }) =>
            <Stack direction="row">
                <Button size="small" disabled={guardando} onClick={() => abrir({ tipo: 'responsable', plan: planActivo, row })}>Editar</Button>
                <Button size="small" disabled={guardando} color="error" onClick={() => abrir({ tipo: 'bajaResponsable', plan: planActivo, row })}>Desactivar</Button>
            </Stack> }] : [])
    ];
    return <Stack spacing={2}>
        {editable && <Button startIcon={<AddRounded />} variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={() => abrir({ tipo: 'plan' })}>Nuevo plan</Button>}
        {error && !modal && <Alert severity="error">{error}</Alert>}
        <DataGrid autoHeight rows={planes} columns={columnas} getRowId={row => row.codigoPlan} loading={cargando} localeText={localeTextES} disableSelectionOnClick />
        <Collapse in={Boolean(planActivo)}>
            {planActivo && <Stack spacing={1.5} id={panelId} sx={{ p: { xs: 1, sm: 2 }, borderLeft: 3, borderColor: 'primary.main', bgcolor: 'action.hover' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                    <Typography component="h2" variant="subtitle1" fontWeight={700}>Responsables · {planActivo.descripcion}</Typography>
                    {editable && <Button startIcon={<AddRounded />} onClick={() => abrir({ tipo: 'responsable', plan: planActivo })}>Agregar responsable</Button>}
                </Stack>
                <Box sx={{ bgcolor: 'background.paper' }}><DataGrid autoHeight rows={planActivo.responsables} columns={columnasResponsables}
                    getRowId={row => row.codigoResponsablePlan} localeText={localeTextES} disableSelectionOnClick /></Box>
            </Stack>}
        </Collapse>
        {modal?.tipo === 'plan' && <FormPlan plan={modal.plan} onClose={() => abrir(null)} error={error} guardando={guardando}
            guardar={body => ejecutar(() => modal.plan ? apiClient.put(`${endpoint}/${modal.plan.codigoPlan}`, body) : apiClient.post(endpoint, body))} />}
        {modal?.tipo === 'responsable' && <FormResponsable responsable={modal.row} anio={anio} frecuencias={frecuencias}
            onClose={() => abrir(null)} error={error} guardando={guardando} guardar={body => ejecutar(() => modal.row
                ? apiClient.put(urlResponsable(modal.plan, modal.row), body) : apiClient.post(urlResponsable(modal.plan), body))} />}
        {modal?.tipo.startsWith('baja') && <Dialog open onClose={() => !guardando && abrir(null)}>
            <DialogTitle>{modal.tipo === 'bajaPlan' ? 'Desactivar plan' : 'Desactivar responsable'}</DialogTitle>
            <DialogContent>
                {error ? <Alert severity="error">{error}</Alert> : <Typography>¿Confirma la desactivación?</Typography>}
            </DialogContent>
            <DialogActions>
                <Button disabled={guardando} onClick={() => abrir(null)}>Cancelar</Button>
                <Button disabled={guardando} variant="contained" color="error" onClick={() => ejecutar(() => apiClient.delete(modal.tipo === 'bajaPlan'
                    ? `${endpoint}/${modal.plan.codigoPlan}` : urlResponsable(modal.plan, modal.row)))}>Desactivar</Button>
            </DialogActions>
        </Dialog>}
    </Stack>;
}
