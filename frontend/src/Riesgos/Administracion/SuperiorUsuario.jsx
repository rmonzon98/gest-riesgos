import { useState } from 'react';
import { Alert, Autocomplete, Stack, TextField } from '@mui/material';
import useBusquedaMarn from 'funciones/useBusquedaMarn';

export default function SuperiorUsuario({ valor, colaborador, actualizar }) {
    const [texto, setTexto] = useState('');
    const opciones = useBusquedaMarn('/api/responsables-actualizados/superiores', texto);
    const elegido = valor.codigo_superior == null ? null
        : { codigoColaborador: valor.codigo_superior, nombre: valor.usuario_superior };
    return <Stack spacing={1}>
        <Autocomplete options={opciones} value={elegido} filterOptions={items => items}
            getOptionLabel={item => item.nombre || ''}
            isOptionEqualToValue={(a, b) => a.codigoColaborador === b.codigoColaborador}
            getOptionDisabled={item => item.codigoColaborador === Number(colaborador)}
            onInputChange={(_, value, reason) => { if (reason !== 'reset') setTexto(value); }}
            onChange={(_, persona) => actualizar(persona ? {
                codigo_superior: persona.codigoColaborador, usuario_superior: persona.nombre,
                nombre_superior: persona.nombre.slice(0, 100), puesto_superior: persona.cargo.slice(0, 100)
            } : { codigo_superior: null, usuario_superior: '' })}
            noOptionsText={texto.trim().length < 3 ? 'Escriba al menos tres caracteres' : 'Sin resultados'}
            renderInput={params => <TextField {...params} label="Usuario superior" />} />
        {!elegido && (valor.nombre_superior || valor.puesto_superior) &&
            <Alert severity="warning">Superior sin usuario asignado. No podrá verificar actividades.</Alert>}
    </Stack>;
}
