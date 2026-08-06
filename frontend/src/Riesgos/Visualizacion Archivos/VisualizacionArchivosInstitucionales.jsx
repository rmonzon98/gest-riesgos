// src/RIESGOS/VisualizacionArchivosInstitucionales.jsx
import React, { useEffect, useState, useCallback } from "react";
import apiClient from "api/apiClient";
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Grid,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Typography,
    Stack,
    Paper,
    Button,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    IconButton,
    LinearProgress,
} from "@mui/material";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { buildExcelHTMLsFromArrayBuffer } from "utils/excelPreview";
import { fmt } from "funciones/Fechas";

const FILE_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Convierte la "ruta" que viene del backend (a veces absoluta Windows, a veces relativa)
 * en una URL pública usando FILE_BASE.
 *
 * Casos:
 * - "docs/entidad1/..."        → FILE_BASE/docs/entidad1/...
 * - "C:\\...\\backend\\docs\\..."  → FILE_BASE/docs/...
 * - ya es http(s)              → tal cual
 */
const buildFileUrl = (ruta) => {
    if (!ruta) return "";
    const r = String(ruta).trim();

    if (/^https?:\/\//i.test(r)) return r;

    const m = r.match(/docs[\\/].*$/i);
    const sub = (m ? m[0] : r).replace(/\\/g, "/");

    const path = sub.startsWith("/") ? sub : `/${sub}`;
    return `${FILE_BASE || ""}${path}`;
};

// ================== Helpers de tipos ==================
const getExt = (name = "") => {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i).toLowerCase() : "";
};

const isImageName = (name = "") =>
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].includes(
        getExt(name)
    );
const isPDFName = (name = "") => getExt(name) === ".pdf";
const isExcelName = (name = "") =>
    [".xlsx", ".xls", ".xlsm"].includes(getExt(name));
const isDocxName = (name = "") => getExt(name) === ".docx";
const isDocLegacyName = (name = "") => getExt(name) === ".doc";

// ================== Tipos institucionales (solo estos 2) ==================
const TYPE_LABELS = {
    "Seguimiento institucional": "Seguimiento institucional",
    "Informe anual institucional": "Informe anual institucional",
};

const TYPE_ORDER = [
    "Seguimiento institucional",
    "Informe anual institucional",
];

// Normaliza siempre al par de tipos permitidos
const normalizeItem = (r, idx) => {
    const rawTipo = (r.tipo || r.TIPO || "").toString().trim().toLowerCase();

    let tipo = "Seguimiento institucional";
    if (rawTipo.includes("informe")) {
        tipo = "Informe anual institucional";
    } else if (rawTipo.includes("seguimiento")) {
        tipo = "Seguimiento institucional";
    }

    return {
        id: idx,
        nombre: r.nombre || r.filename || r.NOMBRE || "Documento",
        ruta: r.ruta || r.path || r.PATH || "",
        tipo,
        fecha_creacion: r.fecha_creacion || r.FECHA_CREACION || null,
    };
};

