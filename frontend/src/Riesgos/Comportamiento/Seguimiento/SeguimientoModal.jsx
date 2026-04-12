/**
 * @fileoverview
 * Modal para registrar y revisar seguimientos específicos de un control.
 *
 * @module Riesgos/Comportamiento/Seguimiento/SeguimientoModal.jsx
 * @version 1.1
 * @author Equipo de Desarrollo
 */

import { useEffect, useMemo, useState, memo, useCallback } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack,
    Divider, Table, TableHead, TableRow, TableBody, TableContainer, TableCell, Paper,
    TextField, RadioGroup, FormControlLabel, Radio, LinearProgress, Alert, useMediaQuery,
    Box, FormControl, InputLabel, Select, MenuItem, Tooltip, Snackbar
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    Document, Packer, Paragraph, TextRun,
    Table as DTable, TableRow as DTR, TableCell as DTC, WidthType, ShadingType,
    AlignmentType, Footer
} from "docx";
import { saveAs } from "file-saver";
import axios from "axios";

/**
 * Section
 *
 * Agrupa visualmente cada bloque lógico del formulario de seguimiento
 * (encabezado, mes, secciones 1–4) dentro del modal.
 *
 * - Renderiza un contenedor con título, subtítulo, borde y contenido interno.
 * - Permite marcar el bloque como deshabilitado, cambiando color de borde/fondo.
 *
 * @component
 * @param {string} props.title Título de la sección.
 * @param {string} [props.subtitle] Texto descriptivo bajo el título.
 * @param {React.ReactNode} props.children Contenido de la sección.
 * @param {boolean} [props.disabled=false] Si es true, aplica estilo “deshabilitado”.
 * @returns {JSX.Element}
 */
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
            {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
            <Divider />
            <Box sx={{ pt: 1 }}>{children}</Box>
        </Stack>
    </Box>
);


/**
 * EditableTextCell
 *
 * Editar texto multilinea dentro de una celda de tabla (acciones, resultados, etc.).
 *
 * - Renderiza un TextField controlado, optimizado con memo y useCallback
 *   para evitar renders innecesarios.
 *
 * @component
 * @param {string} props.value Valor actual del campo.
 * @param {string} [props.placeholder] Texto de ejemplo a mostrar.
 * @param {Function} props.onChange Callback al cambiar el valor.
 * @param {boolean} [props.disabled=false] Deshabilita la edición si es true.
 * @returns {JSX.Element}
 */
const EditableTextCell = memo(function EditableTextCell({ value, placeholder, onChange, disabled }) {
    const handle = useCallback((e) => onChange(e.target.value), [onChange]);
    return (
        <TextField
            size="small"
            fullWidth
            value={value ?? ""}
            onChange={handle}
            placeholder={placeholder ?? "—"}
            multiline
            minRows={2}
            autoComplete="off"
            disabled={disabled}
        />
    );
});

