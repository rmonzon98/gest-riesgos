// src/Reportes/InformeAnual.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import apiClient from "api/apiClient";
import {
  Box, Card, CardContent, Typography, Stack, Select, MenuItem, LinearProgress, Alert, Button,
  TextField, IconButton, Divider, Collapse, Tooltip, Chip, InputAdornment, Snackbar
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import ArticleRounded from "@mui/icons-material/ArticleRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";

import { saveAs } from "file-saver";
import {
  Document, Packer, Paragraph, Table as DTable, TableRow as DTR, TableCell as DTC,
  HeadingLevel, AlignmentType, TextRun, WidthType, ImageRun, PageOrientation, ShadingType, UnderlineType
} from "docx";
import CargaArchivos from "Riesgos/Carga Documentos/CargaArchivos";

/* ===== Quill: permitir cualquier tamaño en px (solo para TEXTO) ===== */
const Size = Quill.import("attributors/style/size");
delete Size.whitelist;
Quill.register(Size, true);

/* ===================== Helpers ===================== */
const safeArr = (a) => (Array.isArray(a) ? a : []);
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const safe = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);

/* ====== ESTILOS DOCX: tamaños para H1/H2/H3 y Normal ====== */
const DOCX_STYLES = {
  paragraphStyles: [
    {
      id: "Normal",
      name: "Normal",
      basedOn: "Normal",
      next: "Normal",
      run: { size: 22 }, // ~11pt
    },
    {
      id: "Heading1",
      name: "Heading 1",
      basedOn: "Heading1",
      next: "Normal",
      quickFormat: true,
      run: { size: 32, bold: true }, // ~16pt
      paragraph: { spacing: { after: 200 } },
    },
    {
      id: "Heading2",
      name: "Heading 2",
      basedOn: "Heading2",
      next: "Normal",
      quickFormat: true,
      run: { size: 28, bold: true }, // ~14pt
      paragraph: { spacing: { after: 160 } },
    },
    {
      id: "Heading3",
      name: "Heading 3",
      basedOn: "Heading3",
      next: "Normal",
      quickFormat: true,
      run: { size: 24, bold: true }, // ~12pt
      paragraph: { spacing: { after: 120 } },
    },
  ],
};

/* ====== NUMERACIÓN DOCX: bullets y números ====== */
const DOCX_NUMBERING = {
  config: [
    {
      reference: "bullet-list",
      levels: [
        {
          level: 0,
          format: "bullet",
          text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }, // 0.5"/0.25"
        },
      ],
    },
    {
      reference: "number-list",
      levels: [
        {
          level: 0,
          format: "decimal",
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
  ],
};

/* ------------------ HTML → DOCX (preserva formato) ------------------ */
const pxToHalfPoints = (px) => {
  const n = Number(px);
  if (!n || Number.isNaN(n)) return undefined;
  // 1px ≈ 0.75pt; docx usa half-points: pt*2
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
  // rgb(a)
  const m = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (m) {
    const r = Number(m[1]).toString(16).padStart(2, "0");
    const g = Number(m[2]).toString(16).padStart(2, "0");
    const b = Number(m[3]).toString(16).padStart(2, "0");
    return `${r}${g}${b}`.toUpperCase();
  }
  return undefined;
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

const extractInlineStyle = (el) => {
  const style = (el.getAttribute?.("style") || "").toLowerCase();
  const out = {};
  if (!style) return out;

  const rules = Object.fromEntries(
    style.split(";").map(s => s.trim()).filter(Boolean).map(s => {
      const i = s.indexOf(":");
      if (i === -1) return [s, ""];
      return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
    })
  );

  const color = cssColorToHex(rules.color);
  const bg = cssColorToHex(rules["background-color"]);
  const sizePx = (rules["font-size"] || "").replace("px", "").trim();
  const font = rules["font-family"]?.split(",")?.[0]?.replace(/['"]/g, "")?.trim();

  if (color) out.color = color;
  if (bg) out.highlight = bg;
  const sz = pxToHalfPoints(sizePx);
  if (sz) out.size = sz;
  if (font) out.font = font;

  const td = (rules["text-decoration"] || "").toLowerCase();
  if (td.includes("underline")) out.underline = true;
  if (td.includes("line-through")) out.strike = true;

  return out;
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
      tr = new TextRun({
        ...opts,
        shading: { type: ShadingType.CLEAR, color: "auto", fill: style.highlight }
      });
    }
    runs.push(tr);
  };

  const walkInline = (n, inherited) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n.nodeValue?.replace(/\s+/g, " ");
      pushText(t, inherited);
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;

    const tag = n.tagName.toLowerCase();
    let cur = { ...inherited };
    // Inline tags
    if (tag === "strong" || tag === "b") cur.bold = true;
    if (tag === "em" || tag === "i") cur.italics = true;
    if (tag === "u") cur.underline = true;
    if (tag === "s" || tag === "strike" || tag === "del") cur.strike = true;
    // span styles
    cur = mergeInlineStyle(cur, extractInlineStyle(n));

    if (tag === "br") {
      runs.push(new TextRun({ break: 1 }));
      return;
    }
    if (tag === "a") {
      // Estilo subrayado color hereda; podrías agregar hyperlink externo si lo necesitas luego
      cur.underline = true;
      cur.color = cur.color || "0563C1"; // azul link por defecto
    }

    Array.from(n.childNodes).forEach((ch) => walkInline(ch, cur));
  };

  walkInline(node, parentStyle);
  return runs;
};

const getDocxAlignment = (el) => {
  const cls = (el?.className || "").toLowerCase();
  const style = (el?.getAttribute?.("style") || "").toLowerCase();

  // 1) Clases de Quill
  if (cls.includes("ql-align-center")) return AlignmentType.CENTER;
  if (cls.includes("ql-align-right")) return AlignmentType.RIGHT;
  if (cls.includes("ql-align-justify")) return AlignmentType.JUSTIFIED;
  if (cls.includes("ql-align-left")) return AlignmentType.LEFT;

  // 2) Inline style
  const m = style.match(/text-align\s*:\s*(left|right|center|justify)/);
  if (m) {
    const val = m[1];
    if (val === "left") return AlignmentType.LEFT;
    if (val === "right") return AlignmentType.RIGHT;
    if (val === "center") return AlignmentType.CENTER;
    if (val === "justify") return AlignmentType.JUSTIFIED;
  }

  return undefined; // sin alineación explícita
};

const getHeadingLevel = (el) => {
  const tag = el?.tagName?.toLowerCase?.() || "";
  const cls = (el?.className || "").toLowerCase();

  // Tags estándar de Quill para headers
  if (tag === "h1") return HeadingLevel.HEADING1;
  if (tag === "h2") return HeadingLevel.HEADING2;
  if (tag === "h3") return HeadingLevel.HEADING3;

  // Por si en algún caso llegan como <p class="ql-header-1">
  if (cls.includes("ql-header-1")) return HeadingLevel.HEADING1;
  if (cls.includes("ql-header-2")) return HeadingLevel.HEADING2;
  if (cls.includes("ql-header-3")) return HeadingLevel.HEADING3;

  return undefined; // Párrafo normal
};

const paragraphFromBlock = (el) => {
  const base = extractInlineStyle(el);
  const heading = getHeadingLevel(el);            // <= H1/H2/H3/P
  const alignment = getDocxAlignment(el);         // <= alineación Quill

  const runs = buildRunsFromNode(el, base);
  return new Paragraph({
    children: runs.length ? runs : [new TextRun("")],
    heading,
    alignment,                     // aplica LEFT/RIGHT/CENTER/JUSTIFIED
    spacing: { after: 120 },
  });
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
        const para = paragraphFromBlock(li); // respeta estilos/align aplicados en <li>
        // Listas nativas (numeradas o con viñeta)
        para.numbering = {
          reference: ordered ? "number-list" : "bullet-list",
          level: 0,
        };
        para.spacing = { after: 60 };
        out.push(para);
      });
      return;
    }

    // Bloques estándar: P, DIV, H1..H3 (con clase ql-align-*, ql-header-* si aplica)
    if (["p", "div", "h1", "h2", "h3"].includes(tag)) {
      out.push(paragraphFromBlock(node));
      return;
    }

    Array.from(node.childNodes).forEach(walk);
  };

  Array.from(tmp.childNodes).forEach(walk);
  if (out.length === 0) out.push(new Paragraph({ children: [new TextRun("")] }));
  return out;
};
/* ------------------ FIN HTML → DOCX ------------------ */

