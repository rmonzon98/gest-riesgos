import apiClient from 'api/apiClient';

// Helpers de normalización
export const safeArr = (a) => (Array.isArray(a) ? a : []);

export async function cargarObjetivosRiesgo() {
    try {
        const { data } = await apiClient.get('/api/riesgos-variables-actualizados/lista-objetivos');
        return safeArr(data.objetivos).map(row => ({ CODIGO: row.CODIGO_OBJETIVO,
            TIPO: row.CODIGO_TIPO_OBJETIVO, DESCRIPCION: row.DESCRIPCION }));
    } catch (error) {
        if (error.response?.status === 404) return [];
        throw error;
    }
}

export const mapCatsInicial = (data) => ({
    areas: safeArr(data?.areas).map((x) => ({ CODIGO: x.ID, DESCRIPCION: x.NOMBRE })),
    tiposObjetivo: safeArr(data?.tipoObjetivos).map((x) => ({ CODIGO: x.CODIGO_TIPO_OBJETIVO, DESCRIPCION: x.DESCRIPCION })),
    probabilidad: safeArr(data?.probabilidad).map((x) => ({ CODIGO: x.CODIGO, DESCRIPCION: x.DESCRIPCION })),
    severidad: safeArr(data?.severidad).map((x) => ({ CODIGO: x.CODIGO, DESCRIPCION: x.DESCRIPCION })),
    capacidadMitigacion: safeArr(data?.mitigacion).map((x) => ({ CODIGO: x.CODIGO, DESCRIPCION: x.DESCRIPCION })),
    tolerancia: safeArr(data?.tolerancia).map((x) => ({ CODIGO: x.CODIGO, DESCRIPCION: x.DESCRIPCION })),
    frecuencia: safeArr(data?.frecuencia).map((x) => ({ CODIGO: x.CODIGO_FRECUENCIA, DESCRIPCION: x.DESCRIPCION })),

    viceministerios: safeArr(data?.viceminsiterios).map(v => ({
        CODIGO_VICEMINISTERIO: v.CODIGO_VICEMINISTERIO, NOMBRE: v.NOMBRE
    })),
    organos: safeArr(data?.organos).map(o => ({
        CODIGO_ORGANO: o.CODIGO_ORGANO, NOMBRE: o.NOMBRE
    })),
});


