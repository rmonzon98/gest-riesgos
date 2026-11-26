// src/Administracion/MetricasDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "api/apiClient";
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    MenuItem,
    Chip,
    Stack,
    LinearProgress,
    Divider,
    CircularProgress,
    Snackbar,
    Alert,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button,
} from "@mui/material";
import FileDownloadRounded from "@mui/icons-material/FileDownloadRounded";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
    formatearHojaReporte,
    estilizarTitulo,
    estilizarFicha,
    configurarImpresion,
    bordesCompletos,
    COLORES_XLSX,
} from "funciones/ExcelFormato";

import {
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import CancelRounded from "@mui/icons-material/CancelRounded";

const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#AA66CC",
    "#FF5252",
    "#4CAF50",
    "#7E57C2",
    "#26C6DA",
];

/* ===== Gráfico de pastel para exportar (se dibuja desde los datos, no se captura la pantalla) ===== */
const escaparXml = (v) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Construye un SVG del pastel con los mismos colores del dashboard, porcentajes en cada porción
 * y una leyenda con cantidad y porcentaje.
 *
 * @param {{name:string, value:number}[]} datos
 * @param {{titulo:string, subtitulo:string}} textos
 * @returns {{svg:string, width:number, height:number}}
 */
function construirSvgPastel(datos, { titulo, subtitulo }) {
    const width = 720;
    const height = Math.max(400, 140 + datos.length * 28);
    const cx = 210;
    const cy = 230;
    const r = 150;
    const total = datos.reduce((acc, d) => acc + d.value, 0) || 1;

    let angulo = -Math.PI / 2;
    const porciones = datos.map((d, i) => {
        const fraccion = d.value / total;
        const a0 = angulo;
        const a1 = angulo + fraccion * 2 * Math.PI;
        angulo = a1;
        const color = COLORS[i % COLORS.length];

        const forma = fraccion >= 0.9999
            ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>`
            : `<path d="M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>`;

        // Porcentaje dentro de la porción (solo si cabe)
        const medio = (a0 + a1) / 2;
        const etiqueta = fraccion >= 0.05
            ? `<text x="${cx + r * 0.62 * Math.cos(medio)}" y="${cy + r * 0.62 * Math.sin(medio)}" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700" fill="#FFFFFF">${Math.round(fraccion * 100)}%</text>`
            : "";
        return forma + etiqueta;
    });

    const leyenda = datos.map((d, i) => {
        const y = 110 + i * 28;
        const pct = ((d.value / total) * 100).toFixed(1);
        return `<rect x="420" y="${y - 11}" width="16" height="16" rx="3" fill="${COLORS[i % COLORS.length]}"/>
            <text x="446" y="${y + 2}" font-size="14" fill="#1F2D3D">${escaparXml(d.name)}</text>
            <text x="700" y="${y + 2}" font-size="14" text-anchor="end" fill="#555555">${d.value} (${pct}%)</text>`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Arial, Helvetica, sans-serif">
        <rect width="100%" height="100%" fill="#FFFFFF"/>
        <text x="20" y="34" font-size="18" font-weight="700" fill="#1F2D3D">${escaparXml(titulo)}</text>
        <text x="20" y="58" font-size="13" fill="#666666">${escaparXml(subtitulo)}</text>
        ${porciones.join("")}
        <text x="420" y="84" font-size="13" font-weight="700" fill="#1F2D3D">Tipo de objetivo</text>
        <text x="700" y="84" font-size="13" font-weight="700" text-anchor="end" fill="#1F2D3D">Riesgos (%)</text>
        ${leyenda.join("")}
    </svg>`;
    return { svg, width, height };
}

/** Convierte un SVG a PNG (data URL) dibujándolo en un canvas. */
const svgAPng = (svg, width, height, escala = 2) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = width * escala;
            canvas.height = height * escala;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });

function MetricasDashboard() {
    // === Snackbar global ===
    const [snackbar, setSnackbar] = useState({
        open: false,
        severity: "info",
        message: "",
    });

    const mostrarSnackbar = (severity, message) => {
        setSnackbar({ open: true, severity, message });
    };

    const handleCloseSnackbar = (_, reason) => {
        if (reason === "clickaway") return;
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    // === Datos ===
    const [metricas, setMetricas] = useState({
        riesgos: [],
        primeraMatriz: [],
        segundaMatriz: [],
        seguimientos: [],
    });

    const [direcciones, setDirecciones] = useState([]);
    const [loading, setLoading] = useState(false);

    // === Exportación a Excel ===
    const [exportando, setExportando] = useState(false);

    // === Filtros ===
    const [entidadesSeleccionadas, setEntidadesSeleccionadas] = useState([]);
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");

    // ==== Carga inicial de datos ====
    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                const [metricasRes, direccionesRes] = await Promise.all([
                    apiClient.get("/api/administracion-actualizados/obtener-metricas"),
                    apiClient.get("/api/direcciones-actualizados"),
                ]);

                const m = metricasRes.data || {};
                // Los riesgos nuevos no cuentan en las métricas del período; se muestran aparte
                const esNuevo = (r) => Number(r.es_nuevo ?? r.ES_NUEVO) === 1;
                setMetricas({
                    riesgos: (m.riesgos || []).filter((r) => !esNuevo(r)),
                    riesgosNuevos: (m.riesgos || []).filter(esNuevo),
                    primeraMatriz: m.primeraMatriz || [],
                    segundaMatriz: m.segundaMatriz || [],
                    seguimientos: m.seguimientos || [],
                });

                const dirs = direccionesRes.data?.result || [];
                setDirecciones(dirs);

                const noHayMetricas =
                    !(m.riesgos || []).length &&
                    !(m.primeraMatriz || []).length &&
                    !(m.segundaMatriz || []).length &&
                    !(m.seguimientos || []).length;

                if (noHayMetricas) {
                    mostrarSnackbar(
                        "info",
                        "No se encontraron métricas para mostrar."
                    );
                } else {
                    mostrarSnackbar("success", "Métricas cargadas correctamente.");
                }
            } catch (error) {
                console.error("Error al cargar métricas:", error);
                const msg =
                    error.response?.data?.msg ||
                    error.response?.data?.error ||
                    error.message ||
                    "Error inesperado al obtener métricas.";
                mostrarSnackbar("error", msg);
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, []);

    // === Helpers de nombres ===
    const getNombreEntidad = (codigoEntidad) => {
        const dir = direcciones.find(
            (d) => Number(d.CODIGO_ENTIDAD) === Number(codigoEntidad)
        );
        if (!dir) return `Entidad ${codigoEntidad}`;
        const siglas = dir.SIGLAS ? `${dir.SIGLAS} - ` : "";
        return `${siglas}${dir.NOMBRE}`;
    };

    // === Periodos disponibles ===
    const periodosDisponibles = useMemo(() => {
        const set = new Set();

        (metricas.riesgos || []).forEach((r) => {
            if (r.codigo_periodo != null) set.add(r.codigo_periodo);
        });
        (metricas.primeraMatriz || []).forEach((r) => {
            if (r.codigo_periodo != null) set.add(r.codigo_periodo);
        });
        (metricas.segundaMatriz || []).forEach((r) => {
            if (r.codigo_periodo != null) set.add(r.codigo_periodo);
        });
        (metricas.seguimientos || []).forEach((r) => {
            if (r.codigo_periodo != null) set.add(r.codigo_periodo);
        });

        return Array.from(set).sort((a, b) => Number(a) - Number(b));
    }, [metricas]);

    // === Lista base de entidades (TODAS las direcciones del catálogo) ===
    const entidadesBase = useMemo(() => {
        if (!direcciones || direcciones.length === 0) return [];
        const ordenadas = [...direcciones].sort((a, b) =>
            a.NOMBRE.localeCompare(b.NOMBRE, "es", { sensitivity: "base" })
        );
        return ordenadas.map((d) => Number(d.CODIGO_ENTIDAD));
    }, [direcciones]);

    // === Aplicar filtros de entidades (sobre TODAS las direcciones) ===
    const entidadesFiltradas = useMemo(() => {
        if (!entidadesBase.length) return [];
        if (entidadesSeleccionadas.length > 0) {
            const setSel = new Set(entidadesSeleccionadas.map(Number));
            return entidadesBase.filter((cod) => setSel.has(Number(cod)));
        }
        return entidadesBase;
    }, [entidadesBase, entidadesSeleccionadas]);

    // === Helper para obtener métricas por entidad (dirección) ===
    const getMetricsForEntidad = (codigoEntidad) => {
        const cod = Number(codigoEntidad);

        const filtrarPorEntidadPeriodo = (lista) =>
            (lista || []).filter(
                (item) =>
                    Number(item.codigo_entidad) === cod &&
                    (periodoSeleccionado === "" ||
                        Number(item.codigo_periodo) ===
                        Number(periodoSeleccionado))
            );

        const riesgosEntidad = filtrarPorEntidadPeriodo(metricas.riesgos);
        const totalRiesgos = riesgosEntidad.length;
        const totalNuevos = filtrarPorEntidadPeriodo(metricas.riesgosNuevos).length;

        const tienePrimera =
            filtrarPorEntidadPeriodo(metricas.primeraMatriz).length > 0;

        const tieneSegunda =
            filtrarPorEntidadPeriodo(metricas.segundaMatriz).length > 0;

        const segEntidad = filtrarPorEntidadPeriodo(metricas.seguimientos);
        const mesesSet = new Set(segEntidad.map((s) => s.mes));
        const mesesConSeguimiento = mesesSet.size; // 0-12

        return {
            totalRiesgos,
            totalNuevos,
            tienePrimera,
            tieneSegunda,
            mesesConSeguimiento,
        };
    };

    // === Resumen global (sobre TODAS las direcciones filtradas) ===
    const resumenGlobal = useMemo(() => {
        if (!entidadesFiltradas.length) {
            return {
                totalRiesgos: 0,
                totalNuevos: 0,
                entidadesConPrimera: 0,
                entidadesConSegunda: 0,
                promedioMesesSeguimiento: 0,
                direccionesSinRiesgos: 0,
                direccionesSinPrimera: 0,
                direccionesSinSegunda: 0,
            };
        }

        let totalRiesgos = 0;
        let totalNuevos = 0;
        let entidadesConPrimera = 0;
        let entidadesConSegunda = 0;
        let sumaMesesSeguimiento = 0;
        let direccionesSinRiesgos = 0;
        let direccionesSinPrimera = 0;
        let direccionesSinSegunda = 0;

        entidadesFiltradas.forEach((cod) => {
            const metrics = getMetricsForEntidad(cod);
            totalRiesgos += metrics.totalRiesgos;
            totalNuevos += metrics.totalNuevos;

            if (metrics.tienePrimera) entidadesConPrimera += 1;
            if (metrics.tieneSegunda) entidadesConSegunda += 1;

            sumaMesesSeguimiento += metrics.mesesConSeguimiento;

            if (metrics.totalRiesgos === 0) direccionesSinRiesgos += 1;
            if (!metrics.tienePrimera) direccionesSinPrimera += 1;
            if (!metrics.tieneSegunda) direccionesSinSegunda += 1;
        });

        const promedioMesesSeguimiento =
            sumaMesesSeguimiento / entidadesFiltradas.length;

        return {
            totalRiesgos,
            totalNuevos,
            entidadesConPrimera,
            entidadesConSegunda,
            promedioMesesSeguimiento,
            direccionesSinRiesgos,
            direccionesSinPrimera,
            direccionesSinSegunda,
        };
    }, [entidadesFiltradas, metricas, periodoSeleccionado]);

    // === Pie data por tipo de objetivo (con filtros) ===
    const pieDataTipoObjetivo = useMemo(() => {
        if (!metricas.riesgos || metricas.riesgos.length === 0) return [];

        const entidadesSet = new Set(entidadesFiltradas.map(Number));

        const riesgosFiltrados = (metricas.riesgos || []).filter((r) => {
            const codEnt = Number(r.codigo_entidad);
            const entraEntidad = entidadesFiltradas.length
                ? entidadesSet.has(codEnt)
                : true;
            const entraPeriodo =
                periodoSeleccionado === "" ||
                Number(r.codigo_periodo) === Number(periodoSeleccionado);
            return entraEntidad && entraPeriodo;
        });

        if (!riesgosFiltrados.length) return [];

        const mapa = new Map();

        riesgosFiltrados.forEach((r) => {
            const tipo = r.codigo_tipo_objetivo ?? "SIN_TIPO";
            const label =
                r.codigo_tipo_objetivo != null
                    ? `Tipo ${r.codigo_tipo_objetivo}`
                    : "Sin tipo de objetivo";

            if (!mapa.has(tipo)) {
                mapa.set(tipo, {
                    name: label,
                    value: 0,
                    codigo: tipo,
                });
            }
            const obj = mapa.get(tipo);
            obj.value += 1;
        });

        return Array.from(mapa.values());
    }, [metricas.riesgos, entidadesFiltradas, periodoSeleccionado]);

    // === Exportar a Excel (respeta los filtros actuales) ===
    // Hojas: Resumen (indicadores), Por dirección (tabla) y Tipo de objetivo (datos + imagen del gráfico).
    const exportarExcel = async () => {
        setExportando(true);
        try {
            const wb = new ExcelJS.Workbook();
            const totalDirecciones = entidadesFiltradas.length;
            const textoPeriodo =
                periodoSeleccionado === "" ? "Todos los períodos" : `Período ${periodoSeleccionado}`;
            const textoDirecciones = entidadesSeleccionadas.length
                ? entidadesSeleccionadas.map(getNombreEntidad).join(", ")
                : "Todas las direcciones";
            const generado = new Date().toLocaleString("es-GT");

            const encabezadoHoja = (ws, titulo) => {
                ws.getCell("A1").value = titulo;
                ws.getCell("A2").value = textoPeriodo;
            };

            // ---- Hoja 1: Resumen (tarjetas como en el dashboard + tabla editable) ----
            // Cuadrícula de 8 columnas: cada tarjeta ocupa 2; la tabla usa A:E | F | G:H
            const wsResumen = wb.addWorksheet("Resumen");
            const COLS_RESUMEN = 8;
            wsResumen.columns = Array.from({ length: COLS_RESUMEN }, () => ({ width: 18 }));
            const fusionar = (fila, c1, c2) => {
                if (c2 > c1) wsResumen.mergeCells(fila, c1, fila, c2);
            };
            const relleno = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

            encabezadoHoja(wsResumen, "Dashboard de métricas de riesgo");
            estilizarTitulo(wsResumen, 1, COLS_RESUMEN, { tipo: "principal" });
            estilizarTitulo(wsResumen, 2, COLS_RESUMEN, { tipo: "secundario" });

            [["Direcciones", textoDirecciones], ["Período", textoPeriodo], ["Generado", generado]]
                .forEach(([etiqueta, valor], i) => {
                    wsResumen.getCell(4 + i, 1).value = etiqueta;
                    wsResumen.getCell(4 + i, 2).value = valor;
                });
            estilizarFicha(wsResumen, { desdeFila: 4, hastaFila: 6, ultimaColumna: COLS_RESUMEN });

            // Tarjetas: etiqueta (fila 8), valor grande (fila 9) y detalle (fila 10)
            const tarjetas = [
                {
                    etiqueta: "Total de riesgos",
                    valor: resumenGlobal.totalRiesgos,
                    detalle: `Identificados en el período (no incluidos): ${resumenGlobal.totalNuevos}`,
                },
                {
                    etiqueta: "Direcciones con 1ra matriz (control interno y gobernanza)",
                    valor: `${resumenGlobal.entidadesConPrimera} / ${totalDirecciones}`,
                    detalle: `Sin 1ra matriz: ${resumenGlobal.direccionesSinPrimera}`,
                },
                {
                    etiqueta: "Direcciones con 2da matriz (fraude y corrupción)",
                    valor: `${resumenGlobal.entidadesConSegunda} / ${totalDirecciones}`,
                    detalle: `Sin 2da matriz: ${resumenGlobal.direccionesSinSegunda}`,
                },
                {
                    etiqueta: "Meses con seguimiento (promedio)",
                    valor: `${resumenGlobal.promedioMesesSeguimiento.toFixed(1)} / 12`,
                    detalle: `Direcciones sin riesgos: ${resumenGlobal.direccionesSinRiesgos}`,
                },
            ];
            const [filaEtiqueta, filaValor, filaDetalle] = [8, 9, 10];
            wsResumen.getRow(filaEtiqueta).height = 32;
            wsResumen.getRow(filaValor).height = 36;
            wsResumen.getRow(filaDetalle).height = 30;
            tarjetas.forEach((t, i) => {
                const c1 = 1 + i * 2;
                const c2 = c1 + 1;
                const estilos = [
                    [filaEtiqueta, t.etiqueta, { bold: true, size: 9, color: { argb: "FF666666" } }],
                    [filaValor, t.valor, { bold: true, size: 20, color: { argb: COLORES_XLSX.titulo } }],
                    [filaDetalle, t.detalle, { size: 9, color: { argb: "FF666666" } }],
                ];
                estilos.forEach(([fila, valor, font]) => {
                    wsResumen.getCell(fila, c1).value = valor;
                    fusionar(fila, c1, c2);
                    for (let c = c1; c <= c2; c++) {
                        const cell = wsResumen.getCell(fila, c);
                        cell.fill = relleno(COLORES_XLSX.filaAlterna);
                        cell.font = font;
                        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true, indent: 1 };
                    }
                });
                // Marco de la tarjeta
                const borde = { style: "medium", color: { argb: COLORES_XLSX.borde } };
                for (let f = filaEtiqueta; f <= filaDetalle; f++) {
                    wsResumen.getCell(f, c1).border = {
                        ...wsResumen.getCell(f, c1).border,
                        left: borde,
                        ...(f === filaEtiqueta ? { top: borde } : {}),
                        ...(f === filaDetalle ? { bottom: borde } : {}),
                    };
                    wsResumen.getCell(f, c2).border = {
                        ...wsResumen.getCell(f, c2).border,
                        right: borde,
                        ...(f === filaEtiqueta ? { top: borde } : {}),
                        ...(f === filaDetalle ? { bottom: borde } : {}),
                    };
                }
            });

            // Tabla editable con los valores numéricos
            const filaEncResumen = 12;
            const detalleDirecciones = `de ${totalDirecciones} direcciones`;
            const indicadores = [
                ["Total de riesgos", resumenGlobal.totalRiesgos, "Suma de riesgos en las direcciones filtradas"],
                ["Riesgos identificados en el período (no incluidos)", resumenGlobal.totalNuevos, "No forman parte de la evaluación ni del seguimiento"],
                ["Direcciones con matriz de control interno y gobernanza (1ra matriz)", resumenGlobal.entidadesConPrimera, detalleDirecciones],
                ["Direcciones sin 1ra matriz", resumenGlobal.direccionesSinPrimera, detalleDirecciones],
                ["Direcciones con matriz de riesgos de fraude y corrupción (2da matriz)", resumenGlobal.entidadesConSegunda, detalleDirecciones],
                ["Direcciones sin 2da matriz", resumenGlobal.direccionesSinSegunda, detalleDirecciones],
                ["Meses con seguimiento (promedio)", Number(resumenGlobal.promedioMesesSeguimiento.toFixed(1)), "de 12 meses"],
                ["Direcciones sin riesgos", resumenGlobal.direccionesSinRiesgos, detalleDirecciones],
            ];
            [["Indicador", "Valor", "Detalle"], ...indicadores].forEach(([indicador, valor, detalle], i) => {
                const fila = filaEncResumen + i;
                const esEncabezado = i === 0;
                wsResumen.getCell(fila, 1).value = indicador;
                wsResumen.getCell(fila, 6).value = valor;
                wsResumen.getCell(fila, 7).value = detalle;
                fusionar(fila, 1, 5);
                fusionar(fila, 7, 8);
                wsResumen.getRow(fila).height = esEncabezado ? 24 : 20;
                for (let c = 1; c <= COLS_RESUMEN; c++) {
                    const cell = wsResumen.getCell(fila, c);
                    cell.border = bordesCompletos();
                    if (esEncabezado) {
                        cell.fill = relleno(COLORES_XLSX.encabezado);
                        cell.font = { bold: true, size: 10, color: { argb: COLORES_XLSX.encabezadoTexto } };
                        cell.alignment = { horizontal: "center", vertical: "middle" };
                    } else {
                        if (i % 2 === 0) cell.fill = relleno(COLORES_XLSX.filaAlterna);
                        cell.font = { size: 10, bold: c === 6 };
                        cell.alignment = { horizontal: c === 6 ? "center" : "left", vertical: "middle", wrapText: true };
                    }
                }
            });
            configurarImpresion(wsResumen, { titulo: "Resumen de métricas" });

            // ---- Hoja 2: Por dirección ----
            const wsDir = wb.addWorksheet("Por dirección");
            encabezadoHoja(wsDir, "Detalle por dirección");
            const filaEncDir = 4;
            wsDir.getRow(filaEncDir).values = [
                "Dirección",
                "Cantidad de riesgos",
                "Identificados en el período",
                "Matriz CI/Gob.",
                "Matriz Riesgos (F/C)",
                "Meses con seguimiento",
            ];
            const metricasDir = entidadesFiltradas.map((cod) => ({
                nombre: getNombreEntidad(cod),
                ...getMetricsForEntidad(cod),
            }));
            // ✓ verde / ✗ gris como los íconos del dashboard; los meses se muestran "N / 12"
            const marca = (tiene) => (tiene ? "✓ Sí" : "✗ No");
            const fuenteMarca = (tiene) => ({ size: 10, bold: tiene, color: { argb: tiene ? "FF2E7D32" : "FF9E9E9E" } });
            metricasDir.forEach((m, i) => {
                const row = wsDir.getRow(filaEncDir + 1 + i);
                row.values = [
                    m.nombre,
                    m.totalRiesgos,
                    m.totalNuevos,
                    marca(m.tienePrimera),
                    marca(m.tieneSegunda),
                    m.mesesConSeguimiento,
                ];
                [2, 3, 6].forEach((c) => { row.getCell(c).alignment = { horizontal: "center" }; });
                row.getCell(4).font = fuenteMarca(m.tienePrimera);
                row.getCell(5).font = fuenteMarca(m.tieneSegunda);
                row.getCell(4).alignment = { horizontal: "center" };
                row.getCell(5).alignment = { horizontal: "center" };
                row.getCell(6).numFmt = '0" / 12"';
            });
            const filaTotalDir = filaEncDir + metricasDir.length + 1;
            wsDir.getRow(filaTotalDir).values = [
                "Total",
                resumenGlobal.totalRiesgos,
                resumenGlobal.totalNuevos,
                `${resumenGlobal.entidadesConPrimera} de ${totalDirecciones}`,
                `${resumenGlobal.entidadesConSegunda} de ${totalDirecciones}`,
                `${resumenGlobal.promedioMesesSeguimiento.toFixed(1)} (promedio)`,
            ];
            formatearHojaReporte(wsDir, {
                filaTitulo: 1,
                filaSubtitulo: 2,
                filaEncabezado: filaEncDir,
                ultimaFilaDatos: filaTotalDir,
                ultimaColumna: 6,
                filasTotales: [filaTotalDir],
                tituloImpresion: "Detalle por dirección",
            });
            // Barra de datos en "Meses con seguimiento" (equivale a la barra de progreso del dashboard)
            if (metricasDir.length) {
                wsDir.addConditionalFormatting({
                    ref: `F${filaEncDir + 1}:F${filaEncDir + metricasDir.length}`,
                    rules: [{
                        type: "dataBar",
                        gradient: false,
                        cfvo: [{ type: "num", value: 0 }, { type: "num", value: 12 }],
                        color: { argb: "FF1976D2" },
                    }],
                });
            }
            wsDir.getColumn(6).width = Math.max(wsDir.getColumn(6).width || 0, 24);

            // ---- Hoja 3: Tipo de objetivo (datos + imagen del gráfico) ----
            const wsTipo = wb.addWorksheet("Tipo de objetivo");
            encabezadoHoja(wsTipo, "Distribución de riesgos por tipo de objetivo");
            const filaEncTipo = 4;
            wsTipo.getRow(filaEncTipo).values = ["Tipo de objetivo", "Cantidad", "Porcentaje"];
            const totalPie = pieDataTipoObjetivo.reduce((acc, d) => acc + d.value, 0);
            pieDataTipoObjetivo.forEach((d, i) => {
                const row = wsTipo.getRow(filaEncTipo + 1 + i);
                row.values = [d.name, d.value, totalPie ? d.value / totalPie : 0];
                row.getCell(3).numFmt = "0.0%";
            });
            const filaTotalTipo = filaEncTipo + pieDataTipoObjetivo.length + 1;
            const rowTotalTipo = wsTipo.getRow(filaTotalTipo);
            rowTotalTipo.values = ["Total", totalPie, totalPie ? 1 : 0];
            rowTotalTipo.getCell(3).numFmt = "0.0%";
            formatearHojaReporte(wsTipo, {
                filaTitulo: 1,
                filaSubtitulo: 2,
                filaEncabezado: filaEncTipo,
                ultimaFilaDatos: filaTotalTipo,
                ultimaColumna: 3,
                filasTotales: [filaTotalTipo],
                autoFiltro: false,
                orientacion: "portrait",
                tituloImpresion: "Riesgos por tipo de objetivo",
            });

            // Gráfico dibujado desde los datos (mismos colores del dashboard), a la derecha de la tabla.
            // La imagen no es editable; la tabla permite rehacer el gráfico en Excel.
            let sinImagen = false;
            if (pieDataTipoObjetivo.length) {
                try {
                    const { svg, width, height } = construirSvgPastel(pieDataTipoObjetivo, {
                        titulo: "Distribución de riesgos por tipo de objetivo",
                        subtitulo: `${textoPeriodo} · ${textoDirecciones}`,
                    });
                    const png = await svgAPng(svg, width, height, 2);
                    const imagenId = wb.addImage({ base64: png, extension: "png" });
                    const ancho = 600;
                    wsTipo.addImage(imagenId, {
                        tl: { col: 4, row: filaEncTipo - 1 },
                        ext: { width: ancho, height: Math.round(ancho * (height / width)) },
                    });
                } catch (errImagen) {
                    console.error("No se pudo generar la imagen del gráfico:", errImagen);
                    sinImagen = true;
                }
            }

            const buffer = await wb.xlsx.writeBuffer();
            const sufijoPeriodo = periodoSeleccionado === "" ? "todos" : periodoSeleccionado;
            saveAs(
                new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
                `Metricas_riesgos_${sufijoPeriodo}.xlsx`
            );
            mostrarSnackbar(
                sinImagen ? "warning" : "success",
                sinImagen
                    ? "Excel generado, pero no se pudo incluir la imagen del gráfico."
                    : "Excel generado correctamente."
            );
        } catch (error) {
            console.error("Error al exportar métricas:", error);
            mostrarSnackbar("error", "No se pudo generar el archivo Excel.");
        } finally {
            setExportando(false);
        }
    };

    // === Render ===
    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Dashboard de métricas de riesgo
            </Typography>

            {/* Filtros */}
            <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="Direcciones"
                            fullWidth
                            size="small"
                            value={entidadesSeleccionadas}
                            onChange={(e) => {
                                const value = e.target.value;
                                const arr =
                                    typeof value === "string"
                                        ? value.split(",").map(Number)
                                        : value.map(Number);
                                setEntidadesSeleccionadas(arr);
                            }}
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) => {
                                    if (!selected.length) {
                                        return "Todas las direcciones";
                                    }

                                    return (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: 0.5,
                                            }}
                                        >
                                            {selected.map((value) => (
                                                <Chip
                                                    key={value}
                                                    label={getNombreEntidad(
                                                        value
                                                    )}
                                                    size="small"
                                                />
                                            ))}
                                        </Box>
                                    );
                                },
                            }}
                        >
                            {direcciones.length === 0 && (
                                <MenuItem disabled>
                                    No hay direcciones configuradas.
                                </MenuItem>
                            )}

                            {direcciones
                                .slice()
                                .sort((a, b) =>
                                    a.NOMBRE.localeCompare(b.NOMBRE, "es", {
                                        sensitivity: "base",
                                    })
                                )
                                .map((dir) => (
                                    <MenuItem
                                        key={dir.CODIGO_ENTIDAD}
                                        value={Number(dir.CODIGO_ENTIDAD)}
                                    >
                                        {getNombreEntidad(dir.CODIGO_ENTIDAD)}
                                    </MenuItem>
                                ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <TextField
                            select
                            label="Período"
                            fullWidth
                            size="small"
                            value={periodoSeleccionado}
                            onChange={(e) =>
                                setPeriodoSeleccionado(e.target.value)
                            }
                        >
                            <MenuItem value="">Todos los períodos</MenuItem>
                            {periodosDisponibles.map((p) => (
                                <MenuItem key={p} value={p}>
                                    {p}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Stack
                            direction="row"
                            spacing={2}
                            sx={{ height: "100%" }}
                            alignItems="center"
                            justifyContent="flex-end"
                        >
                            <Typography variant="body2" color="text.secondary">
                                {entidadesFiltradas.length
                                    ? `${entidadesFiltradas.length} dirección(es) filtrada(s)`
                                    : "Sin direcciones para mostrar"}
                            </Typography>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={exportando ? <CircularProgress size={16} color="inherit" /> : <FileDownloadRounded />}
                                onClick={exportarExcel}
                                disabled={loading || exportando || !entidadesFiltradas.length}
                            >
                                {exportando ? "Generando…" : "Exportar a Excel"}
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            {/* Loading */}
            {loading && (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 200,
                    }}
                >
                    <CircularProgress />
                </Box>
            )}

            {!loading && direcciones.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No hay direcciones configuradas.
                </Typography>
            )}

            {!loading && direcciones.length > 0 && (
                <>
                    {/* Resumen global */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={3}>
                            <Paper sx={{ p: 2 }} elevation={3}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                >
                                    Total de riesgos
                                </Typography>
                                <Typography
                                    variant="h5"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {resumenGlobal.totalRiesgos}
                                </Typography>
                                <Typography variant="caption">
                                    Suma de riesgos en las direcciones
                                    filtradas.
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                >
                                    Identificados en el período (no incluidos):{" "}
                                    {resumenGlobal.totalNuevos}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Paper sx={{ p: 2 }} elevation={3}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                >
                                    Direcciones con matriz de control interno y gobernanza (1ra matriz)
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {resumenGlobal.entidadesConPrimera} /{" "}
                                    {entidadesFiltradas.length || 0}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={
                                            entidadesFiltradas.length
                                                ? (resumenGlobal.entidadesConPrimera /
                                                    entidadesFiltradas.length) *
                                                100
                                                : 0
                                        }
                                    />
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Sin 1ra matriz:{" "}
                                    {resumenGlobal.direccionesSinPrimera}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Paper sx={{ p: 2 }} elevation={3}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                >
                                    Direcciones con matriz de evaluación de riesgos asociados al fraude y corrupción (2da matriz)
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {resumenGlobal.entidadesConSegunda} /{" "}
                                    {entidadesFiltradas.length || 0}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={
                                            entidadesFiltradas.length
                                                ? (resumenGlobal.entidadesConSegunda /
                                                    entidadesFiltradas.length) *
                                                100
                                                : 0
                                        }
                                    />
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Sin 2da matriz:{" "}
                                    {resumenGlobal.direccionesSinSegunda}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Paper sx={{ p: 2 }} elevation={3}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                >
                                    Meses con seguimiento (promedio)
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {resumenGlobal.promedioMesesSeguimiento.toFixed(
                                        1
                                    )}{" "}
                                    / 12
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={
                                            (resumenGlobal.promedioMesesSeguimiento /
                                                12) *
                                            100
                                        }
                                    />
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Direcciones sin riesgos:{" "}
                                    {resumenGlobal.direccionesSinRiesgos}
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Gráfico por tipo de objetivo */}
                    <Grid container spacing={2} sx={{ mb: 3 }} justifyContent="center">
                        <Grid item xs={12} md={6}>
                            <Paper
                                sx={{
                                    p: 2,
                                    height: 320,
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                                elevation={3}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{ mb: 1, fontWeight: 600 }}
                                >
                                    Distribución de riesgos por tipo de objetivo
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 1 }}
                                >
                                    Se muestran solo los riesgos que cumplen con
                                    los filtros de dirección y período.
                                </Typography>

                                {pieDataTipoObjetivo.length === 0 ? (
                                    <Box
                                        sx={{
                                            flex: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            No hay riesgos para graficar con los
                                            filtros actuales.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ flex: 1 }}>
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={pieDataTipoObjetivo}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    outerRadius={100}
                                                    label={(entry) =>
                                                        `${entry.name} (${entry.value})`
                                                    }
                                                >
                                                    {pieDataTipoObjetivo.map(
                                                        (entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={
                                                                    COLORS[
                                                                    index %
                                                                    COLORS.length
                                                                    ]
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    <Divider sx={{ mb: 2 }} />

                    {/* Tabla por dirección (TODAS las direcciones filtradas) */}
                    <Paper elevation={3}>
                        <Box sx={{ p: 2 }}>
                            <Typography
                                variant="subtitle1"
                                sx={{ mb: 1, fontWeight: 600 }}
                            >
                                Detalle por dirección
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 2 }}
                            >
                                Se listan todas las direcciones (según el
                                catálogo), mostrando si tienen riesgos,
                                primera/segunda matriz y cuántos riesgos
                                registrados tienen con los filtros actuales.
                            </Typography>

                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            <strong>Dirección</strong>
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>Cantidad de riesgos</strong>
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>Matriz CI/Gob.</strong>
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>Matriz Riesgos (F/C)</strong>
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>
                                                Meses con seguimiento
                                            </strong>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {entidadesFiltradas.map((cod) => {
                                        const metrics =
                                            getMetricsForEntidad(cod);
                                        const {
                                            totalRiesgos,
                                            tienePrimera,
                                            tieneSegunda,
                                            mesesConSeguimiento,
                                        } = metrics;

                                        return (
                                            <TableRow key={cod}>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {getNombreEntidad(cod)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {totalRiesgos}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    {tienePrimera ? (
                                                        <CheckCircleOutlineRounded
                                                            fontSize="small"
                                                            color="success"
                                                        />
                                                    ) : (
                                                        <CancelRounded
                                                            fontSize="small"
                                                            color="disabled"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {tieneSegunda ? (
                                                        <CheckCircleOutlineRounded
                                                            fontSize="small"
                                                            color="success"
                                                        />
                                                    ) : (
                                                        <CancelRounded
                                                            fontSize="small"
                                                            color="disabled"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ minWidth: 160 }}>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ mb: 0.5 }}
                                                            display="block"
                                                        >
                                                            {mesesConSeguimiento}{" "}
                                                            / 12 meses
                                                        </Typography>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={
                                                                (mesesConSeguimiento /
                                                                    12) *
                                                                100
                                                            }
                                                        />
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {entidadesFiltradas.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Typography
                                                    variant="body2"
                                                    align="center"
                                                    sx={{ py: 2 }}
                                                >
                                                    No hay direcciones para
                                                    mostrar con los filtros
                                                    actuales.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </Paper>
                </>
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default MetricasDashboard;
