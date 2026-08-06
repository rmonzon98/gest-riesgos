/**
 * @fileoverview 
 * Gestión de documentos asociados al seguimiento:
 * - Listado de archivos por período y mes.
 * - Carga de documentos con validación local alineada al backend.
 * - Descarga segura de archivos usando blobs.
 * - Previsualización (imágenes, PDF, Excel y DOCX).
 *
 * @module Riesgos/Comportamiento/Seguimiento/SeguimientoDocsModal.jsx
 * @version 1.1
 */

import { useEffect, useState, useCallback } from "react";
import apiClient from "api/apiClient";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Stack, Button, LinearProgress, Alert, Tooltip,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
    IconButton, Snackbar, Box, Typography
} from "@mui/material";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

function formatSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(1)} GB`;
}
function formatDate(dateLike) {
    try {
        const d = dateLike ? new Date(dateLike) : null;
        if (!d || isNaN(d.getTime())) return "—";
        return d.toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" });
    } catch {
        return "—";
    }
}

const ALLOWED_MIMES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
]);
const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".xlsm"]);
const ACCEPT_STR = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.xlsm";

/**
 * getExt
 * 
 * Obtiene la extensión de un nombre de archivo.
 *
 * @param {string} name Nombre de archivo.
 * @returns {string} Extensión incluyendo el punto, o cadena vacía.
 */
function getExt(name = "") {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i).toLowerCase() : "";
}
function isAllowedFile(file) {
    const mime = (file?.type || "").toLowerCase();
    const ext = getExt(file?.name || file?.originalname || "");
    if (mime.startsWith("image/")) return true;
    if (ALLOWED_MIMES.has(mime)) return true;
    if (ALLOWED_EXT.has(ext)) return true;
    return false;
}

const isImageName = (name = "") => /^\.?(png|jpe?g|gif|webp|bmp|svg)$/i.test(getExt(name).slice(1));
const isPDFName = (name = "") => getExt(name) === ".pdf";
const isExcelName = (name = "") => [".xlsx", ".xls", ".xlsm"].includes(getExt(name));
const isDocxName = (name = "") => getExt(name) === ".docx";
const isDocLegacyName = (name = "") => getExt(name) === ".doc";


/**
 * SeguimientoDocsModal
 *
 * Gestiona los documentos asociados a un mes de seguimiento para una entidad y período.
 *
 * @component
 */
export default function SeguimientoDocsModal({
    open,
    onClose,
    entidadNombre,
    periodo,
    mes,
    titulo = "Documentos",
    viewOnly = false,
    entidadId = null,
    endpoints = {
        list: "/api/seguimientos-actualizados/documentos",
        upload: "/api/seguimientos-actualizados/documentos",
        download: (codigo_doc) => `/api/seguimientos-actualizados/documentos/${codigo_doc}/descargar`,
        // delete opcionalmente sobrescribible, pero por defecto cumple con tu middleware:
        delete: (codigo_doc) => `/api/seguimientos-actualizados/documentos/${codigo_doc}`,
    },
}) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [subiendo, setSubiendo] = useState(false);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [error, setError] = useState("");

    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
    const openSnack = (message, severity = "success") => setSnack({ open: true, message, severity });
    const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

    /**
     * listar
     */
    const listar = useCallback(async () => {
        if (!open || !periodo || !mes) return;
        try {
            setLoading(true);
            setError("");
            const params = {
                codigo_periodo: Number(periodo),
                mes: Number(mes),
                ...(viewOnly && { codigo_entidad: Number(entidadId) }),
            };

            const { data } = await apiClient.get(endpoints.list, {
                params,
            });

            setDocs(Array.isArray(data?.documentos) ? data.documentos : []);
        } catch (e) {
            console.error(e);
            setError("No fue posible cargar los documentos.");
            setDocs([]);
        } finally {
            setLoading(false);
        }
    }, [open, periodo, mes, endpoints.list]);

    useEffect(() => { listar(); }, [listar]);

    /**
     * subir
     */
    const subir = async (evt) => {
        const files = Array.from(evt.target.files || []);
        if (!files.length) return;

        // 1) Pre-validación local 
        const invalidLocal = files.filter((f) => !isAllowedFile(f)).map((f) => f.name);
        if (invalidLocal.length) {
            openSnack(`Tipos no permitidos: ${invalidLocal.join(", ")}`, "error");
            evt.target.value = "";
            return;
        }

        // 2) POST
        const fd = new FormData();
        files.forEach((f) => fd.append("files[]", f));
        fd.append("codigo_periodo", String(periodo));
        fd.append("mes", String(mes));

        try {
            setSubiendo(true);
            const { data } = await apiClient.post(endpoints.upload, fd);

            if (data?.ok) {
                const tot = Array.isArray(data.inserted) ? data.inserted.length : files.length;
                openSnack(`Archivo(s) subido(s) correctamente (${tot}).`);
            } else {
                openSnack("Subida completada.", "success");
            }
            await listar();
        } catch (e) {
            console.error(e);
            const status = e?.response?.status;
            const payload = e?.response?.data;

            if (status === 400 && payload?.error === "TIPO_NO_PERMITIDO") {
                const lista = Array.isArray(payload.invalid) ? payload.invalid.join(", ") : "(sin detalle)";
                openSnack(`Tipos no permitidos por el servidor: ${lista}`, "error");
            } else if (status === 413) {
                openSnack("El/los archivo(s) exceden el tamaño permitido.", "error");
            } else {
                const msg = payload?.message || payload?.error || "Error al subir documentos.";
                openSnack(msg, "error");
            }
        } finally {
            setSubiendo(false);
            evt.target.value = "";
        }
    };

    /**
     * descargar
     */
    const descargar = async (doc) => {
        try {
            const url = endpoints.download(doc.codigo_doc);
            const params = {
                codigo_periodo: Number(periodo),
                mes: Number(mes),
                ...(viewOnly && { codigo_entidad: Number(entidadId) }),
            };

            const response = await apiClient.get(url, {
                params,
                responseType: "blob",
            });

            const contentType = response.headers["content-type"] || "";
            if (contentType.includes("application/json")) {
                const text = await response.data.text?.();
                const parsed = text ? JSON.parse(text) : {};
                const msg = parsed?.message || parsed?.error || "No fue posible descargar el documento.";
                openSnack(msg, "error");
                return;
            }

            // Nombre de archivo desde Content-Disposition
            let filename = doc.nombre || `documento_${doc.codigo_doc}`;
            const dispo = response.headers["content-disposition"];
            if (dispo) {
                const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(dispo);
                if (m && m[1]) {
                    try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
                }
            }

            const blob = new Blob([response.data], { type: contentType || "application/octet-stream" });
            saveAs(blob, filename);
        } catch (e) {
            console.error(e);
            const payload = e?.response?.data;
            let msg = "No fue posible descargar el documento.";
            if (payload instanceof Blob) {
                try {
                    const text = await payload.text();
                    const json = JSON.parse(text);
                    msg = json?.message || json?.error || msg;
                } catch {
                }
            } else if (typeof payload === "object" && payload) {
                msg = payload?.message || payload?.error || msg;
            }
            openSnack(msg, "error");
        }
    };

    // ===== Estado y helpers para previsualización =====
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const [blobUrl, setBlobUrl] = useState("");
    const [excelSheets, setExcelSheets] = useState([]);
    const [excelIndex, setExcelIndex] = useState(0);
    const [previewHTML, setPreviewHTML] = useState("");

    const revokeUrl = useCallback((url) => { try { if (url) URL.revokeObjectURL(url); } catch { } }, []);
    const closePreview = () => {
        setPreviewOpen(false);
        revokeUrl(blobUrl);
        setBlobUrl("");
        setPreviewItem(null);
        setPreviewHTML("");
        setExcelSheets([]);
        setExcelIndex(0);
        setPreviewLoading(false);
    };

    const fetchBlob = async (doc, as = "blob") => {
        const url = endpoints.download(doc.codigo_doc);

        const params = {
            codigo_periodo: Number(periodo),
            mes: Number(mes),
            ...(viewOnly && { codigo_entidad: Number(entidadId) }),
        };

        const resp = await apiClient.get(url, {
            params,
            responseType: as,
        });

        return resp.data;
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
            const mammoth = await import("mammoth/mammoth.browser"); // npm i mammoth
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

    /**
     * openPreview
     */
    const openPreview = async (doc) => {
        setPreviewItem(doc);
        setPreviewOpen(true);
        setPreviewLoading(true);
        setPreviewHTML("");
        setExcelSheets([]);
        setExcelIndex(0);
        revokeUrl(blobUrl);
        setBlobUrl("");

        const name = doc.nombre || doc.filename || "";
        try {
            if (isExcelName(name)) {
                const ab = await fetchBlob(doc, "arraybuffer");
                const sheets = buildExcelHTMLs(ab);
                setExcelSheets(sheets);
                setExcelIndex(0);
                setPreviewLoading(false);
                return;
            }

            if (isDocxName(name)) {
                const ab = await fetchBlob(doc, "arraybuffer");
                const html = await buildDocxHTML(ab);
                if (html == null) {
                    openSnack("Para previsualizar .docx instala mammoth (npm i mammoth).", "info");
                    setPreviewLoading(false);
                    return;
                }
                setPreviewHTML(html);
                setPreviewLoading(false);
                return;
            }

            if (isDocLegacyName(name)) {
                setPreviewLoading(false);
                return;
            }

            if (isImageName(name) || isPDFName(name)) {
                const b = await fetchBlob(doc, "blob");
                const url = URL.createObjectURL(b);
                setBlobUrl(url);
                setPreviewLoading(false);
                return;
            }

            setPreviewLoading(false);
            openSnack("Tipo no soportado para previsualización. Descárgalo para verlo.", "info");
        } catch (e) {
            console.error(e);
            setPreviewLoading(false);
            openSnack("No se pudo generar la vista previa.", "error");
        }
    };

    useEffect(() => {
        if (!previewOpen || excelSheets.length === 0) return;
        const onKey = (e) => {
            if (e.key === "ArrowRight") setExcelIndex((i) => Math.min(i + 1, excelSheets.length - 1));
            else if (e.key === "ArrowLeft") setExcelIndex((i) => Math.max(i - 1, 0));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [previewOpen, excelSheets.length]);

    /**
     * eliminar
     *
     * PUT /api/seguimientos-actualizados/documentos/:codigo_doc
     * body: { periodo, mes }
     * Usa el middleware `eliminarDocumento`.
     */
    const eliminar = async (doc) => {
        const ok = window.confirm(`¿Seguro que deseas eliminar el documento "${doc.nombre || doc.filename}"?`);
        if (!ok) return;

        try {
            setEliminandoId(doc.codigo_doc);
            const url = endpoints.delete
                ? endpoints.delete(doc.codigo_doc)
                : `/api/seguimientos-actualizados/documentos/${doc.codigo_doc}`;

            await apiClient.put(
                url,
                { periodo: Number(periodo), mes: Number(mes) },
                {}
            );

            // Independientemente del mensaje del backend, tratamos 200 como éxito
            setDocs((prev) => prev.filter((d) => d.codigo_doc !== doc.codigo_doc));
            openSnack("Documento eliminado correctamente.", "success");
        } catch (e) {
            console.error(e);
            const payload = e?.response?.data;
            const msg = payload?.message || payload?.error || "Error al eliminar documento.";
            openSnack(msg, "error");
        } finally {
            setEliminandoId(null);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                {titulo} — {entidadNombre ?? "Entidad"} — {periodo ? `Período ${periodo}` : ""} — {mes ? `Mes ${mes}` : ""}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshRounded />}
                            onClick={listar}
                            disabled={loading}
                        >
                            Actualizar
                        </Button>

                        {(!viewOnly) && (
                            <Button
                                component="label"
                                variant="contained"
                                startIcon={<CloudUploadRounded />}
                                disabled={subiendo}
                            >
                                Subir archivos
                                <input
                                    type="file"
                                    multiple
                                    hidden
                                    accept={ACCEPT_STR}
                                    onChange={subiendo ? undefined : subir}
                                />
                            </Button>)}

                        {(loading || subiendo) && <LinearProgress sx={{ flex: 1 }} />}
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}

                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 120 }}>Tamaño</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 180 }}>Fecha</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 210 }}>Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {docs.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={4}>
                                            <Alert severity="info" sx={{ m: 0 }}>
                                                No hay documentos para este mes.
                                            </Alert>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {docs.map((d) => (
                                    <TableRow key={d.codigo_doc ?? `${d.nombre}-${d.fecha}`} hover>
                                        <TableCell>{d.nombre ?? d.filename ?? "(sin nombre)"}</TableCell>
                                        <TableCell>{formatSize(d.tamano ?? d.size)}</TableCell>
                                        <TableCell>{formatDate(d.fecha ?? d.creado ?? d.created_at)}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                <Tooltip title="Previsualizar">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => openPreview(d)}
                                                            disabled={eliminandoId === d.codigo_doc}
                                                        >
                                                            <VisibilityRounded fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Descargar">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => descargar(d)}
                                                            disabled={eliminandoId === d.codigo_doc}
                                                        >
                                                            <DownloadRounded fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                {viewOnly || (
                                                    <Tooltip title="Eliminar">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => eliminar(d)}
                                                                disabled={eliminandoId === d.codigo_doc}
                                                            >
                                                                <DeleteRounded fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>)}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>

            {/* ===== Modal de Previsualización ===== */}
            <Dialog open={previewOpen} onClose={closePreview} fullWidth maxWidth="lg">
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1">{previewItem?.nombre || previewItem?.filename || "Previsualización"}</Typography>
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
                    {!previewLoading && blobUrl && isImageName(previewItem?.nombre || previewItem?.filename) && (
                        <Box sx={{ width: "100%", textAlign: "center" }}>
                            <img
                                alt={previewItem?.nombre || "imagen"}
                                src={blobUrl}
                                style={{ maxWidth: "100%", maxHeight: 600, objectFit: "contain" }}
                            />
                        </Box>
                    )}

                    {/* PDF */}
                    {!previewLoading && blobUrl && isPDFName(previewItem?.nombre || previewItem?.filename) && (
                        <iframe
                            title="preview-pdf"
                            src={blobUrl}
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
                    {!previewLoading && previewHTML && isDocxName(previewItem?.nombre || previewItem?.filename) && (
                        <Box sx={{ width: "100%", maxHeight: 600, overflow: "auto" }}>
                            <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
                        </Box>
                    )}

                    {/* Fallbacks */}
                    {!previewLoading && isDocLegacyName(previewItem?.nombre || previewItem?.filename) && (
                        <Alert severity="info">Los archivos .doc (Word antiguo) no se pueden previsualizar en el navegador. Descárgalo para verlo.</Alert>
                    )}
                    {!previewLoading &&
                        !blobUrl &&
                        excelSheets.length === 0 &&
                        !previewHTML && (
                            <Alert severity="info">Tipo no soportado para previsualización. Descárgalo para verlo.</Alert>
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
                            <Button startIcon={<DownloadRounded />} onClick={() => descargar(previewItem)}>
                                Descargar
                            </Button>
                        )}
                        <Button onClick={closePreview} startIcon={<CloseRounded />}>Cerrar</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={4500}
                onClose={closeSnack}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={closeSnack} severity={snack.severity} variant="filled" sx={{ width: "100%" }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
}
