const DIA_MS = 86_400_000;
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const AGRUPACIONES = { 1: [12, ''], 2: [6, 'S'], 3: [4, 'C'], 4: [3, 'T'], 6: [2, 'B'], 12: [1, ''] };
const estados = ['cumplido', 'por_verificar', 'vencido', 'pendiente', 'futuro'];
const iso = dia => new Date(dia * DIA_MS).toISOString().slice(0, 10);

function diaUtc(value) {
    if (value instanceof Date) return Math.floor(value.getTime() / DIA_MS);
    if (typeof value !== 'string') return NaN;
    const texto = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return NaN;
    const day = Date.parse(`${texto}T00:00:00Z`) / DIA_MS;
    return Number.isFinite(day) && iso(day) === texto ? day : NaN;
}

function comienzoMes(anio, mes, dia = 1) {
    return Date.UTC(anio, mes, dia) / DIA_MS;
}

function bloque(dia, cortesAnio) {
    const fecha = new Date(dia * DIA_MS);
    const anio = fecha.getUTCFullYear();
    const mes = fecha.getUTCMonth();
    if (cortesAnio === 52) {
        const lunes = dia - ((fecha.getUTCDay() + 6) % 7);
        const anioIso = new Date((lunes + 3) * DIA_MS).getUTCFullYear();
        const cuatroEnero = comienzoMes(anioIso, 0, 4);
        const primerLunes = cuatroEnero - ((new Date(cuatroEnero * DIA_MS).getUTCDay() + 6) % 7);
        const semana = 1 + (lunes - primerLunes) / 7;
        return [lunes, lunes + 7, `S${String(semana).padStart(2, '0')}`];
    }
    if (cortesAnio === 24) {
        const primera = fecha.getUTCDate() <= 15;
        return [comienzoMes(anio, mes, primera ? 1 : 16), primera ? comienzoMes(anio, mes, 16) : comienzoMes(anio, mes + 1),
            `${MESES[mes]} ${primera ? '1' : '2'}`];
    }
    const [meses, prefijo] = AGRUPACIONES[cortesAnio];
    const periodo = Math.floor(mes / meses);
    const etiqueta = cortesAnio === 1 ? String(anio) : cortesAnio === 12 ? MESES[mes] : `${prefijo}${periodo + 1}`;
    return [comienzoMes(anio, periodo * meses), comienzoMes(anio, (periodo + 1) * meses), etiqueta];
}

/** Devuelve cortes de calendario en fechas ISO inclusivas y recortados al rango del plan. */
function calcularCortes({ fechaInicio, fechaFin, cortesAnio }) {
    if (cortesAnio == null) return [];
    if (![52, 24, 12, 6, 4, 3, 2, 1].includes(cortesAnio)) throw new RangeError('Frecuencia de cortes no válida.');
    const inicio = diaUtc(fechaInicio);
    const fin = diaUtc(fechaFin);
    if (!Number.isFinite(inicio) || !Number.isFinite(fin) || inicio > fin) return [];
    const cortes = [];
    for (let dia = inicio; dia <= fin;) {
        const [desde, siguiente, etiqueta] = bloque(dia, cortesAnio);
        cortes.push({ indice: cortes.length + 1, etiqueta, desde: iso(Math.max(inicio, desde)), hasta: iso(Math.min(fin, siguiente - 1)) });
        dia = siguiente;
    }
    return cortes;
}

/** Aplica el estado de cada corte y conserva el indicador de actividades observadas. */
function estadoCortes(cortes, actividades, hoy) {
    const actual = diaUtc(hoy);
    if (!Number.isFinite(actual)) throw new RangeError('Indique la fecha actual del cálculo.');
    const porFecha = actividades.filter(item => item.activo == null || Number(item.activo) === 1)
        .map(item => ({ dia: diaUtc(item.fechaActividad), estado: item.estado }))
        .filter(item => Number.isFinite(item.dia) && ['V', 'P', 'O'].includes(item.estado))
        .sort((a, b) => a.dia - b.dia);
    let pos = 0;
    return cortes.map(corte => {
        const desde = diaUtc(corte.desde);
        const hasta = diaUtc(corte.hasta);
        while (pos < porFecha.length && porFecha[pos].dia < desde) pos++;
        let verificada = false;
        let pendienteRevision = false;
        let observada = false;
        while (pos < porFecha.length && porFecha[pos].dia <= hasta) {
            const { estado } = porFecha[pos++];
            verificada ||= estado === 'V';
            pendienteRevision ||= estado === 'P';
            observada ||= estado === 'O';
        }
        const cerrado = hasta < actual;
        const estado = verificada ? 'cumplido' : pendienteRevision || observada ? 'por_verificar'
            : cerrado ? 'vencido' : desde > actual ? 'futuro' : 'pendiente';
        return { ...corte, estado, cerrado, observada, porVencer: !verificada && !cerrado && hasta - actual <= 15 };
    });
}

/** Cuenta los estados y expresa la proporción de cortes cumplidos frente a cortes cerrados. */
function resumen(cortes) {
    const resultado = Object.fromEntries(estados.map(estado => [estado, 0]));
    resultado.total = cortes.length;
    resultado.cerrados = 0;
    resultado.observadas = 0;
    resultado.porVencer = 0;
    for (const corte of cortes) {
        resultado[corte.estado]++;
        resultado.cerrados += Number(corte.cerrado);
        resultado.observadas += Number(corte.observada);
        resultado.porVencer += Number(corte.porVencer);
    }
    resultado.porcentaje = resultado.cerrados ? Math.round(resultado.cumplido * 10000 / resultado.cerrados) / 100 : null;
    return resultado;
}

module.exports = { calcularCortes, estadoCortes, resumen };
