/**
 * @fileoverview
 * Vista de reportes consolidados de seguimiento de controles y acciones.
 *
 * @module Riesgos/Comportamiento/Consolidado/SeguimientoReportes.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useRef, useState } from "react";
import apiClient from "api/apiClient";
import {
    Card, CardHeader, CardContent, Stack, Divider, Chip, Button, Tooltip,
    Typography, IconButton, TextField, Collapse, Box, Snackbar,
    Select, MenuItem, FormControl, InputLabel, CircularProgress
} from "@mui/material";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import NoteAddRounded from "@mui/icons-material/NoteAddRounded";
import ArticleRounded from "@mui/icons-material/ArticleRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { saveAs } from "file-saver";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";

import {
    Document, Packer, Paragraph, TextRun,
    AlignmentType, ShadingType, UnderlineType, PageBreak
} from "docx";

const Size = Quill.import("attributors/style/size");
delete Size.whitelist;
Quill.register(Size, true);

/* ===================== Helpers ===================== */
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const safeArr = (a) => (Array.isArray(a) ? a : []);


const DOCX_STYLES = {
    paragraphStyles: [
        { id: "Normal", name: "Normal", basedOn: "Normal", next: "Normal", run: { size: 22 } },
        { id: "Heading1", name: "Heading 1", basedOn: "Heading1", next: "Normal", quickFormat: true, run: { size: 36, bold: true }, paragraph: { spacing: { after: 200 } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Heading2", next: "Normal", quickFormat: true, run: { size: 36, bold: true }, paragraph: { spacing: { after: 160 } } },
    ],
};

const DOCX_NUMBERING = {
    config: [
        { reference: "bullet-list", levels: [{ level: 0, format: "bullet", text: "\u2022", alignment: AlignmentType.LEFT }] },
        { reference: "number-list", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }] },
    ],
};

