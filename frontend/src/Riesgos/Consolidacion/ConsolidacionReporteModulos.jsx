/**
 * @fileoverview
 * Consolida y descarga en un solo PDF los reportes finales generados por los distintos módulos,
 * permitiendo reordenar y seleccionar los archivos por período y categoría.
 *
 * @module Riesgos/Consolidacion/ConsolidacionReporteModulos
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Box, Card, CardHeader, CardContent, CardActions,
    Grid, Stack, Select, MenuItem,
    Button, LinearProgress, Alert, Chip, Typography,
    Checkbox, IconButton, Divider, Dialog, DialogTitle,
    DialogContent, DialogActions
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import FileDownloadRounded from "@mui/icons-material/FileDownloadRounded";
import PictureAsPdfRounded from "@mui/icons-material/PictureAsPdfRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { PDFDocument } from "pdf-lib";

const headers = () => ({ "x-access-token": localStorage.getItem("token") });

/**
 * fmtBytes
 *
 * Formatea un tamaño en bytes a una cadena legible (B, KB, MB, GB).
 *
 * @param {number} bytes - Cantidad de bytes.
 * @returns {string} Cadena formateada con unidad.
 */
const fmtBytes = (bytes) => {
    if (bytes == null) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let v = Number(bytes), i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(2)} ${units[i]}`;
};

/**
 * fmtDate
 *
 * Formatea una fecha en formato ISO a `YYYY-MM-DD HH:mm`.
 *
 * @param {string} iso - Cadena de fecha (ISO u otra interpretable por Date).
 * @returns {string} Fecha formateada o el valor original si no se puede parsear.
 */
const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch { return String(iso); }
};

const base64ToArrayBuffer = (b64) => {
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
};

const normalizeUrlKey = (url) => {
    if (!url) return null;
    try {
        if (/^https?:\/\//i.test(url)) {
            return String(new URL(url).toString());
        }
        return String(url).replace(/\\/g, "/").replace(/^\/+/, "");
    } catch {
        return String(url);
    }
};

/**
 * ConsolidacionReporteModulos
 *
 * Permite consolidar (unir) múltiples PDFs finales de los distintos módulos
 * del sistema en un único documento por período y categoría.
 *
 * - Obtiene los períodos disponibles y la unidad del usuario.
 * - Consulta al backend el listado de PDFs finales por período/categoría.
 * - Solicita al backend los binarios en lote y genera un PDF consolidado en front.
 *
 * @component
 * @param {number|string} [props.categoria] - Identificador numérico de la categoría (1..6).
 * @param {string} [props.titulo] - Título a mostrar en la UI.
 * @returns {JSX.Element}
 */
export default function ConsolidacionReporteModulos({ categoria = "", titulo }) {
    const [entidad, setEntidad] = useState("");
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState("");
    const [busy, setBusy] = useState(false);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState("");
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState(() => new Set());
    const [previewUrl, setPreviewUrl] = useState(null);

    const totalSize = useMemo(
        () => items.reduce((acc, it) => acc + (Number(it.size) || 0), 0),
        [items]
    );

    useEffect(() => {
        (async () => {
            try {
                /**
                 * Carga entidad y períodos disponibles para la vista de consolidación.
                 *
                 * @route GET /api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos
                 * @returns {200|500} `{ userInfo, periodos }`.
                 */
                const { data } = await axios.get(
                    "/api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos",
                    { headers: headers() }
                );
                setPeriodos(Array.isArray(data?.periodos) ? data.periodos : []);
                if (data?.userInfo) {
                    const { NOMBRE, SIGLAS } = data.userInfo;
                    setEntidad(`${NOMBRE} (${SIGLAS})`);
                }
            } catch {
                setPeriodos([]);
            }
        })();
    }, []);

    useEffect(() => {
        const fetchList = async () => {
            setError("");
            setItems([]);
            setSelected(new Set());
            if (!periodo || !categoria) return;
            try {
                setBusy(true);

                /**
                 * Obtiene la lista de archivos PDF finales generados por los módulos
                 * para un período y categoría específicos.
                 *
                 * @route GET /api/carga-archivos/consolidados
                 * @returns {200|400|500} `{ data: [{ filename, url, size, createdAt, ... }] }`.
                 */
                const { data } = await axios.get("/api/carga-archivos/consolidados", {
                    params: { periodo, categoria },
                    headers: headers(),
                });
                const arr = Array.isArray(data?.data) ? data.data : [];
                const normalized = arr.map((it, idx) => ({
                    ...it,
                    _tempId: String(it.tempId ?? it.id ?? idx),
                }));
                setItems(normalized);
                if (!normalized.length) setError("No se encontraron PDFs finales con esos filtros.");
            } catch (err) {
                setError(err?.response?.data?.msg || "Error al obtener los archivos finales.");
            } finally {
                setBusy(false);
            }
        };
        fetchList();
    }, [periodo, categoria]);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const from = result.source.index, to = result.destination.index;
        if (from === to) return;
        setItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    const toggleOne = (tempId) => {
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(tempId)) n.delete(tempId); else n.add(tempId);
            return n;
        });
    };
    const toggleAll = () => {
        setSelected((prev) => {
            if (items.length === 0) return new Set();
            if (prev.size === items.length) return new Set();
            return new Set(items.map(i => i._tempId));
        });
    };
    const allChecked = items.length > 0 && selected.size === items.length;
    const someChecked = selected.size > 0 && selected.size < items.length;

    const downloadBlob = (blob, filename = "consolidado.pdf") => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.setAttribute("download", filename);
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    };

    const FLAG_MAP = {
        1: "control_interno",
        2: "fraude",
        3: "evaluacion_riesgo",
        4: "continuidad",
        5: "mapa_riesgos",
        6: "monitoreo",
    };

    const obtenerCategoria = (cat) => FLAG_MAP[cat];

    /**
     * handleConsolidar
     *
     * Consolida en un solo PDF los reportes seleccionados en la lista.
     *
     * - Valida que exista al menos un PDF marcado.
     * - Filtra y respeta el orden actual de los ítems seleccionados.
     * - Envía al backend las URLs/filenames para obtener su contenido en base64.
     * - Usa `pdf-lib` para unir todas las páginas en un solo documento.
     * - Dispara la descarga del PDF consolidado en el navegador.
     *
     * Consume:
     * - POST /api/carga-archivos/descargar-lote
     */
    const handleConsolidar = async () => {
        if (!selected.size) {
            setError("Selecciona al menos un PDF para consolidar.");
            return;
        }
        try {
            setMerging(true);
            setError("");
            const orderedSelected = items.filter(i => selected.has(i._tempId) && i.url);
            if (!orderedSelected.length) {
                setError("No hay PDFs seleccionados con URLs válidas.");
                return;
            }
            const payload = { items: orderedSelected.map(it => ({ url: it.url, filename: it.filename })) };
            const { data } = await axios.post("/api/carga-archivos/descargar-lote", payload, { headers: headers() });
            if (!data?.ok) throw new Error(data?.msg || "Fallo al descargar el lote de PDFs.");

            const serverFiles = Array.isArray(data.files) ? data.files : [];
            const byKey = new Map(serverFiles.map(f => [String(f.key), f]));
            const arrayBuffers = orderedSelected.map(it => {
                const k = normalizeUrlKey(it.url);
                const f = byKey.get(k);
                if (!f?.base64) throw new Error(`No se recibió contenido para ${it.filename ?? k}`);
                return base64ToArrayBuffer(f.base64);
            });

            const merged = await PDFDocument.create();
            for (const ab of arrayBuffers) {
                const src = await PDFDocument.load(ab);
                const pages = await merged.copyPages(src, src.getPageIndices());
                pages.forEach(p => merged.addPage(p));
            }
            const bytes = await merged.save();
            downloadBlob(new Blob([bytes], { type: "application/pdf" }),
                `consolidado_${obtenerCategoria(categoria)}_${periodo}.pdf`
            );
        } catch (e) {
            setError(e?.message || "Error al consolidar los PDFs seleccionados.");
        } finally {
            setMerging(false);
        }
    };

    const handleReset = () => {
        setPeriodo("");
        setItems([]);
        setSelected(new Set());
        setError("");
    };

    const handlePreview = (url, filename) => {
        if (!url) return;
        if (filename?.toLowerCase().endsWith(".pdf")) {
            setPreviewUrl(url);
        } else {
            window.open(url, "_blank");
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                {titulo}
            </Typography>
            <Card>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Período</Typography>
                            <Select fullWidth size="small" value={periodo} displayEmpty onChange={(e) => setPeriodo(e.target.value)}>
                                <MenuItem value=""><em>Seleccione un período</em></MenuItem>
                                {periodos.map((p) => (
                                    <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                        {p.FECINI} - {p.FECFIN} del {p.CODIGO_PERIODO}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1.5} mt={2} alignItems="center">
                        <Checkbox
                            checked={allChecked}
                            indeterminate={someChecked}
                            onChange={toggleAll}
                            inputProps={{ "aria-label": "seleccionar todos" }}
                        />
                        <Typography variant="body2">Seleccionar todos</Typography>

                        <Button
                            variant="contained"
                            onClick={handleConsolidar}
                            disabled={busy || merging || !selected.size}
                            startIcon={<PictureAsPdfRounded />}
                            sx={{ ml: 2 }}
                        >
                            Consolidar (orden actual)
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshRounded />}
                            onClick={handleReset}
                            disabled={busy || merging}
                        >
                            Limpiar
                        </Button>

                        {(busy || merging) && (
                            <Box sx={{ flex: 1 }}><LinearProgress /></Box>
                        )}
                    </Stack>

                    {!!error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}

                    {!!items.length && (
                        <>
                            <Stack direction="row" spacing={1.5} alignItems="center" mt={2} flexWrap="wrap">
                                <Chip label={`Total: ${items.length}`} color="primary" variant="outlined" />
                                <Chip label={`Seleccionados: ${selected.size}`} variant="outlined" />
                            </Stack>

                            <Box mt={2}>
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable droppableId="cards-droppable">
                                        {(dropProvided) => (
                                            <Stack spacing={1.25} ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                                                {items.map((it, index) => (
                                                    <Draggable key={it._tempId} draggableId={it._tempId} index={index} isDragDisabled={busy || merging}>
                                                        {(dragProvided, snapshot) => (
                                                            <Card ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                elevation={snapshot.isDragging ? 6 : 1}
                                                                sx={{ borderRadius: 2 }}>
                                                                <CardContent sx={{ py: 1.25 }}>
                                                                    <Stack direction="row" alignItems="center" spacing={1.25}>
                                                                        <IconButton
                                                                            size="small"
                                                                            {...dragProvided.dragHandleProps}
                                                                            sx={{ cursor: busy || merging ? "not-allowed" : "grab" }}
                                                                            title={busy || merging ? "No disponible mientras carga/une" : "Arrastrar para reordenar"}
                                                                            disabled={busy || merging}
                                                                        >
                                                                            <DragIndicatorRounded fontSize="small" />
                                                                        </IconButton>

                                                                        <Checkbox
                                                                            checked={selected.has(it._tempId)}
                                                                            onChange={() => toggleOne(it._tempId)}
                                                                            sx={{ mr: 0.5 }}
                                                                        />

                                                                        <Stack sx={{ flex: 1, minWidth: 0 }}>
                                                                            <Typography variant="subtitle2" noWrap title={it.filename}>
                                                                                {it.filename || "—"}
                                                                            </Typography>
                                                                            <Stack direction="row" spacing={1} divider={<Divider orientation="vertical" flexItem />}>
                                                                                <Typography variant="caption">Dirección: {it.direccion ?? "—"}</Typography>
                                                                                <Typography variant="caption">Fecha: {fmtDate(it.createdAt)}</Typography>
                                                                            </Stack>
                                                                        </Stack>

                                                                        <Stack direction="row" spacing={1}>
                                                                            {!!it.url && (
                                                                                <>
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        title="Previsualizar"
                                                                                        onClick={() => handlePreview(process.env.REACT_APP_API_URL + it.url, it.filename)}
                                                                                    >
                                                                                        <OpenInNewRounded fontSize="small" />
                                                                                    </IconButton>
                                                                                    <IconButton
                                                                                        component="a"
                                                                                        href={it.url}
                                                                                        download
                                                                                        size="small"
                                                                                        title="Descargar"
                                                                                    >
                                                                                        <FileDownloadRounded fontSize="small" />
                                                                                    </IconButton>
                                                                                </>
                                                                            )}
                                                                        </Stack>
                                                                    </Stack>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {dropProvided.placeholder}
                                            </Stack>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            </Box>
                        </>
                    )}
                </CardContent>

                <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 2 }}>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        Ordena las cards con drag &amp; drop, marca las que quieras y presiona “Consolidar”.
                    </Typography>
                </CardActions>
            </Card>

            {/* Modal de previsualización */}
            <Dialog open={!!previewUrl} onClose={() => setPreviewUrl(null)} fullWidth maxWidth="lg">
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6">Previsualización del PDF</Typography>
                    <IconButton onClick={() => setPreviewUrl(null)}><CloseRounded /></IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ height: "80vh", p: 0 }}>
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            title="PDF Preview"
                            style={{ width: "100%", height: "100%", border: "none" }}
                        />
                    ) : (
                        <Typography variant="body2" sx={{ p: 2 }}>No se pudo cargar el archivo.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewUrl(null)}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
}
