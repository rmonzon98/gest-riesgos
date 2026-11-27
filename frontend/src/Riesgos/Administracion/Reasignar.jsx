import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import apiClient from 'api/apiClient';
import { safefmt } from 'funciones/Fechas';
import useBusquedaMarn from 'funciones/useBusquedaMarn';
import { localeTextES } from 'theme/localeTextES';
import usePeriodosPlanes from '../Planes/usePeriodosPlanes';
import RecorridoGuiado from 'funciones/RecorridoGuiado';
import recorridoReasignar from 'Riesgos/Recorridos/reasignar';

const base = '/api/marn/reasignar';
const columnasRiesgos = [
    { field: 'ref', headerName: 'REF', width: 105 },
    { field: 'descripcion', headerName: 'Riesgo', flex: 1, minWidth: 200 },
    { field: 'dueno', headerName: 'Dueño actual', flex: 0.6, minWidth: 170, valueFormatter: ({ value }) => value || 'Sin asignar' }
];
const columnasResponsabilidades = [
    { field: 'ref', headerName: 'REF', width: 98, valueGetter: ({ row }) => row.plan.riesgo.ref },
    { field: 'direccion', headerName: 'Dirección', flex: 0.65, minWidth: 130, valueGetter: ({ row }) => row.plan.riesgo.seguridadEntidad.nombre },
    { field: 'periodo', headerName: 'Periodo', width: 85, valueGetter: ({ row }) => row.plan.riesgo.codigoPeriodo },
    { field: 'plan', headerName: 'Plan de acción', flex: 1, minWidth: 175, valueGetter: ({ row }) => row.plan.descripcion },
    { field: 'fechaInicio', headerName: 'Inicio', width: 102, valueFormatter: ({ value }) => safefmt(value?.slice(0, 10)) },
    { field: 'fechaFin', headerName: 'Fin', width: 102, valueFormatter: ({ value }) => safefmt(value?.slice(0, 10)) }
];

function Usuario({ label, usuario, onChange, disabled }) {
    const [busqueda, setBusqueda] = useState('');
    const opciones = useBusquedaMarn('/api/marn/usuarios', busqueda);
    return <Autocomplete options={opciones} value={usuario} onChange={(_, value) => onChange(value)}
        disabled={disabled} sx={{ minWidth: 230 }} filterOptions={items => items}
        getOptionLabel={item => item.nombre || ''}
        isOptionEqualToValue={(a, b) => a.codigoColaborador === b.codigoColaborador}
        onInputChange={(_, value, reason) => { if (reason !== 'reset') setBusqueda(value); }}
        noOptionsText={busqueda.trim().length < 3 ? 'Escriba al menos tres caracteres' : 'Sin resultados'}
        renderOption={(props, item) => <li {...props}><Box>
            <Typography>{item.nombre}</Typography>
            <Typography variant="caption" color="text.secondary">{[item.direccion, item.cargo].filter(Boolean).join(' · ')}</Typography>
        </Box></li>} renderInput={params => <TextField {...params} label={label} size="small" />} />;
}

