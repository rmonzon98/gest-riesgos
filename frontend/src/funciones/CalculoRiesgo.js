export function calcularRiesgo({ PROBABILIDAD, SEVERIDAD, CAPACIDAD_MITIGACION, VARIABLE_MITIGACION }) {
    const probabilidad = Number(PROBABILIDAD || 0);
    const severidad = Number(SEVERIDAD || 0);
    const capacidad = Math.max(0, Number(CAPACIDAD_MITIGACION || 0) - 1);
    const variable = (VARIABLE_MITIGACION || '').toUpperCase();
    const probabilidadAjustada = variable === 'P' ? Math.max(1, probabilidad - capacidad) : probabilidad;
    const severidadAjustada = variable === 'S' ? Math.max(1, severidad - capacidad) : severidad;
    return {
        PROBABILIDAD_AJUSTADA: probabilidadAjustada || '',
        SEVERIDAD_AJUSTADA: severidadAjustada || '',
        RIESGO_INHERENTE: probabilidad && severidad ? probabilidad * severidad : '',
        RIESGO_RESIDUAL: probabilidadAjustada && severidadAjustada ? probabilidadAjustada * severidadAjustada : ''
    };
}

export function colorTolerancia(valor) {
    if (!Number(valor)) return 'default';
    if (valor <= 10) return 'success';
    if (valor <= 15) return 'warning';
    return 'error';
}