/* QUILl → texto simple (por si lo usas en otra parte, no en Word) */
const quillHtmlToPlain = (html = "") => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  tmp.querySelectorAll("br").forEach((br) => (br.outerHTML = "\n"));
  tmp.querySelectorAll("li").forEach((li) => { li.innerHTML = `- ${li.textContent}\n`; });
  tmp.querySelectorAll("p").forEach((p) => { const t = p.textContent ?? ""; p.innerHTML = `${t}\n`; });
  const text = tmp.textContent || "";
  return text.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
};

const TIPOS = {
  TEXTO: "TEXTO",
  INDICE: "INDICE",
  MATRIZ_CI_GOB: "MATRIZ_CI_GOB",
  MATRIZ_FRAUDE: "MATRIZ_FRAUDE",
  MATRIZ_EVAL: "MATRIZ_EVAL",
  MAPA_CALOR: "MAPA_CALOR",
  MATRIZ_CONT: "MATRIZ_CONT",
};

const TIPO_LABEL = {
  [TIPOS.TEXTO]: "Sección de texto",
  [TIPOS.INDICE]: "Índice (predefinido)",
  [TIPOS.MATRIZ_CI_GOB]: "Matriz de eficiencia del control interno y gobernanza",
  [TIPOS.MATRIZ_FRAUDE]: "Matriz de riesgos de fraude o corrupción",
  [TIPOS.MATRIZ_EVAL]: "Matriz de Evaluación de Riesgos (Institucional)",
  [TIPOS.MAPA_CALOR]: "Mapa de calor de riesgo residual (Institucional)",
  [TIPOS.MATRIZ_CONT]: "Matriz de Continuidad de Evaluación de Riesgos (Institucional)",
};

/* ===== Toolbar personalizada (solo TEXTO) ===== */
function ToolbarSeccion({ toolbarId, fontSizeValue, onFontSizeChange, onApplyFontSize }) {
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
      <span className="ql-formats" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
        <TextField
          size="small" type="number" inputProps={{ min: 8, max: 200, step: 1 }}
          value={fontSizeValue ?? ""} onChange={(e) => onFontSizeChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onApplyFontSize(); }}
          sx={{ width: 120 }}
          InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
        />
        <Button variant="outlined" size="small" onClick={onApplyFontSize}>Aplicar</Button>
      </span>
    </div>
  );
}

const quillFormats = ["header", "font", "size", "bold", "italic", "underline", "strike", "align", "color", "background", "list", "indent"];

/* ===== Normalizadores/fetchers (sin cambios) ===== */
const parseMaybeJSON = (v) => { if (v == null) return null; if (typeof v === "string") { try { return JSON.parse(v); } catch { return null; } } return v; };
const normalizeMatrices = (list = []) =>
  list.map((m, i) => {
    const columnas = parseMaybeJSON(m.columnas ?? m.COLUMNAS) ?? { headers: [] };
    const filas = parseMaybeJSON(m.filas ?? m.FILAS) ?? [];
    return { matriz: m.matriz ?? m.MATRIZ ?? i + 1, titulo: (m.titulo ?? m.TITULO ?? "").toString(), columnas, filas };
  });

