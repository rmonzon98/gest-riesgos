import { formatearHojaReporte } from '../../funciones/ExcelFormato.js';
import { safefmt } from '../../funciones/Fechas.js';

function contexto(reporte) {
    const rango = reporte.desde || reporte.hasta
        ? `${safefmt(reporte.desde) || 'Desde el inicio'} a ${safefmt(reporte.hasta) || 'Hasta el fin'}` : '';
    return [`Periodo ${reporte.periodo}`, reporte.direccion, rango].filter(Boolean).join(' · ');
}

function celdaPdf(valor, columna) {
    if (valor == null || valor === '') return '-';
    if (columna.formato === 'porcentaje') return `${valor}%`;
    if (columna.formato === 'fecha') return safefmt(valor) || '-';
    return String(valor);
}

export async function crearPdfPlanes(reporte, logo) {
    const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
        import('pdfmake/build/pdfmake.js'), import('pdfmake/build/vfs_fonts.js')
    ]);
    const fuentes = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts;
    if (pdfMake.addVirtualFileSystem) pdfMake.addVirtualFileSystem(fuentes);
    else pdfMake.vfs = fuentes;
    const columnas = reporte.columnas;
    const encabezado = columnas.map(({ nombre }) => ({ text: nombre, bold: true, color: 'white', fillColor: '#2a3f54' }));
    const filas = reporte.filas.map((fila, i) => columnas.map((columna, j) => ({
        text: celdaPdf(fila[j], columna), fillColor: i % 2 ? '#f5f7fa' : '#ffffff'
    })));
    const ancho = nombre => /^(Riesgo|Plan de acción|Actividad|Comentario|Cortes|Método)$/.test(nombre) ? '*' : 'auto';
    const fechaEmision = new Date().toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' });
    const doc = {
        pageSize: 'LEGAL', pageOrientation: 'landscape', pageMargins: [35, 50, 35, 42],
        defaultStyle: { fontSize: 8 },
        header: (pagina, total) => ({
            text: `Página ${pagina} de ${total}\n${fechaEmision}`, alignment: 'right', margin: [35, 12],
            fontSize: 8
        }),
        content: [
            { columns: [
                ...(logo ? [{ image: logo, fit: [62, 42], width: 72 }] : []),
                { stack: [
                    { text: reporte.institucion || '', fontSize: 11, color: '#2a3f54' },
                    { text: reporte.titulo, bold: true, fontSize: 17, color: '#1f2d3d' },
                    { text: contexto(reporte), margin: [0, 4, 0, 0] }
                ] }
            ], margin: [0, 0, 0, 14] },
            filas.length ? { table: { widths: columnas.map(({ nombre }) => ancho(nombre)),
                headerRows: 1, body: [encabezado, ...filas] },
                layout: { hLineColor: () => '#8c9bab', vLineColor: () => '#8c9bab' } } :
                { text: 'Sin resultados para los filtros seleccionados.', italics: true }
        ]
    };
    return pdfMake.createPdf(doc);
}

export async function crearExcelPlanes(reporte) {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Planes de acción');
    const columnas = reporte.columnas;
    ws.addRow([reporte.titulo]);
    ws.addRow([[reporte.institucion, contexto(reporte)].filter(Boolean).join(' · ')]);
    ws.addRow(columnas.map(columna => columna.nombre));
    for (const fila of reporte.filas) {
        ws.addRow(columnas.map((columna, i) => {
            const valor = fila[i];
            if (valor == null || valor === '') return null;
            if (columna.formato === 'porcentaje') return valor / 100;
            if (columna.formato === 'fecha') return new Date(valor + 'T00:00:00Z');
            return valor;
        }));
    }
    columnas.forEach(({ formato }, i) => {
        if (formato === 'porcentaje') ws.getColumn(i + 1).numFmt = '0.00%';
        if (formato === 'fecha') ws.getColumn(i + 1).numFmt = 'dd/mm/yyyy';
    });
    formatearHojaReporte(ws, { filaTitulo: 1, filaSubtitulo: 2, filaEncabezado: 3, primeraFilaDatos: 4,
        ultimaFilaDatos: ws.rowCount, ultimaColumna: columnas.length, tituloImpresion: reporte.titulo });
    return wb.xlsx.writeBuffer();
}
