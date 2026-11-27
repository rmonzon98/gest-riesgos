import { Typography } from '@mui/material';
import { safefmt } from 'funciones/Fechas';

export default function RolesAsignados({ roles }) {
    return roles.map((rol, index) => <Typography component="span" variant="inherit" key={rol.codigo_rol}
        sx={{ color: rol.vencido ? 'text.secondary' : 'inherit' }}>
        {index > 0 && ', '}
        <span style={{ textDecoration: rol.vencido ? 'line-through' : 'none' }}>{rol.nombre}</span>
        {rol.vencido && ` (venció el ${safefmt(rol.fecha_fin)})`}
    </Typography>);
}