const normalizeColumns = (payload) => {
  const props = Array.isArray(payload?.propiedades) ? payload.propiedades : [];
  const rows = Array.isArray(payload?.valores) ? payload.valores : [];
  if (props.length > 0) return { propiedades: props, rows };
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    const props2 = keys.map(k => ({ key: k, label: k, source: "predefinida" }));
    return { propiedades: props2, rows };
  }
  return { propiedades: [], rows: [] };
};

const getCellValue = (row, prop) => {
  const label = prop?.label ?? "";
  const key = prop?.key ?? "";
  const source = (prop?.source ?? "predefinida");
  if (source === "extra") {
    if (row?.EXTRAS && Object.prototype.hasOwnProperty.call(row.EXTRAS, label)) return safe(row.EXTRAS[label]);
    if (row?.EXTRAS && Object.prototype.hasOwnProperty.call(row.EXTRAS, key)) return safe(row.EXTRAS[key]);
    return "—";
  }
  if (Object.prototype.hasOwnProperty.call(row, label)) return safe(row[label]);
  if (Object.prototype.hasOwnProperty.call(row, key)) return safe(row[key]);
  return "—";
};

const candidateKeys = (meta = {}) => ([
  meta?.groupKey,
  "Nombre unidad",
  "Unidad", "Unidad organizacional", "NOMBRE_UNIDAD",
  "Dirección", "Direccion", "DIRECCION",
  "Dirección evaluada", "Dirección / Unidad",
  "Área evaluada"
].filter(Boolean));

const findGroupKey = (items, meta = {}) => {
  const cands = candidateKeys(meta);
  for (const c of cands) {
    const hasAny = (items ?? []).some(r => r && (r[c] !== undefined && r[c] !== null && r[c] !== ""));
    if (hasAny) return c;
  }
  return null;
};

const groupByUnidad = (rows, meta = {}) => {
  const gk = findGroupKey(rows, meta);
  const getG = (row) => gk ? safe(row[gk]) : "Institucional";
  const grupos = {};
  (rows ?? []).forEach(r => { const g = getG(r); if (!grupos[g]) grupos[g] = []; grupos[g].push(r); });
  const names = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  return { groupKey: gk, groups: grupos, order: names };
};

// Fetchers
const fetchPrimeraMatriz = async (periodo) => {
  const { data } = await apiClient.get("/api/institucion-actualizados/primera-matriz", { params: { periodo, tipo: 1 } });
  const matrices =
    Array.isArray(data?.matrices) ? normalizeMatrices(data.matrices)
      : Array.isArray(data?.MATRICES) ? normalizeMatrices(data.MATRICES)
        : Array.isArray(data?.respuesta?.matrices) ? normalizeMatrices(data.respuesta.matrices)
          : [];
  return { matrices, institucion: data?.institucion };
};

const fetchSegundaMatriz = async (periodo) => {
  const { data } = await apiClient.get("/api/institucion-actualizados/segunda-matriz", { params: { periodo, tipo: 2 } });
  const matrices =
    Array.isArray(data?.matrices) ? normalizeMatrices(data.matrices)
      : Array.isArray(data?.MATRICES) ? normalizeMatrices(data.MATRICES)
        : [];
  return { matrices, institucion: data?.institucion };
};

const fetchInstME_MC_MCE = async (periodo, categoria) => {
  const { data } = await apiClient.get("/api/reportes-actualizados/matriz-evaluacion-riesgos-inst", {
    params: { periodo, categoria }
  });
  return data; // {propiedades, valores, institucion:[{NOMBRE, TIPO}]}
};

/* ======== Mapa de calor (sin cambios) ======== */
const clamp15 = (v) => Math.max(1, Math.min(5, Number(v) || 1));
const zoneColor = (sev, prob) => { const s = Number(sev) * Number(prob); if (s >= 16) return "#e74c3c"; if (s >= 12) return "#f1c40f"; return "#2ecc71"; };

const findKeyInsensitive = (obj, target) => {
  if (!obj) return null;
  const tk = String(target).toLowerCase();
  return Object.keys(obj).find(k => String(k).toLowerCase() === tk) || null;
};

function puntosFromME_Inst(rows) {
  const out = [];
  for (const r of rows || []) {
    const kProb = findKeyInsensitive(r, "Probabilidad ajustada");
    const kSev = findKeyInsensitive(r, "Severidad ajustada");
    const kRef = findKeyInsensitive(r, "Ref.");
    if (!kProb || !kSev) continue;
    const prob = clamp15(r[kProb]);
    const sev = clamp15(r[kSev]);
    const ref = (kRef && r[kRef] != null && String(r[kRef]).trim() !== "") ? String(r[kRef]) : "—";
    out.push({ prob, sev, ref });
  }
  return out;
}

