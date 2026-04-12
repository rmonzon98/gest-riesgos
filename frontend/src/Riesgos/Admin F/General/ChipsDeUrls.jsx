/**
 * @fileoverview
 * Componente de presentación para mostrar URLs asociadas a un rol como chips.
 *
 * @module Riesgos/Admin F/General/ChipsDeUrls.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React from "react";
import { Chip, Tooltip, Box, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

/**
 * Lista las URLs asociadas a un rol como chips con tooltip.
 *
 * @param {{lista: Array}} props - Lista de URLs a mostrar.
 * @component
 */
function ChipsDeUrls({ lista = [] }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const chipMax = isMobile ? 140 : 220;

    return (
        <Box sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1, 
            py: 0.5,
            maxWidth: "100%"
        }}>
            {lista.map((item, index) => (
                <Tooltip key={index} title={item.nombre_url}>
                    <Chip
                        label={item.nombre_url}
                        color="primary"
                        variant="outlined"
                        sx={{
                            maxWidth: chipMax,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    />
                </Tooltip>
            ))}
        </Box>
    );
}

export default ChipsDeUrls;
