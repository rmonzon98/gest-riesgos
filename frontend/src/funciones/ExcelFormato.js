/**
 * @fileoverview
 * Utilidades de formato institucional para los reportes que se exportan a Excel (ExcelJS).
 *
 * Centraliza la apariencia de los libros generados por el sistema:
 * - Encabezados con color institucional y texto blanco.
 * - Bordes marcados en toda la tabla y en las fichas de datos.
 * - Filas alternas (zebra) para facilitar la lectura impresa.
 * - Configuración de impresión: hoja oficio (8.5" x 13"), horizontal y todas
 *   las columnas ajustadas a una sola página de ancho.
 *
 * Todas las funciones trabajan sobre una hoja (`worksheet`) de ExcelJS ya
 * poblada con datos; no dependen de la librería en tiempo de importación.
 *
 * @module funciones/ExcelFormato
 * @version 1.0
 * @author Equipo de Desarrollo
 */

/**
 * Paleta institucional en formato ARGB (mismo azul usado en los reportes PDF).
 * @constant
 */
export const COLORES_XLSX = {
    titulo: 'FF1F2D3D',        // Fondo del título principal
    tituloTexto: 'FFFFFFFF',
    subtitulo: 'FFE8EDF2',     // Fondo del subtítulo / período
    subtituloTexto: 'FF1F2D3D',
    encabezado: 'FF2A3F54',    // Fondo de los encabezados de columna
    encabezadoTexto: 'FFFFFFFF',
    etiqueta: 'FFDCE6F1',      // Fondo de las etiquetas de las fichas
    etiquetaTexto: 'FF1F2D3D',
    filaAlterna: 'FFF5F7FA',   // Zebra
    borde: 'FF8C9BAB',
    totalFondo: 'FFDCE6F1',
    totalTexto: 'FF1F2D3D',
};

/**
 * Códigos de tamaño de papel usados por Excel.
 * @constant
 */
export const PAPEL_XLSX = {
    CARTA: 1,    // Letter 8.5" x 11"
    OFICIO: 14,  // Folio (oficio) 8.5" x 13"
    LEGAL: 5,    // Legal 8.5" x 14"
    A4: 9,
    A3: 8,
};

/**
 * Ancho total (en unidades de columna de Excel) que cabe cómodamente en una
 * hoja oficio (8.5" x 13") horizontal sin que la escala de impresión quede
 * ilegible: 13" menos los márgenes, a 100% de escala.
 * @constant
 */
const ANCHO_TOTAL_OFICIO_HORIZONTAL = 240;

/**
 * Devuelve un objeto de bordes completos para una celda.
 *
 * @param {string} [color] - Color ARGB del borde.
 * @param {string} [estilo] - Estilo del borde ('thin' | 'medium' | ...).
 * @returns {Object} Definición de bordes para ExcelJS.
 */
export const bordesCompletos = (color = COLORES_XLSX.borde, estilo = 'thin') => {
    const b = { style: estilo, color: { argb: color } };
    return { top: b, left: b, bottom: b, right: b };
};

/** Obtiene el texto plano de una celda, tolerando fórmulas y texto enriquecido. */
const textoCelda = (cell) => {
    if (!cell) return '';
    const v = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
        if (Array.isArray(v.richText)) return v.richText.map((t) => t.text ?? '').join('');
        if ('text' in v) return String(v.text ?? '');
        if ('result' in v) return String(v.result ?? '');
        if (v instanceof Date) return v.toLocaleDateString('es-GT');
        return '';
    }
    return String(v);
};

/** Escapa el carácter especial "&" en encabezados/pies de página de Excel. */
const escaparPie = (txt) => String(txt ?? '').replace(/&/g, '&&');