function buildSvgMapaFromPuntos(puntos) {
  const gridSize = 5, cell = 54;
  const padLeft = 56, padRight = 10, padTop = 8, padBottom = 42;
  const GW = gridSize * cell, GH = gridSize * cell;
  const W = GW + padLeft + padRight, H = GH + padTop + padBottom;
  const ox = padLeft, oy = padTop;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const sev = col + 1, prob = gridSize - row;
      const x = ox + col * cell, y = oy + row * cell;
      const score = sev * prob;
      svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${zoneColor(sev, prob)}" stroke="#ffffff" stroke-width="0.8"/>`;
      svg += `<text x="${x + cell / 2}" y="${y + cell / 2 + 3}" font-size="11" text-anchor="middle" fill="#000">${score}</text>`;
    }
  }

  svg += `<rect x="${ox}" y="${oy}" width="${GW}" height="${GH}" fill="none" stroke="#000" stroke-width="1.2"/>`;

  for (let i = 1; i <= gridSize; i++) {
    const cx = ox + (i - 0.5) * cell;
    const yBase = oy + GH;
    svg += `<text x="${cx}" y="${yBase + 18}" font-size="10" text-anchor="middle" fill="#000">${i}</text>`;
  }
  svg += `<text x="${ox + GW / 2}" y="${oy + GH + 34}" font-size="11" text-anchor="middle" fill="#000">Severidad</text>`;
  for (let i = 1; i <= gridSize; i++) {
    const cy = oy + GH - (i - 0.5) * cell;
    svg += `<text x="${ox - 12}" y="${cy + 3}" font-size="10" text-anchor="end" fill="#000">${i}</text>`;
  }
  svg += `<text x="${ox - 36}" y="${oy + GH / 2}" font-size="11" text-anchor="middle" fill="#000" transform="rotate(-90 ${ox - 36}, ${oy + GH / 2})">Probabilidad</text>`;

  const grouped = new Map();
  puntos.forEach(p => {
    const key = `${clamp15(p.sev)}-${clamp15(p.prob)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(p);
  });

  const pointRadius = 8;
  grouped.forEach((lista, key) => {
    const [sevStr, probStr] = key.split("-");
    const sev = Number(sevStr), prob = Number(probStr);
    const cx = ox + (sev - 0.5) * cell;
    const cy = oy + (gridSize - prob + 0.5) * cell;
    const rad = cell * 0.30;

    const offsets = lista.length === 1
      ? [{ dx: 0, dy: 0 }]
      : Array.from({ length: lista.length }).map((_, i) => {
        const ang = (2 * Math.PI * i) / lista.length;
        return { dx: rad * Math.cos(ang), dy: rad * Math.sin(ang) };
      });

    lista.forEach((p, i) => {
      const { dx, dy } = offsets[i];
      const px = cx + dx, py = cy + dy;
      const fs = String(p.ref || "—").length <= 3 ? 9 : String(p.ref).length === 4 ? 8 : 7;
      svg += `<circle cx="${px}" cy="${py}" r="${pointRadius}" fill="#fff" stroke="#000" stroke-width="1"/>`;
      svg += `<text x="${px}" y="${py}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle" fill="#000">${p.ref || "—"}</text>`;
    });
  });

  svg += `</svg>`;
  return { svg, width: W, height: H };
}

async function svgToPngDataUrl(svg, width, height, scale = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(width * scale);
        canvas.height = Math.floor(height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const png = canvas.toDataURL("image/png");
        URL.revokeObjectURL(url);
        resolve(png);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

async function dataUrlToUint8Array(dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new Uint8Array(await blob.arrayBuffer());
}

/* ======== Contenido por defecto: ÍNDICE ======== */
const INDICE_HTML = `
<ol type="a">
  <li>Carátula</li>
  <li>Índice</li>
  <li>Introducción</li>
  <li>Objetivos institucionales</li>
  <li>Resultados de la evaluación de la eficiencia del control interno y gobernanza</li>
  <li>Conclusión global del auditor Interno</li>
  <li>Anexos</li>
</ol>
`.trim();

/* ===================== Componente ===================== */
export default function InformeAnual({ titulo = "Informe anual" }) {
  const [periodos, setPeriodos] = useState([]);
  const [periodo, setPeriodo] = useState("");
  const [loadingCats, setLoadingCats] = useState(false);
  const [catsError, setCatsError] = useState("");
  const [secciones, setSecciones] = useState([]);
  const [tipoNuevaSeccion, setTipoNuevaSeccion] = useState(TIPOS.TEXTO);

  // Refs / caches
  const editorRefs = useRef({});
  const modulesCache = useRef({});

  // UI auxiliares
  const [fontUi, setFontUi] = useState({});

  // Persistencia
  const [saving, setSaving] = useState(false);
  const [loadingInforme, setLoadingInforme] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const openSnack = (msg, severity = "info") =>
    setSnack({ open: true, msg, severity });
  const closeSnack = () =>
    setSnack((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    const obtenerCatalogos = async () => {
      try {
        const { data } = await apiClient.get(
          "/api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos",
          {}
        );
        setPeriodos(safeArr(data?.periodos));
      } catch (err) {
        console.error("Error al cargar períodos", err);
        setCatsError("No se pudieron cargar los períodos disponibles.");
        setPeriodos([]);
      } finally {
        setLoadingCats(false);
      }
    };
    setLoadingCats(true);
    setCatsError("");
    obtenerCatalogos();
  }, []);

  useEffect(() => {
    setSecciones([]); setFontUi({});
    if (periodo) cargarInforme(periodo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  const serializeForApi = useMemo(() => (periodoVal, seccionesVal) => {
    return {
      periodo: Number(periodoVal),
      titulo,
      secciones: safeArr(seccionesVal).map(s => ({
        id: s.id,
        tipo: s.tipo,
        titulo: s.titulo ?? "",
        contenido: s.contenido ?? "",
        open: Boolean(s.open)
      }))
    };
  }, [titulo]);

  const hydrateFromApi = (payload) => {
    if (!payload || !Array.isArray(payload.secciones)) return [];
    return payload.secciones.map(s => ({
      id: s.id || newId(),
      tipo: s.tipo,
      titulo: s.titulo ?? "",
      contenido: s.contenido ?? "",
      open: typeof s.open === "boolean" ? s.open : true
    }));
  };

  const guardarInforme = async () => {
    if (!periodo) {
      openSnack("Selecciona un período primero.", "warning");
      return;
    }
    try {
      setSaving(true);
      const body = serializeForApi(periodo, secciones);
      await apiClient.post("/api/institucion-actualizados/informe-anual", body);
      openSnack("Informe guardado correctamente.", "success");
    } catch (e) {
      console.error("Error guardando el informe", e);
      openSnack("No se pudo guardar el informe.", "error");
    } finally {
      setSaving(false);
    }
  };

  const cargarInforme = async (periodoToLoad) => {
    try {
      setLoadingInforme(true);
      const { data } = await apiClient.get("/api/institucion-actualizados/informe-anual", {
        params: { periodo: periodoToLoad }
      });
      let hs = [];
      if (data && Array.isArray(data?.secciones)) {
        hs = hydrateFromApi(data);
      }
      const newMods = {};
      const newFont = {};
      hs.forEach(s => {
        newMods[s.id] = { toolbar: { container: `#toolbar-${s.id}` }, clipboard: { matchVisual: false } };
        newFont[s.id] = 16;
      });
      modulesCache.current = newMods;
      setFontUi(newFont);
      setSecciones(hs);
      openSnack("Informe cargado.", "info");
    } catch (e) {
      console.error("Error cargando el informe", e);
      setSecciones([]);
      openSnack("No se pudo cargar el informe para ese período.", "warning");
    } finally {
      setLoadingInforme(false);
    }
  };

  const existeTipoUnico = (tipo) => secciones.some((s) => s.tipo === tipo);
  const crearModules = (secId) => ({ toolbar: { container: `#toolbar-${secId}` }, clipboard: { matchVisual: false } });

  const agregarSeccion = () => {
    if (!periodo) return;
    const tipoUnico = [TIPOS.INDICE, TIPOS.MATRIZ_EVAL, TIPOS.MAPA_CALOR, TIPOS.MATRIZ_CONT, TIPOS.MATRIZ_CI_GOB, TIPOS.MATRIZ_FRAUDE];
    if (tipoUnico.includes(tipoNuevaSeccion) && existeTipoUnico(tipoNuevaSeccion)) return;

    if (tipoNuevaSeccion === TIPOS.INDICE) {
      const id = newId();
      const nueva = { id, tipo: TIPOS.INDICE, titulo: "Índice", contenido: INDICE_HTML, open: true };
      setSecciones((prev) => [...prev, nueva]);
      modulesCache.current[id] = crearModules(id);
      setFontUi((u) => ({ ...u, [id]: 16 }));
      return;
    }

    const id = newId();
    setSecciones((prev) => [...prev, {
      id,
      tipo: tipoNuevaSeccion,
      titulo: tipoNuevaSeccion === TIPOS.TEXTO ? "" : "",
      contenido: tipoNuevaSeccion === TIPOS.TEXTO ? "" : "",
      open: true
    }]);
    modulesCache.current[id] = crearModules(id);
    setFontUi((u) => ({ ...u, [id]: 16 }));
  };

  const eliminarSeccion = (id) => {
    delete modulesCache.current[id];
    setSecciones((prev) => prev.filter((s) => s.id !== id));
    setFontUi((u) => { const c = { ...u }; delete c[id]; return c; });
  };

  const toggleOpen = (id) => setSecciones((prev) => prev.map((s) => s.id === id ? { ...s, open: !s.open } : s));
  const cambiarTitulo = (id, value) => setSecciones((prev) => prev.map((s) => s.id === id ? { ...s, titulo: value } : s));
  const cambiarContenido = (id, value) => setSecciones((prev) => prev.map((s) => s.id === id ? { ...s, contenido: value } : s));

  const onChangeSelection = (secId) => (range) => {
    const quill = editorRefs.current[secId]?.getEditor?.();
    if (!quill) return;
    if (range) {
      const fmt = quill.getFormat(range);
      const size = fmt.size || "";
      const px = size.endsWith("px") ? parseInt(size, 10) : "";
      setFontUi((u) => ({ ...u, [secId]: px || "" }));
    }
  };

  const applyFontSize = (secId) => {
    const quill = editorRefs.current[secId]?.getEditor?.();
    if (!quill) return;
    let val = fontUi[secId];
    if (val === "" || val == null) return;
    const n = Math.max(8, Math.min(200, parseInt(val, 10) || 16));
    quill.format("size", `${n}px`);
    setFontUi((u) => ({ ...u, [secId]: n }));
  };

  const onDragEnd = (result) => {
    const { source, destination } = result || {};
    if (!destination || source.index === destination.index) return;
    setSecciones((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(source.index, 1);
      arr.splice(destination.index, 0, moved);
      return arr;
    });
  };

  const disabledEval = secciones.some((s) => s.tipo === TIPOS.MATRIZ_EVAL);
  const disabledMapa = secciones.some((s) => s.tipo === TIPOS.MAPA_CALOR);
  const disabledCont = secciones.some((s) => s.tipo === TIPOS.MATRIZ_CONT);
  const disabledCIGob = secciones.some((s) => s.tipo === TIPOS.MATRIZ_CI_GOB);
  const disabledFraude = secciones.some((s) => s.tipo === TIPOS.MATRIZ_FRAUDE);
  const disabledIndice = secciones.some((s) => s.tipo === TIPOS.INDICE);

  const buildDocxForPrimeraSegunda = (matrices) => {
    const children = [];
    matrices.forEach((m, idx) => {
      const subt = m.titulo ? `${m.matriz}. ${m.titulo}` : `Matriz ${m.matriz}`;
      children.push(new Paragraph({ text: idx === 0 ? "" : " " }));
      children.push(new Paragraph({ text: subt, heading: HeadingLevel.HEADING2, spacing: { after: 120 } }));

      const headers = Array.isArray(m?.columnas?.headers) ? m.columnas.headers : [];
      const headerRow = new DTR({
        children: headers.map((h) =>
          new DTC({ children: [new Paragraph({ children: [new TextRun({ text: safe(h), bold: true })] })] })
        )
      });

      const bodyRows = (m.filas ?? []).map((filaArr) =>
        new DTR({
          children: (Array.isArray(filaArr) ? filaArr : []).map((cellVal) =>
            new DTC({ children: [new Paragraph(safe(cellVal))] })
          )
        })
      );

      const tabla = new DTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...bodyRows]
      });

      children.push(tabla);
    });
    return children;
  };

  const buildDocxForME_MCE = (propiedades, rows) => {
    const { groups, order } = groupByUnidad(rows, {});
    const children = [];
    order.forEach((gName) => {
      children.push(new Paragraph({ text: " " }));
      children.push(new Paragraph({ text: `Unidad: ${gName}`, heading: HeadingLevel.HEADING2, spacing: { after: 100 } }));

      const headerRow = new DTR({
        children: [
          new DTC({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true })] })] }),
          ...propiedades.map(p =>
            new DTC({ children: [new Paragraph({ children: [new TextRun({ text: (p?.label ?? p?.key ?? "—"), bold: true })] })] })
          )
        ]
      });

      const bodyRows = groups[gName].map((r, i) => new DTR({
        children: [
          new DTC({ children: [new Paragraph(String(i + 1))] }),
          ...propiedades.map(p => new DTC({ children: [new Paragraph(getCellValue(r, p))] }))
        ]
      }));

      const tabla = new DTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...bodyRows]
      });

      children.push(tabla);
    });
    return children;
  };

  const generarWordMatriz = async (tipoMatriz) => {
    if (!periodo) {
      openSnack("Selecciona un período primero.", "warning");
      return;
    }

    const tituloPorTipo = (t) => {
      if (t === TIPOS.MATRIZ_CI_GOB) return "Matriz de eficiencia del control interno y gobernanza";
      if (t === TIPOS.MATRIZ_FRAUDE) return "Matriz de riesgos de fraude o corrupción";
      if (t === TIPOS.MATRIZ_EVAL) return "Matriz de Evaluación de Riesgos (Institucional)";
      if (t === TIPOS.MAPA_CALOR) return "Mapa de Calor de Riesgos (Residual) Institucional";
      if (t === TIPOS.MATRIZ_CONT) return "Matriz de Continuidad y Evaluación (Institucional)";
      return "Reporte";
    };
    const nombreBase = (t) => {
      if (t === TIPOS.MATRIZ_CI_GOB) return `Primera_Matriz_${periodo}`;
      if (t === TIPOS.MATRIZ_FRAUDE) return `Segunda_Matriz_${periodo}`;
      if (t === TIPOS.MATRIZ_EVAL) return `Matriz_Evaluacion_${periodo}`;
      if (t === TIPOS.MAPA_CALOR) return `Mapa_de_calor_de_riesgos_${periodo}`;
      if (t === TIPOS.MATRIZ_CONT) return `Matriz_Continuidad_Y_Monitoreo_${periodo}`;
      return `Reporte_${periodo}`;
    };

    try {
      const sections = [];
      sections.push({
        properties: {},
        children: [
          new Paragraph({ text: tituloPorTipo(tipoMatriz), heading: HeadingLevel.HEADING1, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Paragraph({ text: `Periodo ${periodo}`, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        ]
      });

      if (tipoMatriz === TIPOS.MATRIZ_CI_GOB || tipoMatriz === TIPOS.MATRIZ_FRAUDE) {
        const { matrices } = (tipoMatriz === TIPOS.MATRIZ_CI_GOB)
          ? await fetchPrimeraMatriz(periodo)
          : await fetchSegundaMatriz(periodo);
        if (!matrices.length) {
          openSnack("No hay versión guardada para este período.", "warning");
          return;
        }

        const content = buildDocxForPrimeraSegunda(matrices);
        sections.push({ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } }, children: content });
      } else {
        const categoria = (tipoMatriz === TIPOS.MATRIZ_EVAL) ? "ME" : (tipoMatriz === TIPOS.MAPA_CALOR) ? "MC" : "MCE";
        const payload = await fetchInstME_MC_MCE(periodo, categoria);
        const { propiedades, rows } = normalizeColumns(payload);
        if (!propiedades.length || !rows.length) {
          openSnack("No hay datos para exportar a Word.", "warning");
          return;
        }

        if (tipoMatriz === TIPOS.MAPA_CALOR) {
          const puntos = puntosFromME_Inst(rows);
          if (!puntos.length) {
            openSnack("No hay datos para el mapa de calor.", "warning");
            return;
          }
          const { svg, width, height } = buildSvgMapaFromPuntos(puntos);
          const pngDataUrl = await svgToPngDataUrl(svg, width, height, 2);
          const bytes = await dataUrlToUint8Array(pngDataUrl);
          sections.push({
            properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
            children: [
              new Paragraph({ text: "Mapa de calor de riesgos residuales", heading: HeadingLevel.HEADING2, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
              new Paragraph({
                children: [new ImageRun({ data: bytes, transformation: { width: Math.min(1100, width * 2), height: Math.min(650, height * 2) } })],
                alignment: AlignmentType.CENTER
              }),
            ]
          });
        }

        const content = buildDocxForME_MCE(propiedades, rows);
        sections.push({ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } }, children: content });
      }

      const doc = new Document({
        styles: DOCX_STYLES,
        numbering: DOCX_NUMBERING,
        sections,
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${nombreBase(tipoMatriz)}.docx`);
      openSnack("Archivo Word generado correctamente.", "success");
    } catch (e) {
      console.error(e);
      openSnack("Ocurrió un error generando el Word. Revisa la consola.", "error");
    }
  };

  /* ===== Exportar Word GENERAL (TEXTO mantiene formato del editor) ===== */
  const generarWordGeneral = async () => {
    try {
      if (!periodo) {
        openSnack("Selecciona un período primero.", "warning");
        return;
      }

      const tituloDoc = `${titulo}${periodo ? ` - ${periodo}` : ""}`.trim();
      const sections = [];

      // portada
      sections.push({
        properties: {},
        children: [
          new Paragraph({ text: titulo, heading: HeadingLevel.HEADING1, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Paragraph({ text: periodo ? `Período ${periodo}` : "", alignment: AlignmentType.CENTER }),
        ]
      });

      for (const s of secciones) {
        if (s.tipo === TIPOS.TEXTO || s.tipo === TIPOS.INDICE) {
          const tituloSec = s.titulo?.trim?.() ? s.titulo.trim() : (s.tipo === TIPOS.INDICE ? "Índice" : "Sección");
          const blocks = quillHtmlToDocxBlocks(s.contenido);
          sections.push({
            properties: {}, // retrato
            children: [
              new Paragraph({ text: " ", spacing: { before: 120 } }),
              new Paragraph({ text: tituloSec, heading: HeadingLevel.HEADING2, spacing: { after: 120 } }),
              ...blocks
            ]
          });
        } else if (s.tipo === TIPOS.MATRIZ_CI_GOB || s.tipo === TIPOS.MATRIZ_FRAUDE) {
          const { matrices } = (s.tipo === TIPOS.MATRIZ_CI_GOB)
            ? await fetchPrimeraMatriz(periodo)
            : await fetchSegundaMatriz(periodo);
          if (!matrices.length) continue;
          const children = [
            new Paragraph({ text: s.tipo === TIPOS.MATRIZ_CI_GOB ? TIPO_LABEL[TIPOS.MATRIZ_CI_GOB] : TIPO_LABEL[TIPOS.MATRIZ_FRAUDE], heading: HeadingLevel.HEADING2, spacing: { after: 120 } }),
            ...buildDocxForPrimeraSegunda(matrices),
          ];
          sections.push({ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } }, children });
        } else {
          const categoria = (s.tipo === TIPOS.MATRIZ_EVAL) ? "ME" : (s.tipo === TIPOS.MAPA_CALOR) ? "MC" : "MCE";
          const payload = await fetchInstME_MC_MCE(periodo, categoria);
          const { propiedades, rows } = normalizeColumns(payload);
          if (!propiedades.length || !rows.length) continue;

          const children = [];
          if (s.tipo === TIPOS.MAPA_CALOR) {
            const puntos = puntosFromME_Inst(rows);
            if (puntos.length) {
              const { svg, width, height } = buildSvgMapaFromPuntos(puntos);
              const pngDataUrl = await svgToPngDataUrl(svg, width, height, 2);
              const bytes = await dataUrlToUint8Array(pngDataUrl);
              children.push(new Paragraph({ text: TIPO_LABEL[TIPOS.MAPA_CALOR], heading: HeadingLevel.HEADING2, spacing: { after: 120 }, alignment: AlignmentType.CENTER }));
              children.push(new Paragraph({
                children: [new ImageRun({ data: bytes, transformation: { width: Math.min(1100, width * 2), height: Math.min(650, height * 2) } })],
                alignment: AlignmentType.CENTER
              }));
              children.push(new Paragraph({ text: " " }));
            } else {
              children.push(new Paragraph({ text: "Sin datos ingresados.", alignment: AlignmentType.CENTER }));
            }
          } else {
            children.push(new Paragraph({ text: s.tipo === TIPOS.MATRIZ_EVAL ? TIPO_LABEL[TIPOS.MATRIZ_EVAL] : TIPO_LABEL[TIPOS.MATRIZ_CONT], heading: HeadingLevel.HEADING2, spacing: { after: 120 } }));
          }

          children.push(...buildDocxForME_MCE(propiedades, rows));
          sections.push({ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } }, children });
        }
      }

      const doc = new Document({
        styles: DOCX_STYLES,
        numbering: DOCX_NUMBERING,
        sections,
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${tituloDoc || "informe"}.docx`);
      openSnack("Informe Word generado correctamente.", "success");
    } catch (e) {
      console.error("Error al generar Word general", e);
      openSnack("No se pudo generar el archivo Word.", "error");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{titulo}</Typography>

      <Card sx={{ borderRadius: 2, mb: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Seleccione un período</Typography>
              <Select fullWidth size="small" value={periodo} displayEmpty onChange={(e) => setPeriodo(e.target.value)} disabled={loadingCats}>
                <MenuItem value=""><em>Seleccione un período</em></MenuItem>
                {periodos.map((p) => (
                  <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                    {p.FECINI} - {p.FECFIN} del {p.CODIGO_PERIODO}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {loadingCats && <LinearProgress />}
            {!!catsError && <Alert severity="error">{catsError}</Alert>}

            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                Secciones: {secciones.length}
              </Typography>

              <Select
                size="small"
                value={tipoNuevaSeccion}
                onChange={(e) => setTipoNuevaSeccion(e.target.value)}
                sx={{ minWidth: 360 }}
                disabled={!periodo}
              >
                <MenuItem value={TIPOS.INDICE} disabled={disabledIndice}>{TIPO_LABEL[TIPOS.INDICE]} {disabledIndice ? "(ya agregada)" : ""}</MenuItem>
                <MenuItem value={TIPOS.TEXTO}>{TIPO_LABEL[TIPOS.TEXTO]}</MenuItem>
                <MenuItem value={TIPOS.MATRIZ_CI_GOB} disabled={disabledCIGob}>
                  {TIPO_LABEL[TIPOS.MATRIZ_CI_GOB]} {disabledCIGob ? " (ya agregada)" : ""}
                </MenuItem>
                <MenuItem value={TIPOS.MATRIZ_FRAUDE} disabled={disabledFraude}>
                  {TIPO_LABEL[TIPOS.MATRIZ_FRAUDE]} {disabledFraude ? " (ya agregada)" : ""}
                </MenuItem>
                <MenuItem value={TIPOS.MATRIZ_EVAL} disabled={disabledEval}>
                  {TIPO_LABEL[TIPOS.MATRIZ_EVAL]} {disabledEval ? " (ya agregada)" : ""}
                </MenuItem>
                <MenuItem value={TIPOS.MAPA_CALOR} disabled={disabledMapa}>
                  {TIPO_LABEL[TIPOS.MAPA_CALOR]} {disabledMapa ? " (ya agregada)" : ""}
                </MenuItem>
                <MenuItem value={TIPOS.MATRIZ_CONT} disabled={disabledCont}>
                  {TIPO_LABEL[TIPOS.MATRIZ_CONT]} {disabledCont ? " (ya agregada)" : ""}
                </MenuItem>
              </Select>

              <Tooltip title={periodo ? "Agregar una nueva sección" : "Seleccione un período primero"}>
                <span>
                  <Button variant="contained" size="small" startIcon={<AddRounded />} onClick={agregarSeccion} disabled={!periodo}>
                    Agregar sección
                  </Button>
                </span>
              </Tooltip>

              {secciones.length > 0 && (
                <>
                  <Button variant="outlined" size="small" startIcon={<DescriptionRounded />} onClick={generarWordGeneral}>
                    Generar Word (Informe)
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveRounded />}
                    disabled={!periodo || saving}
                    onClick={guardarInforme}
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {periodo && <CargaArchivos periodo={periodo} flag={7} />}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="lista-secciones">
          {(provided) => (
            <Stack spacing={2} ref={provided.innerRef} {...provided.droppableProps}>
              {secciones.map((sec, idx) => {
                const toolbarId = `toolbar-${sec.id}`;
                const fontVal = fontUi[sec.id] ?? "";
                const chipColor =
                  (sec.tipo === TIPOS.TEXTO || sec.tipo === TIPOS.INDICE)
                    ? "default"
                    : sec.tipo === TIPOS.MAPA_CALOR
                      ? "warning"
                      : "info";

                const esMatriz = ![TIPOS.TEXTO, TIPOS.INDICE].includes(sec.tipo);

                return (
                  <Draggable draggableId={sec.id} index={idx} key={sec.id}>
                    {(drag) => (
                      <Card sx={{ borderRadius: 2 }} ref={drag.innerRef} {...drag.draggableProps}>
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Tooltip title="Arrastrar para reordenar">
                                <IconButton size="small" {...drag.dragHandleProps}><DragIndicatorRounded /></IconButton>
                              </Tooltip>
                              <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>Sección {idx + 1}</Typography>
                              <Chip size="small" label={TIPO_LABEL[sec.tipo]} sx={{ ml: 1 }} color={chipColor} variant="outlined" />
                              <Box sx={{ flex: 1 }} />
                              <Tooltip title={sec.open ? "Colapsar" : "Expandir"}>
                                <IconButton size="small" onClick={() => toggleOpen(sec.id)}>{sec.open ? <ExpandLessRounded /> : <ExpandMoreRounded />}</IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar sección">
                                <IconButton color="error" size="small" onClick={() => eliminarSeccion(sec.id)}><DeleteRounded /></IconButton>
                              </Tooltip>
                            </Stack>

                            <Divider />

                            {!esMatriz && (
                              <TextField
                                label="Título de la sección"
                                placeholder="Ej. Introducción, Metodología, Resultados, Conclusiones..."
                                fullWidth size="small" value={sec.titulo}
                                onChange={(e) => cambiarTitulo(sec.id, e.target.value)}
                              />
                            )}

                            <Collapse in={sec.open} timeout="auto" unmountOnExit={false}>
                              {!esMatriz ? (
                                <>
                                  <ToolbarSeccion
                                    toolbarId={toolbarId}
                                    fontSizeValue={fontVal}
                                    onFontSizeChange={(val) => setFontUi((u) => ({ ...u, [sec.id]: val }))}
                                    onApplyFontSize={() => applyFontSize(sec.id)}
                                  />
                                  <Box sx={{ "& .ql-container": { minHeight: 200, borderRadius: 1 } }}>
                                    <ReactQuill
                                      ref={(el) => (editorRefs.current[sec.id] = el)}
                                      theme="snow"
                                      value={sec.contenido}
                                      onChange={(html) => cambiarContenido(sec.id, html)}
                                      onChangeSelection={onChangeSelection(sec.id)}
                                      modules={modulesCache.current[sec.id] || (modulesCache.current[sec.id] = {
                                        toolbar: { container: `#${toolbarId}` },
                                        clipboard: { matchVisual: false },
                                      })}
                                      formats={quillFormats}
                                      placeholder={sec.tipo === TIPOS.INDICE ? "Contenido del índice..." : "Escribe aquí el contenido de esta sección..."}
                                    />
                                  </Box>
                                </>
                              ) : (
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<ArticleRounded />}
                                    onClick={() => generarWordMatriz(sec.tipo)}
                                  >
                                    Generar Word (individual)
                                  </Button>
                                  <Alert severity="info">
                                    Esta sección se genera desde la información actual. El <strong>mapa de calor</strong> se inserta como imagen usando valores ajustados (Prob./Sev.) y <em>Ref.</em>.
                                  </Alert>
                                </Stack>
                              )}
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

      {/* Snackbar global */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={closeSnack}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={closeSnack}
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