const MESES = [
    { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
    { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
];
const nombreMes = (n) => (MESES.find(m => String(m.value) === String(n))?.label ?? "");

/**
 * SeguimientoModal
 *
 * Gestionar la elaboración y edición del informe ejecutivo de seguimiento
 * de control interno y generar el documento Word.
 *
 * @component
 */
export default function SeguimientoModal({
    open,
    onClose,
    periodoSeleccionado,
    entidadNombre,
    filasBase = [],
    prefill = null,
}) {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
    const isEdit = Boolean(prefill);

    const [generando, setGenerando] = useState(false);
    const [mesSeleccionado, setMesSeleccionado] = useState("");
    const [baseRows, setBaseRows] = useState([]);

    // ---- Encabezado editable (también se envía/recibe de la BD)
    const [tituloInforme, setTituloInforme] = useState("INFORME EJECUTIVO DE SEGUIMIENTO DE CONTROL INTERNO");
    const [viceministerioHeader, setViceministerioHeader] = useState("");
    const [organoHeader, setOrganoHeader] = useState("");

    // Snackbar
    const [snack, setSnack] = useState({ open: false, message: "", severity: "error" });
    const openSnack = (message, severity = "error") => setSnack({ open: true, message, severity });
    const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

    useEffect(() => {
        if (open) {
            setBaseRows(Array.isArray(filasBase) ? filasBase : []);

            const firstWithV = (filasBase || []).find(r => (r?.Viceministerio ?? r?.VICEMINISTERIO)?.toString().trim());
            const firstWithO = (filasBase || []).find(r => (r?.Organo ?? r?.Órgano ?? r?.ORGANO)?.toString().trim());

            setTituloInforme((prev) => prev || "INFORME EJECUTIVO DE SEGUIMIENTO DE CONTROL INTERNO");
            setViceministerioHeader((firstWithV?.Viceministerio ?? firstWithV?.VICEMINISTERIO ?? "").toString());
            setOrganoHeader((firstWithO?.Organo ?? firstWithO?.Órgano ?? firstWithO?.ORGANO ?? "").toString());
        } else {
            setBaseRows([]);
            setTituloInforme("INFORME EJECUTIVO DE SEGUIMIENTO DE CONTROL INTERNO");
            setViceministerioHeader("");
            setOrganoHeader("");
        }
    }, [open, filasBase]);

    useEffect(() => {
        if (!open || !prefill) return;

        if (prefill.mes) setMesSeleccionado(String(prefill.mes));

        const t = prefill.subtitulo ?? null;
        const v = prefill.viceministerio ?? null;
        const o = prefill.organo ?? null;

        if (t != null) setTituloInforme(String(t));
        if (v != null) setViceministerioHeader(String(v));
        if (o != null) setOrganoHeader(String(o));
    }, [open, prefill]);

    /**
     * Agrupa las filas base por período de trabajo.
     */
    const gruposPorPeriodo = useMemo(() => {
        const map = new Map();
        for (const row of baseRows) {
            const per = Number(row?.Periodo ?? row?.CODIGO_PERIODO ?? row?.periodo ?? 0);
            if (!map.has(per)) map.set(per, []);
            map.get(per).push(row);
        }
        for (const arr of map.values()) {
            arr.sort((a, b) => {
                const ra = (a?.["Ref."] ?? a?.Ref ?? "").toString();
                const rb = (b?.["Ref."] ?? b?.Ref ?? "").toString();
                return ra.localeCompare(rb, "es", { numeric: true, sensitivity: "base" });
            });
        }
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    }, [baseRows]);

    // Estado editable
    const [accionesEditadas, setAccionesEditadas] = useState({});
    const setEditable = (key, campo, valor) =>
        setAccionesEditadas((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [campo]: valor } }));

    const [estatusPeriodo, setEstatusPeriodo] = useState({});
    const [resultadosPrincipales, setResultadosPrincipales] = useState({});

    const setResultado = (key, valor) => setResultadosPrincipales((prev) => ({ ...prev, [key]: valor }));

    const [accionesRealizadas, setAccionesRealizadas] = useState(true);
    const [justificacion, setJustificacion] = useState("");

    // Reset al cerrar
    useEffect(() => {
        if (!open) {
            setMesSeleccionado("");
            setAccionesEditadas({});
            setEstatusPeriodo({});
            setResultadosPrincipales({});
            setAccionesRealizadas(true);
            setJustificacion("");
            setGenerando(false);
            setSnack({ open: false, message: "", severity: "error" });
        }
    }, [open]);

    // Prefill de edición para secciones
    useEffect(() => {
        if (!open || !prefill) return;

        if (Array.isArray(prefill.seccion3)) {
            const ep = {};
            const resP = {};
            for (const bloque of prefill.seccion3) {
                const per = Number(bloque.periodo);
                if (per) ep[per] = bloque.estatus || "";
                if (Array.isArray(bloque.resultados)) {
                    for (const r of bloque.resultados) {
                        const key = `${per}#${r?.codigo_entidad ?? "ent"}#${r?.codigo_riesgo ?? ""}#${r?.ref ?? "ref"}`;
                        resP[key] = r?.resultados_principales ?? "";
                    }
                }
            }
            setEstatusPeriodo(ep);
            setResultadosPrincipales(resP);
        }

        if (Array.isArray(prefill.seccion2)) {
            const map = {};
            for (const r of prefill.seccion2) {
                const per = Number(r?.periodo ?? periodoSeleccionado);
                const key = `${per}#${r?.codigo_entidad ?? "ent"}#${r?.codigo_riesgo ?? ""}#${r?.ref ?? "ref"}`;
                map[key] = {
                    control: r?.control_interno ?? "",
                    metodo: r?.metodo_monitoreo ?? "",
                    frecuencia: r?.frecuencia ?? "",
                };
            }
            setAccionesEditadas(map);
        }

        if (prefill.seccion4) {
            setAccionesRealizadas(Boolean(prefill.seccion4.acciones_realizadas));
            setJustificacion(prefill.seccion4.justificacion ?? "");
        }
    }, [open, prefill, periodoSeleccionado]);

    const edicionHabilitada = Boolean(mesSeleccionado);

    const buildHeaderRow = (titles) =>
        new DTR({
            tableHeader: true,
            children: titles.map(
                (t) =>
                    new DTC({
                        children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF" })] })],
                        shading: { type: ShadingType.SOLID, color: "2E4A66", fill: "2E4A66" },
                    })
            ),
        });

    const cell = (text, opts = {}) =>
        new DTC({
            children: [new Paragraph(String(text ?? "—"))],
            ...opts,
        });

    const buildTablaPaso1Docx = (per, rows) => {
        const head = buildHeaderRow(["Ref.", "Descripción", "Tolerancia", "Severidad (narración)", "Control interno", "Método de monitoreo", "Frecuencia"]);
        const body = rows.map((r) =>
            new DTR({
                children: [
                    cell(r?.["Ref."] ?? r?.Ref),
                    cell(r?.["Descripción del riesgo"] ?? r?.Descripcion ?? r?.descripcion),
                    cell(r?.["Tolerancia"] ?? r?.Tolerancia),
                    cell(r?.["Severidad (narración)"] ?? r?.["Severidad (narracion)"] ?? r?.severidad_narracion),
                    cell(r?.["Control interno para mitigar"]),
                    cell(r?.["Método de monitoreo"] ?? r?.["Metodo de monitoreo"] ?? r?.metodo_monitoreo),
                    cell(r?.["Frecuencia"] ?? r?.Frecuencia),
                ],
            })
        );
        return [
            new Paragraph({ text: `Período del 1 de enero al 31 de diciembre de ${per}`, bold: true }),
            new DTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...body] }),
            new Paragraph({ text: "" }),
        ];
    };

    const buildTablaPaso2Docx = (per, rows) => {
        const head = buildHeaderRow(["Ref.", "Descripción", "Control interno", "Método de monitoreo", "Frecuencia"]);
        const body = rows.map((r, i) => {
            const keyStable = `${per}#${r?.CODIGO_ENTIDAD ?? r?.codigo_entidad ?? "ent"}#${r?.CODIGO_RIESGO ?? r?.codigo_riesgo ?? i}#${r?.["Ref."] ?? r?.Ref ?? "ref"}`;
            const cur = accionesEditadas[keyStable] || {};
            return new DTR({
                children: [
                    cell(r?.["Ref."] ?? r?.Ref),
                    cell(r?.["Descripción del riesgo"] ?? r?.Descripcion ?? r?.descripcion),
                    cell(cur.control ?? ""),
                    cell(cur.metodo ?? ""),
                    cell(cur.frecuencia ?? ""),
                ],
            });
        });
        return [
            new Paragraph({ text: `Acciones mitigadoras realizadas — ${per}`, bold: true }),
            new DTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...body] }),
            new Paragraph({ text: "" }),
        ];
    };

    const buildTablaEstatusDocx = (per) => {
        const head = buildHeaderRow(["Estatus", "Coloque ✓", "Criterio"]);
        const selected = estatusPeriodo[per] ?? "";
        const row = (labelText, shadeHex, criterio) =>
            new DTR({
                children: [
                    new DTC({
                        children: [new Paragraph({ children: [new TextRun({ text: labelText, bold: true, color: "FFFFFF" })] })],
                        shading: { type: ShadingType.SOLID, color: shadeHex.replace("#", ""), fill: shadeHex.replace("#", "") },
                    }),
                    cell(selected === labelText.split(" ")[0] || selected === labelText ? "✓" : ""),
                    cell(criterio),
                ],
            });
        return [
            new Paragraph({ children: [new TextRun({ text: `Estatus del seguimiento y monitoreo — Período del 1 de enero al 31 de diciembre de ${per}`, bold: true })] }),
            new DTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    head,
                    row("Pendiente", "#F44336", "No muestra evidencia de gestión del control interno. Debe observar cumplir con método y frecuencia propuestos."),
                    row("Ejecución", "#FF9800", "Control interno con avance en la implementación. Supervisión y monitoreo en curso."),
                    row("Cumple", "#4CAF50", "Acciones implementadas al 100% según lo propuesto para mitigar el riesgo."),
                ],
            }),
            new Paragraph({ text: "" }),
        ];
    };

    const buildResultadosPrincipalesDocx = (per, rows) => {
        const head = buildHeaderRow(["Ref.", "Descripción", "Resultados principales"]);
        const body = rows.map((r, i) => {
            const keyStable = `${per}#${r?.CODIGO_ENTIDAD ?? r?.codigo_entidad ?? "ent"}#${r?.CODIGO_RIESGO ?? r?.codigo_riesgo ?? i}#${r?.["Ref."] ?? r?.Ref ?? "ref"}`;
            return new DTR({
                children: [
                    cell(r?.["Ref."] ?? r?.Ref),
                    cell(r?.["Descripción del riesgo"] ?? r?.Descripcion ?? r?.descripcion),
                    cell(resultadosPrincipales[keyStable] ?? ""),
                ],
            });
        });
        return [
            new Paragraph({ text: `Resultados principales del período del 1 de enero al 31 de diciembre de ${per}`, bold: true }),
            new DTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...body] }),
            new Paragraph({ text: "" }),
        ];
    };

    const buildAjustesDocx = () => [
        new Paragraph({ text: "Ajustes a los mitigadores propuestos", bold: true }),
        new Paragraph({
            text: accionesRealizadas
                ? "Se registraron acciones durante el período. No se requieren ajustes declarados."
                : `No se registraron acciones. Justificación y pasos a seguir: ${justificacion || "(sin información)"}`,
        }),
    ];

    const mapFilaBase = (per, r) => ({
        objetivo: r?.["Objetivo"] ?? r?.Objetivo ?? "",
        periodo: per,
        codigo_riesgo: r?.CODIGO_RIESGO ?? null,
        codigo_entidad: r?.CODIGO_ENTIDAD ?? null,
        ref: r?.["Ref."] ?? r?.Ref ?? "",
        descripcion: r?.["Descripción del riesgo"] ?? r?.Descripcion ?? r?.descripcion ?? "",
        tolerancia: r?.["Tolerancia"] ?? r?.Tolerancia ?? "",
        severidad_narracion: r?.["Severidad (narración)"] ?? r?.["Severidad (narracion)"] ?? r?.severidad_narracion ?? "",
        control_interno: r?.["Control interno para mitigar"] ?? r?.control_interno ?? "",
        metodo_monitoreo: r?.["Método de monitoreo"] ?? r?.["Metodo de monitoreo"] ?? r?.metodo_monitoreo ?? "",
        frecuencia: r?.["Frecuencia"] ?? r?.Frecuencia ?? "",
        viceministerio: r?.["Viceministerio"] ?? r?.Viceministerio ?? "",
        organo: r?.["Organo"] ?? r?.Órgano ?? r?.Organo ?? "",
        responsable: r?.["Responsable"] ?? r?.Responsable ?? "",
    });

    const buildPayload = () => {
        const seccion1 = gruposPorPeriodo.flatMap(([per, rows]) => rows.map((r) => mapFilaBase(per, r)));

        const seccion2 = gruposPorPeriodo.flatMap(([per, rows]) =>
            rows.map((r, i) => {
                const keyStable = `${per}#${r?.CODIGO_ENTIDAD ?? "ent"}#${r?.CODIGO_RIESGO ?? i}#${r?.["Ref."] ?? "ref"}`;
                const cur = accionesEditadas[keyStable] || {};
                const base = mapFilaBase(per, r);
                return {
                    ...base,
                    control_interno: cur.control ?? "",
                    metodo_monitoreo: cur.metodo ?? "",
                    frecuencia: cur.frecuencia ?? "",
                };
            })
        );

        const seccion3 = gruposPorPeriodo.map(([per, rows]) => ({
            periodo: per,
            estatus: estatusPeriodo[per] ?? "",
            resultados: rows.map((r, i) => {
                const keyStable = `${per}#${r?.CODIGO_ENTIDAD ?? "ent"}#${r?.CODIGO_RIESGO ?? i}#${r?.["Ref."] ?? "ref"}`;
                return {
                    codigo_riesgo: r?.CODIGO_RIESGO ?? null,
                    codigo_entidad: r?.CODIGO_ENTIDAD ?? null,
                    ref: r?.["Ref."] ?? r?.Ref ?? "",
                    descripcion: r?.["Descripción del riesgo"] ?? r?.Descripcion ?? r?.descripcion ?? "",
                    resultados_principales: resultadosPrincipales[keyStable] ?? "",
                    responsable: r?.["Responsable"] ?? r?.Responsable ?? "",
                };
            }),
        }));

        const seccion4 = {
            acciones_realizadas: Boolean(accionesRealizadas),
            justificacion: justificacion ?? "",
        };

        return {
            mes: Number(mesSeleccionado),
            seccion1,
            seccion2,
            seccion3,
            seccion4,
            entidad: entidadNombre ?? "",
            periodo_trabajo: periodoSeleccionado ?? "",
            titulo_informe: tituloInforme,
            viceministerio_encabezado: viceministerioHeader,
            organo_encabezado: organoHeader,
        };
    };

    const generarDOCX = async () => {
        const portadaChildren = [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: organoHeader || "", bold: true, size: 28 })],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: viceministerioHeader || "", bold: true, size: 24 })],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: (tituloInforme || "INFORME EJECUTIVO DE SEGUIMIENTO DE CONTROL INTERNO"), bold: true, size: 36 })],
            }),
        ];

        const mesTxt = nombreMes(mesSeleccionado);
        const periodoTxt = String(periodoSeleccionado ?? "");

        const portadaSection = {
            properties: {},
            children: portadaChildren,
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: `${mesTxt} ${periodoTxt}` })],
                        }),
                    ],
                }),
            },
        };

        const contenidoChildren = [
            new Paragraph({ text: entidadNombre ?? "" }),
            new Paragraph({ text: `Período de trabajo: ${periodoTxt}` }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "1. Riesgos reportados para mitigar", bold: true }),
            ...gruposPorPeriodo.flatMap(([per, rows]) => buildTablaPaso1Docx(per, rows)),

            new Paragraph({ text: "2. Acciones mitigadoras realizadas", bold: true }),
            ...gruposPorPeriodo.flatMap(([per, rows]) => buildTablaPaso2Docx(per, rows)),

            new Paragraph({ text: "3. Seguimiento y continuidad", bold: true }),
            ...gruposPorPeriodo.flatMap(([per, rows]) => [
                ...buildTablaEstatusDocx(per),
                ...buildResultadosPrincipalesDocx(per, rows),
            ]),

            ...buildAjustesDocx(),
        ];

        const contenidoSection = { properties: {}, children: contenidoChildren };

        const doc = new Document({
            sections: [portadaSection, contenidoSection],
        });

        const blob = await Packer.toBlob(doc);
        const nombreArchivo = `Seguimiento_${(entidadNombre || "Entidad").replace(/\s+/g, "_")}_${periodoTxt}.docx`;
        saveAs(blob, nombreArchivo);
    };

    /* ================== Validaciones comunes ================== */
    const validar = () => {
        if (!mesSeleccionado) {
            openSnack("Debe seleccionar un mes para guardar la información.", "warning");
            return false;
        }
        if (!accionesRealizadas && !justificacion.trim()) {
            openSnack(
                "Debe ingresar la justificación en 'Ajustes' o marcar que sí se realizaron acciones.",
                "warning"
            );
            return false;
        }
        const token = localStorage.getItem("token");
        if (!token) {
            openSnack("No se encontró token de autenticación. Vuelva a iniciar sesión.", "error");
            return false;
        }
        return true;
    };

    /* ================== Crear (POST + DOCX) ================== */
    const handleFinalizarCrear = async () => {
        if (!validar()) return;
        try {
            setGenerando(true);
            const payload = buildPayload();
            await axios.post("/api/seguimientos-actualizados", payload, {
                headers: {
                    "Content-Type": "application/json",
                    "x-access-token": localStorage.getItem("token"),
                },
            });
            await generarDOCX();
            openSnack("Seguimiento creado y documento generado correctamente.", "success");
            onClose?.();
        } catch (e) {
            console.error(e);
            if (e?.response?.status === 409) {
                const msg = e?.response?.data?.message || "Ya existe un seguimiento para ese período y mes. No se sobreescribió.";
                openSnack(msg, "error");
            } else {
                const msg = e?.response?.data?.message || e?.message || "Error desconocido al guardar/generar.";
                openSnack(msg, "error");
            }
        } finally {
            setGenerando(false);
        }
    };

    /* ================== Editar (PUT) ================== */
    const handleGuardarCambios = async () => {
        if (!validar()) return;
        try {
            setGenerando(true);
            const payload = buildPayload();
            await axios.put("/api/seguimientos-actualizados", payload, {
                headers: {
                    "Content-Type": "application/json",
                    "x-access-token": localStorage.getItem("token"),
                },
            });
            openSnack("Cambios guardados correctamente.", "success");
            onClose?.();
        } catch (e) {
            console.error(e);
            const msg = e?.response?.data?.message || e?.message || "Error desconocido";
            openSnack(msg, "error");
        } finally {
            setGenerando(false);
        }
    };

    /* ================== Editar: solo DOCX ================== */
    const handleGenerarWordSolo = async () => {
        try {
            setGenerando(true);
            await generarDOCX();
            openSnack("Documento generado correctamente.", "success");
        } catch (e) {
            console.error(e);
            openSnack("Ocurrió un error al generar el documento.", "error");
        } finally {
            setGenerando(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" keepMounted>
            <DialogTitle>Documento de seguimiento — {entidadNombre}</DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                            Período seleccionado: <strong>{periodoSeleccionado ?? "—"}</strong>
                        </Typography>
                    </Stack>

                    {/* ------ Encabezado del informe  ------ */}
                    <Section title="Encabezado del informe" subtitle="Estos datos se usarán en la primera hoja del documento y se guardarán.">
                        <Stack spacing={2}>
                            <TextField
                                label="Título del informe"
                                value={tituloInforme}
                                onChange={(e) => setTituloInforme(e.target.value)}
                                fullWidth
                                size="small"
                            />
                            <Stack direction={isMdUp ? "row" : "column"} spacing={2}>
                                <TextField
                                    label="Viceministerio"
                                    value={viceministerioHeader}
                                    onChange={(e) => setViceministerioHeader(e.target.value)}
                                    fullWidth
                                    size="small"
                                />
                                <TextField
                                    label="Órgano"
                                    value={organoHeader}
                                    onChange={(e) => setOrganoHeader(e.target.value)}
                                    fullWidth
                                    size="small"
                                />
                            </Stack>
                        </Stack>
                    </Section>

                    <Section
                        title="Mes de seguimiento"
                        subtitle="Seleccione el mes al que corresponde la información que se registrará."
                    >
                        <Stack direction={isMdUp ? "row" : "column"} spacing={2} alignItems="center">
                            <FormControl size="small" sx={{ minWidth: 220 }}>
                                <InputLabel id="mes-seguimiento-label">Mes</InputLabel>
                                <Select
                                    labelId="mes-seguimiento-label"
                                    label="Mes"
                                    value={mesSeleccionado}
                                    onChange={(e) => setMesSeleccionado(e.target.value)}
                                    disabled={isEdit}
                                >
                                    {MESES.map((m) => (
                                        <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {!mesSeleccionado && (
                                <Alert severity="info" sx={{ flex: 1 }}>
                                    Debe seleccionar un mes para habilitar la edición de las secciones.
                                </Alert>
                            )}
                        </Stack>
                    </Section>

                    {/* Sección 1 */}
                    <Section
                        title="1. Riesgos reportados para mitigar"
                        subtitle="Listado de riesgos, tal como fueron definidos en la matriz de continuidad y monitoreo."
                        disabled={!Boolean(mesSeleccionado)}
                    >
                        <Stack spacing={3}>
                            {gruposPorPeriodo.length === 0 && <Alert severity="info">No hay información para mostrar.</Alert>}
                            {gruposPorPeriodo.map(([per, rows]) => (
                                <Stack key={`p1-${per}`} spacing={1}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Período {per}</Typography>
                                    <TableContainer component={Paper}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>Ref.</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Tolerancia</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Severidad (narración)</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Control interno</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Método de monitoreo</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Frecuencia</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {rows.map((row, i) => {
                                                    const keyRow = `${per}#${row?.CODIGO_ENTIDAD ?? "ent"}#${row?.CODIGO_RIESGO ?? i}#${row?.["Ref."] ?? "ref"}`;
                                                    return (
                                                        <TableRow key={keyRow} hover>
                                                            <TableCell>{row?.["Ref."] ?? "—"}</TableCell>
                                                            <TableCell>{row?.["Descripción del riesgo"] ?? "—"}</TableCell>
                                                            <TableCell>{row?.["Tolerancia"] ?? "—"}</TableCell>
                                                            <TableCell>{row?.["Severidad (narración)"] ?? "—"}</TableCell>
                                                            <TableCell>{row?.["Control interno para mitigar"] ?? "—"}</TableCell>
                                                            <TableCell>{row?.["Método de monitoreo"] ?? "—"}</TableCell>
                                                            <TableCell>{row?.["Frecuencia"] ?? "—"}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Divider />
                                </Stack>
                            ))}
                        </Stack>
                    </Section>

                    {/* Sección 2 */}
                    <Section
                        title="2. Acciones mitigadoras realizadas"
                        subtitle="Describa lo ejecutado en el mes seleccionado: ajustes a controles, métodos de monitoreo y frecuencias."
                        disabled={!Boolean(mesSeleccionado)}
                    >
                        <Stack spacing={3}>
                            {gruposPorPeriodo.map(([per, rows]) => (
                                <Stack key={`p2-${per}`} spacing={1}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Acciones — {per}</Typography>
                                    <TableContainer component={Paper}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>Ref.</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, width: 175 }}>Descripción</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, width: 350 }}>Control interno</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, width: 350 }}>Método de monitoreo</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, width: 350 }}>Frecuencia</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {rows.map((row, i) => {
                                                    const keyStable = `${per}#${row?.CODIGO_ENTIDAD ?? "ent"}#${row?.CODIGO_RIESGO ?? i}#${row?.["Ref."] ?? "ref"}`;
                                                    const cur = accionesEditadas[keyStable] || {};
                                                    return (
                                                        <TableRow key={keyStable} hover>
                                                            <TableCell>{row?.["Ref."] ?? "—"}</TableCell>
                                                            <TableCell>{row?.["Descripción del riesgo"] ?? "—"}</TableCell>
                                                            <TableCell>
                                                                <EditableTextCell
                                                                    disabled={!Boolean(mesSeleccionado)}
                                                                    value={cur.control}
                                                                    placeholder={row?.["Control interno para mitigar"]}
                                                                    onChange={(v) => setEditable(keyStable, "control", v)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <EditableTextCell
                                                                    disabled={!Boolean(mesSeleccionado)}
                                                                    value={cur.metodo}
                                                                    placeholder={row?.["Método de monitoreo"]}
                                                                    onChange={(v) => setEditable(keyStable, "metodo", v)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <EditableTextCell
                                                                    disabled={!Boolean(mesSeleccionado)}
                                                                    value={cur.frecuencia}
                                                                    placeholder={row?.["Frecuencia"]}
                                                                    onChange={(v) => setEditable(keyStable, "frecuencia", v)}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Divider />
                                </Stack>
                            ))}
                        </Stack>
                    </Section>

                    {/* Sección 3 */}
                    <Section
                        title="3. Seguimiento y continuidad"
                        subtitle="Marque el estatus del control interno por período y documente los resultados principales del mes."
                        disabled={!Boolean(mesSeleccionado)}
                    >
                        <Stack spacing={3}>
                            {gruposPorPeriodo.map(([per, rows]) => (
                                <Stack key={`p3-${per}`} spacing={1}>
                                    <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 800 }}>
                                        Estatus — Período del 1 de enero al 31 de diciembre de {per}
                                    </Typography>

                                    <TableContainer component={Paper}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ background: "#2e4a66" }}>
                                                    <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Estatus</TableCell>
                                                    <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Coloque ✓</TableCell>
                                                    <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Criterio</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {[
                                                    { label: "Pendiente", color: "#f44336", criterio: "No muestra evidencia de gestión del control interno. Debe observar cumplir con el método de monitoreo y frecuencia propuestos." },
                                                    { label: "Ejecución", color: "#ff9800", criterio: "Control interno con avance en la implementación de medidas. Supervisión y monitoreo en curso." },
                                                    { label: "Cumple", color: "#4caf50", criterio: "Control interno con acciones implementadas al 100% según lo propuesto para mitigar el riesgo." },
                                                ].map((opt) => (
                                                    <TableRow key={`${per}-${opt.label}`}>
                                                        <TableCell sx={{ fontWeight: 700, width: 200 }}>
                                                            <span style={{ display: "inline-block", padding: "4px 8px", background: opt.color, color: "#fff", borderRadius: 4 }}>
                                                                {opt.label}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell sx={{ width: 140 }}>
                                                            <RadioGroup
                                                                row
                                                                value={estatusPeriodo[per] ?? ""}
                                                                onChange={(e) => setEstatusPeriodo((prev) => ({ ...prev, [per]: e.target.value }))}
                                                            >
                                                                <FormControlLabel value={opt.label.split(" ")[0]} control={<Radio />} label="" disabled={!Boolean(mesSeleccionado)} />
                                                            </RadioGroup>
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
                                    <TableContainer component={Paper}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>Ref.</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, width: 750 }}>Resultados principales</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {rows.map((row, i) => {
                                                    const keyStable = `${per}#${row?.CODIGO_ENTIDAD ?? "ent"}#${row?.CODIGO_RIESGO ?? i}#${row?.["Ref."] ?? "ref"}`;
                                                    return (
                                                        <TableRow key={keyStable} hover>
                                                            <TableCell>{row?.["Ref."] ?? "—"}</TableCell>
                                                            <TableCell>{row?.["Descripción del riesgo"] ?? "—"}</TableCell>
                                                            <TableCell>
                                                                <EditableTextCell
                                                                    disabled={!Boolean(mesSeleccionado)}
                                                                    value={resultadosPrincipales[keyStable]}
                                                                    placeholder="Escriba los resultados principales…"
                                                                    onChange={(v) => setResultado(keyStable, v)}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    <Divider />
                                </Stack>
                            ))}
                        </Stack>
                    </Section>

                    {/* Sección 4 */}
                    <Section
                        title="4. Ajustes a mitigadores"
                        subtitle="Indique si se realizaron acciones durante el mes; si no, justifique y describa pasos a seguir."
                        disabled={!Boolean(mesSeleccionado)}
                    >
                        <Stack spacing={2}>
                            <Typography>
                                <strong>Instrucciones:</strong> Si no se ha realizado ninguna acción, indíquelo y brinde una justificación clara y concisa,
                                indicando pasos a seguir para ajustar las medidas de gravedad y reflejar la efectividad de los mitigadores propuestos.
                            </Typography>
                            <RadioGroup
                                row
                                value={accionesRealizadas ? "si" : "no"}
                                onChange={(e) => {
                                    const v = e.target.value === "si";
                                    setAccionesRealizadas(v);
                                    if (v) setJustificacion("");
                                }}
                            >
                                <FormControlLabel value="si" control={<Radio />} label="Sí se realizaron acciones" disabled={!Boolean(mesSeleccionado)} />
                                <FormControlLabel value="no" control={<Radio />} label="No se realizaron acciones" disabled={!Boolean(mesSeleccionado)} />
                            </RadioGroup>
                            {!accionesRealizadas && (
                                <TextField
                                    label="Justificación y pasos a seguir"
                                    placeholder="Explique por qué no se realizaron acciones y los pasos a seguir…"
                                    fullWidth multiline minRows={4}
                                    value={justificacion}
                                    onChange={(e) => setJustificacion(e.target.value)}
                                    disabled={!Boolean(mesSeleccionado)}
                                />
                            )}
                        </Stack>
                    </Section>

                    {generando && <LinearProgress />}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={generando}>Cancelar</Button>

                {!isEdit ? (
                    <Tooltip title={!mesSeleccionado ? "Seleccione un mes para habilitar la generación" : ""} arrow disableHoverListener={!!mesSeleccionado}>
                        <span>
                            <Button
                                variant="contained"
                                onClick={handleFinalizarCrear}
                                disabled={generando || !mesSeleccionado || (!accionesRealizadas && !justificacion.trim())}
                            >
                                Finalizar y generar Word
                            </Button>
                        </span>
                    </Tooltip>
                ) : (
                    <>
                        <Tooltip title={!mesSeleccionado ? "Mes no válido" : "Guardar sin generar documento"} arrow disableHoverListener={!!mesSeleccionado}>
                            <span>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleGuardarCambios}
                                    disabled={generando || !mesSeleccionado || (!accionesRealizadas && !justificacion.trim())}
                                >
                                    Guardar cambios
                                </Button>
                            </span>
                        </Tooltip>
                        <Button
                            variant="outlined"
                            onClick={handleGenerarWordSolo}
                            disabled={generando}
                        >
                            Generar Word
                        </Button>
                    </>
                )}
            </DialogActions>

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
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