/**
 * Configura la impresión de la hoja: oficio (8.5" x 13"), horizontal y ajuste
 * de todas las columnas a una sola página de ancho.
 *
 * @param {Object} ws - Hoja de ExcelJS.
 * @param {Object} [opciones]
 * @param {number} [opciones.paperSize=PAPEL_XLSX.OFICIO] - Tamaño de papel.
 * @param {'landscape'|'portrait'} [opciones.orientacion='landscape'] - Orientación.
 * @param {number|null} [opciones.filaEncabezado=null] - Fila a repetir en cada página impresa.
 * @param {number|null} [opciones.filaEncabezadoFin=null] - Última fila del encabezado a repetir (encabezados de dos niveles).
 * @param {number} [opciones.paginasAncho=1] - Páginas a lo ancho (1 = todas las columnas en una página).
 * @param {number} [opciones.paginasAlto=0] - Páginas a lo alto (0 = las que sean necesarias).
 * @param {string} [opciones.titulo=''] - Texto mostrado a la izquierda del pie de página.
 * @param {boolean} [opciones.piePagina=true] - Agrega numeración de página y fecha.
 * @returns {void}
 */
export function configurarImpresion(ws, opciones = {}) {
    if (!ws) return;

    const {
        paperSize = PAPEL_XLSX.OFICIO,
        orientacion = 'landscape',
        filaEncabezado = null,
        filaEncabezadoFin = null,
        paginasAncho = 1,
        paginasAlto = 0,
        titulo = '',
        piePagina = true,
    } = opciones;

    ws.pageSetup = {
        ...(ws.pageSetup || {}),
        paperSize,
        orientation: orientacion,
        fitToPage: true,
        fitToWidth: paginasAncho,
        fitToHeight: paginasAlto,
        horizontalCentered: true,
        verticalCentered: false,
        margins: {
            left: 0.25,
            right: 0.25,
            top: 0.5,
            bottom: 0.5,
            header: 0.2,
            footer: 0.2,
        },
        ...(filaEncabezado
            ? { printTitlesRow: `${filaEncabezado}:${filaEncabezadoFin || filaEncabezado}` }
            : {}),
    };

    if (piePagina) {
        const pie = `&L&9${escaparPie(titulo)}&C&9Página &P de &N&R&9&D`;
        ws.headerFooter = {
            ...(ws.headerFooter || {}),
            oddFooter: pie,
            evenFooter: pie,
        };
    }
}

/**
 * Calcula (o normaliza) los anchos de columna y los reduce proporcionalmente
 * para que la tabla completa quepa en una sola página de ancho sin que la
 * escala de impresión resulte ilegible.
 *
 * @param {Object} ws - Hoja de ExcelJS.
 * @param {Object} [opciones]
 * @param {boolean} [opciones.recalcular=true] - Calcula el ancho según el contenido; si es false conserva los anchos ya definidos.
 * @param {number} [opciones.minimo=10] - Ancho mínimo por columna.
 * @param {number} [opciones.maximo=55] - Ancho máximo por columna.
 * @param {number} [opciones.anchoTotalMaximo] - Suma máxima de anchos permitida.
 * @param {number} [opciones.primeraColumna=1] - Primera columna a considerar.
 * @param {number} [opciones.ultimaColumna] - Última columna a considerar.
 * @param {number[]} [opciones.filasIgnoradas=[]] - Filas que no deben influir en el ancho (títulos combinados).
 * @returns {void}
 */
