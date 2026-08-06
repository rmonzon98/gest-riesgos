/**
 * @fileoverview
 * Módulo de carga, listado y gestión de documentos de seguimiento.
 *
 * @module Riesgos/Comportamiento/CargaArchivos.jsx
 * @version 1.2
 * @author Equipo
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import apiClient from "api/apiClient";
import {
    Box, Card, CardHeader, CardContent, Stack, Button, LinearProgress, Typography, Alert,
    IconButton, List, ListItem, ListItemText, Chip, Dialog, DialogTitle, DialogContent,
    DialogActions, Collapse, Tooltip, Switch, FormControlLabel
} from "@mui/material";
import {
    UploadFileRounded, RefreshRounded, VisibilityRounded, VisibilityOffRounded,
    DownloadRounded, CloseRounded, ChevronLeftRounded, ChevronRightRounded,
    DeleteOutlineRounded
} from "@mui/icons-material";
import * as XLSX from "xlsx";

/**
 * Módulo de carga y administración de archivos de seguimiento.
 *
 * Permite seleccionar, subir, listar, marcar como final y previsualizar documentos.
 *
 * @component
 */
export default function CargaArchivos({
    flag,
    periodo = "",
    baseUrl = "/api/carga-archivos",
    showList = true,
    maxMB = 20,
    onUploaded
}) {
    const inputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const [items, setItems] = useState([]);
    const [loadingList, setLoadingList] = useState(false);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState(null);
    const [previewHTML, setPreviewHTML] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);

    // Navegación de hojas de Excel
    const [excelSheets, setExcelSheets] = useState([]); // [{name, html}]
    const [excelIndex, setExcelIndex] = useState(0);

    const [listVisible, setListVisible] = useState(Boolean(showList));

    // Estado de toggle por ítem (para deshabilitar switch mientras se guarda)
    const [toggling, setToggling] = useState({}); // { [id]: boolean }

    const FLAG_MAP = {
        1: "control_interno",
        2: "fraude",
        3: "evaluacion_riesgo",
        4: "continuidad",
        5: "mapa_riesgos",
        6: "seguimiento",
        7: "informe_anual",
        8: "monitoreo",
    };
    const ALLOWED_FLAGS = new Set(Object.values(FLAG_MAP));

    /**
     * Normaliza el código de flag para garantizar un valor válido antes de subir.
     */
    const normalizeFlag = (val) => {
        if (val == null) return "";
        const s = String(val).trim().toLowerCase();
        if (FLAG_MAP[s]) return FLAG_MAP[s];
        if (FLAG_MAP[val]) return FLAG_MAP[val];
        if (ALLOWED_FLAGS.has(s)) return s;
        return "";
    };

    const ACCEPT =
        ".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx," +
        "application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel," +
        "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";

    const bytesToMB = (b = 0) => (b / (1024 * 1024)).toFixed(2);
    const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp"
    ];

    const isImage = (ct = "") => ct?.startsWith?.("image/");
    const isPDF = (ct = "") => ct === "application/pdf";
    const isExcel = (ct = "") =>
        ct === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        ct === "application/vnd.ms-excel";
    const isWord = (ct = "") =>
        ct === "application/msword" ||
        ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isLegacyDoc = (name = "") => String(name).toLowerCase().endsWith(".doc");
    const isDocx = (name = "", ct = "") =>
        String(name).toLowerCase().endsWith(".docx") ||
        ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const clearMessage = () => setMsg({ type: "", text: "" });

    /**
     * Limpia el archivo seleccionado en el input y en el estado.
     */
    const resetInput = () => {
        if (inputRef.current) inputRef.current.value = "";
        setFile(null);
    };

    /**
     * Permite al usuario “eliminar” el archivo seleccionado
     * antes de enviarlo al backend (simplemente limpia la selección).
     */
    const handleRemoveSelected = () => {
        clearMessage();
        resetInput();
    };

    /**
     * Maneja la selección de un archivo desde el input de tipo file.
     */
    const handlePick = (e) => {
        clearMessage();
        const f = e.target.files?.[0] || null;
        if (!f) return setFile(null);

        const ext = `.${(f.name.split(".").pop() || "").toLowerCase()}`;
        const mimeOk = validTypes.includes(f.type);
        const extOk = [".pdf", ".xlsx", ".xls", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".doc", ".docx"].includes(ext);

        if (!mimeOk && !extOk) {
            setMsg({ type: "error", text: "Tipo de archivo no permitido. Solo PDF, Excel, Word e imágenes." });
            e.target.value = "";
            setFile(null);
            return;
        }
        if (f.size > maxMB * 1024 * 1024) {
            setMsg({ type: "error", text: `El archivo supera el máximo de ${maxMB} MB.` });
            e.target.value = "";
            setFile(null);
            return;
        }
        setFile(f);
    };

    /**
     * Valida los datos requeridos y envía el archivo seleccionado al backend.
     */
    const handleUpload = async () => {
        clearMessage();
        const normFlag = normalizeFlag(flag);

        if (!file) return setMsg({ type: "warning", text: "Selecciona un archivo antes de subir." });
        if (!normFlag) return setMsg({ type: "error", text: "Flag inválido o faltante." });
        if (periodo === "" || periodo === null || periodo === undefined)
            return setMsg({ type: "error", text: "Falta el período (periodo)." });

        try {
            setBusy(true);
            setProgress(0);

            const fd = new FormData();
            fd.append("file", file);
            fd.append("flag", normFlag);
            fd.append("periodo", String(periodo));
            fd.append("nombre_real", file.name);
            fd.append("categoria", flag);

            await apiClient.post(`${baseUrl}`, fd, {
                onUploadProgress: (evt) => {
                    if (!evt.total) return;
                    const pct = Math.round((evt.loaded * 100) / evt.total);
                    setProgress(pct);
                },
            });

            setMsg({ type: "success", text: "Archivo subido correctamente." });
            resetInput();
            if (showList && listVisible) await fetchList();
            if (typeof onUploaded === "function") onUploaded();
        } catch (err) {
            const text =
                err?.response?.data?.msg ||
                err?.response?.data?.error ||
                "No se pudo subir el archivo. Intenta de nuevo.";
            setMsg({ type: "error", text });
        } finally {
            setBusy(false);
            setProgress(0);
        }
    };

    /**
     * Formatea una fecha ISO a una cadena legible con fecha y hora local.
     *
     * @param {string} isoString - Cadena de fecha en formato ISO.
     */
    function formatDateTime(isoString) {
        if (!isoString) return "";
        const d = new Date(isoString);
        const pad = (n) => String(n).padStart(2, "0");
        const day = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    // Normaliza UI: si vinieran varios PDFs con final=1, deja seleccionado solo el primero.
    const enforceSingleFinalInUI = (list) => {
        const pdfs = list.filter(it => isPDF(it.contentType));
        const alreadyFinal = pdfs.filter(it => Number(it.final) === 1);
        if (alreadyFinal.length <= 1) return list;

        const keepId = alreadyFinal[0].id;
        return list.map(it => {
            if (!isPDF(it.contentType)) return it;
            if (it.id === keepId) return { ...it, final: 1 };
            return { ...it, final: 0 };
        });
    };

    const fetchList = useCallback(async () => {
        const normFlag = normalizeFlag(flag);
        if (!showList || !listVisible || !normFlag) return;
        try {
            setLoadingList(true);
            const res = await apiClient.get(`${baseUrl}/${normFlag}`, {
                params: { periodo },
            });
            const arr = Array.isArray(res.data) ? res.data : [];
            setItems(enforceSingleFinalInUI(arr));
        } catch (err) {
            setItems([]);
            setMsg({ type: "error", text: "No se pudo obtener el listado." });
        } finally {
            setLoadingList(false);
        }
    }, [showList, listVisible, flag, baseUrl, periodo]);

    useEffect(() => {
        if (listVisible) fetchList();
    }, [fetchList, listVisible]);

    const fetchBlobArrayBuffer = async (item) => {
        const normFlag = normalizeFlag(flag);
        const res = await apiClient.get(`${baseUrl}/${normFlag}/${item.id}/download`, {
            params: { periodo },
            responseType: "arraybuffer",
        });
        return res.data;
    };

    const buildExcelHTMLs = (ab) => {
        const wb = XLSX.read(ab, { type: "array" });
        const out = [];
        for (const name of wb.SheetNames) {
            const ws = wb.Sheets[name];
            const html = XLSX.utils.sheet_to_html(ws, { editable: false, header: "", footer: "" });
            out.push({ name, html });
        }
        return out;
    };

    const buildDocxHTML = async (ab) => {
        try {
            const mammoth = await import("mammoth/mammoth.browser");
            const { value: html } = await mammoth.convertToHtml({ arrayBuffer: ab }, {
                styleMap: [
                    "p[style-name='Title'] => h1:fresh",
                    "p[style-name='Subtitle'] => h2:fresh"
                ]
            });
            return html || "<p>(Documento vacío)</p>";
        } catch {
            return null;
        }
    };

    const openPreview = async (item) => {
        setPreviewItem(item);
        setPreviewOpen(true);
        setPreviewHTML("");
        setExcelSheets([]);
        setExcelIndex(0);
        setPreviewLoading(true);

        try {
            if (isPDF(item.contentType) || isImage(item.contentType)) {
                setPreviewLoading(false);
                return;
            }

            // Excel: genera TODAS las hojas
            if (isExcel(item.contentType) || /\.(xlsx|xls)$/i.test(item.filename || "")) {
                const ab = await fetchBlobArrayBuffer(item);
                const sheets = buildExcelHTMLs(ab);
                setExcelSheets(sheets);
                setExcelIndex(0);
                setPreviewLoading(false);
                return;
            }

            // Word DOCX
            if (isWord(item.contentType) || /\.(docx|doc)$/i.test(item.filename || "")) {
                if (isLegacyDoc(item.filename)) {
                    setPreviewLoading(false);
                    return;
                }
                const ab = await fetchBlobArrayBuffer(item);
                const html = await buildDocxHTML(ab);
                if (html == null) {
                    setMsg({ type: "info", text: "Para previsualizar .docx instala mammoth: npm i mammoth" });
                    setPreviewLoading(false);
                    return;
                }
                setPreviewHTML(html);
                setPreviewLoading(false);
                return;
            }

            setPreviewLoading(false);
        } catch {
            setPreviewLoading(false);
            setMsg({ type: "error", text: "No se pudo generar la vista previa." });
        }
    };

    const closePreview = () => {
        setPreviewOpen(false);
        setPreviewItem(null);
        setPreviewHTML("");
        setExcelSheets([]);
        setExcelIndex(0);
        setPreviewLoading(false);
    };

    const handleDownload = async (item) => {
        const normFlag = normalizeFlag(flag);
        try {
            const res = await apiClient.get(`${baseUrl}/${normFlag}/${item.id}/download`, {
                params: { periodo },
                responseType: "blob",
            });
            const blob = new Blob([res.data], { type: item?.contentType || "application/octet-stream" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = item?.filename || "archivo";
            a.click();
            URL.revokeObjectURL(a.href);
        } catch {
            setMsg({ type: "error", text: "No se pudo descargar el archivo." });
        }
    };

    const handleToggleFinal = async (item, checked) => {
        const normFlag = normalizeFlag(flag);
        const newVal = checked ? 1 : 0;
        const id = item.id;
        const categoria = item?.categoria ?? flag;

        const prevItems = items;
        setItems((arr) => {
            if (newVal === 1) {
                return arr.map((x) => {
                    if (!isPDF(x.contentType)) return x;
                    if (x.id === id) return { ...x, final: 1 };
                    return { ...x, final: 0 };
                });
            }
            return arr.map((x) => (x.id === id ? { ...x, final: 0 } : x));
        });
        setToggling((m) => ({ ...m, [id]: true }));

        try {
            await apiClient.post(
                `${baseUrl}/${normFlag}/final`,
                { id, periodo, categoria, final: newVal }
            );
        } catch (err) {
            setItems(prevItems);
            const text = err?.response?.data?.msg || err?.response?.data?.error || "No se pudo actualizar el estado 'Final'.";
            setMsg({ type: "error", text });
        } finally {
            setToggling((m) => ({ ...m, [id]: false }));
        }
    };

    /**
     * Elimina un archivo usando PUT.
     * Ruta asumida: PUT `${baseUrl}/${normFlag}/${item.id}` con { periodo } en el body.
     */
    const handleDelete = async (item) => {
        const normFlag = normalizeFlag(flag);
        if (!normFlag) {
            setMsg({ type: "error", text: "Flag inválido o faltante para eliminar." });
            return;
        }

        const confirmar = window.confirm(`¿Seguro que deseas eliminar el archivo "${item.filename}"?`);
        if (!confirmar) return;

        try {
            setBusy(true);
            await apiClient.put(
                `${baseUrl}/${normFlag}/${item.id}`,
                { periodo, flagN: flag }
            );

            setItems((arr) => arr.filter((x) => x.id !== item.id));
            setMsg({ type: "success", text: "Archivo eliminado correctamente." });
        } catch (err) {
            const text =
                err?.response?.data?.msg ||
                err?.response?.data?.error ||
                "No se pudo eliminar el archivo.";
            setMsg({ type: "error", text });
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        if (!previewOpen || excelSheets.length === 0) return;
        const onKey = (e) => {
            if (e.key === "ArrowRight") {
                setExcelIndex((i) => Math.min(i + 1, excelSheets.length - 1));
            } else if (e.key === "ArrowLeft") {
                setExcelIndex((i) => Math.max(i - 1, 0));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [previewOpen, excelSheets.length]);

    return (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardHeader
                title="Carga de archivos"
                subheader={`Solo PDF, Excel, Word e imágenes. Tamaño máx.: ${maxMB} MB`}
                action={
                    showList ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton onClick={() => setListVisible(v => !v)} title={listVisible ? "Ocultar lista" : "Mostrar lista"}>
                                {listVisible ? <VisibilityOffRounded /> : <VisibilityRounded />}
                            </IconButton>
                            <IconButton onClick={fetchList} disabled={loadingList || !listVisible} title="Refrescar">
                                <RefreshRounded />
                            </IconButton>
                        </Stack>
                    ) : null
                }
                sx={{ pb: 0 }}
            />

            <CardContent>
                <Stack spacing={2}>
                    {msg.text && (
                        <Alert severity={msg.type || "info"} onClose={() => setMsg({ type: "", text: "" })}>
                            {msg.text}
                        </Alert>
                    )}

                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                        <input
                            ref={inputRef}
                            type="file"
                            accept={ACCEPT}
                            onChange={handlePick}
                            style={{ display: "none" }}
                            id="carga-archivos-input"
                        />
                        <label htmlFor="carga-archivos-input">
                            <Button component="span" variant="outlined" startIcon={<UploadFileRounded />} disabled={busy}>
                                Seleccionar archivo
                            </Button>
                        </label>

                        <Button
                            variant="contained"
                            onClick={handleUpload}
                            disabled={!file || busy}
                            startIcon={<UploadFileRounded />}
                        >
                            Subir
                        </Button>

                        {file ? (
                            <Chip
                                label={`${file.name} • ${bytesToMB(file.size)} MB`}
                                variant="outlined"
                                sx={{ maxWidth: 360 }}
                                onDelete={handleRemoveSelected}
                                deleteIcon={<CloseRounded />}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No hay archivo seleccionado.
                            </Typography>
                        )}
                    </Stack>

                    {busy && (
                        <Box>
                            <LinearProgress variant="determinate" value={progress} />
                            <Typography variant="caption" color="text.secondary">{progress}% completado</Typography>
                        </Box>
                    )}

                    {/* Listado */}
                    {showList && (
                        <Collapse in={listVisible} unmountOnExit>
                            <Box>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>Documentos cargados</Typography>

                                {loadingList ? (
                                    <LinearProgress />
                                ) : items.length ? (
                                    <List dense disablePadding>
                                        {items.map((it) => {
                                            const showPreview =
                                                isImage(it.contentType) ||
                                                isPDF(it.contentType) ||
                                                isExcel(it.contentType) ||
                                                isWord(it.contentType);

                                            const isPdfType = isPDF(it.contentType);
                                            const checked = Number(it?.final) === 1;

                                            return (
                                                <ListItem
                                                    key={it.id || it.filename}
                                                    secondaryAction={
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            {/* Switch SOLO para PDFs */}
                                                            {isPdfType && (
                                                                <Tooltip title={checked ? "Marcar como no final" : "Marcar como final"}>
                                                                    <FormControlLabel
                                                                        control={
                                                                            <Switch
                                                                                size="small"
                                                                                checked={checked}
                                                                                onChange={(e) => handleToggleFinal(it, e.target.checked)}
                                                                                disabled={Boolean(toggling[it.id])}
                                                                            />
                                                                        }
                                                                        label="Final"
                                                                    />
                                                                </Tooltip>
                                                            )}

                                                            {showPreview && (
                                                                <IconButton edge="end" onClick={() => openPreview(it)} title="Previsualizar">
                                                                    <VisibilityRounded />
                                                                </IconButton>
                                                            )}
                                                            <IconButton edge="end" onClick={() => handleDownload(it)} title="Descargar">
                                                                <DownloadRounded />
                                                            </IconButton>
                                                            <IconButton
                                                                edge="end"
                                                                onClick={() => handleDelete(it)}
                                                                title="Eliminar"
                                                            >
                                                                <DeleteOutlineRounded />
                                                            </IconButton>
                                                        </Stack>
                                                    }
                                                >
                                                    <ListItemText
                                                        primary={it.filename}
                                                        secondary={
                                                            <span>
                                                                {formatDateTime(it.createdAt) + " • "}
                                                                {it.size ? `${bytesToMB(it.size)} MB` : "tamaño desconocido"}
                                                                {isLegacyDoc(it.filename) ? " • (.doc sin vista previa)" : ""}
                                                            </span>
                                                        }
                                                    />
                                                </ListItem>
                                            );
                                        })}
                                    </List>
                                ) : (
                                    <Alert severity="info" variant="outlined">No hay documentos cargados aún.</Alert>
                                )}
                            </Box>
                        </Collapse>
                    )}
                </Stack>
            </CardContent>

            {/* Modal Preview */}
            <Dialog open={previewOpen} onClose={closePreview} fullWidth maxWidth="lg">
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1">{previewItem?.filename || "Previsualización"}</Typography>
                        {excelSheets.length > 0 && (
                            <Typography variant="body2" color="text.secondary">
                                — Hoja {excelIndex + 1} de {excelSheets.length} ({excelSheets[excelIndex]?.name})
                            </Typography>
                        )}
                    </Stack>
                    <IconButton onClick={closePreview}><CloseRounded /></IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ minHeight: 300 }}>
                    {previewLoading && <LinearProgress />}

                    {/* Imagen */}
                    {!previewLoading && previewItem?.url && isImage(previewItem.contentType) && (
                        <Box sx={{ width: "100%", textAlign: "center" }}>
                            <img
                                alt={previewItem.filename}
                                src={previewItem.url}
                                style={{ maxWidth: "100%", maxHeight: 600, objectFit: "contain" }}
                            />
                        </Box>
                    )}

                    {/* PDF */}
                    {!previewLoading && previewItem?.url && isPDF(previewItem.contentType) && (
                        <iframe
                            title="preview-pdf"
                            src={previewItem.url}
                            style={{ width: "100%", height: 600, border: "none" }}
                        />
                    )}

                    {/* Excel: multipestaña */}
                    {!previewLoading && excelSheets.length > 0 && (
                        <Box sx={{ width: "100%", maxHeight: 600, overflow: "auto" }}>
                            <div dangerouslySetInnerHTML={{ __html: excelSheets[excelIndex]?.html || "" }} />
                        </Box>
                    )}

                    {/* DOCX */}
                    {!previewLoading && previewHTML && isDocx(previewItem?.filename, previewItem?.contentType) && (
                        <Box sx={{ width: "100%", maxHeight: 600, overflow: "auto" }}>
                            <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
                        </Box>
                    )}

                    {/* Fallbacks */}
                    {!previewLoading && isLegacyDoc(previewItem?.filename) && (
                        <Alert severity="info">
                            Los archivos .doc (Word antiguo) no se pueden previsualizar en el navegador. Descárgalo para verlo.
                        </Alert>
                    )}
                    {!previewLoading &&
                        !isImage(previewItem?.contentType) &&
                        !isPDF(previewItem?.contentType) &&
                        excelSheets.length === 0 &&
                        !previewHTML && (
                            <Alert severity="info">
                                Tipo no soportado para previsualización. Descárgalo para verlo.
                            </Alert>
                        )}
                </DialogContent>

                <DialogActions sx={{ justifyContent: "space-between" }}>
                    {/* Navegación Excel */}
                    {excelSheets.length > 0 ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Tooltip title="Anterior (←)">
                                <span>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ChevronLeftRounded />}
                                        disabled={excelIndex === 0}
                                        onClick={() => setExcelIndex((i) => Math.max(0, i - 1))}
                                    >
                                        Anterior
                                    </Button>
                                </span>
                            </Tooltip>
                            <Tooltip title="Siguiente (→)">
                                <span>
                                    <Button
                                        variant="outlined"
                                        endIcon={<ChevronRightRounded />}
                                        disabled={excelIndex >= excelSheets.length - 1}
                                        onClick={() => setExcelIndex((i) => Math.min(excelSheets.length - 1, i + 1))}
                                    >
                                        Siguiente
                                    </Button>
                                </span>
                            </Tooltip>
                        </Stack>
                    ) : <span />}

                    <Stack direction="row" spacing={1}>
                        {previewItem && (
                            <Button startIcon={<DownloadRounded />} onClick={() => handleDownload(previewItem)}>
                                Descargar
                            </Button>
                        )}
                        <Button onClick={closePreview} startIcon={<CloseRounded />}>Cerrar</Button>
                    </Stack>
                </DialogActions>
            </Dialog>
        </Card>
    );
}
