// src/Reportes/ReporteLogs.js
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;

/**
 * Detecta si un log fue hecho en gestor de BD (fuera del sistema).
 */
const parseNumberSafe = (value) => {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
};

const collectNumbersFromInfo = (info, candidates) => {
    if (!info || typeof info !== "object") return;

    const keysToCheck = [
        "CODIGO_COLABORADOR",
        "codigo_colaborador",
        "CODIGO_USUARIO",
        "codigo_usuario",
        "USUARIO",
        "usuario",
    ];

    keysToCheck.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(info, k)) {
            const n = parseNumberSafe(info[k]);
            if (n !== null) candidates.push(n);
        }
    });

    if (info.registro && typeof info.registro === "object") {
        collectNumbersFromInfo(info.registro, candidates);
    }
};

const isFromDBTool = (log) => {
    const candidates = [];

    const cia = parseNumberSafe(log.codigo_cia);
    const usr = parseNumberSafe(log.usuario_creacion);

    if (cia !== null) candidates.push(cia);
    if (usr !== null) candidates.push(usr);

    try {
        const infoObj =
            typeof log.informacion === "string"
                ? JSON.parse(log.informacion)
                : log.informacion;
        collectNumbersFromInfo(infoObj, candidates);
    } catch {
        // ignorar errores de parseo
    }

    return candidates.some((n) => n === 0 || n === -1);
};

const origenTexto = (log) =>
    isFromDBTool(log)
        ? "Realizado directamente en gestor de base de datos (fuera del sistema)"
        : "Realizado dentro del sistema (aplicación web)";

const safe = (v) =>
    v === null || v === undefined || v === "" ? "—" : String(v);

const formatFecha = (fecha) => {
    if (!fecha) return "—";
    try {
        return new Date(fecha).toLocaleString("es-GT");
    } catch {
        return String(fecha);
    }
};

export function ReporteLogs(
    logs = [],
    meta = {},
    nombreArchivo = "Reporte_logs.pdf"
) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("es-GT");
    const formattedTime = now.toLocaleTimeString("es-GT");

    const header = (currentPage, pageCount) => ({
        columns: [
            { text: "", width: "*" },
            {
                alignment: "right",
                stack: [
                    {
                        text: `Página ${currentPage} de ${pageCount}`,
                        style: "footerSmall",
                    },
                    { text: formattedDate, style: "footerSmall" },
                    { text: formattedTime, style: "footerSmall" },
                ],
                width: "auto",
            },
        ],
        margin: [40, 12],
    });

    const styles = {
        title: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
        subtitle: { fontSize: 10, italics: true, margin: [0, 0, 0, 10] },
        footerSmall: { fontSize: 8 },

        sectionTitle: { fontSize: 11, bold: true, margin: [0, 10, 0, 4] },
        label: { bold: true, fontSize: 9 },
        value: { fontSize: 9 },
        // sin fuente especial, usa la default (Roboto)
        code: {
            fontSize: 8,
            margin: [0, 2, 0, 0],
        },
        notes: { fontSize: 8, italics: true, margin: [0, 6, 0, 0] },
    };

    const blackLayout = {
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        hLineColor: () => "black",
        vLineColor: () => "black",
    };

    const makeLogSection = (log, index) => {
        // Pretty JSON
        let prettyInfo = "";
        const raw = log.informacion;

        if (raw !== null && raw !== undefined) {
            if (typeof raw === "object") {
                try {
                    prettyInfo = JSON.stringify(raw, null, 2);
                } catch {
                    prettyInfo = String(raw);
                }
            } else {
                try {
                    const parsed = JSON.parse(raw);
                    prettyInfo = JSON.stringify(parsed, null, 2);
                } catch {
                    prettyInfo = String(raw);
                }
            }
        }

        const origen = origenTexto(log);

        const rows = [
            [
                { text: "Tabla", style: "label" },
                { text: safe(log.nombre_tabla), style: "value" },
            ],
            [
                { text: "Fecha", style: "label" },
                { text: formatFecha(log.fecha_creacion), style: "value" },
            ],
            [
                { text: "Usuario", style: "label" },
                { text: safe(log.usuario_creacion), style: "value" },
            ],
            [
                { text: "Código compañía", style: "label" },
                { text: safe(log.codigo_cia), style: "value" },
            ],
            [
                { text: "Código log", style: "label" },
                { text: safe(log.codigo_log), style: "value" },
            ],
            [
                { text: "Origen del cambio", style: "label" },
                { text: origen, style: "value" },
            ],
        ];

        return {
            pageBreak: index === 0 ? undefined : "before",
            stack: [
                {
                    text: `Log #${index + 1}`,
                    style: "sectionTitle",
                },
                {
                    table: {
                        widths: ["auto", "*"],
                        body: rows,
                    },
                    layout: blackLayout,
                    margin: [0, 2, 0, 6],
                },
                {
                    text: "Información (JSON)",
                    style: "label",
                    margin: [0, 4, 0, 2],
                },
                {
                    text: prettyInfo || "Sin contenido",
                    style: "code",
                },
            ],
            margin: [12, 0, 12, 8],
        };
    };

    const logSections = logs.map((log, idx) => makeLogSection(log, idx));

    const notaOrigen =
        'Nota: si el origen indica "gestor de base de datos", el cambio se realizó directamente en la base de datos y no a través del sistema.';

    const docDefinition = {
        pageSize: "LETTER",
        pageOrientation: "portrait",
        pageMargins: [44, 80, 44, 44],
        header,
        styles,
        defaultStyle: { fontSize: 9 }, // usa Roboto por defecto
        content: [
            ...(meta.logoBase64
                ? [
                    {
                        image: meta.logoBase64,
                        width: 60,
                        alignment: "left",
                        margin: [0, 0, 0, 12],
                    },
                ]
                : []),
            {
                text: meta.titulo || "REPORTE DE LOGS DEL SISTEMA",
                style: "title",
                alignment: "center",
            },
            ...(meta.subtitulo
                ? [
                    {
                        text: meta.subtitulo,
                        style: "subtitle",
                        alignment: "center",
                    },
                ]
                : []),
            { text: notaOrigen, style: "notes" },
            ...logSections,
        ],
    };

    pdfMake.createPdf(docDefinition).download(nombreArchivo);
}