export function ajustarAnchos(ws, opciones = {}) {
    if (!ws) return;

    const {
        recalcular = true,
        minimo = 10,
        maximo = 55,
        anchoTotalMaximo = ANCHO_TOTAL_OFICIO_HORIZONTAL,
        primeraColumna = 1,
        ultimaColumna = ws.columnCount || 1,
        filasIgnoradas = [],
    } = opciones;

    const ignoradas = new Set(filasIgnoradas);
    const limitar = (n) => Math.min(Math.max(n, minimo), maximo);

    if (recalcular) {
        for (let c = primeraColumna; c <= ultimaColumna; c++) {
            let largo = 0;
            ws.eachRow({ includeEmpty: false }, (row, numFila) => {
                if (ignoradas.has(numFila)) return;
                const cell = row.getCell(c);
                if (cell?.isMerged) return; // Los títulos combinados no definen el ancho
                const texto = textoCelda(cell);
                // Con ajuste de texto la referencia es la palabra/línea más larga
                const lineas = texto.split(/\r?\n/);
                const tope = Math.max(...lineas.map((l) => l.length), 0);
                if (tope > largo) largo = tope;
            });
            ws.getColumn(c).width = limitar(largo + 2);
        }
    } else {
        for (let c = primeraColumna; c <= ultimaColumna; c++) {
            const col = ws.getColumn(c);
            col.width = limitar(col.width || minimo);
        }
    }

    // Reducción proporcional para que todo entre en una página de ancho
    let total = 0;
    for (let c = primeraColumna; c <= ultimaColumna; c++) total += ws.getColumn(c).width || 0;

    if (total > anchoTotalMaximo && total > 0) {
        const factor = anchoTotalMaximo / total;
        for (let c = primeraColumna; c <= ultimaColumna; c++) {
            const col = ws.getColumn(c);
            col.width = Math.max(Math.round((col.width || minimo) * factor * 10) / 10, 7);
        }
    }
}

/**
 * Da formato a una fila de título (principal o secundaria) combinada a lo
 * ancho de la tabla.
 *
 * @param {Object} ws - Hoja de ExcelJS.
 * @param {number} fila - Número de fila.
 * @param {number} ultimaColumna - Última columna que abarca el título.
 * @param {Object} [opciones]
 * @param {'principal'|'secundario'} [opciones.tipo='principal'] - Estilo a aplicar.
 * @param {boolean} [opciones.fusionar=true] - Combina las celdas de la fila.
 * @param {number} [opciones.altura] - Altura de la fila.
 * @returns {void}
 */
export function estilizarTitulo(ws, fila, ultimaColumna, opciones = {}) {
    if (!ws || !fila) return;

    const { tipo = 'principal', fusionar = true, altura } = opciones;
    const fin = Math.max(Number(ultimaColumna) || 1, 1);
    const principal = tipo === 'principal';

    if (fusionar && fin > 1 && !ws.getCell(fila, 1).isMerged) {
        try {
            ws.mergeCells(fila, 1, fila, fin);
        } catch {
            /* La fila ya estaba combinada */
        }
    }

    const row = ws.getRow(fila);
    row.height = altura ?? (principal ? 28 : 20);

    for (let c = 1; c <= fin; c++) {
        const cell = row.getCell(c);
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: principal ? COLORES_XLSX.titulo : COLORES_XLSX.subtitulo },
        };
        cell.font = {
            bold: true,
            size: principal ? 14 : 11,
            color: { argb: principal ? COLORES_XLSX.tituloTexto : COLORES_XLSX.subtituloTexto },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = bordesCompletos();
    }
}

/**
 * Da formato a una ficha de datos (pares etiqueta / valor) ubicada en filas
 * contiguas: la columna de etiqueta se resalta y todo el bloque se enmarca.
 *
 * @param {Object} ws - Hoja de ExcelJS.
 * @param {Object} opciones
 * @param {number} opciones.desdeFila - Primera fila de la ficha.
 * @param {number} opciones.hastaFila - Última fila de la ficha.
 * @param {number} [opciones.columnaEtiqueta=1] - Columna de las etiquetas.
 * @param {number} [opciones.ultimaColumna] - Última columna que abarca el valor (se combina).
 * @returns {void}
 */
