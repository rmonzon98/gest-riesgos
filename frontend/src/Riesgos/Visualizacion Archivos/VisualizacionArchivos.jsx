// src/RIESGOS/VisualizacionArhivos.jsx
import React, { useEffect, useState, useCallback } from "react";
import apiClient from "api/apiClient";
import {
    Box, Card, CardHeader, CardContent, Grid, MenuItem, Select, FormControl, InputLabel, Typography, Stack,
    Paper, Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, IconButton, LinearProgress,
} from "@mui/material";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import * as XLSX from "xlsx";
import { fmt } from "funciones/Fechas";

const FILE_BASE = process.env.REACT_APP_API_URL;

// ================== Helpers de rutas ==================
/**
 * Convierte la "ruta" que viene del backend (a veces absoluta Windows, a veces relativa)
 * en una URL pública usando FILE_BASE.
 *
 * Casos:
 * - "docs/entidad1/..."        → FILE_BASE/docs/entidad1/...
 * - "C:\...\backend\docs\..."  → FILE_BASE/docs/...
 * - ya es http(s)              → tal cual
 */
const buildFileUrl = (ruta) => {
    if (!ruta) return "";
    const r = String(ruta).trim();

    if (/^https?:\/\//i.test(r)) return r;

    // Buscar desde "docs\" o "docs/"
    const m = r.match(/docs[\\/].*$/i);
    const sub = (m ? m[0] : r).replace(/\\/g, "/"); // normalizar slashes

    const path = sub.startsWith("/") ? sub : `/${sub}`;
    return `${FILE_BASE || ""}${path}`;
};

// ================== Helpers de tipos ==================
const getExt = (name = "") => {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i).toLowerCase() : "";
};

const isImageName = (name = "") =>
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].includes(getExt(name));
const isPDFName = (name = "") => getExt(name) === ".pdf";
const isExcelName = (name = "") =>
    [".xlsx", ".xls", ".xlsm"].includes(getExt(name));
const isDocxName = (name = "") => getExt(name) === ".docx";
const isDocLegacyName = (name = "") => getExt(name) === ".doc";

// ================== Agrupación por tipo ==================
const TYPE_LABELS = {
    "módulo de control interno y gobernanza": "Módulo de control interno y gobernanza",
    "módulo de evaluación de riesgos asociados a fraude o corrupción":
        "Módulo de evaluación de riesgos asociados a fraude o corrupción",
    "módulo de evaluación y gestión de riesgos": "Módulo de evaluación y gestión de riesgos",
    "módulo de continuidad y monitoreo": "Módulo de continuidad y monitoreo",
    "módulo de mapa de riesgos": "Módulo de mapa de riesgos",
    "módulo de monitoreo del comportamiento de los riesgos":
        "Módulo de monitoreo del comportamiento de los riesgos",
    otro: "Otros documentos",
};

const TYPE_ORDER = [
    "módulo de control interno y gobernanza",
    "módulo de evaluación de riesgos asociados a fraude o corrupción",
    "módulo de evaluación y gestión de riesgos",
    "módulo de continuidad y monitoreo",
    "módulo de mapa de riesgos",
    "módulo de monitoreo del comportamiento de los riesgos",
    "otro",
];

const normalizeItem = (r, idx) => ({
    id: idx,
    nombre: r.nombre || r.filename || "Documento",
    ruta: r.ruta || r.path || r.PATH || "",
    tipo: r.tipo || "otro",
    fecha_creacion: r.fecha_creacion || r.FECHA_CREACION || null,
});

// ================== API ==================
const api = {
    unidades: () =>
        apiClient.get("/api/direcciones-actualizados"),
    periodos: () =>
        apiClient.get("/api/periodos-actualizados"),
    listarArchivosDireccionPeriodo: ({ codigo_entidad, codigo_periodo }) =>
        apiClient.get("/api/carga-archivos/listar-archivos-direccion-periodo", {
            params: { codigo_entidad, codigo_periodo },
        }),
};

// ================== Card de archivo ==================
function FileCard({ doc, onPreview, onDownload }) {
    const fecha = doc.fecha_creacion
        ? new Date(doc.fecha_creacion).toLocaleString("es-GT")
        : "";

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.5,
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
            }}
        >
            <Typography
                variant="body2"
                fontWeight={600}
                noWrap
                title={doc.nombre}
            >
                {doc.nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                {fecha || "Fecha no disponible"}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Tooltip title="Previsualizar">
                    <span>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onPreview(doc)}
                            disabled={!doc.ruta}
                        >
                            <VisibilityRounded fontSize="small" />
                        </Button>
                    </span>
                </Tooltip>
                <Tooltip title="Descargar">
                    <span>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onDownload(doc)}
                            disabled={!doc.ruta}
                        >
                            <DownloadRounded fontSize="small" />
                        </Button>
                    </span>
                </Tooltip>
            </Stack>
        </Paper>
    );
}

