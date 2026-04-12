/**
 * @fileoverview
 * Reporte de seguimiento de riesgos: generación de informe PDF por riesgo.
 *
 * @module Riesgos/Reportes F/Seguimientos/Seguimiento
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;

/**
 * Genera un informe PDF del seguimiento de un riesgo.
 * 
 * @param {Object} payload - { descripcion, control, monitoreo, frecuencia, seguimientos: [] }
 * @param {string} [logoBase64] - Logo opcional en base64
 * @param {Object} [meta] - { titulo, subtitulo, periodo }
 * @param {string} [nombreArchivo] - Nombre del archivo a descargar
 */
export function ReporteSeguimiento(payload, logoBase64, meta = {}, nombreArchivo = "Informe_de_Seguimiento.pdf") {
    const {
        descripcion = "—",
        control = "—",
        monitoreo = "—",
        frecuencia = "—",
        seguimientos = [],
    } = payload || {};

    const safe = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));

    const now = new Date();
    const formattedDate = now.toLocaleDateString("es-ES");
    const formattedTime = now.toLocaleTimeString("es-ES");

    const styles = {
        title: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] },
        subtitle: { fontSize: 11, italics: true, margin: [0, 0, 0, 10] },
        sectionTitle: { fontSize: 12, bold: true, fillColor: "#2a3f54", color: "white", margin: [0, 10, 0, 6], padding: 3 },
        label: { bold: true, fontSize: 10 },
        text: { fontSize: 10, margin: [0, 0, 0, 4] },
        tableHeader: { bold: true, fillColor: "#2a3f54", color: "white", alignment: "center", fontSize: 9 },
        tableCell: { fontSize: 9, margin: [0, 2, 0, 2] },
        footerSmall: { fontSize: 9, alignment: "right" }
    };

    const blackLayout = {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => "black",
        vLineColor: () => "black",
    };

    const header = (currentPage, pageCount) => ({
        columns: [
            { text: meta?.titulo ?? "Informe de Seguimiento", style: "footerSmall", alignment: "left" },
            {
                alignment: "right",
                stack: [
                    { text: `Página ${currentPage} de ${pageCount}`, style: "footerSmall" },
                    { text: `${formattedDate} ${formattedTime}`, style: "footerSmall" },
                ],
            },
        ],
        margin: [40, 20],
    });

    // Información general del riesgo
    const fichaRiesgo = {
        table: {
            widths: ["auto", "*"],
            body: [
                [{ text: "Descripción del riesgo", style: "label" }, { text: safe(descripcion), style: "text" }],
                [{ text: "Control interno para mitigar", style: "label" }, { text: safe(control), style: "text" }],
                [{ text: "Método de monitoreo", style: "label" }, { text: safe(monitoreo), style: "text" }],
                [{ text: "Frecuencia", style: "label" }, { text: safe(frecuencia), style: "text" }],
            ],
        },
        layout: blackLayout,
        margin: [12, 6, 12, 12],
    };

    // Tabla de seguimientos
    const tablaSeguimientos = {
        table: {
            headerRows: 1,
            widths: ["auto", "auto", "auto", "*", "auto"],
            body: [
                [
                    { text: "No.", style: "tableHeader" },
                    { text: "Fecha", style: "tableHeader" },
                    { text: "Responsable", style: "tableHeader" },
                    { text: "Comentario", style: "tableHeader" },
                    { text: "Documento", style: "tableHeader" },
                ],
                ...seguimientos.map((s, i) => [
                    { text: String(i + 1), style: "tableCell", alignment: "center" },
                    { text: safe(s.fecha), style: "tableCell", alignment: "center" },
                    { text: safe(s.responsable), style: "tableCell" },
                    { text: safe(s.comentario), style: "tableCell" },
                    { text: safe(s.path_archivo?.split("/").pop()), style: "tableCell" },
                ]),
            ],
        },
        layout: blackLayout,
        margin: [12, 6, 12, 12],
    };

    // Sección de firmas
    const firmas = {
        table: {
            widths: ["*", "*"],
            body: [
                [
                    { text: "Responsable del seguimiento", style: "tableHeader" },
                    { text: "Vo. Bo. del superior inmediato", style: "tableHeader" },
                ],
                [
                    { text: "\n\n\n\n_________________________", alignment: "center" },
                    { text: "\n\n\n\n_________________________", alignment: "center" },
                ],
            ],
        },
        layout: blackLayout,
        margin: [12, 20, 12, 12],
    };

    const docDefinition = {
        pageSize: "A4",
        pageOrientation: "portrait",
        pageMargins: [40, 80, 40, 40],
        header,
        content: [
            ...(logoBase64
                ? [{ image: logoBase64, width: 60, alignment: "left", margin: [0, 0, 0, 12] }]
                : []),
            { text: meta?.titulo ?? "Informe de Seguimiento", style: "title", alignment: "center" },
            ...(meta?.subtitulo ? [{ text: meta.subtitulo, style: "subtitle", alignment: "center" }] : []),

            { text: "Información del riesgo", style: "sectionTitle" },
            fichaRiesgo,

            { text: "Historial de seguimientos", style: "sectionTitle" },
            tablaSeguimientos,

            firmas,
        ],
        styles,
        defaultStyle: { fontSize: 9 },
    };

    const fileName = nombreArchivo || "Informe_de_Seguimiento.pdf";
    pdfMake.createPdf(docDefinition).download(fileName);
}

/* ===== Ejemplo de uso =====
ReporteSeguimiento(
  {
    descripcion: "Deterioro de expedientes de personal",
    control: "Implementación de Archivo digital por fases",
    monitoreo: "Implementación de Archivo digital por fases",
    frecuencia: "Semanal",
    seguimientos: [
      { codigo_seguimiento: 5, fecha: "2025-10-13", responsable: "Douglas Álvarez", comentario: "Quinto registro", path_archivo: "entidad1/seguimientos/periodo2025/direccion1/1760421393944_Matriz.pdf" },
      { codigo_seguimiento: 4, fecha: "2025-10-13", responsable: "Douglas Álvarez", comentario: "Cuarto registro", path_archivo: "entidad1/seguimientos/periodo2025/direccion1/1760421341311_Matriz.pdf" }
    ]
  },
  null,
  { titulo: "Informe de Seguimiento del Riesgo RGMR O - 1", subtitulo: "Periodo 2025" },
  "Informe_Seguimiento_RGMR_O_1.pdf"
);
*/
