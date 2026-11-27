import { useEffect, useState } from 'react';
import apiClient from 'api/apiClient';

const fechaGuatemala = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guatemala' });

export default function usePeriodosPlanes() {
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');
    const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
    const [errorPeriodos, setErrorPeriodos] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        apiClient.get('/api/periodos-actualizados', { signal: controller.signal }).then(({ data }) => {
            if (controller.signal.aborted) return;
            const hoy = fechaGuatemala.format(new Date());
            const actual = data.result.findLast(row => row.PERIODO_INICIAL && row.PERIODO_FINAL && row.PERIODO_INICIAL <= hoy && hoy <= row.PERIODO_FINAL);
            const anterior = data.result.findLast(row => row.PERIODO_INICIAL && row.PERIODO_INICIAL <= hoy);
            setPeriodos(data.result);
            setPeriodo((actual ?? anterior ?? data.result[0])?.CODIGO_PERIODO ?? '');
        }).catch(() => { if (!controller.signal.aborted) setErrorPeriodos('No se pudieron cargar los periodos.'); })
            .finally(() => { if (!controller.signal.aborted) setCargandoPeriodos(false); });
        return () => controller.abort();
    }, []);
    return { periodos, periodo, setPeriodo, cargandoPeriodos, errorPeriodos };
}