// ================== Sección por tipo ==================
function TipoSection({ tipo, docs, onPreview, onDownload }) {
    if (!docs.length) return null;
    return (
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
            <CardHeader
                title={TYPE_LABELS[tipo] || "Otros documentos"}
                sx={{
                    "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                    bgcolor: "#2a3f54",
                    color: "white",
                    py: 1.2,
                }}
            />
            <CardContent sx={{ pt: 2 }}>
                <Grid container spacing={1.5}>
                    {docs.map((doc) => (
                        <Grid item xs={12} md={6} lg={4} key={doc.id}>
                            <FileCard
                                doc={doc}
                                onPreview={onPreview}
                                onDownload={onDownload}
                            />
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
}

// ================== Principal ==================
export default function VisualizacionArhivos() {
    const [unidades, setUnidades] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [unidad, setUnidad] = useState("");
    const [periodo, setPeriodo] = useState("");

    const [docsByTipo, setDocsByTipo] = useState({});
    const [snack, setSnack] = useState({ open: false, msg: "", severity: "info" });

    // Preview state
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [blobUrl, setBlobUrl] = useState("");
    const [excelSheets, setExcelSheets] = useState([]); // [{name, html}]
    const [excelIndex, setExcelIndex] = useState(0);
    const [previewHTML, setPreviewHTML] = useState("");

    const notify = (severity, msg) =>
        setSnack({ open: true, severity, msg });

    // ================== Carga catálogos ==================
    useEffect(() => {
        (async () => {
            try {
                const [entRes, perRes] = await Promise.all([
                    api.unidades(),
                    api.periodos(),
                ]);
                setUnidades(entRes.data?.result ?? entRes.data ?? []);
                setPeriodos(perRes.data?.result ?? perRes.data ?? []);
            } catch (e) {
                console.error("Error cargando catálogos", e);
                notify("error", "Error al cargar unidades o períodos.");
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const ready = Boolean(unidad) && Boolean(periodo);

    // ================== Carga de documentos ==================
    const loadDocs = useCallback(async () => {
        if (!ready) {
            setDocsByTipo({});
            return;
        }

        try {
            const { data } = await api.listarArchivosDireccionPeriodo({
                codigo_entidad: unidad,
                codigo_periodo: periodo,
            });

            const arr = Array.isArray(data?.result) ? data.result : [];
            const normalized = arr.map((r, idx) => normalizeItem(r, idx));

            const grouped = {};
            normalized.forEach((doc) => {
                const key = TYPE_LABELS[doc.tipo] ? doc.tipo : "otro";
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(doc);
            });

            setDocsByTipo(grouped);
        } catch (e) {
            console.error("Error listando archivos por dirección/período", e);
            setDocsByTipo({});
            notify(
                "error",
                "No se pudieron cargar los archivos para la unidad y período seleccionados."
            );
        }
    }, [ready, unidad, periodo]);

    useEffect(() => {
        if (!ready) {
            setDocsByTipo({});
            return;
        }
        loadDocs();
    }, [ready, loadDocs]);

    // ================== Descargar ==================
    const handleDownload = async (doc) => {
        if (!doc?.ruta) return;
        try {
            const url = buildFileUrl(doc.ruta);
            const res = await apiClient.get(url, { responseType: "blob" });

            // Nombre de archivo preferente: backend ya manda nombre real
            let filename = doc.nombre || url.split("/").pop() || "archivo";
            const dispo = res.headers["content-disposition"];
            if (dispo) {
                const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(dispo);
                if (m && m[1]) {
                    try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
                }
            }

            const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/octet-stream" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
        } catch (e) {
            console.error(e);
            notify("error", "No fue posible descargar el archivo.");
        }
    };

    // ================== Helpers Preview ==================
    const resetPreviewState = () => {
        if (blobUrl) {
            try { URL.revokeObjectURL(blobUrl); } catch { /* ignore */ }
        }
        setBlobUrl("");
        setExcelSheets([]);
        setExcelIndex(0);
        setPreviewHTML("");
    };

    const closePreview = () => {
        setPreviewOpen(false);
        setPreviewItem(null);
        resetPreviewState();
        setPreviewLoading(false);
    };

    const fetchAs = async (url, type) => {
        const res = await apiClient.get(url, { responseType: type });
        return res.data;
    };

    const buildExcelHTMLs = (ab) => {
        const wb = XLSX.read(ab, { type: "array" });
        const out = [];
        for (const name of wb.SheetNames) {
            const ws = wb.Sheets[name];
            const html = XLSX.utils.sheet_to_html(ws, {
                editable: false,
                header: "",
                footer: "",
            });
            out.push({ name, html });
        }
        return out;
    };

    const buildDocxHTML = async (ab) => {
        try {
            const mammoth = await import("mammoth/mammoth.browser");
            const { value: html } = await mammoth.convertToHtml(
                { arrayBuffer: ab },
                {
                    styleMap: [
                        "p[style-name='Title'] => h1:fresh",
                        "p[style-name='Subtitle'] => h2:fresh",
                    ],
                }
            );
            return html || "<p>(Documento vacío)</p>";
        } catch {
            return null;
        }
    };

    // ================== Abrir Preview ==================
    const handlePreview = async (doc) => {
        if (!doc?.ruta) return;
        const url = buildFileUrl(doc.ruta);
        const name = doc.nombre || doc.ruta || "";

        setPreviewItem(doc);
        setPreviewOpen(true);
        setPreviewLoading(true);
        resetPreviewState();

        try {
            // Excel
            if (isExcelName(name)) {
                const ab = await fetchAs(url, "arraybuffer");
                const sheets = buildExcelHTMLs(ab);
                setExcelSheets(sheets);
                setExcelIndex(0);
                setPreviewLoading(false);
                return;
            }

            // DOCX
            if (isDocxName(name)) {
                const ab = await fetchAs(url, "arraybuffer");
                const html = await buildDocxHTML(ab);
                if (html == null) {
                    notify(
                        "info",
                        "Para previsualizar .docx asegúrate de tener instalada la dependencia 'mammoth'."
                    );
                    setPreviewLoading(false);
                    return;
                }
                setPreviewHTML(html);
                setPreviewLoading(false);
                return;
            }

            // DOC (legacy)
            if (isDocLegacyName(name)) {
                setPreviewLoading(false);
                // Se maneja en el contenido del modal
                return;
            }

            // Imagen o PDF → blob URL
            if (isImageName(name) || isPDFName(name)) {
                const blob = await fetchAs(url, "blob");
                const oUrl = URL.createObjectURL(blob);
                setBlobUrl(oUrl);
                setPreviewLoading(false);
                return;
            }

            // Tipo desconocido
            setPreviewLoading(false);
            notify(
                "info",
                "Tipo no soportado para previsualización. Descarga el archivo para verlo."
            );
        } catch (e) {
            console.error(e);
            setPreviewLoading(false);
            notify("error", "No se pudo generar la vista previa.");
        }
    };

    // Navegación con teclado para Excel
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
        <Box p={3}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Archivos por módulo
            </Typography>

            {/* Filtros */}
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
                <CardHeader
                    title="Filtros"
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 15 },
                        bgcolor: "rgba(42,63,84,0.06)",
                        py: 1,
                    }}
                />
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6} lg={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="unidad-label">Unidad administrativa</InputLabel>
                                <Select
                                    labelId="unidad-label"
                                    value={unidad}
                                    label="Unidad administrativa"
                                    onChange={(e) => setUnidad(e.target.value)}
                                >
                                    {unidades.map((u) => {
                                        const id =
                                            u.CODIGO_ENTIDAD ??
                                            u.codigo_entidad ??
                                            u.CODIGO_DIRECCION ??
                                            u.ID;
                                        const desc =
                                            u.DESCRIPCION ??
                                            u.descripcion ??
                                            u.NOMBRE ??
                                            u.nombre ??
                                            `Entidad ${id}`;
                                        return (
                                            <MenuItem key={id} value={id}>
                                                {desc}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6} lg={4}>
                            <FormControl
                                fullWidth
                                size="small"
                                disabled={!unidad}
                            >
                                <InputLabel id="periodo-label">Período</InputLabel>
                                <Select
                                    labelId="periodo-label"
                                    value={periodo}
                                    label="Período"
                                    onChange={(e) => setPeriodo(e.target.value)}
                                >
                                    {periodos.map((p) => (
                                        <MenuItem
                                            key={p.CODIGO_PERIODO}
                                            value={p.CODIGO_PERIODO}
                                        >
                                            {p.PERIODO_INICIAL && p.PERIODO_FINAL
                                                ? `${fmt(p.PERIODO_INICIAL)} - ${fmt(
                                                    p.PERIODO_FINAL
                                                )} · ${p.CODIGO_PERIODO}`
                                                : p.CODIGO_PERIODO}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {ready && (
                            <Grid item xs={12} md={6} lg={4}>
                                <Button
                                    variant="outlined"
                                    onClick={loadDocs}
                                    sx={{ mt: { xs: 1, md: 0 } }}
                                >
                                    Recargar
                                </Button>
                            </Grid>
                        )}
                    </Grid>
                </CardContent>
            </Card>

            {/* Secciones por tipo */}
            {ready ? (
                TYPE_ORDER.map((tipo) => (
                    <TipoSection
                        key={tipo}
                        tipo={tipo}
                        docs={docsByTipo[tipo] || []}
                        onPreview={handlePreview}
                        onDownload={handleDownload}
                    />
                ))
            ) : (
                <Typography variant="body2" color="text.secondary">
                    Selecciona una unidad y un período para ver los documentos.
                </Typography>
            )}

            {/* Modal de Previsualización */}
            <Dialog open={previewOpen} onClose={closePreview} fullWidth maxWidth="lg">
                <DialogTitle
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1">
                            {previewItem?.nombre || "Previsualización"}
                        </Typography>
                        {excelSheets.length > 0 && (
                            <Typography variant="body2" color="text.secondary">
                                — Hoja {excelIndex + 1} de {excelSheets.length} (
                                {excelSheets[excelIndex]?.name})
                            </Typography>
                        )}
                    </Stack>
                    <IconButton onClick={closePreview} size="small">
                        <CloseRounded />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ minHeight: 300 }}>
                    {previewLoading && <LinearProgress />}

                    {/* Imagen */}
                    {!previewLoading &&
                        blobUrl &&
                        previewItem &&
                        isImageName(previewItem.nombre) && (
                            <Box sx={{ width: "100%", textAlign: "center" }}>
                                <img
                                    alt={previewItem.nombre}
                                    src={blobUrl}
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: 600,
                                        objectFit: "contain",
                                    }}
                                />
                            </Box>
                        )}

                    {/* PDF */}
                    {!previewLoading &&
                        blobUrl &&
                        previewItem &&
                        isPDFName(previewItem.nombre) && (
                            <iframe
                                title="preview-pdf"
                                src={blobUrl}
                                style={{ width: "100%", height: 600, border: "none" }}
                            />
                        )}

                    {/* Excel */}
                    {!previewLoading && excelSheets.length > 0 && (
                        <Box
                            sx={{
                                width: "100%",
                                maxHeight: 600,
                                overflow: "auto",
                            }}
                        >
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: excelSheets[excelIndex]?.html || "",
                                }}
                            />
                        </Box>
                    )}

                    {/* DOCX */}
                    {!previewLoading &&
                        previewHTML &&
                        previewItem &&
                        isDocxName(previewItem.nombre) && (
                            <Box
                                sx={{
                                    width: "100%",
                                    maxHeight: 600,
                                    overflow: "auto",
                                }}
                            >
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: previewHTML,
                                    }}
                                />
                            </Box>
                        )}

                    {/* DOC legacy */}
                    {!previewLoading &&
                        previewItem &&
                        isDocLegacyName(previewItem.nombre) && (
                            <Alert severity="info">
                                Los archivos .doc (Word antiguo) no se pueden previsualizar en el
                                navegador. Descárgalo para verlo.
                            </Alert>
                        )}

                    {/* Fallback */}
                    {!previewLoading &&
                        !blobUrl &&
                        excelSheets.length === 0 &&
                        !previewHTML &&
                        !isDocLegacyName(previewItem?.nombre || "") && (
                            <Alert severity="info">
                                Tipo no soportado para previsualización. Descarga el archivo para
                                verlo.
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
                                        onClick={() =>
                                            setExcelIndex((i) =>
                                                Math.max(0, i - 1)
                                            )
                                        }
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
                                        disabled={
                                            excelIndex >=
                                            excelSheets.length - 1
                                        }
                                        onClick={() =>
                                            setExcelIndex((i) =>
                                                Math.min(
                                                    excelSheets.length - 1,
                                                    i + 1
                                                )
                                            )
                                        }
                                    >
                                        Siguiente
                                    </Button>
                                </span>
                            </Tooltip>
                        </Stack>
                    ) : (
                        <span />
                    )}

                    <Stack direction="row" spacing={1}>
                        {previewItem && (
                            <Button
                                startIcon={<OpenInNewIcon />}
                                onClick={() => handleDownload(previewItem)}
                            >
                                Descargar
                            </Button>
                        )}
                        <Button
                            onClick={closePreview}
                            startIcon={<CloseRounded />}
                        >
                            Cerrar
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() =>
                    setSnack((s) => ({ ...s, open: false }))
                }
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
            >
                <Alert
                    onClose={() =>
                        setSnack((s) => ({
                            ...s,
                            open: false,
                        }))
                    }
                    severity={snack.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
