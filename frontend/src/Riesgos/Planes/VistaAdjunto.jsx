import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Table, TableBody, TableCell, TableRow } from '@mui/material';
import apiClient from 'api/apiClient';
import { saveAs } from 'file-saver';

const IMAGEN = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
const ruta = (actividad, adjunto) => `/api/marn/asignaciones/${actividad.codigoResponsablePlan}/actividades/${actividad.codigoActividad}/documentos/${adjunto.codigoDoc}`;

export async function descargarAdjunto(actividad, adjunto) {
    const { data } = await apiClient.get(ruta(actividad, adjunto), { responseType: 'blob' });
    saveAs(data, adjunto.nombre);
}

export default function VistaAdjunto({ actividad, adjunto, onClose }) {
    const [contenido, setContenido] = useState(null);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);
    const direccion = ruta(actividad, adjunto);
    useEffect(() => {
        const controller = new AbortController();
        let objectUrl;
        const cargar = async () => {
            const extension = adjunto.nombre.split('.').pop().toLowerCase();
            if (!Object.hasOwn(IMAGEN, extension) && !['pdf', 'txt', 'csv', 'docx', 'xlsx'].includes(extension)) return;
            const { data } = await apiClient.get(direccion, { responseType: 'blob', signal: controller.signal });
            if (controller.signal.aborted) return;
            const tipo = extension === 'pdf' ? 'application/pdf' : IMAGEN[extension];
            if (tipo) {
                objectUrl = URL.createObjectURL(new Blob([data], { type: tipo }));
                setContenido({ objectUrl, pdf: extension === 'pdf' });
                return;
            }
            if (extension === 'docx') {
                const mammoth = await import('mammoth');
                const { value } = await mammoth.extractRawText({ arrayBuffer: await data.arrayBuffer() });
                if (!controller.signal.aborted) setContenido({ texto: value.slice(0, 20000) });
            } else if (extension === 'xlsx') {
                const { readWorkbookFromArrayBuffer, worksheetToAoA } = await import('utils/excelPreview');
                const libro = await readWorkbookFromArrayBuffer(await data.arrayBuffer());
                const hoja = libro.worksheets[0];
                if (!controller.signal.aborted) setContenido({ filas: hoja ? worksheetToAoA(hoja).slice(0, 100).map(row => row.slice(0, 24)) : [] });
            } else {
                const texto = await data.slice(0, 50000).text();
                if (!controller.signal.aborted) setContenido({ texto });
            }
        };
        cargar().catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar la vista previa.'); })
            .finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [direccion, adjunto.nombre]);
    return <Dialog open onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>{adjunto.nombre}</DialogTitle>
        <DialogContent dividers>
            {cargando && <LinearProgress />}
            {error && <Alert severity="error">{error}</Alert>}
            {!contenido && !error && !cargando && <Alert severity="info">Este formato se puede consultar mediante la descarga.</Alert>}
            {contenido?.objectUrl && (contenido.pdf ? <Box component="iframe" title={`Vista previa de ${adjunto.nombre}`} src={contenido.objectUrl}
                sx={{ border: 0, width: '100%', height: '65vh' }} /> : <Box component="img" alt={`Vista previa de ${adjunto.nombre}`} src={contenido.objectUrl} sx={{ maxWidth: '100%' }} />)}
            {contenido?.texto !== undefined && <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', m: 0 }}>{contenido.texto}</Box>}
            {contenido?.filas && <Box sx={{ overflow: 'auto' }}><Table size="small" aria-label="Vista previa de la primera hoja"><TableBody>
                {contenido.filas.map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}</TableRow>)}
            </TableBody></Table></Box>}
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Cerrar</Button>
            <Button variant="contained" onClick={() => descargarAdjunto(actividad, adjunto).catch(() => setError('No se pudo descargar el archivo.'))}>Descargar</Button>
        </DialogActions>
    </Dialog>;
}
