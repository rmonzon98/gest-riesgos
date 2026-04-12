// JuntarPDF.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
    Box, Card, CardHeader, CardContent, Stack, Button, Typography,
    List, ListItem, ListItemText, IconButton, Divider, TextField,
    Snackbar, Alert, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PreviewIcon from '@mui/icons-material/Preview';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

function JuntarPDF() {
    const [files, setFiles] = useState([]);                // File[]
    const [merging, setMerging] = useState(false);
    const [mergedUrl, setMergedUrl] = useState('');        // object URL del PDF combinado
    const [mergedBlob, setMergedBlob] = useState(null);    // Blob del PDF combinado
    const [outputName, setOutputName] = useState('PDF_Combinado.pdf');

    // UI: notificaciones y preview
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'info' });
    const [openPreview, setOpenPreview] = useState(false);

    const inputRef = useRef(null);
    const dropRef = useRef(null);

    // Limpia el objectURL cuando cambie
    useEffect(() => {
        return () => { if (mergedUrl) URL.revokeObjectURL(mergedUrl); };
    }, [mergedUrl]);

    // Validación PDF
    const isPdfFile = (f) => {
        const name = (f?.name || '').toLowerCase();
        const type = (f?.type || '').toLowerCase();
        return type === 'application/pdf' || /\.pdf$/i.test(name);
    };

    // Agregar archivos desde <input> o DnD
    const addFiles = useCallback((fileList) => {
        const arr = Array.from(fileList || []);
        const onlyPdf = arr.filter(isPdfFile);
        const rejected = arr.length - onlyPdf.length;

        setFiles((prev) => [...prev, ...onlyPdf]);

        if (rejected > 0) {
            setSnack({ open: true, severity: 'warning', msg: `Se ignoraron ${rejected} archivo(s) no PDF.` });
        }
    }, []);

    const onChoose = (e) => {
        addFiles(e.target.files);
        e.target.value = '';
    };

    // Drag & Drop simple (sin libs)
    useEffect(() => {
        const zone = dropRef.current;
        if (!zone) return;

        const onDragOver = (ev) => {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'copy';
            zone.style.borderColor = '#2a3f54';
        };
        const onDragLeave = () => { zone.style.borderColor = 'rgba(0,0,0,0.12)'; };
        const onDrop = (ev) => {
            ev.preventDefault();
            zone.style.borderColor = 'rgba(0,0,0,0.12)';
            addFiles(ev.dataTransfer.files);
        };

        zone.addEventListener('dragover', onDragOver);
        zone.addEventListener('dragleave', onDragLeave);
        zone.addEventListener('drop', onDrop);
        return () => {
            zone.removeEventListener('dragover', onDragOver);
            zone.removeEventListener('dragleave', onDragLeave);
            zone.removeEventListener('drop', onDrop);
        };
    }, [addFiles]);

    // Reordenar y remover
    const moveUp = (idx) => {
        if (idx <= 0) return;
        setFiles((prev) => {
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    };
    const moveDown = (idx) => {
        setFiles((prev) => {
            if (idx >= prev.length - 1) return prev;
            const next = [...prev];
            [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
            return next;
        });
    };
    const removeAt = (idx) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    // Combinar con pdf-lib (100% frontend)
    const merge = async () => {
        if (files.length < 2) {
            setSnack({ open: true, severity: 'info', msg: 'Selecciona al menos 2 PDFs para combinar.' });
            return;
        }
        try {
            setMerging(true);
            const out = await PDFDocument.create();

            for (const f of files) {
                const buf = await f.arrayBuffer();
                const src = await PDFDocument.load(buf);
                const pages = await out.copyPages(src, src.getPageIndices());
                pages.forEach((p) => out.addPage(p));
            }

            const bytes = await out.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });

            // libera url anterior si existe
            if (mergedUrl) URL.revokeObjectURL(mergedUrl);
            const url = URL.createObjectURL(blob);

            setMergedBlob(blob);
            setMergedUrl(url);
            setSnack({ open: true, severity: 'success', msg: 'PDFs combinados correctamente.' });
        } catch (e) {
            console.error(e);
            setSnack({ open: true, severity: 'error', msg: 'Ocurrió un error al combinar los PDFs.' });
        } finally {
            setMerging(false);
        }
    };

    // Descargar
    const download = () => {
        if (!mergedBlob) return;
        const a = document.createElement('a');
        const url = mergedUrl || URL.createObjectURL(mergedBlob);
        a.href = url;
        a.download = outputName?.trim() ? outputName.trim() : 'PDF_Combinado.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    // Previsualizar en modal (iframe)
    const preview = () => {
        if (!mergedUrl) {
            setSnack({ open: true, severity: 'info', msg: 'Primero combina los PDFs.' });
            return;
        }
        setOpenPreview(true);
    };

    // Limpia todo
    const resetAll = () => {
        setFiles([]);
        if (mergedUrl) URL.revokeObjectURL(mergedUrl);
        setMergedUrl('');
        setMergedBlob(null);
        setOutputName('PDF_Combinado.pdf');
    };

    const canMerge = useMemo(() => files.length >= 2 && !merging, [files, merging]);

    return (
        <Box p={3}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Juntar PDF
            </Typography>

            <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
                <CardHeader title="Selecciona tus PDFs (mínimo 2)" />
                <CardContent>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <input
                            ref={inputRef}
                            type="file"
                            hidden
                            accept="application/pdf"
                            multiple
                            onChange={onChoose}
                        />
                        <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => inputRef.current?.click()}>
                            Elegir archivos
                        </Button>
                        <Tooltip title="Restablecer selección y resultado">
                            <span>
                                <Button
                                    variant="text"
                                    startIcon={<RestartAltIcon />}
                                    onClick={resetAll}
                                    disabled={files.length === 0 && !mergedUrl}
                                >
                                    Limpiar
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>

                    {/* Zona de arrastre */}
                    <Box
                        ref={dropRef}
                        sx={{
                            border: '2px dashed rgba(0,0,0,0.12)',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            mb: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Arrastra y suelta aquí tus PDFs, o usa “Elegir archivos”.
                        </Typography>
                    </Box>

                    {/* Lista de archivos con controles de orden */}
                    <List dense>
                        {files.map((f, idx) => (
                            <React.Fragment key={`${f.name}-${idx}-${f.size}`}>
                                <ListItem
                                    secondaryAction={
                                        <Stack direction="row" spacing={0.5}>
                                            <Tooltip title="Subir">
                                                <span>
                                                    <IconButton size="small" onClick={() => moveUp(idx)} disabled={idx === 0}>
                                                        <ArrowUpwardIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Bajar">
                                                <span>
                                                    <IconButton size="small" onClick={() => moveDown(idx)} disabled={idx === files.length - 1}>
                                                        <ArrowDownwardIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Quitar">
                                                <IconButton size="small" onClick={() => removeAt(idx)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    }
                                >
                                    <ListItemText
                                        primary={f.name}
                                        secondary={`${(f.size / (1024 * 1024)).toFixed(2)} MB`}
                                    />
                                </ListItem>
                                {idx < files.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        ))}
                    </List>

                    {/* Acciones */}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" sx={{ mt: 2 }}>
                        <TextField
                            size="small"
                            label="Nombre del PDF resultante"
                            value={outputName}
                            onChange={(e) => setOutputName(e.target.value)}
                            sx={{ minWidth: 260 }}
                        />
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title={files.length < 2 ? 'Selecciona al menos 2 PDFs' : 'Combinar en un solo PDF'}>
                            <span>
                                <Button variant="contained" onClick={merge} disabled={!canMerge}>
                                    {merging ? 'Combinando…' : 'Combinar PDF'}
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title="Previsualizar">
                            <span>
                                <Button
                                    variant="outlined"
                                    startIcon={<PreviewIcon />}
                                    onClick={preview}
                                    disabled={!mergedUrl}
                                >
                                    Previsualizar
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title="Descargar">
                            <span>
                                <Button
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    onClick={download}
                                    disabled={!mergedBlob}
                                >
                                    Descargar
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                </CardContent>
            </Card>

            {/* Modal de previsualización */}
            <Dialog open={openPreview} onClose={() => setOpenPreview(false)} fullWidth maxWidth="md">
                <DialogTitle>Previsualización</DialogTitle>
                <DialogContent dividers>
                    {!mergedUrl ? (
                        <Typography color="text.secondary">Sin PDF combinado aún.</Typography>
                    ) : (
                        <iframe title="preview-merged-pdf" src={mergedUrl} style={{ width: '100%', height: '70vh', border: 0 }} />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPreview(false)}>Cerrar</Button>
                    <Button onClick={download} startIcon={<DownloadIcon />} disabled={!mergedBlob}>
                        Descargar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnack((s) => ({ ...s, open: false }))}
                    severity={snack.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default JuntarPDF;