// ================== API ==================
const api = {
    periodos: () =>
        apiClient.get("/api/periodos-actualizados"),
    listarArchivosInstitucionales: ({ codigo_periodo }) =>
        apiClient.get("/api/carga-archivos/listar-archivos-insti-periodo", {
            params: { codigo_periodo },
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
                title={TYPE_LABELS[tipo]}
                sx={{
                    "& .MuiCardHeader-title": {
                        fontWeight: 700,
                        fontSize: 16,
                    },
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
export default function VisualizacionArchivosInstitucionales() {
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState("");

    const [docsByTipo, setDocsByTipo] = useState({});
    const [snack, setSnack] = useState({
        open: false,
        msg: "",
        severity: "info",
    });

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

    const ready = Boolean(periodo);

    // ================== Carga catálogos ==================
    useEffect(() => {
        (async () => {
            try {
                const perRes = await api.periodos();
                setPeriodos(perRes.data?.result ?? perRes.data ?? []);
            } catch (e) {
                console.error("Error cargando períodos", e);
                notify("error", "Error al cargar períodos.");
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ================== Carga de documentos ==================
    const loadDocs = useCallback(async () => {
        if (!ready) {
            setDocsByTipo({});
            return;
        }

        try {
            const { data } = await api.listarArchivosInstitucionales({
                codigo_periodo: periodo,
            });

            const arr = Array.isArray(data?.result)
                ? data.result
                : Array.isArray(data)
                    ? data
                    : [];

            const normalized = arr.map((r, idx) => normalizeItem(r, idx));

            const grouped = {
                "Seguimiento institucional": [],
                "Informe anual institucional": [],
            };

            normalized.forEach((doc) => {
                if (TYPE_LABELS[doc.tipo]) {
                    grouped[doc.tipo].push(doc);
                }
            });

            setDocsByTipo(grouped);
        } catch (e) {
            console.error(
                "Error listando archivos institucionales por período",
                e
            );
            setDocsByTipo({});
            notify(
                "error",
                "No se pudieron cargar los archivos institucionales para el período seleccionado."
            );
        }
    }, [ready, periodo]);

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
            const res = await apiClient.get(url, {
                responseType: "blob",
            });

            let filename =
                doc.nombre || url.split("/").pop() || "archivo";
            const dispo = res.headers["content-disposition"];
            if (dispo) {
                const m =
                    /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(
                        dispo
                    );
                if (m && m[1]) {
                    try {
                        filename = decodeURIComponent(m[1]);
                    } catch {
                        filename = m[1];
                    }
                }
            }

            const blob = new Blob([res.data], {
                type:
                    res.headers["content-type"] ||
                    "application/octet-stream",
            });
            const a = document.createElement("a");
            const href = URL.createObjectURL(blob);
            a.href = href;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(href);
        } catch (e) {
            console.error(e);
            notify("error", "No fue posible descargar el archivo.");
        }
    };

    // ================== Helpers Preview ==================
    const resetPreviewState = () => {
        if (blobUrl) {
            try {
                URL.revokeObjectURL(blobUrl);
            } catch {
                /* ignore */
            }
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

    const buildExcelHTMLs = buildExcelHTMLsFromArrayBuffer;

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
            if (isExcelName(name)) {
                const ab = await fetchAs(url, "arraybuffer");
                const sheets = await buildExcelHTMLs(ab);
                setExcelSheets(sheets);
                setExcelIndex(0);
                setPreviewLoading(false);
                return;
            }

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

            if (isDocLegacyName(name)) {
                setPreviewLoading(false);
                return;
            }

            if (isImageName(name) || isPDFName(name)) {
                const blob = await fetchAs(url, "blob");
                const oUrl = URL.createObjectURL(blob);
                setBlobUrl(oUrl);
                setPreviewLoading(false);
                return;
            }

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
                setExcelIndex((i) =>
                    Math.min(i + 1, excelSheets.length - 1)
                );
            } else if (e.key === "ArrowLeft") {
                setExcelIndex((i) => Math.max(i - 1, 0));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [previewOpen, excelSheets.length]);

    // ================== Render ==================
    const currentName = previewItem?.nombre || previewItem?.ruta || "";

    return (
        <Box p={3}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Archivos institucionales por módulo
            </Typography>

            {/* Filtros */}
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
                <CardHeader
                    title="Filtros"
                    sx={{
                        "& .MuiCardHeader-title": {
                            fontWeight: 700,
                            fontSize: 15,
                        },
                        bgcolor: "rgba(42,63,84,0.06)",
                        py: 1,
                    }}
                />
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6} lg={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="periodo-label">
                                    Período
                                </InputLabel>
                                <Select
                                    labelId="periodo-label"
                                    value={periodo}
                                    label="Período"
                                    onChange={(e) =>
                                        setPeriodo(e.target.value)
                                    }
                                >
                                    {periodos.map((p) => (
                                        <MenuItem
                                            key={p.CODIGO_PERIODO}
                                            value={p.CODIGO_PERIODO}
                                        >
                                            {p.PERIODO_INICIAL &&
                                                p.PERIODO_FINAL
                                                ? `${fmt(
                                                    p.PERIODO_INICIAL
                                                )} - ${fmt(
                                                    p.PERIODO_FINAL
                                                )} · ${p.CODIGO_PERIODO
                                                }`
                                                : p.CODIGO_PERIODO}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {ready && (
                            <Grid
                                item
                                xs={12}
                                md={6}
                                lg={4}
                                sx={{
                                    display: "flex",
                                    alignItems: {
                                        xs: "flex-start",
                                        md: "center",
                                    },
                                }}
                            >
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
                    Selecciona un período para ver los documentos institucionales.
                </Typography>
            )}

            {/* Modal de Previsualización */}
            <Dialog
                open={previewOpen}
                onClose={closePreview}
                fullWidth
                maxWidth="lg"
            >
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
                            {currentName || "Previsualización"}
                        </Typography>
                        {excelSheets.length > 0 && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                — Hoja {excelIndex + 1} de{" "}
                                {excelSheets.length} (
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
                        isImageName(currentName) && (
                            <Box
                                sx={{
                                    width: "100%",
                                    textAlign: "center",
                                }}
                            >
                                <img
                                    alt={currentName}
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
                        isPDFName(currentName) && (
                            <iframe
                                title="preview-pdf"
                                src={blobUrl}
                                style={{
                                    width: "100%",
                                    height: 600,
                                    border: "none",
                                }}
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
                                    __html:
                                        excelSheets[excelIndex]?.html ||
                                        "",
                                }}
                            />
                        </Box>
                    )}

                    {/* DOCX */}
                    {!previewLoading &&
                        previewHTML &&
                        previewItem &&
                        isDocxName(currentName) && (
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
                        isDocLegacyName(currentName) && (
                            <Alert severity="info">
                                Los archivos .doc (Word
                                antiguo) no se pueden
                                previsualizar en el
                                navegador. Descárgalo para
                                verlo.
                            </Alert>
                        )}

                    {/* Fallback */}
                    {!previewLoading &&
                        !blobUrl &&
                        excelSheets.length === 0 &&
                        !previewHTML &&
                        !isDocLegacyName(currentName) && (
                            <Alert severity="info">
                                Tipo no soportado para
                                previsualización. Descarga
                                el archivo para verlo.
                            </Alert>
                        )}
                </DialogContent>

                <DialogActions
                    sx={{ justifyContent: "space-between" }}
                >
                    {/* Navegación Excel */}
                    {excelSheets.length > 0 ? (
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                        >
                            <Tooltip title="Anterior (←)">
                                <span>
                                    <Button
                                        variant="outlined"
                                        startIcon={
                                            <ChevronLeftRounded />
                                        }
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
                                        endIcon={
                                            <ChevronRightRounded />
                                        }
                                        disabled={
                                            excelIndex >=
                                            excelSheets.length - 1
                                        }
                                        onClick={() =>
                                            setExcelIndex((i) =>
                                                Math.min(
                                                    excelSheets.length -
                                                    1,
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
                                onClick={() =>
                                    handleDownload(previewItem)
                                }
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
                    setSnack((s) => ({
                        ...s,
                        open: false,
                    }))
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
