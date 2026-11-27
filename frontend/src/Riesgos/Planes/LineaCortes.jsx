import { Box, ButtonBase, Stack, Tooltip, Typography } from '@mui/material';
import { safefmt } from 'funciones/Fechas';

import { estadosCorte } from './estadosCorte';
export { estadosCorte } from './estadosCorte';

export default function LineaCortes({ cortes = [], mini = false, onSeleccion }) {
    if (!cortes.length) return <Typography variant={mini ? 'caption' : 'body2'} color="text.secondary">Sin cortes programados</Typography>;
    return <Stack direction="row" spacing={mini ? 0.35 : 0.7} sx={{ minWidth: 0, overflowX: 'auto', p: mini ? 0.25 : 0.5 }}>
        {cortes.map(corte => {
            const estado = estadosCorte[corte.estado] ?? estadosCorte.futuro;
            const disabled = !onSeleccion;
            const Contenedor = disabled ? Box : ButtonBase;
            const rango = `${safefmt(corte.desde)} al ${safefmt(corte.hasta)}`;
            const label = `${corte.etiqueta}, ${rango}, ${estado.etiqueta}${corte.observada ? ', con observación' : ''}`;
            return <Tooltip key={corte.indice} title={label} describeChild disableInteractive>
                <Contenedor {...(disabled ? { component: 'span', 'aria-label': label } : { onClick: () => onSeleccion(corte), 'aria-label': label })}
                    sx={{ minWidth: mini ? 26 : 48, minHeight: mini ? 23 : 40, flex: '0 0 auto', position: 'relative', px: 0.75,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1,
                        border: '1px solid', borderColor: estado.color === 'default' ? 'divider' : `${estado.color}.main`,
                        bgcolor: estado.color === 'default' ? 'action.hover' : `${estado.color}.light`,
                        color: estado.color === 'default' ? 'text.primary' : `${estado.color}.contrastText`,
                        '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}>
                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: mini ? '0.63rem' : '0.75rem', whiteSpace: 'nowrap' }}>{corte.etiqueta}</Typography>
                    {corte.observada && <Box sx={{ position: 'absolute', top: 2, right: 2, width: 7, height: 7,
                        border: '1px solid', borderColor: 'background.paper', borderRadius: '50%', bgcolor: 'error.dark' }} />}
                </Contenedor>
            </Tooltip>;
        })}
    </Stack>;
}
