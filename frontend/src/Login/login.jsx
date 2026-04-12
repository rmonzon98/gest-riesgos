/**
 * @fileoverview 
 * Pantalla de inicio de sesión del sistema de Gestión de Riesgos.
 * Renderiza el formulario de login, valida datos mínimos del cliente y consume
 * el endpoint de autenticación para obtener el token JWT. Gestiona feedback
 * al usuario y redirección tras login exitoso.
 *
 * @module Login/login
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import * as React from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  TextField,
  Link,
  Button,
  Stack,
  InputAdornment,
  IconButton,
} from "@mui/material";
import ApartmentIcon from "@mui/icons-material/Apartment";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import axios from "axios";
import AlertaMensaje from "Riesgos/Alerta F/AlertaMensaje";
import { Link as RouterLink } from "react-router-dom";

/**
 * Tema base para la pantalla de login (tipografía y colores corporativos).
 * @constant
 */
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#137fec" },
    background: { default: "#F8F9FA" },
    text: {
      primary: "#1a202c",
      secondary: "#718096",
    },
  },
  typography: {
    fontFamily: ['Inter', '"Noto Sans"', "sans-serif"].join(","),
  },
});

/**
 * Obtiene la posición del separador N dentro de una URL.
 * Se usa para recortar y obtener la raíz del dominio y redirigir
 * al home una vez autenticado.
 *
 * @param {string} string - Cadena principal (p. ej., window.location.href).
 * @param {string} subString - Subcadena separadora a buscar (p. ej., "/").
 * @param {number} index - Ocurrencia (1-based) que se desea localizar.
 * @returns {number} Índice de la ocurrencia solicitada.
 */
function getPosition(string, subString, index) {
  return string.split(subString, index).join(subString).length;
}

/**
 * Página de Login.
 *
 * - Gestiona estado local: email, contraseña, visibilidad de contraseña,
 *   loading y alertas.
 * - Valida que el usuario haya ingresado credenciales.
 * - Invoca POST `/api/login-actualizados` con `{ usuario, contra }`.
 * - Si `auth` es true, guarda `token` en localStorage y redirige al home.
 * - Muestra mensajes contextualizados ante errores (backend o red de red).
 *
 * @component
 * @example
 * return <LoginPage />;
 */
export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [mostrar, setMostrar] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [alerta, setAlerta] = React.useState({
    open: false,
    tipo: "success",
    mensaje: "",
  });

  /**
   * Controlador de envío del formulario.
   * 1) Previene submit por defecto.
   * 2) Valida que existan email y pass.
   * 3) Hace POST al endpoint de autenticación con `{ usuario, contra }`.
   * 4) Administra mensajes de error/éxito.
   * 5) Persiste el token en `localStorage` y redirige al home.
   *
   * @param {React.FormEvent<HTMLFormElement>} e - Evento de envío.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Validación mínima de cliente (evita llamada innecesaria al backend).
    if (!email || !pass) {
      setAlerta({
        open: true,
        tipo: "info",
        mensaje: "Ingrese correo y contraseña",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/login-actualizados", {
        usuario: email, 
        contra: pass,
      });

      if (!response?.data?.auth) {
        setAlerta({
          open: true,
          tipo: "error",
          mensaje: response?.data?.message || "Credenciales inválidas",
        });
      } else {
        setAlerta({
          open: true,
          tipo: "success",
          mensaje: response?.data?.message || "Inicio de sesión exitoso",
        });
        localStorage.clear();
        localStorage.setItem("token", response.data.token);

        // Redirige al origen del dominio (raíz)
        const base = String(window.location.href).substring(
          0,
          getPosition(window.location.href, "/", 3)
        );
        window.location = base;
      }
    } catch (err) {
      console.error("[LOGIN][ERR]", err);
      setAlerta({
        open: true,
        tipo: "error",
        mensaje:
          err?.response?.data?.message ||
          err?.message ||
          "Error al iniciar sesión",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        component="main"
        sx={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, sm: 3, lg: 4 },
          backgroundColor: "background.default",
        }}
      >
        <Container maxWidth="xs" disableGutters>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Avatar
              sx={{
                mx: "auto",
                mb: 2.5,
                width: 64,
                height: 64,
                bgcolor: "grey.200",
                color: "grey.600",
              }}
            >
              <ApartmentIcon fontSize="large" />
            </Avatar>

            <Typography component="h1" variant="h4" fontWeight={700}>
              Iniciar Sesión
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Bienvenido de nuevo, por favor ingrese sus datos.
            </Typography>
          </Box>

          <Card elevation={6} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box component="form" noValidate onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                  <TextField
                    id="email"
                    name="email"
                    label="Correo"
                    placeholder="ejemplo@correo.com"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                  />

                  <TextField
                    id="password"
                    name="password"
                    label="Contraseña"
                    placeholder="••••••••"
                    type={mostrar ? "text" : "password"}
                    autoComplete="current-password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    required
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setMostrar((m) => !m)}
                            edge="end"
                            aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {mostrar ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    fullWidth
                    sx={{ py: 1.25, fontWeight: 700 }}
                  >
                    {loading ? "Ingresando..." : "Iniciar Sesión"}
                  </Button>

                  <Box sx={{ textAlign: "center" }}>
                    <Link
                      component={RouterLink}
                      to="/recuperar-contraseña"
                      underline="hover"
                      color="primary"
                      variant="body2"
                    >
                      Olvidé mi contraseña
                    </Link>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>

      <AlertaMensaje
        open={alerta.open}
        tipo={alerta.tipo}
        mensaje={alerta.mensaje}
        setOpen={() => setAlerta((prev) => ({ ...prev, open: false }))}
      />
    </ThemeProvider>
  );
}
