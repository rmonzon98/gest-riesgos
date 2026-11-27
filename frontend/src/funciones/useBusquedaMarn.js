import { useEffect, useState } from 'react';
import apiClient from 'api/apiClient';

export default function useBusquedaMarn(ruta, busqueda) {
    const [opciones, setOpciones] = useState([]);
    useEffect(() => {
        const q = busqueda.trim();
        setOpciones([]);
        if (!ruta || q.length < 3) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const { data } = await apiClient.get(ruta, { params: { q }, signal: controller.signal });
                if (!controller.signal.aborted) setOpciones(Array.isArray(data.result) ? data.result : []);
            } catch {
                if (!controller.signal.aborted) setOpciones([]);
            }
        }, 250);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [ruta, busqueda]);
    return opciones;
}
