/**
 * @fileoverview
 * Origen de un riesgo: año en que nació (según la cadena de continuidad) y tipo de origen.
 *
 * - "Seguimiento": riesgo que forma parte de la evaluación y seguimiento del período.
 * - "Identificado en el período" (ES_NUEVO = 1): se registra en el período, pero no forma
 *   parte de su evaluación ni seguimiento; se arrastra al período siguiente.
 *
 * @module funciones/OrigenRiesgo
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { Box, Tooltip, Typography } from "@mui/material";

export const TOOLTIP_EN_PERIODO =
    "Riesgo identificado durante el período; no forma parte de la evaluación ni del seguimiento";

export const ORIGEN = {
    SEGUIMIENTO: "SEGUIMIENTO",
    EN_PERIODO: "EN_PERIODO",
};

export const ORIGEN_LABEL = {
    [ORIGEN.SEGUIMIENTO]: "Seguimiento",
    [ORIGEN.EN_PERIODO]: "Identificado en el período",
};

// Colores fuera de la paleta de estados (verde/naranja/rojo) para no confundirse con ellos.
// Ambos cumplen contraste WCAG AA sobre blanco y sobre las filas alternas.
export const ORIGEN_COLOR = {
    [ORIGEN.SEGUIMIENTO]: "#1565C0",  // azul
    [ORIGEN.EN_PERIODO]: "#6A1B9A",   // morado
};

export const tipoOrigen = (r) => (Number(r?.ES_NUEVO) === 1 ? ORIGEN.EN_PERIODO : ORIGEN.SEGUIMIENTO);

/** Tipo de origen con punto de color al inicio ("● Seguimiento"). */
function TextoTipo({ tipo, variant, sinSalto = false }) {
    return (
        <Typography
            variant={variant}
            component="span"
            sx={{ color: ORIGEN_COLOR[tipo], fontWeight: 600, ...(sinSalto ? { whiteSpace: "nowrap" } : {}) }}
        >
            <Box component="span" sx={{ mr: 0.5 }}>●</Box>
            {ORIGEN_LABEL[tipo]}
        </Typography>
    );
}

/**
 * Solo la etiqueta del tipo de origen ("● Seguimiento" / "● Identificado en el período"),
 * para ubicarla por separado del año.
 *
 * @component
 * @param {Object} props.riesgo Fila del riesgo con ES_NUEVO.
 * @param {string} [props.variant="body2"] Variante tipográfica.
 * @param {string} [props.tooltip] Tooltip para "Identificado en el período" (por defecto TOOLTIP_EN_PERIODO).
 * @returns {JSX.Element}
 */
export function EtiquetaTipoOrigen({ riesgo, variant = "body2", tooltip = TOOLTIP_EN_PERIODO }) {
    const tipo = tipoOrigen(riesgo);
    const etiqueta = <TextoTipo tipo={tipo} variant={variant} sinSalto />;
    return tipo === ORIGEN.EN_PERIODO
        ? <Tooltip title={tooltip}>{etiqueta}</Tooltip>
        : etiqueta;
}

/**
 * Muestra el año de origen (negrita) y debajo el tipo de origen en su color.
 *
 * @component
 * @param {Object} props.riesgo Fila del riesgo con ANIO_ORIGEN y ES_NUEVO.
 * @param {boolean} [props.inline=false] Muestra todo en una línea ("2024 · ● Seguimiento").
 * @returns {JSX.Element}
 */
export default function OrigenRiesgo({ riesgo, inline = false }) {
    const tipo = tipoOrigen(riesgo);
    const contenido = inline ? (
        <Typography variant="body2" component="span">
            <strong>{riesgo?.ANIO_ORIGEN ?? "—"}</strong>
            {" · "}
            <TextoTipo tipo={tipo} variant="body2" sinSalto />
        </Typography>
    ) : (
        <Box sx={{ lineHeight: 1.2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {riesgo?.ANIO_ORIGEN ?? "—"}
            </Typography>
            <TextoTipo tipo={tipo} variant="caption" />
        </Box>
    );

    return tipo === ORIGEN.EN_PERIODO
        ? <Tooltip title={TOOLTIP_EN_PERIODO}>{contenido}</Tooltip>
        : contenido;
}