const pxToHalfPoints = (px) => {
    const n = Number(px);
    if (!n || Number.isNaN(n)) return undefined;
    return Math.max(1, Math.round(n * 1.5));
};
const cssColorToHex = (val) => {
    if (!val) return undefined;
    let v = String(val).trim();
    if (v.startsWith("#")) {
        const hex = v.slice(1);
        if (hex.length === 3) return hex.split("").map((c) => c + c).join("").toUpperCase();
        if (hex.length === 6) return hex.toUpperCase();
        return undefined;
    }
    const m = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) {
        const r = Number(m[1]).toString(16).padStart(2, "0");
        const g = Number(m[2]).toString(16).padStart(2, "0");
        const b = Number(m[3]).toString(16).padStart(2, "0");
        return `${r}${g}${b}`.toUpperCase();
    }
    return undefined;
};
const extractInlineStyle = (el) => {
    const style = (el.getAttribute?.("style") || "").toLowerCase();
    const out = {};
    if (!style) return out;
    const rules = Object.fromEntries(
        style.split(";").map(s => s.trim()).filter(Boolean).map(s => {
            const i = s.indexOf(":"); if (i === -1) return [s, ""];
            return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
        })
    );
    const color = cssColorToHex(rules.color);
    const bg = cssColorToHex(rules["background-color"]);
    const sizePx = (rules["font-size"] || "").replace("px", "").trim();
    const font = rules["font-family"]?.split(",")?.[0]?.replace(/['"]/g, "")?.trim();

    const out2 = {};
    if (color) out2.color = color;
    if (bg) out2.highlight = bg;
    const sz = pxToHalfPoints(sizePx); if (sz) out2.size = sz;
    if (font) out2.font = font;

    const td = (rules["text-decoration"] || "").toLowerCase();
    if (td.includes("underline")) out2.underline = true;
    if (td.includes("line-through")) out2.strike = true;
    return out2;
};
const mergeInlineStyle = (base, add) => ({
    bold: add.bold ?? base.bold,
    italics: add.italics ?? base.italics,
    underline: add.underline ?? base.underline,
    strike: add.strike ?? base.strike,
    color: add.color ?? base.color,
    highlight: add.highlight ?? base.highlight,
    size: add.size ?? base.size,
    font: add.font ?? base.font,
});
const getDocxAlignment = (el) => {
    const cls = (el?.className || "").toLowerCase();
    const style = (el?.getAttribute?.("style") || "").toLowerCase();
    if (cls.includes("ql-align-center")) return AlignmentType.CENTER;
    if (cls.includes("ql-align-right")) return AlignmentType.RIGHT;
    if (cls.includes("ql-align-justify")) return AlignmentType.JUSTIFIED;
    if (cls.includes("ql-align-left")) return AlignmentType.LEFT;
    const m = style.match(/text-align\s*:\s*(left|right|center|justify)/);
    if (m) {
        const val = m[1];
        if (val === "left") return AlignmentType.LEFT;
        if (val === "right") return AlignmentType.RIGHT;
        if (val === "center") return AlignmentType.CENTER;
        if (val === "justify") return AlignmentType.JUSTIFIED;
    }
    return undefined;
};
const buildRunsFromNode = (node, parentStyle = {}) => {
    const runs = [];
    const pushText = (text, style) => {
        if (!text) return;
        const opts = {
            text,
            bold: !!style.bold,
            italics: !!style.italics,
            strike: !!style.strike,
            color: style.color,
            size: style.size,
            font: style.font,
        };
        if (style.underline) opts.underline = { type: UnderlineType.SINGLE };
        let tr = new TextRun(opts);
        if (style.highlight) {
            tr = new TextRun({ ...opts, shading: { type: ShadingType.CLEAR, color: "auto", fill: style.highlight } });
        }
        runs.push(tr);
    };
    const walkInline = (n, inherited) => {
        if (n.nodeType === Node.TEXT_NODE) {
            const t = n.nodeValue?.replace(/\s+/g, " ");
            pushText(t, inherited); return;
        }
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        const tag = n.tagName.toLowerCase();
        let cur = { ...inherited };
        if (tag === "strong" || tag === "b") cur.bold = true;
        if (tag === "em" || tag === "i") cur.italics = true;
        if (tag === "u") cur.underline = true;
        if (tag === "s" || tag === "strike" || tag === "del") cur.strike = true;
        cur = mergeInlineStyle(cur, extractInlineStyle(n));
        if (tag === "br") { runs.push(new TextRun({ break: 1 })); return; }
        if (tag === "a") { cur.underline = true; cur.color = cur.color || "0563C1"; }
        Array.from(n.childNodes).forEach((ch) => walkInline(ch, cur));
    };
    walkInline(node, parentStyle);
    return runs;
};
const paragraphFromBlock = (el) => {
    const base = extractInlineStyle(el);
    const alignment = getDocxAlignment(el);
    const runs = buildRunsFromNode(el, base);
    return new Paragraph({ children: runs.length ? runs : [new TextRun("")], alignment, spacing: { after: 120 } });
};
const quillHtmlToDocxBlocks = (html = "") => {
    const out = [];
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    const walk = (node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = node.tagName.toLowerCase();
        if (tag === "ul" || tag === "ol") {
            const ordered = tag === "ol";
            Array.from(node.children).forEach((li) => {
                if (li.tagName?.toLowerCase() !== "li") return;
                const p = paragraphFromBlock(li);
                p.numbering = { reference: ordered ? "number-list" : "bullet-list", level: 0 };
                out.push(p);
            });
            return;
        }
        if (["p", "div", "h1", "h2", "h3", "h4"].includes(tag)) {
            out.push(paragraphFromBlock(node)); return;
        }
        Array.from(node.childNodes).forEach(walk);
    };
    Array.from(tmp.childNodes).forEach(walk);
    if (out.length === 0) out.push(new Paragraph({ children: [new TextRun("")] }));
    return out;
};

/**
 * Barra de herramientas superior para seleccionar secciones e indicadores.
 *
 * @component
 */
function ToolbarSeccion({ toolbarId }) {
    return (
        <div id={toolbarId} className="ql-toolbar ql-snow" style={{ border: 0, padding: 0, marginBottom: 8 }}>
            <span className="ql-formats">
                <select className="ql-header" defaultValue="">
                    <option value="1">H1</option><option value="2">H2</option><option value="3">H3</option><option value="">P</option>
                </select>
                <select className="ql-font"></select>
            </span>
            <span className="ql-formats">
                <button className="ql-bold"></button><button className="ql-italic"></button>
                <button className="ql-underline"></button><button className="ql-strike"></button>
            </span>
            <span className="ql-formats">
                <select className="ql-align" defaultValue="">
                    <option value=""></option><option value="center"></option><option value="right"></option><option value="justify"></option>
                </select>
                <button className="ql-list" value="ordered"></button>
                <button className="ql-list" value="bullet"></button>
                <select className="ql-color"></select><select className="ql-background"></select>
            </span>
        </div>
    );
}
const quillFormats = ["header", "font", "size", "bold", "italic", "underline", "strike", "align", "color", "background", "list", "indent"];

/* ====== Catálogo de secciones ====== */
const SECTION_CATALOG = [
    "Índice",
    "Introducción",
    "Objetivo",
    "Alcance",
    "Metodología utilizada para la solicitud, recopilación y seguimiento de informes de riesgos",
    "Principales hallazgos",
    "Recomendaciones",
    "Conclusiones",
    "Anexos",
];
const DEFAULT_BODY_INDEX = `
<ol>
  <li>Introducción</li>
  <li>Objetivo</li>
  <li>Alcance</li>
  <li>Metodología utilizada para la solicitud, recopilación y seguimiento de informes de riesgos</li>
  <li>Principales hallazgos</li>
  <li>Recomendaciones</li>
  <li>Conclusiones</li>
  <li>Anexos</li>
</ol>
`.trim();
const isIndexTitle = (t) => t.trim().toLowerCase() === "índice" || t.trim().toLowerCase() === "indice";
const catalogRank = (title) => {
    if (isIndexTitle(title)) return -100;
    const i = SECTION_CATALOG.findIndex(s => s.toLowerCase() === String(title || "").trim().toLowerCase());
    return i >= 0 ? i : 999;
};


/**
 * Vista principal de reportes de seguimiento consolidados.
 *
 * Permite filtrar, agrupar y exportar los datos de seguimiento.
 * 
 * Props:
 * - periodo: number|string  (requerido para llamadas al API)
 *
 * @component
 */
export default function SeguimientoReportes({ periodo }) {
    // Portada
    const [tituloDocumento, setTituloDocumento] = useState("");

    // Documento seleccionado / estado "nuevo"
    const [docSel, setDocSel] = useState("");
    const [isNew, setIsNew] = useState(false);
    const active = isNew || !!docSel;

    // Lista de documentos del periodo
    const [docs, setDocs] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);
    const [saving, setSaving] = useState(false);

    // Secciones
    const [secciones, setSecciones] = useState([]);
    const [secToAdd, setSecToAdd] = useState("");

    // Edición
    const editorRefs = useRef({});
    const modulesCache = useRef({});

    // UI
    const [snack, setSnack] = useState({ open: false, msg: "", severity: "info" });

    // ===== API: helpers =====
    const fetchLista = async () => {
        if (!periodo) return;
        try {
            setLoadingList(true);
            const { data } = await apiClient.get("/api/seguimientos-actualizados/lista-periodo", { params: { periodo } });
            setDocs(Array.isArray(data?.data) ? data.data : []);
        } catch (e) {
            console.error(e);
            setDocs([]);
            setSnack({ open: true, msg: "No se pudo cargar la lista de reportes.", severity: "error" });
        } finally {
            setLoadingList(false);
        }
    };

    const fetchDocumento = async (codigo) => {
        if (!periodo || !codigo) return;
        try {
            setLoadingDoc(true);
            const { data } = await apiClient.get("/api/seguimientos-actualizados/obtener-informacion", {
                params: { periodo, codigo }
            });
            const info = data?.data || {};
            setTituloDocumento(info?.titulo || "");
            const arr = Array.isArray(info?.informacion) ? info.informacion : [];
            // tolerantes a versiones antiguas
            setSecciones(arr.map((s, idx) => ({
                id: s.id || newId(),
                titulo: s.titulo || `Sección ${idx + 1}`,
                contenido: s.contenido || "",
                open: true,
            })));
        } catch (e) {
            console.error(e);
            setSnack({ open: true, msg: "No se pudo cargar el reporte.", severity: "error" });
        } finally {
            setLoadingDoc(false);
        }
    };

    const sanitizeInfo = () =>
        secciones.map((s, i) => ({ id: s.id, titulo: s.titulo || `Sección ${i + 1}`, contenido: s.contenido || "", orden: i + 1 }));

    const crearReporte = async () => {
        try {
            setSaving(true);
            const payload = { periodo, titulo: tituloDocumento || "Reporte", informacion: sanitizeInfo() };
            const { data } = await apiClient.post("/api/seguimientos-actualizados/crear-reporte", payload);
            if (!data?.ok) throw new Error("Respuesta inválida");
            setIsNew(false);
            setDocSel(String(data.codigo));
            setSnack({ open: true, msg: "Reporte creado correctamente.", severity: "success" });
            await fetchLista();
        } catch (e) {
            console.error(e);
            setSnack({ open: true, msg: "No se pudo crear el reporte.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    const actualizarReporte = async () => {
        if (!docSel) {
            setSnack({ open: true, msg: "Seleccione un reporte para actualizar.", severity: "warning" });
            return;
        }
        try {
            setSaving(true);
            const payload = { periodo, codigo: docSel, titulo: tituloDocumento || "Reporte", informacion: sanitizeInfo() };
            const { data } = await apiClient.put("/api/seguimientos-actualizados/actualizar-reporte", payload);
            if (!data?.ok) throw new Error("Respuesta inválida");
            setSnack({ open: true, msg: "Reporte actualizado correctamente.", severity: "success" });
            await fetchLista();
        } catch (e) {
            console.error(e);
            setSnack({ open: true, msg: "No se pudo actualizar el reporte.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    // ===== efectos =====
    useEffect(() => {
        // al cambiar periodo, limpiar selección y traer lista
        setDocSel("");
        setIsNew(false);
        setSecciones([]);
        setTituloDocumento("");
        if (periodo) fetchLista();
    }, [periodo]);

    useEffect(() => {
        const mods = { ...modulesCache.current };
        secciones.forEach((s) => {
            if (!mods[s.id]) mods[s.id] = { toolbar: { container: `#toolbar-${s.id}` }, clipboard: { matchVisual: false } };
        });
        modulesCache.current = mods;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secciones.length]);

    // ===== UI actions =====
    const resetearAPlantilla = () => {
        setSecciones([]);
        setTituloDocumento("");
    };
    const handleNuevoReporte = () => {
        resetearAPlantilla();
        setDocSel("");
        setIsNew(true);
        setSnack({ open: true, msg: "Se inició un nuevo reporte.", severity: "info" });
    };
    const handleSelectDoc = async (e) => {
        const v = e.target.value;
        setDocSel(v);
        setIsNew(false);
        await fetchDocumento(v);
    };

    const addSelectedSection = () => {
        const label = secToAdd || "";
        if (!label) return;
        const id = newId();
        const contenido = isIndexTitle(label) ? DEFAULT_BODY_INDEX : "";
        const next = [...secciones, { id, titulo: label, contenido, open: true }];
        next.sort((a, b) => catalogRank(a.titulo) - catalogRank(b.titulo) || String(a.titulo).localeCompare(String(b.titulo), "es"));
        setSecciones(next);
        setSecToAdd("");
        setSnack({ open: true, msg: `Se agregó la sección “${label}”.`, severity: "info" });
    };
    const agregarSeccionLibre = () => {
        const id = newId();
        const next = [...secciones, { id, titulo: "", contenido: "", open: true }];
        next.sort((a, b) => catalogRank(a.titulo) - catalogRank(b.titulo) || String(a.titulo).localeCompare(String(b.titulo), "es"));
        setSecciones(next);
    };
    const eliminarSeccion = (id) => {
        delete modulesCache.current[id];
        setSecciones((prev) => prev.filter((s) => s.id !== id));
    };
    const toggleOpen = (id) => setSecciones((prev) => prev.map((s) => (s.id === id ? { ...s, open: !s.open } : s)));
    const cambiarTitulo = (id, value) =>
        setSecciones((prev) => {
            const next = prev.map((s) => (s.id === id ? { ...s, titulo: value } : s));
            next.sort((a, b) => catalogRank(a.titulo) - catalogRank(b.titulo) || String(a.titulo).localeCompare(String(b.titulo), "es"));
            return next;
        });
    const cambiarContenido = (id, html) => setSecciones((prev) => prev.map((s) => (s.id === id ? { ...s, contenido: html } : s)));
    const onDragEnd = (result) => {
        const { source, destination } = result || {};
        if (!destination || source.index === destination.index) return;
        setSecciones((prev) => {
            const arr = [...prev];
            const [moved] = arr.splice(source.index, 1);
            arr.splice(destination.index, 0, moved);
            arr.sort((a, b) => catalogRank(a.titulo) - catalogRank(b.titulo) || String(a.titulo).localeCompare(String(b.titulo), "es"));
            return arr;
        });
    };

    /* ===== Exportar Word ===== */
    const generarWord = async () => {
        if (!periodo) return setSnack({ open: true, msg: "Selecciona un período primero.", severity: "warning" });
        if (!active) return setSnack({ open: true, msg: "Seleccione un documento o cree uno nuevo.", severity: "warning" });
        if (!secciones.length) return setSnack({ open: true, msg: "Agrega al menos una sección.", severity: "warning" });

        try {
            const ordered = [...secciones].sort((a, b) => catalogRank(a.titulo) - catalogRank(b.titulo) || String(a.titulo).localeCompare(String(b.titulo), "es"));
            const children = [];

            // Portada
            children.push(new Paragraph({
                children: [new TextRun({ text: (tituloDocumento || "Reporte"), bold: true, size: 48 })],
                alignment: AlignmentType.CENTER, spacing: { after: 200 }
            }));
            children.push(new Paragraph({ children: [new TextRun({ text: `Período ${periodo}` })], alignment: AlignmentType.CENTER }));
            children.push(new Paragraph({ children: [new PageBreak()] }));

            // Secciones
            ordered.forEach((s, i) => {
                const tituloSec = (s.titulo?.trim?.() || `Sección ${i + 1}`);
                const blocks = quillHtmlToDocxBlocks(s.contenido);
                if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
                children.push(new Paragraph({ children: [new TextRun({ text: tituloSec, bold: true, size: 40 })], spacing: { after: 160 } }));
                children.push(...blocks);
            });

            const doc = new Document({ styles: DOCX_STYLES, numbering: DOCX_NUMBERING, sections: [{ properties: {}, children }] });
            const slug = (tituloDocumento || "Reporte").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 80);
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${slug}_${periodo}.docx`);
            setSnack({ open: true, msg: "Word generado correctamente.", severity: "success" });
        } catch (e) {
            console.error(e);
            setSnack({ open: true, msg: "No se pudo generar el Word.", severity: "error" });
        }
    };

    return (
        <Card sx={{ borderRadius: 2, mt: 3, mb: 2 }}>
            <CardHeader
                titleTypographyProps={{ sx: { fontWeight: 700, fontSize: { xs: "1rem", md: "1.1rem" } } }}
                subheaderTypographyProps={{ sx: { fontSize: { xs: "0.9rem", md: "0.95rem" } } }}
                title="Reportes"
                subheader="gestión de reportes institucionales"
            />

            <CardContent>
                <Stack spacing={2}>
                    {/* Chips */}
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                        <Chip label={`Período: ${periodo || "—"}`} size="small" />
                        <Chip label={`Secciones: ${secciones.length}`} size="small" />
                        {docSel && <Chip label={`Doc: ${docSel}`} size="small" />}
                        {isNew && <Chip label="Nuevo" color="info" variant="outlined" size="small" />}
                    </Stack>

                    {/* Fila: Select documento + Nuevo + Guardar + Word */}
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
                        <FormControl size="small" sx={{ minWidth: 260 }}>
                            <InputLabel id="doc-label">Documento</InputLabel>
                            <Select
                                labelId="doc-label"
                                label="Documento"
                                value={docSel}
                                onChange={handleSelectDoc}
                                disabled={!periodo || loadingList}
                            >
                                <MenuItem value=""><em>— Seleccione —</em></MenuItem>
                                {loadingList && (
                                    <MenuItem disabled>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <CircularProgress size={16} />
                                            <span>Cargando…</span>
                                        </Stack>
                                    </MenuItem>
                                )}
                                {safeArr(docs).map((d) => (
                                    <MenuItem key={d.codigo} value={String(d.codigo)}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <ArticleRounded fontSize="small" />
                                            <span>{d.titulo || `Reporte ${d.codigo}`}</span>
                                        </Stack>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box sx={{ flex: 1 }} />

                        <Tooltip title="Iniciar un reporte en blanco">
                            <span>
                                <Button variant="outlined" size="small" startIcon={<NoteAddRounded />} onClick={handleNuevoReporte} disabled={!periodo}>
                                    Nuevo reporte
                                </Button>
                            </span>
                        </Tooltip>

                        <Tooltip title={isNew || !docSel ? "Guardar (crea o actualiza según corresponda)" : "Guardar cambios"}>
                            <span>
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    startIcon={<SaveRounded />}
                                    onClick={() => (isNew || !docSel ? crearReporte() : actualizarReporte())}
                                    disabled={!periodo || saving || (!isNew && !docSel)}
                                >
                                    {isNew || !docSel ? "Guardar (crear)" : "Guardar"}
                                </Button>
                            </span>
                        </Tooltip>

                        <Tooltip title={periodo ? (active ? "Generar archivo Word" : "Seleccione un documento o cree uno nuevo") : "Seleccione un período primero"}>
                            <span>
                                <Button variant="contained" size="small" startIcon={<DescriptionRounded />} onClick={generarWord} disabled={!periodo || !active}>
                                    Generar Word
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>

                    <Divider />

                    {/* Contenido */}
                    <Collapse in={active} unmountOnExit>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            {/* Título del documento */}
                            <TextField
                                label="Título del documento (portada)"
                                fullWidth
                                size="small"
                                value={tituloDocumento}
                                onChange={(e) => setTituloDocumento(e.target.value)}
                                placeholder="Ej. Reporte de seguimiento de control interno"
                            />

                            {/* Agregar secciones */}
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                                <FormControl size="small" sx={{ minWidth: 280 }}>
                                    <InputLabel id="sec-add-label">Agregar sección</InputLabel>
                                    <Select
                                        labelId="sec-add-label"
                                        label="Agregar sección"
                                        value={secToAdd}
                                        onChange={(e) => setSecToAdd(e.target.value)}
                                    >
                                        <MenuItem value=""><em>— Seleccione —</em></MenuItem>
                                        {SECTION_CATALOG.filter(
                                            (t) => !secciones.some((s) => (s.titulo || "").trim().toLowerCase() === t.trim().toLowerCase())
                                        ).map((t) => (
                                            <MenuItem key={t} value={t}>{t}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button variant="outlined" size="small" startIcon={<AddRounded />} onClick={addSelectedSection} disabled={!secToAdd}>
                                    Agregar del catálogo
                                </Button>
                                <Tooltip title="Agregar una sección en blanco (editable)">
                                    <span>
                                        <Button variant="text" size="small" onClick={() => { setSecToAdd(""); agregarSeccionLibre(); }}>
                                            Añadir sección en blanco
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Stack>

                            {/* Lista de secciones */}
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="seguimiento-reportes">
                                    {(provided) => (
                                        <Stack spacing={2} ref={provided.innerRef} {...provided.droppableProps}>
                                            {loadingDoc && (
                                                <Stack alignItems="center" sx={{ py: 3 }}>
                                                    <CircularProgress />
                                                </Stack>
                                            )}
                                            {secciones.map((sec, idx) => {
                                                const toolbarId = `toolbar-${sec.id}`;
                                                const tituloPreview = (sec.titulo || "").trim();

                                                return (
                                                    <Draggable key={sec.id} draggableId={sec.id} index={idx}>
                                                        {(drag) => (
                                                            <Card ref={drag.innerRef} {...drag.draggableProps} sx={{ borderRadius: 2 }}>
                                                                <CardContent>
                                                                    <Stack spacing={1.5}>
                                                                        {/* Encabezado */}
                                                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                                            <Tooltip title="Arrastrar para reordenar">
                                                                                <IconButton size="small" {...drag.dragHandleProps}>
                                                                                    <DragIndicatorRounded />
                                                                                </IconButton>
                                                                            </Tooltip>

                                                                            <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
                                                                                Sección {idx + 1}
                                                                            </Typography>

                                                                            <Typography
                                                                                variant="h6"
                                                                                sx={{
                                                                                    ml: 1,
                                                                                    fontWeight: 800,
                                                                                    maxWidth: { xs: "100%", sm: 520 },
                                                                                    whiteSpace: "nowrap",
                                                                                    overflow: "hidden",
                                                                                    textOverflow: "ellipsis",
                                                                                }}
                                                                                title={tituloPreview || "(sin título)"}
                                                                            >
                                                                                {tituloPreview || "(sin título)"}
                                                                            </Typography>

                                                                            <Box sx={{ flex: 1 }} />

                                                                            <Tooltip title={sec.open ? "Colapsar" : "Expandir"}>
                                                                                <IconButton size="small" onClick={() => toggleOpen(sec.id)}>
                                                                                    {sec.open ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title="Eliminar sección">
                                                                                <IconButton color="error" size="small" onClick={() => eliminarSeccion(sec.id)}>
                                                                                    <DeleteRounded />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </Stack>

                                                                        <Divider />

                                                                        {/* Campo editable del título */}
                                                                        <TextField
                                                                            label="Título de la sección"
                                                                            fullWidth
                                                                            size="small"
                                                                            value={sec.titulo}
                                                                            onChange={(e) => cambiarTitulo(sec.id, e.target.value)}
                                                                            placeholder="Ej. Índice, Introducción, Objetivo, Alcance..."
                                                                        />

                                                                        {/* Cuerpo de la sección */}
                                                                        <Collapse in={sec.open} timeout="auto" unmountOnExit={false}>
                                                                            <ToolbarSeccion toolbarId={toolbarId} />
                                                                            <Box sx={{ "& .ql-container": { minHeight: 180, borderRadius: 1 } }}>
                                                                                <ReactQuill
                                                                                    ref={(el) => (editorRefs.current[sec.id] = el)}
                                                                                    theme="snow"
                                                                                    value={sec.contenido}
                                                                                    onChange={(html) => cambiarContenido(sec.id, html)}
                                                                                    modules={modulesCache.current[sec.id] || (modulesCache.current[sec.id] = {
                                                                                        toolbar: { container: `#${toolbarId}` },
                                                                                        clipboard: { matchVisual: false },
                                                                                    })}
                                                                                    formats={quillFormats}
                                                                                    placeholder="Escribe aquí el contenido de esta sección..."
                                                                                />
                                                                            </Box>
                                                                        </Collapse>
                                                                    </Stack>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                        </Stack>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </Stack>
                    </Collapse>

                    <Snackbar
                        open={snack.open}
                        autoHideDuration={3200}
                        onClose={() => setSnack((s) => ({ ...s, open: false }))}
                        message={snack.msg}
                        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                    />
                </Stack>
            </CardContent>
        </Card>
    );
}
