/**
 * @fileoverview
 * Modal para registrar y revisar seguimientos específicos de control interno.
 *
 * Ajustado para:
 * - Agrupar por período raíz / "se arrastra desde".
 * - Tomar la información operativa del año anterior inmediato o del riesgo actual si es nuevo.
 * - Conservar trazabilidad: período seleccionado, período información y período raíz.
 * - Leer seguimientos antiguos guardados sin periodo_raiz / periodo_informacion / codigo_riesgo_seleccionado.
 *
 * @module Riesgos/Comportamiento/Seguimiento/SeguimientoModal.jsx
 * @version 1.4
 */

import { useEffect, useMemo, useState, memo, useCallback } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Stack,
    Divider,
    Table,
    TableHead,
    TableRow,
    TableBody,
    TableContainer,
    TableCell,
    Paper,
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    LinearProgress,
    Alert,
    useMediaQuery,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip,
    Snackbar,
    Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table as DTable,
    TableRow as DTR,
    TableCell as DTC,
    WidthType,
    ShadingType,
    AlignmentType,
    Footer,
} from "docx";
import { saveAs } from "file-saver";
import apiClient from "api/apiClient";

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
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {title}
            </Typography>

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

const EditableTextCell = memo(function EditableTextCell({
    value,
    placeholder,
    onChange,
    disabled,
}) {
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
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
];

const nombreMes = (n) => MESES.find((m) => String(m.value) === String(n))?.label ?? "";

const getCampo = (row, keys = [], fallback = "") => {
    for (const key of keys) {
        const value = row?.[key];

        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }

    return fallback;
};

const getNumeroCampo = (row, keys = [], fallback = null) => {
    const value = getCampo(row, keys, fallback);

    if (value === null || value === undefined || value === "") {
        return fallback;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
};

const getPeriodoSeleccionadoFila = (row, fallback = null) =>
    getNumeroCampo(
        row,
        [
            "Periodo seleccionado",
            "periodo_seleccionado",
            "PERIODO_SELECCIONADO",
        ],
        fallback
    );

const getRiesgoSeleccionadoFila = (row, fallback = null) =>
    getNumeroCampo(
        row,
        [
            "Riesgo seleccionado",
            "riesgo_seleccionado",
            "RIESGO_SELECCIONADO",
            "codigo_riesgo_seleccionado",
            "CODIGO_RIESGO_SELECCIONADO",
            "codigo_riesgo",
            "CODIGO_RIESGO",
        ],
        fallback
    );

const getPeriodoInformacion = (row, fallback = null) =>
    getNumeroCampo(
        row,
        [
            "Periodo información",
            "periodo_informacion",
            "PERIODO_INFORMACION",
            "Periodo",
            "periodo",
            "CODIGO_PERIODO",
        ],
        fallback
    );

const getRiesgoInformacionFila = (row, fallback = null) =>
    getNumeroCampo(
        row,
        [
            "Riesgo información",
            "riesgo_informacion",
            "RIESGO_INFORMACION",
            "codigo_riesgo_informacion",
            "CODIGO_RIESGO_INFORMACION",
            "CODIGO_RIESGO",
            "codigo_riesgo",
        ],
        fallback
    );

const getPeriodoRaiz = (row, fallback = null) =>
    getNumeroCampo(
        row,
        [
            "Periodo raíz",
            "periodo_raiz",
            "PERIODO_RAIZ",
        ],
        fallback
    );

const getRiesgoRaiz = (row, fallback = null) =>
    getNumeroCampo(
        row,
        [
            "Riesgo raíz",
            "riesgo_raiz",
            "RIESGO_RAIZ",
        ],
        fallback
    );

const getAniosArrastre = (row, fallback = null) =>
    getNumeroCampo(
        row,
        [
            "Años de arrastre",
            "anios_arrastre",
            "ANIOS_ARRASTRE",
        ],
        fallback
    );

const getCodigoEntidad = (row) =>
    getCampo(
        row,
        [
            "CODIGO_ENTIDAD",
            "codigo_entidad",
        ],
        "ent"
    );

const getObjetivo = (row) =>
    getCampo(row, ["Objetivo", "OBJETIVO", "objetivo"], "");

const getRef = (row) =>
    getCampo(row, ["Ref.", "Ref", "REF", "ref"], "");

const getDescripcion = (row) =>
    getCampo(
        row,
        [
            "Descripción del riesgo",
            "Descripcion",
            "DESCRIPCION",
            "descripcion",
        ],
        ""
    );

const getTolerancia = (row) =>
    getCampo(row, ["Tolerancia", "TOLERANCIA", "tolerancia"], "");

const getSeveridadNarracion = (row) =>
    getCampo(
        row,
        [
            "Severidad(narración)",
            "Severidad (narración)",
            "Severidad (narracion)",
            "severidad_narracion",
            "SEVERIDAD_NARRACION",
        ],
        ""
    );

const getControlInterno = (row) =>
    getCampo(
        row,
        [
            "Control interno para mitigar",
            "control_interno",
            "CONTROL_INTERNO",
        ],
        ""
    );

const getMetodoMonitoreo = (row) =>
    getCampo(
        row,
        [
            "Método de monitoreo",
            "Metodo de monitoreo",
            "metodo_monitoreo",
            "METODO_MONITOREO",
        ],
        ""
    );

const getFrecuencia = (row) =>
    getCampo(row, ["Frecuencia", "FRECUENCIA", "frecuencia"], "");

const getResponsable = (row) =>
    getCampo(row, ["Responsable", "RESPONSABLE", "responsable"], "");

const getViceministerio = (row) =>
    getCampo(row, ["Viceministerio", "VICEMINISTERIO", "viceministerio"], "");

const getOrgano = (row) =>
    getCampo(row, ["Organo", "Órgano", "ORGANO", "organo"], "");

const getRefRaiz = (row) =>
    getCampo(row, ["Ref. raíz", "ref_raiz", "REF_RAIZ"], "");

const getDescripcionRaiz = (row) =>
    getCampo(row, ["Descripción raíz", "descripcion_raiz", "DESCRIPCION_RAIZ"], "");

const getOrigenInformacion = (row) =>
    getCampo(row, ["Origen información", "origen_informacion", "ORIGEN_INFORMACION"], "");

const getKeyFilaSeguimiento = (row, index = 0, periodoActual = null) => {
    const periodoSeleccionado = getPeriodoSeleccionadoFila(row, periodoActual);
    const periodoInformacion = getPeriodoInformacion(row, periodoSeleccionado);
    const periodoRaiz = getPeriodoRaiz(row, periodoInformacion);
    const riesgoSeleccionado = getRiesgoSeleccionadoFila(row, index);
    const riesgoInformacion = getRiesgoInformacionFila(row, riesgoSeleccionado);
    const codigoEntidad = getCodigoEntidad(row);
    const ref = getRef(row) || "ref";

    return [
        periodoRaiz ?? "periodo-raiz",
        periodoSeleccionado ?? "periodo-seleccionado",
        codigoEntidad ?? "ent",
        riesgoSeleccionado ?? index,
        periodoInformacion ?? "periodo-info",
        riesgoInformacion ?? "riesgo-info",
        ref,
    ].join("#");
};

const normalizarFilaGuardada = (row, periodoActual = null) => {
    const periodoBase = getPeriodoInformacion(row, null);
    const periodoRaiz = getPeriodoRaiz(row, periodoBase ?? periodoActual);
    const periodoSeleccionado = getPeriodoSeleccionadoFila(row, periodoActual);

    const codigoRiesgo = getRiesgoSeleccionadoFila(row, null);
    const codigoRiesgoInformacion = getRiesgoInformacionFila(row, codigoRiesgo);

    return {
        ...row,

        periodo: periodoRaiz ?? periodoBase ?? periodoActual,
        periodo_raiz: periodoRaiz ?? periodoBase ?? periodoActual,
        periodo_seleccionado: periodoSeleccionado ?? periodoActual,
        periodo_informacion: periodoBase ?? periodoRaiz ?? periodoActual,

        codigo_riesgo: codigoRiesgo,
        codigo_riesgo_seleccionado: row?.codigo_riesgo_seleccionado ?? row?.["Riesgo seleccionado"] ?? codigoRiesgo,
        codigo_riesgo_informacion: row?.codigo_riesgo_informacion ?? row?.["Riesgo información"] ?? codigoRiesgoInformacion,

        riesgo_raiz: row?.riesgo_raiz ?? row?.["Riesgo raíz"] ?? codigoRiesgo,
        ref_raiz: row?.ref_raiz ?? row?.["Ref. raíz"] ?? getRef(row),
        descripcion_raiz: row?.descripcion_raiz ?? row?.["Descripción raíz"] ?? getDescripcion(row),
        origen_informacion: row?.origen_informacion ?? row?.["Origen información"] ?? "FORMATO_ANTERIOR",
    };
};

const getLegacyKeyFilaSeguimiento = (row, index = 0, periodoActual = null) => {
    const periodo = getNumeroCampo(
        row,
        [
            "periodo",
            "Periodo",
            "CODIGO_PERIODO",
            "periodo_informacion",
            "periodo_raiz",
            "Periodo información",
            "Periodo raíz",
        ],
        periodoActual
    );

    const codigoEntidad = getCodigoEntidad(row);

    const codigoRiesgo = getNumeroCampo(
        row,
        [
            "codigo_riesgo",
            "CODIGO_RIESGO",
            "codigo_riesgo_seleccionado",
            "codigo_riesgo_informacion",
            "Riesgo seleccionado",
            "Riesgo información",
        ],
        index
    );

    const ref = getRef(row) || "ref";

    return [
        periodo ?? "periodo",
        codigoEntidad ?? "ent",
        codigoRiesgo ?? index,
        ref,
    ].join("#");
};

const getKeyAliasesFilaSeguimiento = (row, index = 0, periodoActual = null) => {
    const normalizada = normalizarFilaGuardada(row, periodoActual);

    return Array.from(new Set([
        getKeyFilaSeguimiento(row, index, periodoActual),
        getKeyFilaSeguimiento(normalizada, index, periodoActual),
        getLegacyKeyFilaSeguimiento(row, index, periodoActual),
        getLegacyKeyFilaSeguimiento(normalizada, index, periodoActual),
        `${getRef(row)}#${getDescripcion(row)}`,
        `${getRef(normalizada)}#${getDescripcion(normalizada)}`,
        `${getRef(row)}`,
        `${getRef(normalizada)}`,
    ].filter(Boolean)));
};

const crearMapaCompatibilidad = (rows = [], periodoActual = null) => {
    const map = {};

    rows.forEach((row, index) => {
        const aliases = getKeyAliasesFilaSeguimiento(row, index, periodoActual);

        aliases.forEach((alias) => {
            if (alias && !map[alias]) {
                map[alias] = {
                    row,
                    index,
                    keyActual: getKeyFilaSeguimiento(row, index, periodoActual),
                };
            }
        });
    });

    return map;
};

const buscarKeyCompatible = (rowGuardada, index, periodoActual, mapaCompatibilidad) => {
    const aliases = getKeyAliasesFilaSeguimiento(rowGuardada, index, periodoActual);

    for (const alias of aliases) {
        if (mapaCompatibilidad[alias]) {
            return mapaCompatibilidad[alias].keyActual;
        }
    }

    return getKeyFilaSeguimiento(
        normalizarFilaGuardada(rowGuardada, periodoActual),
        index,
        periodoActual
    );
};

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

    const [tituloInforme, setTituloInforme] = useState("INFORME EJECUTIVO DE SEGUIMIENTO DE CONTROL INTERNO");
    const [viceministerioHeader, setViceministerioHeader] = useState("");
    const [organoHeader, setOrganoHeader] = useState("");

    const [snack, setSnack] = useState({
        open: false,
        message: "",
        severity: "error",
    });

    const [accionesEditadas, setAccionesEditadas] = useState({});
    const [estatusPeriodo, setEstatusPeriodo] = useState({});
    const [resultadosPrincipales, setResultadosPrincipales] = useState({});
    const [accionesRealizadas, setAccionesRealizadas] = useState(true);
    const [justificacion, setJustificacion] = useState("");

    const [openReiniciarFormato, setOpenReiniciarFormato] = useState(false);
    const [formatoReiniciado, setFormatoReiniciado] = useState(false);

    const openSnack = (message, severity = "error") => {
        setSnack({ open: true, message, severity });
    };

    const closeSnack = () => {
        setSnack((s) => ({ ...s, open: false }));
    };

    const setEditable = (key, campo, valor) => {
        setAccionesEditadas((prev) => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [campo]: valor,
            },
        }));
    };

    const setResultado = (key, valor) => {
        setResultadosPrincipales((prev) => ({
            ...prev,
            [key]: valor,
        }));
    };

    useEffect(() => {
        if (open) {
            const filasGuardadas = Array.isArray(prefill?.seccion1)
                ? prefill.seccion1
                : [];

            const filasOrigen = filasGuardadas.length > 0
                ? filasGuardadas
                : Array.isArray(filasBase)
                    ? filasBase
                    : [];

            const filasNormalizadas = filasOrigen.map((row) =>
                normalizarFilaGuardada(row, periodoSeleccionado)
            );

            setBaseRows(filasNormalizadas);

            const firstWithV = filasNormalizadas.find((r) => getViceministerio(r).toString().trim());
            const firstWithO = filasNormalizadas.find((r) => getOrgano(r).toString().trim());

            setTituloInforme((prev) => prev || "INFORME EJECUTIVO DE SEGUIMIENTO DE CONTROL INTERNO");
            setViceministerioHeader(getViceministerio(firstWithV));
            setOrganoHeader(getOrgano(firstWithO));
        } else {
            setBaseRows([]);
            setTituloInforme("INFORME EJECUTIVO DE SEGUIMIENTO DE CONTROL INTERNO");
            setViceministerioHeader("");
            setOrganoHeader("");
        }
    }, [open, filasBase, prefill, periodoSeleccionado]);

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

    useEffect(() => {
        if (!open) {
            setMesSeleccionado("");
            setAccionesEditadas({});
            setEstatusPeriodo({});
            setResultadosPrincipales({});
            setAccionesRealizadas(true);
            setJustificacion("");
            setGenerando(false);
            setOpenReiniciarFormato(false);
            setFormatoReiniciado(false);
            setSnack({ open: false, message: "", severity: "error" });
        }
    }, [open]);

    const gruposPorPeriodo = useMemo(() => {
        const map = new Map();

        for (const row of baseRows) {
            const periodoInformacion = getPeriodoInformacion(row, periodoSeleccionado);
            const periodoRaiz = getPeriodoRaiz(row, periodoInformacion);
            const per = periodoRaiz || periodoInformacion || periodoSeleccionado || 0;

            if (!map.has(per)) map.set(per, []);
            map.get(per).push(row);
        }

        for (const arr of map.values()) {
            arr.sort((a, b) => {
                const riesgoSeleccionadoA = getRiesgoSeleccionadoFila(a, 0);
                const riesgoSeleccionadoB = getRiesgoSeleccionadoFila(b, 0);

                if (riesgoSeleccionadoA !== riesgoSeleccionadoB) {
                    return riesgoSeleccionadoA - riesgoSeleccionadoB;
                }

                const refA = getRef(a).toString();
                const refB = getRef(b).toString();

                return refA.localeCompare(refB, "es", {
                    numeric: true,
                    sensitivity: "base",
                });
            });
        }

        return Array.from(map.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
    }, [baseRows, periodoSeleccionado]);

    useEffect(() => {
        if (!open || !prefill) return;

        const mapaCompatibilidad = crearMapaCompatibilidad(baseRows, periodoSeleccionado);

        if (Array.isArray(prefill.seccion3)) {
            const ep = {};
            const resP = {};

            for (const bloque of prefill.seccion3) {
                const bloqueNormalizado = normalizarFilaGuardada(bloque, periodoSeleccionado);

                const per = Number(
                    bloque?.periodo_raiz ??
                    bloque?.["Periodo raíz"] ??
                    bloque?.periodo ??
                    bloqueNormalizado?.periodo_raiz ??
                    bloqueNormalizado?.periodo ??
                    periodoSeleccionado
                );

                if (per) {
                    ep[per] = bloque.estatus || "";
                }

                if (Array.isArray(bloque.resultados)) {
                    bloque.resultados.forEach((r, index) => {
                        const rowNormalizada = normalizarFilaGuardada(
                            {
                                ...r,
                                periodo: r?.periodo ?? bloque?.periodo,
                                periodo_raiz: r?.periodo_raiz ?? bloque?.periodo_raiz ?? bloque?.periodo,
                                periodo_seleccionado: r?.periodo_seleccionado ?? bloque?.periodo_seleccionado ?? periodoSeleccionado,
                                periodo_informacion: r?.periodo_informacion ?? r?.periodo ?? bloque?.periodo,
                            },
                            periodoSeleccionado
                        );

                        const key = buscarKeyCompatible(
                            rowNormalizada,
                            index,
                            periodoSeleccionado,
                            mapaCompatibilidad
                        );

                        resP[key] = r?.resultados_principales ?? "";
                    });
                }
            }

            setEstatusPeriodo(ep);
            setResultadosPrincipales(resP);
        }

        if (Array.isArray(prefill.seccion2)) {
            const map = {};

            prefill.seccion2.forEach((r, index) => {
                const rowNormalizada = normalizarFilaGuardada(r, periodoSeleccionado);

                const key = buscarKeyCompatible(
                    rowNormalizada,
                    index,
                    periodoSeleccionado,
                    mapaCompatibilidad
                );

                map[key] = {
                    control: r?.control_interno ?? "",
                    metodo: r?.metodo_monitoreo ?? "",
                    frecuencia: r?.frecuencia ?? "",
                };
            });

            setAccionesEditadas(map);
        }

        if (prefill.seccion4) {
            setAccionesRealizadas(Boolean(prefill.seccion4.acciones_realizadas));
            setJustificacion(prefill.seccion4.justificacion ?? "");
        }
    }, [open, prefill, periodoSeleccionado, baseRows]);

    const handleAbrirReiniciarFormato = () => {
        setOpenReiniciarFormato(true);
    };

    const handleCerrarReiniciarFormato = () => {
        if (generando) return;
        setOpenReiniciarFormato(false);
    };

    const handleConfirmarReiniciarFormato = () => {
        const filasActuales = Array.isArray(filasBase) ? filasBase : [];

        if (filasActuales.length === 0) {
            setOpenReiniciarFormato(false);
            openSnack("No hay riesgos base cargados para iniciar nuevamente con el formato actual.", "warning");
            return;
        }

        const filasNormalizadas = filasActuales.map((row) =>
            normalizarFilaGuardada(row, periodoSeleccionado)
        );

        setBaseRows(filasNormalizadas);

        setAccionesEditadas({});
        setEstatusPeriodo({});
        setResultadosPrincipales({});
        setAccionesRealizadas(true);
        setJustificacion("");

        setFormatoReiniciado(true);
        setOpenReiniciarFormato(false);

        openSnack(
            "Se inició nuevamente con el formato actual. Presione Guardar cambios para reemplazar la versión anterior.",
            "info"
        );
    };

    const edicionHabilitada = Boolean(mesSeleccionado);

    const buildHeaderRow = (titles) =>
        new DTR({
            tableHeader: true,
            children: titles.map(
                (t) =>
                    new DTC({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: t,
                                        bold: true,
                                        color: "FFFFFF",
                                    }),
                                ],
                            }),
                        ],
                        shading: {
                            type: ShadingType.SOLID,
                            color: "2E4A66",
                            fill: "2E4A66",
                        },
                    })
            ),
        });

    const cell = (text, opts = {}) =>
        new DTC({
            children: [
                new Paragraph(String(text ?? "—")),
            ],
            ...opts,
        });

    const buildTablaPaso1Docx = (per, rows) => {
        const head = buildHeaderRow([
            "Ref.",
            "Descripción",
            "Tolerancia",
            "Severidad (narración)",
            "Control interno",
            "Método de monitoreo",
            "Frecuencia",
        ]);

        const body = rows.map((r) =>
            new DTR({
                children: [
                    cell(getRef(r)),
                    cell(getDescripcion(r)),
                    cell(getTolerancia(r)),
                    cell(getSeveridadNarracion(r)),
                    cell(getControlInterno(r)),
                    cell(getMetodoMonitoreo(r)),
                    cell(getFrecuencia(r)),
                ],
            })
        );

        return [
            new Paragraph({
                text: `Período ${per}`,
                bold: true,
            }),
            new DTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [head, ...body],
            }),
            new Paragraph({ text: "" }),
        ];
    };

    const buildTablaPaso2Docx = (per, rows) => {
        const head = buildHeaderRow([
            "Ref.",
            "Descripción",
            "Control interno",
            "Método de monitoreo",
            "Frecuencia",
        ]);

        const body = rows.map((r, i) => {
            const keyStable = getKeyFilaSeguimiento(r, i, periodoSeleccionado);
            const cur = accionesEditadas[keyStable] || {};

            return new DTR({
                children: [
                    cell(getRef(r)),
                    cell(getDescripcion(r)),
                    cell(cur.control ?? ""),
                    cell(cur.metodo ?? ""),
                    cell(cur.frecuencia ?? ""),
                ],
            });
        });

        return [
            new Paragraph({
                text: `Acciones mitigadoras realizadas — Período ${per}`,
                bold: true,
            }),
            new DTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [head, ...body],
            }),
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
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: labelText,
                                        bold: true,
                                        color: "FFFFFF",
                                    }),
                                ],
                            }),
                        ],
                        shading: {
                            type: ShadingType.SOLID,
                            color: shadeHex.replace("#", ""),
                            fill: shadeHex.replace("#", ""),
                        },
                    }),
                    cell(selected === labelText.split(" ")[0] || selected === labelText ? "✓" : ""),
                    cell(criterio),
                ],
            });

        return [
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Estatus del seguimiento y monitoreo — Período ${per}`,
                        bold: true,
                    }),
                ],
            }),
            new DTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    head,
                    row(
                        "Pendiente",
                        "#F44336",
                        "No muestra evidencia de gestión del control interno. Debe observar cumplir con el método de monitoreo y frecuencia propuesto en la matriz de monitoreo y continuidad del riesgo."
                    ),
                    row(
                        "Ejecución",
                        "#FF9800",
                        "El control interno presenta un grado de avance en la implementación de las medidas propuestas; la supervisión se encuentra en ejecución conforme a lo establecido en la matriz de continuidad."
                    ),
                    row(
                        "Cumple",
                        "#4CAF50",
                        "El control interno implementado contribuyó a disminuir el nivel de exposición del riesgo, reduciendo su rango de tolerancia, aunque no alcanzó una mitigación completa."
                    ),
                ],
            }),
            new Paragraph({ text: "" }),
        ];
    };

    const buildResultadosPrincipalesDocx = (per, rows) => {
        const head = buildHeaderRow([
            "Ref.",
            "Descripción",
            "Resultados principales",
        ]);

        const body = rows.map((r, i) => {
            const keyStable = getKeyFilaSeguimiento(r, i, periodoSeleccionado);

            return new DTR({
                children: [
                    cell(getRef(r)),
                    cell(getDescripcion(r)),
                    cell(resultadosPrincipales[keyStable] ?? ""),
                ],
            });
        });

        return [
            new Paragraph({
                text: `Resultados principales — Período ${per}`,
                bold: true,
            }),
            new DTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [head, ...body],
            }),
            new Paragraph({ text: "" }),
        ];
    };

    const buildAjustesDocx = () => [
        new Paragraph({
            text: "Ajustes a los mitigadores propuestos",
            bold: true,
        }),
        new Paragraph({
            text: accionesRealizadas
                ? "Se registraron acciones durante el período. No se requieren ajustes declarados."
                : `No se registraron acciones. Justificación y pasos a seguir: ${justificacion || "(sin información)"}`,
        }),
    ];

    const mapFilaBase = (per, r) => {
        const periodoInformacion = getPeriodoInformacion(r, periodoSeleccionado);
        const periodoRaiz = getPeriodoRaiz(r, per || periodoInformacion);
        const periodoSeleccionadoFila = getPeriodoSeleccionadoFila(r, periodoSeleccionado);
        const riesgoSeleccionado = getRiesgoSeleccionadoFila(r, null);
        const riesgoInformacion = getRiesgoInformacionFila(r, riesgoSeleccionado);

        return {
            objetivo: getObjetivo(r),

            periodo: periodoRaiz,
            periodo_raiz: periodoRaiz,
            periodo_seleccionado: periodoSeleccionadoFila,
            periodo_informacion: periodoInformacion,

            codigo_riesgo: riesgoSeleccionado,
            codigo_riesgo_seleccionado: riesgoSeleccionado,
            codigo_riesgo_informacion: riesgoInformacion,
            codigo_entidad: getCodigoEntidad(r),

            riesgo_raiz: getRiesgoRaiz(r, riesgoInformacion),
            anios_arrastre: getAniosArrastre(r, null),
            ref_raiz: getRefRaiz(r),
            descripcion_raiz: getDescripcionRaiz(r),
            origen_informacion: getOrigenInformacion(r),

            ref: getRef(r),
            descripcion: getDescripcion(r),
            tolerancia: getTolerancia(r),
            severidad_narracion: getSeveridadNarracion(r),
            control_interno: getControlInterno(r),
            metodo_monitoreo: getMetodoMonitoreo(r),
            frecuencia: getFrecuencia(r),
            viceministerio: getViceministerio(r),
            organo: getOrgano(r),
            responsable: getResponsable(r),
        };
    };

    const buildPayload = () => {
        const seccion1 = gruposPorPeriodo.flatMap(([per, rows]) =>
            rows.map((r) => mapFilaBase(per, r))
        );

        const seccion2 = gruposPorPeriodo.flatMap(([per, rows]) =>
            rows.map((r, i) => {
                const keyStable = getKeyFilaSeguimiento(r, i, periodoSeleccionado);
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
            periodo_raiz: per,
            periodo_seleccionado: periodoSeleccionado,
            estatus: estatusPeriodo[per] ?? "",
            resultados: rows.map((r, i) => {
                const keyStable = getKeyFilaSeguimiento(r, i, periodoSeleccionado);
                const base = mapFilaBase(per, r);

                return {
                    ...base,
                    resultados_principales: resultadosPrincipales[keyStable] ?? "",
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
                children: [
                    new TextRun({
                        text: organoHeader || "",
                        bold: true,
                        size: 28,
                    }),
                ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: viceministerioHeader || "",
                        bold: true,
                        size: 24,
                    }),
                ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: tituloInforme || "INFORME EJECUTIVO DE SEGUIMIENTO DE CONTROL INTERNO",
                        bold: true,
                        size: 36,
                    }),
                ],
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
                            children: [
                                new TextRun({
                                    text: `${mesTxt} ${periodoTxt}`,
                                }),
                            ],
                        }),
                    ],
                }),
            },
        };

        const contenidoChildren = [
            new Paragraph({ text: entidadNombre ?? "" }),
            new Paragraph({ text: `Período de seguimiento: ${periodoTxt}` }),
            new Paragraph({ text: "" }),

            new Paragraph({
                text: "1. Riesgos reportados para mitigar",
                bold: true,
            }),
            ...gruposPorPeriodo.flatMap(([per, rows]) => buildTablaPaso1Docx(per, rows)),

            new Paragraph({
                text: "2. Acciones mitigadoras realizadas",
                bold: true,
            }),
            ...gruposPorPeriodo.flatMap(([per, rows]) => buildTablaPaso2Docx(per, rows)),

            new Paragraph({
                text: "3. Seguimiento y continuidad",
                bold: true,
            }),
            ...gruposPorPeriodo.flatMap(([per, rows]) => [
                ...buildTablaEstatusDocx(per),
                ...buildResultadosPrincipalesDocx(per, rows),
            ]),

            ...buildAjustesDocx(),
        ];

        const contenidoSection = {
            properties: {},
            children: contenidoChildren,
        };

        const doc = new Document({
            sections: [portadaSection, contenidoSection],
        });

        const blob = await Packer.toBlob(doc);
        const nombreArchivo = `Seguimiento_${(entidadNombre || "Entidad").replace(/\s+/g, "_")}_${periodoTxt}.docx`;

        saveAs(blob, nombreArchivo);
    };

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

        return true;
    };

    const handleFinalizarCrear = async () => {
        if (!validar()) return;

        try {
            setGenerando(true);

            const payload = buildPayload();

            await apiClient.post("/api/seguimientos-actualizados", payload);
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

    const handleGuardarCambios = async () => {
        if (!validar()) return;

        try {
            setGenerando(true);

            const payload = buildPayload();

            await apiClient.put("/api/seguimientos-actualizados", payload);

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
            <DialogTitle>
                Documento de seguimiento — {entidadNombre}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                            Período seleccionado: <strong>{periodoSeleccionado ?? "—"}</strong>
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                            Los riesgos se agrupan por el período desde donde se vienen arrastrando.
                        </Typography>

                        {isEdit && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                <Stack
                                    direction={isMdUp ? "row" : "column"}
                                    alignItems={isMdUp ? "center" : "flex-start"}
                                    justifyContent="space-between"
                                    spacing={1.5}
                                >

                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={handleAbrirReiniciarFormato}
                                        disabled={generando}
                                        sx={{ flexShrink: 0 }}
                                    >
                                        Iniciar de nuevo con formato actual
                                    </Button>
                                </Stack>
                            </Alert>
                        )}

                        {formatoReiniciado && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                Está trabajando con el formato actual. La información anterior será reemplazada únicamente cuando presione
                                <strong> Guardar cambios</strong>.
                            </Alert>
                        )}
                    </Stack>

                    <Section
                        title="Encabezado del informe"
                        subtitle="Estos datos se usarán en la primera hoja del documento y se guardarán."
                    >
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
                                <InputLabel id="mes-seguimiento-label">
                                    Mes
                                </InputLabel>

                                <Select
                                    labelId="mes-seguimiento-label"
                                    label="Mes"
                                    value={mesSeleccionado}
                                    onChange={(e) => setMesSeleccionado(e.target.value)}
                                    disabled={isEdit}
                                >
                                    {MESES.map((m) => (
                                        <MenuItem key={m.value} value={m.value}>
                                            {m.label}
                                        </MenuItem>
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

                    <Section
                        title="1. Riesgos reportados para mitigar"
                        subtitle="Listado de riesgos agrupados por el período desde donde se vienen arrastrando."
                        disabled={!edicionHabilitada}
                    >
                        <Stack spacing={3}>
                            {gruposPorPeriodo.length === 0 && (
                                <Alert severity="info">
                                    No hay información para mostrar.
                                </Alert>
                            )}

                            {gruposPorPeriodo.map(([per, rows]) => (
                                <Stack key={`p1-${per}`} spacing={1}>
                                    <Stack
                                        direction={isMdUp ? "row" : "column"}
                                        alignItems={isMdUp ? "center" : "flex-start"}
                                        justifyContent="space-between"
                                        spacing={1}
                                    >
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            Período {per}
                                        </Typography>

                                        <Chip
                                            size="small"
                                            color="info"
                                            variant="outlined"
                                            label={`Seguimiento del período ${periodoSeleccionado}`}
                                        />
                                    </Stack>

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
                                                    const keyRow = getKeyFilaSeguimiento(row, i, periodoSeleccionado);

                                                    return (
                                                        <TableRow key={keyRow} hover>
                                                            <TableCell>{getRef(row) || "—"}</TableCell>
                                                            <TableCell>{getDescripcion(row) || "—"}</TableCell>
                                                            <TableCell>{getTolerancia(row) || "—"}</TableCell>
                                                            <TableCell>{getSeveridadNarracion(row) || "—"}</TableCell>
                                                            <TableCell>{getControlInterno(row) || "—"}</TableCell>
                                                            <TableCell>{getMetodoMonitoreo(row) || "—"}</TableCell>
                                                            <TableCell>{getFrecuencia(row) || "—"}</TableCell>
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

                    <Section
                        title="2. Acciones mitigadoras realizadas"
                        subtitle="Describa lo ejecutado en el mes seleccionado: ajustes a controles, métodos de monitoreo y frecuencias."
                        disabled={!edicionHabilitada}
                    >
                        <Stack spacing={3}>
                            {gruposPorPeriodo.map(([per, rows]) => (
                                <Stack key={`p2-${per}`} spacing={1}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        Acciones — Período {per}
                                    </Typography>

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
                                                    const keyStable = getKeyFilaSeguimiento(row, i, periodoSeleccionado);
                                                    const cur = accionesEditadas[keyStable] || {};

                                                    return (
                                                        <TableRow key={keyStable} hover>
                                                            <TableCell>{getRef(row) || "—"}</TableCell>
                                                            <TableCell>{getDescripcion(row) || "—"}</TableCell>

                                                            <TableCell>
                                                                <EditableTextCell
                                                                    disabled={!edicionHabilitada}
                                                                    value={cur.control}
                                                                    placeholder={getControlInterno(row)}
                                                                    onChange={(v) => setEditable(keyStable, "control", v)}
                                                                />
                                                            </TableCell>

                                                            <TableCell>
                                                                <EditableTextCell
                                                                    disabled={!edicionHabilitada}
                                                                    value={cur.metodo}
                                                                    placeholder={getMetodoMonitoreo(row)}
                                                                    onChange={(v) => setEditable(keyStable, "metodo", v)}
                                                                />
                                                            </TableCell>

                                                            <TableCell>
                                                                <EditableTextCell
                                                                    disabled={!edicionHabilitada}
                                                                    value={cur.frecuencia}
                                                                    placeholder={getFrecuencia(row)}
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

                    <Section
                        title="3. Seguimiento y continuidad"
                        subtitle="Marque el estatus del control interno por período raíz y documente los resultados principales del mes."
                        disabled={!edicionHabilitada}
                    >
                        <Stack spacing={3}>
                            {gruposPorPeriodo.map(([per, rows]) => (
                                <Stack key={`p3-${per}`} spacing={1}>
                                    <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 800 }}>
                                        Estatus — Período {per}
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
                                                    {
                                                        label: "Pendiente",
                                                        color: "#f44336",
                                                        criterio: "No muestra evidencia de gestión del control interno. Debe observar cumplir con el método de monitoreo y frecuencia propuesto en la matriz de monitoreo y continuidad del riesgo.",
                                                    },
                                                    {
                                                        label: "Ejecución",
                                                        color: "#ff9800",
                                                        criterio: "El control interno presenta un grado de avance en la implementación de las medidas propuestas; la supervisión se encuentra en ejecución conforme a lo establecido en la matriz de continuidad.",
                                                    },
                                                    {
                                                        label: "Cumple",
                                                        color: "#4caf50",
                                                        criterio: "El control interno implementado contribuyó a disminuir el nivel de exposición del riesgo, reduciendo su rango de tolerancia, aunque no alcanzó una mitigación completa.",
                                                    },
                                                ].map((opt) => (
                                                    <TableRow key={`${per}-${opt.label}`}>
                                                        <TableCell sx={{ fontWeight: 700, width: 200 }}>
                                                            <span
                                                                style={{
                                                                    display: "inline-block",
                                                                    padding: "4px 8px",
                                                                    background: opt.color,
                                                                    color: "#fff",
                                                                    borderRadius: 4,
                                                                }}
                                                            >
                                                                {opt.label}
                                                            </span>
                                                        </TableCell>

                                                        <TableCell sx={{ width: 140 }}>
                                                            <RadioGroup
                                                                row
                                                                value={estatusPeriodo[per] ?? ""}
                                                                onChange={(e) =>
                                                                    setEstatusPeriodo((prev) => ({
                                                                        ...prev,
                                                                        [per]: e.target.value,
                                                                    }))
                                                                }
                                                            >
                                                                <FormControlLabel
                                                                    value={opt.label.split(" ")[0]}
                                                                    control={<Radio />}
                                                                    label=""
                                                                    disabled={!edicionHabilitada}
                                                                />
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
                                                    const keyStable = getKeyFilaSeguimiento(row, i, periodoSeleccionado);

                                                    return (
                                                        <TableRow key={keyStable} hover>
                                                            <TableCell>{getRef(row) || "—"}</TableCell>
                                                            <TableCell>{getDescripcion(row) || "—"}</TableCell>
                                                            <TableCell>
                                                                <EditableTextCell
                                                                    disabled={!edicionHabilitada}
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

                    <Section
                        title="4. Ajustes a mitigadores"
                        subtitle="Indique si se realizaron acciones durante el mes; si no, justifique y describa pasos a seguir."
                        disabled={!edicionHabilitada}
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
                                <FormControlLabel
                                    value="si"
                                    control={<Radio />}
                                    label="Sí se realizaron acciones"
                                    disabled={!edicionHabilitada}
                                />

                                <FormControlLabel
                                    value="no"
                                    control={<Radio />}
                                    label="No se realizaron acciones"
                                    disabled={!edicionHabilitada}
                                />
                            </RadioGroup>

                            {!accionesRealizadas && (
                                <TextField
                                    label="Justificación y pasos a seguir"
                                    placeholder="Explique por qué no se realizaron acciones y los pasos a seguir…"
                                    fullWidth
                                    multiline
                                    minRows={4}
                                    value={justificacion}
                                    onChange={(e) => setJustificacion(e.target.value)}
                                    disabled={!edicionHabilitada}
                                />
                            )}
                        </Stack>
                    </Section>

                    {generando && <LinearProgress />}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={generando}>
                    Cancelar
                </Button>

                {!isEdit ? (
                    <Tooltip
                        title={!mesSeleccionado ? "Seleccione un mes para habilitar la generación" : ""}
                        arrow
                        disableHoverListener={Boolean(mesSeleccionado)}
                    >
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
                        <Tooltip
                            title={!mesSeleccionado ? "Mes no válido" : "Guardar sin generar documento"}
                            arrow
                            disableHoverListener={Boolean(mesSeleccionado)}
                        >
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

            <Dialog
                open={openReiniciarFormato}
                onClose={handleCerrarReiniciarFormato}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800 }}>
                    Iniciar de nuevo con formato actual
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Typography>
                            Esta acción limpiará la información editable cargada en el modal y volverá a construir el seguimiento con la estructura actual.
                        </Typography>

                        <Alert severity="warning">
                            No se modificará la información guardada hasta que presione <strong>Guardar cambios</strong>.
                        </Alert>

                        <Typography variant="body2" color="text.secondary">
                            Se conservará el mes seleccionado y se usarán los riesgos base cargados para el período {periodoSeleccionado ?? "—"}.
                        </Typography>
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={handleCerrarReiniciarFormato}
                        disabled={generando}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleConfirmarReiniciarFormato}
                        disabled={generando}
                    >
                        Iniciar nuevamente
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={closeSnack}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={closeSnack}
                    severity={snack.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
}