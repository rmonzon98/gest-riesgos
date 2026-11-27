import { formatearHojaReporte } from '../../funciones/ExcelFormato.js';
import { estadosCorte } from './estadosCorte.js';

export async function generarExcelPlanesViceministerio(datos, periodo, entidad, estado) {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Planes');
    const headers = ['Dirección', 'REF', 'Riesgo', 'Plan', 'Responsable', 'Frecuencia', 'Inicio', 'Fin', 'Cortes', 'Cumplimiento'];
    ws.addRow(['Planes por viceministerio']);
    const nombreDireccion = datos.direcciones.find(row => row.codigoEntidad === entidad)?.nombre;
    const filtroEstado = estado === 'observada' ? 'Con observaciones' : estadosCorte[estado]?.etiqueta;
    ws.addRow([['Periodo ' + periodo, datos.viceministerio, nombreDireccion, filtroEstado].filter(Boolean).join(' · ')]);
    ws.addRow(headers);
    for (const row of datos.result) {
        const cortes = row.cortes.map(corte => `${corte.etiqueta}: ${estadosCorte[corte.estado]?.etiqueta}${corte.observada ? ' (con observación)' : ''}`).join('\n');
        ws.addRow([row.plan.riesgo.seguridadEntidad?.nombre ?? '', row.plan.riesgo.ref ?? '', row.plan.riesgo.descripcion ?? '',
            row.plan.descripcion, row.nombreResponsable, row.frecuencia.descripcion, row.fechaInicio.slice(0, 10), row.fechaFin.slice(0, 10),
            cortes, row.resumen.porcentaje == null ? null : row.resumen.porcentaje / 100]);
    }
    ws.getColumn(headers.length).numFmt = '0.00%';
    formatearHojaReporte(ws, { filaTitulo: 1, filaSubtitulo: 2, filaEncabezado: 3, primeraFilaDatos: 4,
        ultimaFilaDatos: ws.rowCount, ultimaColumna: headers.length, tituloImpresion: 'Planes por viceministerio' });
    return wb.xlsx.writeBuffer();
}
