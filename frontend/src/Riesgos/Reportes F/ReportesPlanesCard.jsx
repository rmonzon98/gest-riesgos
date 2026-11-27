import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Button, Card, CardContent, CardHeader, MenuItem, Stack, TextField } from '@mui/material';
import { saveAs } from 'file-saver';
import apiClient from 'api/apiClient';
import { apiErrorMessage } from 'funciones/errors';
import useBusquedaMarn from 'funciones/useBusquedaMarn';
import usePeriodosPlanes from '../Planes/usePeriodosPlanes';

const base = '/api/marn/reportes-planes';

export default function ReportesPlanesCard({ logoBase64 }) {
    const [catalogo, setCatalogo] = useState(null);
    const [tipo, setTipo] = useState('');
    const [entidad, setEntidad] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [responsable, setResponsable] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState('');
    const { periodo, setPeriodo, periodos } = usePeriodosPlanes();
    const opciones = useBusquedaMarn(`${base}/busqueda-responsables${entidad ? `?entidad=${entidad}` : ''}`, busqueda);
    useEffect(() => {
        const controller = new AbortController();
        apiClient.get(`${base}/filtros`, { signal: controller.signal }).then(({ data }) => {
            if (controller.signal.aborted) return;
            setCatalogo(data.result);
            setTipo(data.result.reportes[0]?.codigo || '');
            setEntidad(data.result.propia ?? '');
        }).catch(e => { if (!controller.signal.aborted) setError(apiErrorMessage(e)); });
        return () => controller.abort();
    }, []);

    const exportar = async formato => {
        setOcupado(true);
        setError('');
        try {
            const { data } = await apiClient.get(`${base}/${tipo}`, {
                params: { periodo, entidad, responsable: responsable?.codigoColaborador, desde, hasta }
            });
            const { crearPdfPlanes, crearExcelPlanes } = await import('./exportarReportesPlanes');
            const nombre = `Planes-${tipo}-${periodo}`;
            if (formato === 'pdf') (await crearPdfPlanes(data.result, logoBase64)).download(nombre + '.pdf');
            else {
                const buffer = await crearExcelPlanes(data.result);
                saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombre + '.xlsx');
            }
        } catch (e) { setError(e.response ? apiErrorMessage(e) : 'No se pudo generar el archivo.'); }
        finally { setOcupado(false); }
    };
    const rangoInvalido = Boolean(desde && hasta && desde > hasta);
    return <Card variant="outlined">
        <CardHeader title="Planes de acción" />
        <CardContent>
            <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <Stack direction={{ xs: 'column', lg: 'row' }} useFlexGap flexWrap="wrap" spacing={1.5}>
                    <TextField select size="small" label="Reporte" value={tipo} onChange={e => setTipo(e.target.value)}
                        sx={{ minWidth: 290 }} disabled={!catalogo || ocupado}>
                        {(catalogo?.reportes || []).map(row => <MenuItem key={row.codigo} value={row.codigo}>{row.titulo}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Periodo" value={periodo} onChange={e => setPeriodo(e.target.value)}
                        sx={{ minWidth: 105 }} disabled={!periodos.length || ocupado}>
                        {periodos.map(row => <MenuItem key={row.CODIGO_PERIODO} value={row.CODIGO_PERIODO}>{row.CODIGO_PERIODO}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Dirección" value={entidad}
                        onChange={e => { setEntidad(e.target.value); setResponsable(null); }} sx={{ minWidth: 180 }} disabled={Boolean(catalogo?.propia) || ocupado}>
                        {!catalogo?.propia && <MenuItem value="">Todas las direcciones</MenuItem>}
                        {(catalogo?.direcciones || []).map(row => <MenuItem key={row.codigoEntidad} value={row.codigoEntidad}>{row.nombre}</MenuItem>)}
                    </TextField>
                    <Autocomplete options={opciones} value={responsable} onChange={(_, value) => setResponsable(value)}
                        onInputChange={(_, value, reason) => { if (reason !== 'reset') setBusqueda(value); }} sx={{ minWidth: 220 }}
                        filterOptions={items => items} getOptionLabel={item => item.nombre || ''} disabled={!catalogo || ocupado}
                        isOptionEqualToValue={(a, b) => a.codigoColaborador === b.codigoColaborador}
                        noOptionsText={busqueda.trim().length < 3 ? 'Escriba al menos tres caracteres' : 'Sin resultados'}
                        renderInput={params => <TextField {...params} size="small" label="Responsable" />} />
                    <TextField size="small" type="date" label="Desde" disabled={ocupado} InputLabelProps={{ shrink: true }}
                        value={desde} onChange={e => setDesde(e.target.value)} error={rangoInvalido} />
                    <TextField size="small" type="date" label="Hasta" disabled={ocupado} InputLabelProps={{ shrink: true }}
                        value={hasta} onChange={e => setHasta(e.target.value)} error={rangoInvalido}
                        helperText={rangoInvalido ? 'La fecha final debe ser igual o posterior a la inicial.' : undefined} />
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" disabled={!tipo || !periodo || ocupado || rangoInvalido} onClick={() => exportar('pdf')}>Descargar PDF</Button>
                    <Button variant="outlined" disabled={!tipo || !periodo || ocupado || rangoInvalido} onClick={() => exportar('xlsx')}>Descargar Excel</Button>
                </Stack>
            </Stack>
        </CardContent>
    </Card>;
}
