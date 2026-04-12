/**
 * @fileoverview 
 * Página de error 404 (no encontrada) del sistema de Gestión de Riesgos.
 * Renderiza un layout centrado con icono, código de error y acción para volver al inicio.
 *
 * @module PageNotFound/PageNotFound
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { Box, Typography, Button, SvgIcon } from "@mui/material";

/**
 * FaceIcon: Icono SVG estilizado para pantallas vacías/errores.
 * @component
 * @returns {JSX.Element}
 */
function FaceIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24" sx={{ fontSize: 96 }}>
      <path
        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

/**
 * PageNotFound: Componente de interfaz para mostrar el estado 404.
 *
 * - Informa al usuario que la ruta no existe o fue movida.
 * - Ofrece navegación rápida de regreso a la página de inicio.
 *
 * @component
 * @returns {JSX.Element}
 */
const PageNotFound = () => {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      justifyContent="center"
      alignItems="center"
      bgcolor="#f8faff"
      px={2}
    >
      <Box textAlign="center" maxWidth={400}>
        {/* Ícono */}
        <Box mb={4}>
          <FaceIcon sx={{ color: "#1173d4" }} />
        </Box>

        {/* Código de error */}
        <Typography
          variant="h1"
          fontWeight="800"
          color="#1173d4"
          mb={1}
          sx={{ fontSize: "6rem" }}
        >
          404
        </Typography>

        {/* Título */}
        <Typography
          variant="h4"
          fontWeight="bold"
          color="#1a202c"
          mb={2}
        >
          Página no encontrada
        </Typography>

        {/* Mensaje */}
        <Typography variant="body1" color="#4a5568" mb={4}>
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </Typography>

        {/* Botón */}
        <Button
          variant="contained"
          sx={{
            bgcolor: "#1173d4",
            px: 4,
            py: 1.5,
            borderRadius: 2,
            fontWeight: "600",
            "&:hover": { bgcolor: "#0f5fb0" },
          }}
          href="/"
        >
          Volver a la página de inicio
        </Button>
      </Box>
    </Box>
  );
};

export default PageNotFound;