export default function Reasignar() {
    const { periodos, periodo, setPeriodo, errorPeriodos } = usePeriodosPlanes();
    const [tab, setTab] = useState(0);
    const [catalogos, setCatalogos] = useState({ direcciones: [], areas: [] });
    const [entidad, setEntidad] = useState('');
    const [area, setArea] = useState('');
    const [origen, setOrigen] = useState(null);
    const [destino, setDestino] = useState(null);
    const [seleccion, setSeleccion] = useState([]);
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorCatalogos, setErrorCatalogos] = useState('');
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [version, setVersion] = useState(0);
    const responsables = tab === 1;
    const seccion = responsables ? 'responsabilidades' : 'riesgos';
    const codigoOrigen = origen?.codigoColaborador;
    useEffect(() => {
        const controller = new AbortController();
        apiClient.get(`${base}/catalogos`, { signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setCatalogos(data.result); })
            .catch(e => { if (!controller.signal.aborted) setErrorCatalogos(e.response?.data?.error || 'No se pudieron cargar los filtros.'); });
        return () => controller.abort();
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        setError('');
        setFilas([]);
        setSeleccion([]);
        if (responsables ? !codigoOrigen : !entidad || !periodo) {
            setCargando(false);
            return () => controller.abort();
        }
        setCargando(true);
        apiClient.get(`${base}/${seccion}`, { params: responsables ? { origen: codigoOrigen } : { periodo, entidad, area },
            signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setFilas(data.result); })
            .catch(e => { if (!controller.signal.aborted) setError(e.response?.data?.error || 'No se pudo cargar la lista.'); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, [area, codigoOrigen, entidad, periodo, responsables, seccion, version]);

    const reasignar = async () => {
        setGuardando(true);
        setExito('');
        setError('');
        try {
            const { data } = await apiClient.patch(`${base}/${seccion}`, {
                ...(responsables ? { origen: codigoOrigen } : { periodo, entidad, area }),
                ids: seleccion, destino: destino.codigoColaborador
            });
            setExito(`Se reasignaron ${data.result} registros a ${destino.nombre}.`);
            setDestino(null);
            setVersion(value => value + 1);
        } catch (e) { setError(e.response?.data?.error || 'No se pudo completar la reasignación.'); }
        finally { setGuardando(false); }
    };

    return <Stack spacing={2} sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography component="h1" variant="h5" fontWeight={700} data-tour="reasignar-titulo">Reasignar</Typography>
            <RecorridoGuiado pantalla="reasignar" pasos={recorridoReasignar} habilitado={!guardando} />
        </Stack>
        <Tabs data-tour="reasignar-tipos" value={tab} onChange={(_, value) => { setTab(value); setDestino(null); setExito(''); }}
            aria-label="Tipo de reasignación">
            <Tab label="Dueños de riesgos" disabled={guardando} />
            <Tab label="Responsables de planes" disabled={guardando} />
        </Tabs>
        {(error || errorPeriodos || errorCatalogos) && <Alert severity="error">{error || errorPeriodos || errorCatalogos}</Alert>}
        {exito && <Alert severity="success" onClose={() => setExito('')}>{exito}</Alert>}
        <Stack data-tour="reasignar-filtros" direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
            {responsables ? <Usuario label="Persona de origen" usuario={origen} onChange={setOrigen} disabled={guardando} /> : <>
                <TextField select label="Periodo" size="small" value={periodo} onChange={e => setPeriodo(e.target.value)}
                    sx={{ minWidth: 135 }} disabled={guardando || !periodos.length}>
                    {periodos.map(row => <MenuItem key={row.CODIGO_PERIODO} value={row.CODIGO_PERIODO}>{row.CODIGO_PERIODO}</MenuItem>)}
                </TextField>
                <TextField select label="Dirección" size="small" value={entidad} sx={{ minWidth: 190 }} disabled={guardando}
                    onChange={e => { setEntidad(e.target.value); setArea(''); }}>
                    <MenuItem value="">Seleccione una dirección</MenuItem>
                    {catalogos.direcciones.map(row => <MenuItem key={row.codigoEntidad} value={row.codigoEntidad}>{row.nombre}</MenuItem>)}
                </TextField>
                <TextField select label="Área" size="small" value={area} onChange={e => setArea(e.target.value)}
                    sx={{ minWidth: 190 }} disabled={guardando || !entidad}>
                    <MenuItem value="">Todas las áreas</MenuItem>
                    {catalogos.areas.filter(row => row.codigoEntidad == null || row.codigoEntidad === entidad)
                        .map(row => <MenuItem key={row.codigoArea} value={row.codigoArea}>{row.descripcion}</MenuItem>)}
                </TextField>
            </>}
        </Stack>
        <DataGrid data-tour="reasignar-seleccion" key={seccion} autoHeight checkboxSelection disableSelectionOnClick
            getRowId={row => responsables ? row.codigoResponsablePlan : row.codigoRiesgo}
            selectionModel={seleccion} onSelectionModelChange={setSeleccion}
            rows={filas} columns={responsables ? columnasResponsabilidades : columnasRiesgos} loading={cargando}
            pageSize={10} rowsPerPageOptions={[10]} localeText={localeTextES} sx={{ minHeight: 235 }} />
        <Stack data-tour="reasignar-destino" direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <Usuario label="Asignar a…" usuario={destino} onChange={setDestino} disabled={guardando} />
            <Button variant="contained" onClick={reasignar} disabled={!seleccion.length || !destino || guardando ||
                (responsables && codigoOrigen === destino.codigoColaborador)}>Reasignar seleccionados</Button>
        </Stack>
    </Stack>;
}
