/**
 * @fileoverview
 * Modal de detalle de seguimientos y documentos asociados a un control.
 *
 * @module Riesgos/Comportamiento/Consolidado/SeguimientoDetalleModal.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Stack,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  LinearProgress,
  Alert,
  Tooltip,
  Snackbar,
  Divider,
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import PictureAsPdfRounded from "@mui/icons-material/PictureAsPdfRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

/* =============== Estilo de sección (como tu SeguimientoModal.jsx) =============== */
const Section = ({ title, subtitle, children, disabled }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 2,
      border: "1px solid",
      borderColor: (t) => (disabled ? t.palette.divider : t.palette.primary.light),
      backgroundColor: (t) => (disabled ? t.palette.action.hover : "transparent"),
    }}
  >
    <Stack spacing={1}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
      <Divider />
      <Box sx={{ pt: 1 }}>{children}</Box>
    </Stack>
  </Box>
);

/* ================= Helpers comunes ================= */
const headers = () => ({ "x-access-token": localStorage.getItem("token") });

const MESES = [
  null,
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const mesNombre = (n) => {
  const x = Number(n);
  return Number.isInteger(x) && x >= 1 && x <= 12 ? MESES[x] : "—";
};

const extName = (filename = "") => {
  try {
    const clean = String(filename).split("?")[0];
    const parts = clean.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  } catch {
    return "";
  }
};
const isPdf = (mime = "", name = "") =>
  String(mime).toLowerCase() === "application/pdf" || extName(name) === "pdf";

const guessIcon = (mime, name) =>
  isPdf(mime, name) ? (
    <PictureAsPdfRounded fontSize="small" />
  ) : (
    <InsertDriveFileRounded fontSize="small" />
  );

const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
};
const formatFecha = (dateLike) => {
  try {
    const d = dateLike ? new Date(dateLike) : null;
    if (!d || isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
};

const countArray = (v) => (Array.isArray(v) ? v.length : 0);

/* ======= helpers de tipo para previsualización (por extensión) ======= */
const isImageName = (name = "") => ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extName(name));
const isPDFName = (name = "") => extName(name) === "pdf";
const isExcelName = (name = "") => ["xlsx", "xls", "xlsm"].includes(extName(name));
const isDocxName = (name = "") => extName(name) === "docx";
const isDocName = (name = "") => extName(name) === "doc";


/**
 * Modal que muestra el detalle de un seguimiento y sus documentos.
 *
 * @component
 */
export default function SeguimientoDetalleModal({
  open,
  onClose,
  row,
  direccionLabel = "",
  siglasLabel = "",
}) {
  // Docs
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");

  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const openSnack = (message, severity = "success") => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  /**
   * Normaliza la lista cruda de documentos de seguimiento a un formato amigable.
   */
  const listarDocs = useCallback(async () => {
    if (!row?.codigo_entidad || !row?.codigo_periodo || !row?.mes) return;
    setDocs([]);
    setDocsError("");
    setDocsLoading(true);
    try {
      const resp = await axios.get("/api/seguimientos-actualizados/documentos", {
        headers: headers(),
        params: {
          codigo_entidad: row.codigo_entidad,
          codigo_periodo: row.codigo_periodo,
          mes: row.mes,
        },
      });
      const list = resp.data?.documentos ?? [];
      const norm = (Array.isArray(list) ? list : [])
        .filter((d) => d && (d.codigo_doc ?? null) !== null)
        .map((d) => ({
          codigo_doc: d.codigo_doc,
          nombre: d.nombre || "Documento",
          mime: d.mime || "",
          tamano: d.tamano ?? 0,
          fecha: d.fecha || null,
        }));
      setDocs(norm);
    } catch {
      setDocsError("No fue posible cargar los documentos.");
      setDocs([]);
    } finally {
      setDocsLoading(false);
    }
  }, [row]);

  useEffect(() => {
    if (open && row) listarDocs();
  }, [open, row, listarDocs]);

  // Descargar documento
  const descargar = async (doc) => {
    if (!row || !doc?.codigo_doc) return;
    try {
      const url = `/api/seguimientos-actualizados/documentos/${doc.codigo_doc}/descargar`;
      const response = await axios.get(url, {
        params: {
          codigo_entidad: row.codigo_entidad,
          codigo_periodo: row.codigo_periodo,
          mes: row.mes,
        },
        headers: headers(),
        responseType: "blob",
      });

      const contentType = response.headers["content-type"] || "application/octet-stream";

      // Si vino JSON (error), intenta leerlo
      if (contentType.includes("application/json")) {
        const text = await response.data.text?.();
        const parsed = text ? JSON.parse(text) : {};
        const msg = parsed?.message || parsed?.error || "No fue posible descargar el documento.";
        openSnack(msg, "error");
        return;
      }

      // Nombre desde Content-Disposition si existe
      let filename = doc.nombre || `documento_${doc.codigo_doc}`;
      const dispo = response.headers["content-disposition"];
      if (dispo) {
        const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(dispo);
        if (m && m[1]) {
          try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
        }
      }

      const blob = new Blob([response.data], { type: contentType });
      saveAs(blob, filename);
    } catch (e) {
      let msg = "No fue posible descargar el documento.";
      const payload = e?.response?.data;
      if (payload instanceof Blob) {
        try {
          const text = await payload.text();
          const json = JSON.parse(text);
          msg = json?.message || json?.error || msg;
        } catch { /* blob no-JSON */ }
      } else if (typeof payload === "object" && payload) {
        msg = payload?.message || payload?.error || msg;
      }
      openSnack(msg, "error");
    }
  };

  // ============ PREVIEW ============

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [blobUrl, setBlobUrl] = useState("");          // para PDF/imagen
  const [excelSheets, setExcelSheets] = useState([]);  // [{name, html}]
  const [excelIndex, setExcelIndex] = useState(0);
  const [previewHTML, setPreviewHTML] = useState("");  // DOCX

  const revokeUrl = useCallback((url) => { try { if (url) URL.revokeObjectURL(url); } catch { } }, []);
  const resetPreview = () => {
    revokeUrl(blobUrl);
    setBlobUrl("");
    setPreviewItem(null);
    setPreviewHTML("");
    setExcelSheets([]);
    setExcelIndex(0);
    setPreviewLoading(false);
  };
  const closePreview = () => {
    setPreviewOpen(false);
    resetPreview();
  };

  const fetchBlob = async (doc, as = "blob") => {
    const url = `/api/seguimientos-actualizados/documentos/${doc.codigo_doc}/descargar`;
    const resp = await axios.get(url, {
      params: {
        codigo_entidad: row.codigo_entidad,
        codigo_periodo: row.codigo_periodo,
        mes: row.mes,
      },
      headers: headers(),
      responseType: as, // "blob" | "arraybuffer"
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

  /**
   * Construye el HTML que se insertará en un documento Word generado.
   */
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

  const openPreview = async (doc) => {
    setPreviewItem(doc);
    setPreviewOpen(true);
    setPreviewLoading(true);
    revokeUrl(blobUrl);
    setBlobUrl("");
    setExcelSheets([]);
    setExcelIndex(0);
    setPreviewHTML("");

    const name = doc.nombre || "";
    try {
      // Excel
      if (isExcelName(name)) {
        const ab = await fetchBlob(doc, "arraybuffer");
        const sheets = buildExcelHTMLs(ab);
        setExcelSheets(sheets);
        setExcelIndex(0);
        setPreviewLoading(false);
        return;
      }
      // DOCX
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
      // DOC (legacy)
      if (isDocName(name)) {
        setPreviewLoading(false);
        return; // se muestra aviso en UI
      }
      // Imagen / PDF
      if (isImageName(name) || isPDFName(name)) {
        const b = await fetchBlob(doc, "blob");
        const url = URL.createObjectURL(b);
        setBlobUrl(url);
        setPreviewLoading(false);
        return;
      }
      // No soportado
      setPreviewLoading(false);
      openSnack("Tipo no soportado para previsualización. Descárgalo para verlo.", "info");
    } catch (e) {
      console.error(e);
      setPreviewLoading(false);
      openSnack("No se pudo generar la vista previa.", "error");
    }
  };

  // Navegación con teclado para Excel
  useEffect(() => {
    if (!previewOpen || excelSheets.length === 0) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") setExcelIndex((i) => Math.min(i + 1, excelSheets.length - 1));
      else if (e.key === "ArrowLeft") setExcelIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen, excelSheets.length]);

  // Cerrar y limpiar
  const handleClose = () => {
    onClose?.();
    setDocs([]);
    setDocsError("");
    setDocsLoading(false);
    setSnack({ open: false, message: "", severity: "success" });
    resetPreview();
  };

  // ===== agrupación ligera por período (solo para encabezados de tablas) =====
  const gruposPorPeriodo = useMemo(() => {
    const s1 = Array.isArray(row?.seccion1) ? row.seccion1 : [];
    const periods = new Set(
      [
        ...s1.map((r) => Number(r.periodo)).filter(Boolean),
        ...(Array.isArray(row?.seccion2) ? row.seccion2 : []).map((r) => Number(r.periodo)).filter(Boolean),
        ...(Array.isArray(row?.seccion3) ? row.seccion3 : []).map((b) => Number(b.periodo)).filter(Boolean),
        Number(row?.codigo_periodo || 0),
      ].filter(Boolean)
    );
    return [...periods].sort((a, b) => a - b);
  }, [row]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xl" keepMounted>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <DescriptionRounded />
        Detalle del seguimiento
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={handleClose}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {row ? (
          <Stack spacing={2}>
            {/* Cabecera compacta */}
            <Section title="Resumen del registro" subtitle="Identificación del seguimiento seleccionado.">
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip label={`Dirección: ${direccionLabel || row.codigo_entidad}`} size="small" />
                {siglasLabel ? <Chip label={siglasLabel} size="small" /> : null}
                <Chip label={`Período: ${row.codigo_periodo ?? "—"}`} size="small" />
                <Chip label={`Mes: ${mesNombre(row.mes)}`} size="small" />
              </Stack>
            </Section>

            {/* Sección 1 */}
            <Section
              title="1. Riesgos reportados para mitigar"
              subtitle="Listado de riesgos y atributos tal como se definieron en la matriz."
            >
              {countArray(row.seccion1) === 0 ? (
                <Alert severity="info">Sin registros.</Alert>
              ) : (
                <Stack spacing={3}>
                  {gruposPorPeriodo.map((per) => {
                    const rows = row.seccion1.filter((r) => Number(r.periodo) === per || !r.periodo);
                    if (rows.length === 0) return null;
                    return (
                      <Stack key={`s1-${per}`} spacing={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          Período {per}
                        </Typography>
                        <TableContainer component={Paper}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Ref.</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Objetivo</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 260 }}>Descripción</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Tolerancia</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 220 }}>Severidad (narración)</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 220 }}>Control interno</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 220 }}>Método de monitoreo</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Frecuencia</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {rows.map((s, i) => (
                                <TableRow key={`s1-${per}-${i}`} hover>
                                  <TableCell>{s.ref ?? "—"}</TableCell>
                                  <TableCell>{s.objetivo ?? "—"}</TableCell>
                                  <TableCell>{s.descripcion ?? "—"}</TableCell>
                                  <TableCell>{s.tolerancia ?? "—"}</TableCell>
                                  <TableCell>{s.severidad_narracion ?? "—"}</TableCell>
                                  <TableCell>{s.control_interno ?? "—"}</TableCell>
                                  <TableCell>{s.metodo_monitoreo ?? "—"}</TableCell>
                                  <TableCell>{s.frecuencia ?? "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Section>

            {/* Sección 2 */}
            <Section
              title="2. Acciones mitigadoras realizadas"
              subtitle="Ejecución del mes respecto a controles, método de monitoreo y frecuencia."
            >
              {countArray(row.seccion2) === 0 ? (
                <Alert severity="info">Sin registros.</Alert>
              ) : (
                <Stack spacing={3}>
                  {gruposPorPeriodo.map((per) => {
                    const rows = row.seccion2.filter((r) => Number(r.periodo) === per || !r.periodo);
                    if (rows.length === 0) return null;
                    return (
                      <Stack key={`s2-${per}`} spacing={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          Acciones — {per}
                        </Typography>
                        <TableContainer component={Paper}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Ref.</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 200 }}>Descripción</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 280 }}>Control interno</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 280 }}>Método de monitoreo</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 200 }}>Frecuencia</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {rows.map((s, i) => (
                                <TableRow key={`s2-${per}-${i}`} hover>
                                  <TableCell>{s.ref ?? "—"}</TableCell>
                                  <TableCell>{s.descripcion ?? "—"}</TableCell>
                                  <TableCell>{s.control_interno ?? "—"}</TableCell>
                                  <TableCell>{s.metodo_monitoreo ?? "—"}</TableCell>
                                  <TableCell>{s.frecuencia ?? "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Section>

            {/* Sección 3 */}
            <Section
              title="3. Seguimiento y continuidad"
              subtitle="Estatus por período y resultados principales declarados para el mes."
            >
              {countArray(row.seccion3) === 0 ? (
                <Alert severity="info">Sin registros.</Alert>
              ) : (
                <Stack spacing={3}>
                  {row.seccion3.map((bloque, idx) => (
                    <Stack key={`s3-${idx}`} spacing={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        Estatus — Período del 1 de enero al 31 de diciembre de {bloque.periodo ?? row.codigo_periodo ?? "—"}
                      </Typography>

                      <TableContainer component={Paper}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ background: "#2e4a66" }}>
                              <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Estatus</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Seleccionado</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Criterio</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {[
                              { label: "Pendiente", color: "#f44336", criterio: "Sin evidencia de gestión; debe observar método y frecuencia propuestos." },
                              { label: "Ejecución", color: "#ff9800", criterio: "Avance en la implementación; supervisión y monitoreo en curso." },
                              { label: "Cumple", color: "#4caf50", criterio: "Acciones implementadas al 100% según lo propuesto." },
                            ].map((opt) => (
                              <TableRow key={`${idx}-${opt.label}`}>
                                <TableCell sx={{ fontWeight: 700, width: 200 }}>
                                  <span style={{ display: "inline-block", padding: "4px 8px", background: opt.color, color: "#fff", borderRadius: 4 }}>
                                    {opt.label}
                                  </span>
                                </TableCell>
                                <TableCell sx={{ width: 140 }}>
                                  {String(bloque.estatus ?? "") === opt.label ? "✓" : ""}
                                </TableCell>
                                <TableCell>{opt.criterio}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>
                        Resultados principales
                      </Typography>

                      {Array.isArray(bloque.resultados) && bloque.resultados.length > 0 ? (
                        <TableContainer component={Paper}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Ref.</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 700 }}>Resultados principales</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {bloque.resultados.map((rr, j) => (
                                <TableRow key={`s3r-${idx}-${j}`} hover>
                                  <TableCell>{rr.ref ?? "—"}</TableCell>
                                  <TableCell>{rr.descripcion ?? "—"}</TableCell>
                                  <TableCell>{rr.resultados_principales ?? "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          Sin resultados principales.
                        </Alert>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}
            </Section>

            {/* Documentos */}
            <Section title="Documentos" subtitle="Previsualiza o descarga los archivos asociados al seguimiento.">
              {docsLoading && <LinearProgress />}
              {docsError && <Alert severity="error">{docsError}</Alert>}
              {!docsLoading && !docsError && docs.length === 0 && (
                <Alert severity="info" icon={<InsertDriveFileRounded />}>
                  No se localizaron documentos para este seguimiento.
                </Alert>
              )}
              {!docsLoading && !docsError && docs.length > 0 && (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Archivo</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Tamaño</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {docs.map((d, i) => (
                        <TableRow key={`${d.codigo_doc}-${i}`} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {guessIcon(d.mime, d.nombre)}
                              <Typography noWrap>{d.nombre}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{formatBytes(d.tamano)}</TableCell>
                          <TableCell>{formatFecha(d.fecha)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Previsualizar">
                                <span>
                                  <IconButton onClick={() => openPreview(d)} size="small">
                                    <VisibilityRounded fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Descargar">
                                <span>
                                  <IconButton onClick={() => descargar(d)} size="small">
                                    <DownloadRounded fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Section>
          </Stack>
        ) : (
          <Typography color="text.secondary">Cargando…</Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="contained">Cerrar</Button>
      </DialogActions>

      {/* ===== Modal de Previsualización ===== */}
      <Dialog open={previewOpen} onClose={closePreview} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1">
              {previewItem?.nombre || "Previsualización"}
            </Typography>
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
          {!previewLoading && blobUrl && isImageName(previewItem?.nombre) && (
            <Box sx={{ width: "100%", textAlign: "center" }}>
              <img
                alt={previewItem?.nombre || "imagen"}
                src={blobUrl}
                style={{ maxWidth: "100%", maxHeight: 600, objectFit: "contain" }}
              />
            </Box>
          )}

          {/* PDF */}
          {!previewLoading && blobUrl && isPDFName(previewItem?.nombre) && (
            <iframe title="preview-pdf" src={blobUrl} style={{ width: "100%", height: 600, border: "none" }} />
          )}

          {/* Excel multipestaña */}
          {!previewLoading && excelSheets.length > 0 && (
            <Box sx={{ width: "100%", maxHeight: 600, overflow: "auto" }}>
              <div dangerouslySetInnerHTML={{ __html: excelSheets[excelIndex]?.html || "" }} />
            </Box>
          )}

          {/* DOCX */}
          {!previewLoading && previewHTML && isDocxName(previewItem?.nombre) && (
            <Box sx={{ width: "100%", maxHeight: 600, overflow: "auto" }}>
              <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
            </Box>
          )}

          {/* Fallbacks */}
          {!previewLoading && isDocName(previewItem?.nombre) && (
            <Alert severity="info">Los archivos .doc (Word antiguo) no se pueden previsualizar en el navegador. Descárgalo para verlo.</Alert>
          )}
          {!previewLoading && !blobUrl && excelSheets.length === 0 && !previewHTML && (
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