export function estilizarFicha(ws, opciones = {}) {
    if (!ws) return;

    const {
        desdeFila,
        hastaFila,
        columnaEtiqueta = 1,
        ultimaColumna = ws.columnCount || 2,
    } = opciones;

    if (!desdeFila || !hastaFila) return;

    const finValor = Math.max(columnaEtiqueta + 1, Math.min(ultimaColumna, ws.columnCount || ultimaColumna));

    for (let f = desdeFila; f <= hastaFila; f++) {
        const row = ws.getRow(f);
        row.height = Math.max(row.height || 0, 18);

        const etiqueta = row.getCell(columnaEtiqueta);
        etiqueta.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORES_XLSX.etiqueta },
        };
        etiqueta.font = { bold: true, size: 10, color: { argb: COLORES_XLSX.etiquetaTexto } };
        etiqueta.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        etiqueta.border = bordesCompletos();

        if (finValor > columnaEtiqueta + 1 && !row.getCell(columnaEtiqueta + 1).isMerged) {
            try {
                ws.mergeCells(f, columnaEtiqueta + 1, f, finValor);
            } catch {
                /* Ya estaba combinada */
            }
        }

        for (let c = columnaEtiqueta + 1; c <= finValor; c++) {
            const cell = row.getCell(c);
            cell.font = { size: 10 };
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            cell.border = bordesCompletos();
        }
    }
}

/**
 * Da formato al bloque de tabla: encabezado con color institucional, bordes en
 * todas las celdas, filas alternas, autofiltro y encabezado congelado.
 *
 * Respeta los rellenos ya aplicados a celdas individuales (por ejemplo, los
 * colores de estatus), por lo que puede llamarse después de escribir los datos.
 *
 * @param {Object} ws - Hoja de ExcelJS.
 * @param {Object} opciones
 * @param {number} opciones.filaEncabezado - Fila que contiene los encabezados.
 * @param {number|null} [opciones.filaSubEncabezado=null] - Segunda fila de encabezado (encabezados de dos niveles).
 * @param {number[]} [opciones.columnasConSubEncabezado=[]] - Columnas que tienen su propio sub-encabezado; el resto se combina verticalmente.
 * @param {number} [opciones.primeraFilaDatos] - Primera fila de datos.
 * @param {number} [opciones.ultimaFilaDatos] - Última fila de datos.
 * @param {number} [opciones.primeraColumna=1] - Primera columna de la tabla.
 * @param {number} [opciones.ultimaColumna] - Última columna de la tabla.
 * @param {boolean} [opciones.zebra=true] - Aplica color a las filas pares.
 * @param {boolean} [opciones.autoFiltro=true] - Habilita el autofiltro.
 * @param {boolean} [opciones.congelar=true] - Congela el encabezado.
 * @param {number} [opciones.alturaEncabezado=34] - Altura de la fila de encabezado.
 * @param {number[]} [opciones.filasTotales=[]] - Filas de totales a resaltar.
 * @returns {void}
 */
