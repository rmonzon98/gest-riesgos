const assert = require('node:assert/strict');
const { test } = require('node:test');
const { calcularCortes, estadoCortes, resumen } = require('../services/cumplimientoPlanes');

const anio = (cortesAnio, year = 2024) => calcularCortes({ fechaInicio: `${year}-01-01`, fechaFin: `${year}-12-31`, cortesAnio });
for (const [frecuencia, cantidad, primera, ultima] of [
    [1, 1, '2024', '2024'], [2, 2, 'S1', 'S2'], [3, 3, 'C1', 'C3'], [4, 4, 'T1', 'T4'],
    [6, 6, 'B1', 'B6'], [12, 12, 'ENE', 'DIC'], [24, 24, 'ENE 1', 'DIC 2'], [52, 53, 'S01', 'S01']
]) test(`Frecuencia ${frecuencia} y cobertura anual`, () => {
    const result = anio(frecuencia);
    assert.equal(result.length, cantidad);
    assert.deepEqual([result[0].etiqueta, result.at(-1).etiqueta], [primera, ultima]);
    assert.deepEqual([result[0].desde, result.at(-1).hasta], ['2024-01-01', '2024-12-31']);
});

test('Recorta los cortes de un rango y conserva febrero bisiesto', () => {
    assert.deepEqual(calcularCortes({ fechaInicio: '2024-02-18', fechaFin: '2024-03-05', cortesAnio: 24 }), [
        { indice: 1, etiqueta: 'FEB 2', desde: '2024-02-18', hasta: '2024-02-29' },
        { indice: 2, etiqueta: 'MAR 1', desde: '2024-03-01', hasta: '2024-03-05' }
    ]);
    assert.equal(anio(12, 2023)[1].hasta, '2023-02-28');
});

test('Semana ISO 53 atraviesa el cambio de año y se recorta', () => {
    assert.deepEqual(calcularCortes({ fechaInicio: '2020-12-30', fechaFin: '2021-01-05', cortesAnio: 52 }), [
        { indice: 1, etiqueta: 'S53', desde: '2020-12-30', hasta: '2021-01-03' },
        { indice: 2, etiqueta: 'S01', desde: '2021-01-04', hasta: '2021-01-05' }
    ]);
});

test('Cuando se necesite no genera cortes ni porcentaje', () => {
    assert.deepEqual(anio(null), []);
    assert.equal(resumen([]).porcentaje, null);
});

test('Verificada prevalece sobre observada y el corte conserva su señal', () => {
    const resultado = estadoCortes(anio(12), [
        { fechaActividad: '2024-01-04', estado: 'V' }, { fechaActividad: '2024-01-31', estado: 'O' }
    ], '2024-04-01');
    assert.equal(resultado[0].estado, 'cumplido');
    assert.equal(resultado[0].observada, true);
    assert.equal(resumen(resultado).porcentaje, 33.33);
});

test('Pendiente u observada dejan el corte por verificar incluso después de su cierre', () => {
    const resultado = estadoCortes(anio(12), [
        { fechaActividad: '2024-01-31', estado: 'P' }, { fechaActividad: '2024-02-29', estado: 'O' },
        { fechaActividad: '2024-03-05', estado: 'V', activo: 0 }
    ], '2024-04-21');
    assert.deepEqual(resultado.slice(0, 5).map(corte => corte.estado),
        ['por_verificar', 'por_verificar', 'vencido', 'pendiente', 'futuro']);
    assert.equal(resultado[3].porVencer, true);
    assert.equal(resumen(resultado).observadas, 1);
    assert.equal(resumen(resultado).vencido, 1);
});

test('El fin del día actual se incluye en el corte en curso', () => {
    const cortes = anio(12);
    assert.equal(estadoCortes(cortes, [], '2024-01-31')[0].estado, 'pendiente');
    assert.equal(estadoCortes(cortes, [], '2024-02-01')[0].estado, 'vencido');
});
