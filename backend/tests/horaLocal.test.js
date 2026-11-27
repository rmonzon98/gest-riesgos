process.env.TZ = 'America/Guatemala';
const test = require('node:test');
const assert = require('node:assert/strict');
const { aBaseDeDatos, deBaseDeDatos, convertirArgumentos } = require('../prisma/horaLocal');

// 20:30 en Guatemala = 02:30 UTC del día siguiente.
const instante = new Date('2026-11-28T02:30:00.000Z');
const paredLocal = new Date('2026-11-27T20:30:00.000Z'); // lo que Prisma debe escribir para guardar "20:30"

test('Un instante se escribe como la hora local de Guatemala', () => {
    assert.equal(aBaseDeDatos(instante).toISOString(), paredLocal.toISOString());
});

test('La hora leída de la base vuelve al instante real', () => {
    assert.equal(deBaseDeDatos(paredLocal).toISOString(), instante.toISOString());
    assert.equal(deBaseDeDatos(aBaseDeDatos(instante)).getTime(), instante.getTime());
});

test('Los valores que no son fechas válidas no se tocan', () => {
    assert.equal(aBaseDeDatos(null), null);
    const invalida = new Date('x');
    assert.equal(aBaseDeDatos(invalida), invalida);
});

test('Se convierten timestamps en data y where, incluidos operadores y relaciones', () => {
    const args = convertirArgumentos('RiesgosPlanResponsable', 'updateMany', {
        where: { fechaCreacion: { gte: instante }, plan: { fechaModificacion: { lt: instante } } },
        data: { fechaModificacion: instante }
    });
    assert.equal(args.where.fechaCreacion.gte.toISOString(), paredLocal.toISOString());
    assert.equal(args.where.plan.fechaModificacion.lt.toISOString(), paredLocal.toISOString());
    assert.equal(args.data.fechaModificacion.toISOString(), paredLocal.toISOString());
});

test('Las fechas de calendario (@db.Date) no se convierten', () => {
    const inicio = new Date('2026-02-01T00:00:00Z');
    const args = convertirArgumentos('RiesgosPlanResponsable', 'create', { data: { fechaInicio: inicio, fechaFin: inicio } });
    assert.equal(args.data.fechaInicio, inicio);
    assert.equal(args.data.fechaFin, inicio);
});

test('Al crear se completan los @default(now()) en hora local', () => {
    const antes = Date.now();
    const args = convertirArgumentos('RiesgosGlosario', 'create', { data: { titulo: 'x' } });
    const guardado = deBaseDeDatos(args.data.fechaCreacion).getTime();
    assert.ok(guardado >= antes - 1000 && guardado <= Date.now() + 1000);
    const muchos = convertirArgumentos('RiesgosGlosario', 'createMany', { data: [{ titulo: 'a' }, { titulo: 'b' }] });
    assert.ok(muchos.data.every(fila => fila.fechaCreacion instanceof Date));
});

test('Los resultados con relaciones uno a muchos conservan sus arreglos y convierten sus fechas', () => {
    const { recorrerResultado } = require('../prisma/horaLocal');
    const plan = recorrerResultado('RiesgosPlanAccion', [{ fechaCreacion: paredLocal,
        responsables: [{ fechaCreacion: paredLocal, fechaInicio: new Date('2026-02-01T00:00:00Z'), actividades: [] }] }]);
    assert.ok(Array.isArray(plan[0].responsables));
    assert.ok(Array.isArray(plan[0].responsables[0].actividades));
    assert.equal(plan[0].fechaCreacion.toISOString(), instante.toISOString());
    assert.equal(plan[0].responsables[0].fechaCreacion.toISOString(), instante.toISOString());
    assert.equal(plan[0].responsables[0].fechaInicio.toISOString(), '2026-02-01T00:00:00.000Z');
});

test('Un valor explícito en un campo con @default(now()) se respeta', () => {
    const args = convertirArgumentos('RiesgosGlosario', 'create', { data: { titulo: 'x', fechaCreacion: instante } });
    assert.equal(args.data.fechaCreacion.toISOString(), paredLocal.toISOString());
});
