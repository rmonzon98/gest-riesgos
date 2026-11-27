import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import apiClient from 'api/apiClient';

const Joyride = lazy(() => import('react-joyride').then(modulo => ({ default: modulo.Joyride })));
const idioma = { back: 'Anterior', close: 'Cerrar', last: 'Finalizar', next: 'Siguiente',
    nextWithProgress: 'Siguiente ({current} de {total})', open: 'Mostrar ayuda', skip: 'Omitir' };

export default function RecorridoGuiado({ pantalla, pasos, habilitado = true }) {
    const theme = useTheme();
    const [activos, setActivos] = useState(null);
    const mostrado = useRef(false);
    const guardado = useRef(false);
    const guardando = useRef(false);
    const boton = useRef(null);

    const abrir = useCallback(() => {
        const disponibles = pasos.filter(({ target }) => document.querySelector(target)?.getClientRects().length);
        if (disponibles.length) {
            mostrado.current = true;
            setActivos(disponibles);
        }
    }, [pasos]);

    useEffect(() => {
        if (!habilitado || mostrado.current) return;
        const controller = new AbortController();
        apiClient.get('/api/marn/tour/vistos', { signal: controller.signal }).then(({ data }) => {
            if (controller.signal.aborted) return;
            guardado.current = data.result.includes(pantalla);
            if (!guardado.current && !mostrado.current) abrir();
        }).catch(() => {});
        return () => controller.abort();
    }, [abrir, habilitado, pantalla]);

    const evento = ({ type }) => {
        if (type === 'tooltip' && !guardado.current && !guardando.current) {
            guardando.current = true;
            apiClient.post('/api/marn/tour/visto', { pantalla }, { adapter: ['fetch', 'xhr'], fetchOptions: { keepalive: true } })
                .then(() => { guardado.current = true; })
                .catch(() => {})
                .finally(() => { guardando.current = false; });
        }
        if (type === 'tour:end') {
            setActivos(null);
            boton.current?.focus({ preventScroll: true });
        }
    };

    return <>
        <Tooltip title="Recorrido guiado">
            <span><IconButton ref={boton} size="small" aria-label="Abrir recorrido guiado" disabled={!habilitado || Boolean(activos)}
                onClick={abrir}><HelpOutlineRounded /></IconButton></span>
        </Tooltip>
        {activos && <Suspense fallback={null}>
            <Joyride run continuous scrollToFirstStep onEvent={evento} steps={activos} locale={idioma}
                options={{ skipBeacon: true, buttons: ['back', 'close', 'primary', 'skip'], closeButtonAction: 'skip',
                    overlayClickAction: false, showProgress: true, primaryColor: theme.palette.primary.main,
                    backgroundColor: theme.palette.background.paper, textColor: theme.palette.text.primary,
                    arrowColor: theme.palette.background.paper, zIndex: theme.zIndex.tooltip + 1 }}
                styles={{ tooltip: { fontFamily: theme.typography.fontFamily } }} />
        </Suspense>}
    </>;
}
