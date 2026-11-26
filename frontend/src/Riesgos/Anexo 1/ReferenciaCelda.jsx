/**
 * @fileoverview
 * Acciones sobre una celda Presente / Funcionando / Vigente del Anexo 1:
 * - "Ver referencia": muestra el texto de referencia en un recuadro.
 * - "Ampliar": abre un editor grande con la referencia al lado y la respuesta.
 *
 * Los textos salen de anexo1Referencias.json, generado a partir del Excel
 * "Normas Control Interno.xlsx". Estructura: { [codigoNorma]: { "*": [p, f, v], [ocurrencia]: [p, f, v] } }
 * donde "*" une todas las filas del Excel con ese código y la ocurrencia se usa
 * cuando el sistema tiene la misma cantidad de filas repetidas (p. ej. varias "2.3").
 *
 * @module Riesgos/Anexo 1/ReferenciaCelda.jsx
 */

import { useState } from 'react';
import {
    Link, Popover, Typography, Box, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Paper, Grid
} from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import OpenInFullRounded from '@mui/icons-material/OpenInFullRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import referencias from './anexo1Referencias.json';

/** Extrae el código de la norma ("4. 2 Documentos…" → "4.2"). */
export const codigoNorma = (texto) => {
    const m = /^\s*(\d+(?:\s*\.\s*\d+)+)/.exec(texto ?? '');
    return m ? m[1].replace(/\s+/g, '').replace(/\.$/, '') : null;
};

const obtenerReferencia = (codigo, ocurrencia, columna) => {
    const ref = codigo ? referencias[codigo] : null;
    if (!ref) return '';
    return (ref[ocurrencia] ?? ref['*'])?.[columna] ?? '';
};

const enlaceSx = { display: 'inline-flex', alignItems: 'center', gap: 0.5 };

const AVISO_REFERENCIA = 'Texto de referencia. Actualice fechas, documentos y responsables antes de usarlo.';

function AvisoReferencia({ sx }) {
    return (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', fontStyle: 'italic', ...sx }}>
            {AVISO_REFERENCIA}
        </Typography>
    );
}

export default function ReferenciaCelda({ codigo, ocurrencia, columna, titulo, valor = '', onAplicar }) {
    const [anchor, setAnchor] = useState(null);
    const [editorAbierto, setEditorAbierto] = useState(false);
    const [borrador, setBorrador] = useState('');
    const referencia = obtenerReferencia(codigo, ocurrencia, columna);

    const abrirEditor = () => {
        setBorrador(valor ?? '');
        setEditorAbierto(true);
    };

    const aplicar = () => {
        onAplicar?.(borrador);
        setEditorAbierto(false);
    };

    // Agrega la referencia a la respuesta (debajo de lo ya escrito, si hay algo)
    const copiarReferencia = () => {
        setBorrador((b) => (b?.trim() ? `${b.trimEnd()}\n${referencia}` : referencia));
    };

    return (
        <>
            <Stack direction="row" spacing={1.5} sx={{ mb: 0.5 }}>
                {referencia && (
                    <Link
                        component="button"
                        type="button"
                        variant="caption"
                        underline="hover"
                        onClick={(e) => setAnchor(e.currentTarget)}
                        sx={enlaceSx}
                    >
                        <InfoOutlined sx={{ fontSize: 14 }} />
                        Ver referencia
                    </Link>
                )}
                <Link
                    component="button"
                    type="button"
                    variant="caption"
                    underline="hover"
                    onClick={abrirEditor}
                    sx={enlaceSx}
                >
                    <OpenInFullRounded sx={{ fontSize: 13 }} />
                    Ampliar
                </Link>
            </Stack>

            <Popover
                open={!!anchor}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <Box sx={{ p: 2, maxWidth: 420 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Referencia — {titulo}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {referencia}
                    </Typography>
                    <AvisoReferencia sx={{ mt: 1.5 }} />
                </Box>
            </Popover>

            <Dialog open={editorAbierto} onClose={() => setEditorAbierto(false)} fullWidth maxWidth={referencia ? 'lg' : 'md'}>
                <DialogTitle sx={{ pb: 1 }}>{titulo}</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        {referencia && (
                            <Grid item xs={12} md={5}>
                                <Typography variant="subtitle2">Referencia</Typography>
                                <AvisoReferencia sx={{ mb: 1 }} />
                                <Paper
                                    variant="outlined"
                                    sx={{ p: 1.5, bgcolor: 'action.hover', maxHeight: { xs: 200, md: 320 }, overflowY: 'auto' }}
                                >
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                        {referencia}
                                    </Typography>
                                </Paper>
                                <Button
                                    size="small"
                                    startIcon={<ContentCopyRounded fontSize="small" />}
                                    onClick={copiarReferencia}
                                    sx={{ mt: 1 }}
                                >
                                    Copiar a la respuesta
                                </Button>
                            </Grid>
                        )}
                        <Grid item xs={12} md={referencia ? 7 : 12}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Respuesta</Typography>
                            <TextField
                                autoFocus
                                fullWidth
                                multiline
                                minRows={12}
                                maxRows={20}
                                value={borrador}
                                placeholder="Escriba aquí"
                                onChange={(e) => setBorrador(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditorAbierto(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={aplicar}>Aplicar</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