export function estilizarTabla(ws, opciones = {}) {
    if (!ws) return;

    const {
        filaEncabezado,
        filaSubEncabezado = null,
        columnasConSubEncabezado = [],
        primeraFilaDatos = (Number(filaSubEncabezado || filaEncabezado) || 0) + 1,
        ultimaFilaDatos = ws.rowCount,
        primeraColumna = 1,
        ultimaColumna = ws.columnCount || 1,
        zebra = true,
        autoFiltro = true,
        congelar = true,
        alturaEncabezado = 34,
        alturaSubEncabezado = 22,
        filasTotales = [],
    } = opciones;

    if (!filaEncabezado) return;

    const finCol = Math.max(Number(ultimaColumna) || 1, primeraColumna);
    const totales = new Set(filasTotales);

    // ===== Encabezado =====
    const header = ws.getRow(filaEncabezado);
    header.height = alturaEncabezado;
    for (let c = primeraColumna; c <= finCol; c++) {
        const cell = header.getCell(c);
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORES_XLSX.encabezado },
        };
        cell.font = { bold: true, size: 10, color: { argb: COLORES_XLSX.encabezadoTexto } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = bordesCompletos();
    }

    // ===== Sub-encabezado (segundo nivel) =====
    // Las columnas sin sub-encabezado propio se combinan verticalmente con su
    // título; las que sí lo tienen conservan el color que traiga cada celda.
    if (filaSubEncabezado) {
        const conSub = new Set(columnasConSubEncabezado);
        const sub = ws.getRow(filaSubEncabezado);
        sub.height = alturaSubEncabezado;

        for (let c = primeraColumna; c <= finCol; c++) {
            const celdaSub = sub.getCell(c);
            const celdaTitulo = header.getCell(c);

            if (!conSub.has(c) && !celdaSub.isMerged && !celdaTitulo.isMerged) {
                try {
                    ws.mergeCells(filaEncabezado, c, filaSubEncabezado, c);
                } catch {
                    /* Ya estaba combinada */
                }
            }

            if (!celdaSub.fill) {
                celdaSub.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORES_XLSX.encabezado },
                };
            }
            if (!celdaSub.font) {
                celdaSub.font = { bold: true, size: 10, color: { argb: COLORES_XLSX.encabezadoTexto } };
            }
            celdaSub.alignment = {
                horizontal: 'center',
                vertical: 'middle',
                wrapText: true,
                ...(celdaSub.alignment || {}),
            };
            celdaSub.border = bordesCompletos();
        }
    }

    // ===== Filas de datos =====
    for (let f = primeraFilaDatos; f <= ultimaFilaDatos; f++) {
        const row = ws.getRow(f);
        const esTotal = totales.has(f);
        const alterna = zebra && (f - primeraFilaDatos) % 2 === 1;

        for (let c = primeraColumna; c <= finCol; c++) {
            const cell = row.getCell(c);

            if (esTotal) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORES_XLSX.totalFondo },
                };
                cell.font = { ...(cell.font || {}), bold: true, size: 10, color: { argb: COLORES_XLSX.totalTexto } };
            } else {
                // No se pisan los rellenos propios de la celda (estatus, semáforos)
                if (alterna && !cell.fill) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: COLORES_XLSX.filaAlterna },
                    };
                }
                if (!cell.font) cell.font = { size: 10 };
            }

            if (!cell.alignment) cell.alignment = { vertical: 'top', wrapText: true };
            else cell.alignment = { vertical: 'top', wrapText: true, ...cell.alignment };

            cell.border = bordesCompletos();
        }
    }

    const filaFiltro = filaSubEncabezado || filaEncabezado;

    if (autoFiltro && ultimaFilaDatos >= filaFiltro) {
        ws.autoFilter = {
            from: { row: filaFiltro, column: primeraColumna },
            to: { row: Math.max(ultimaFilaDatos, filaFiltro), column: finCol },
        };
    }

    if (congelar) {
        ws.views = [{ state: 'frozen', ySplit: filaFiltro }];
    }
}

/**
 * Aplica el formato institucional completo a una hoja de reporte: títulos,
 * ficha, tabla, anchos de columna y configuración de impresión en oficio
 * (8.5" x 13") horizontal con las columnas ajustadas a una sola página.
 *
 * @param {Object} ws - Hoja de ExcelJS ya poblada con datos.
 * @param {Object} [cfg]
 * @param {number} [cfg.filaTitulo] - Fila del título principal.
 * @param {number} [cfg.filaSubtitulo] - Fila del subtítulo (período, unidad, etc.).
 * @param {{desde:number, hasta:number}} [cfg.ficha] - Rango de filas de la ficha etiqueta/valor.
 * @param {number} cfg.filaEncabezado - Fila de encabezados de la tabla.
 * @param {number|null} [cfg.filaSubEncabezado] - Segunda fila de encabezado (encabezados de dos niveles).
 * @param {number[]} [cfg.columnasConSubEncabezado] - Columnas con sub-encabezado propio.
 * @param {number} [cfg.primeraFilaDatos] - Primera fila de datos.
 * @param {number} [cfg.ultimaFilaDatos] - Última fila de datos.
 * @param {number} [cfg.ultimaColumna] - Última columna de la tabla.
 * @param {number[]} [cfg.filasTotales] - Filas de totales a resaltar.
 * @param {boolean} [cfg.recalcularAnchos=true] - Calcula anchos según el contenido.
 * @param {number} [cfg.anchoMinimo] - Ancho mínimo de columna.
 * @param {number} [cfg.anchoMaximo] - Ancho máximo de columna.
 * @param {boolean} [cfg.zebra=true] - Filas alternas.
 * @param {boolean} [cfg.autoFiltro=true] - Autofiltro sobre el encabezado.
 * @param {string} [cfg.tituloImpresion=''] - Texto del pie de página.
 * @param {'landscape'|'portrait'} [cfg.orientacion='landscape'] - Orientación de impresión.
 * @param {number} [cfg.paperSize=PAPEL_XLSX.OFICIO] - Tamaño de papel.
 * @returns {void}
 */
export function formatearHojaReporte(ws, cfg = {}) {
    if (!ws) return;

    const {
        filaTitulo,
        filaSubtitulo,
        ficha,
        filaEncabezado,
        filaSubEncabezado = null,
        columnasConSubEncabezado = [],
        primeraFilaDatos,
        ultimaFilaDatos,
        ultimaColumna = ws.columnCount || 1,
        filasTotales = [],
        recalcularAnchos = true,
        anchoMinimo,
        anchoMaximo,
        zebra = true,
        autoFiltro = true,
        tituloImpresion = '',
        orientacion = 'landscape',
        paperSize = PAPEL_XLSX.OFICIO,
    } = cfg;

    const finCol = Math.max(Number(ultimaColumna) || 1, 1);

    // Las filas combinadas no deben estirar la primera columna
    const filasIgnoradas = [filaTitulo, filaSubtitulo].filter(Boolean);
    if (ficha?.desde && ficha?.hasta) {
        for (let f = ficha.desde; f <= ficha.hasta; f++) filasIgnoradas.push(f);
    }

    ajustarAnchos(ws, {
        recalcular: recalcularAnchos,
        ultimaColumna: finCol,
        filasIgnoradas,
        ...(anchoMinimo ? { minimo: anchoMinimo } : {}),
        ...(anchoMaximo ? { maximo: anchoMaximo } : {}),
    });

    if (filaTitulo) estilizarTitulo(ws, filaTitulo, finCol, { tipo: 'principal' });
    if (filaSubtitulo) estilizarTitulo(ws, filaSubtitulo, finCol, { tipo: 'secundario' });

    if (ficha?.desde && ficha?.hasta) {
        estilizarFicha(ws, {
            desdeFila: ficha.desde,
            hastaFila: ficha.hasta,
            ultimaColumna: finCol,
        });
    }

    if (filaEncabezado) {
        estilizarTabla(ws, {
            filaEncabezado,
            filaSubEncabezado,
            columnasConSubEncabezado,
            primeraFilaDatos,
            ultimaFilaDatos,
            ultimaColumna: finCol,
            filasTotales,
            zebra,
            autoFiltro,
        });
    }

    configurarImpresion(ws, {
        paperSize,
        orientacion,
        filaEncabezado: filaEncabezado || null,
        filaEncabezadoFin: filaSubEncabezado || filaEncabezado || null,
        titulo: tituloImpresion,
    });
}

/**
 * Aplica el formato de impresión (oficio 8.5" x 13" horizontal, una página de
 * ancho) a todas las hojas del libro. Útil como red de seguridad al final de una
 * exportación con varias hojas.
 *
 * @param {Object} wb - Libro de ExcelJS.
 * @param {Object} [opciones] - Mismas opciones de {@link configurarImpresion}.
 * @returns {void}
 */
export function configurarImpresionLibro(wb, opciones = {}) {
    if (!wb?.eachSheet) return;
    wb.eachSheet((ws) => configurarImpresion(ws, opciones));
}
