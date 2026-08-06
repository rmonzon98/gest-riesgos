/**
 * @fileoverview
 * Pantalla de inicio de sesión del sistema de Gestión de Riesgos.
 *
 * Renderiza el formulario de login, valida datos mínimos del cliente y consume
 * los endpoints de autenticación actualizados.
 *
 * Esta versión soporta:
 *
 * - Login por correo y contraseña.
 * - Autenticación en dos pasos mediante TOTP.
 * - Códigos de recuperación 2FA.
 * - Sesión basada en cookies HTTP-only desde backend.
 * - Carga de sesión mediante AuthContext.
 * - Redirección al módulo de Riesgos tras login exitoso.
 *
 * @module Login/login
 * @version 2.0
 * @author Equipo de Desarrollo
 */

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Link,
  Button,
  Stack,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Avatar,
} from "@mui/material";

import ApartmentIcon from "@mui/icons-material/Apartment";
import SecurityIcon from "@mui/icons-material/Security";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import KeyIcon from "@mui/icons-material/Key";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Visibility, VisibilityOff } from "@mui/icons-material";

import { authApi, limpiarSesionLocal } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import inicio from "images/inicio.png";

/**
 * Tema base para la pantalla de login.
 *
 * Define:
 * - Colores principales.
 * - Fondo general.
 * - Tipografía institucional.
 *
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
 * Tutorial visual para orientar al usuario sobre el uso de autenticación
 * en dos pasos.
 *
 * Se usa en dos variantes:
 *
 * - Compacto: dentro del formulario principal.
 * - Completo: al lado del formulario de verificación 2FA.
 *
 * @component
 * @param {object} props
 * @param {boolean} [props.compacto=false] Determina si se renderiza en modo compacto.
 * @returns {JSX.Element}
 */
function TutorialAutenticador({ compacto = false }) {
  const contenido = (
    <Stack spacing={2}>
      {!compacto && (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 44, height: 44 }}>
            <SecurityIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800}>Autenticación en dos pasos</Typography>
            <Typography variant="body2" color="text.secondary">
              Usa una app autenticadora para generar códigos temporales.
            </Typography>
          </Box>
        </Box>
      )}

      <Alert severity="info">
        El código cambia aproximadamente cada 30 segundos. Si no funciona, espera al siguiente e inténtalo de nuevo.
      </Alert>

      <Stack spacing={1.5}>
        {[
          { icon: <SmartphoneIcon color="primary" />, title: '1. Abre tu app autenticadora', desc: 'Puede ser Google Authenticator, Microsoft Authenticator, Authy u otra compatible.' },
          { icon: <KeyIcon color="primary" />, title: '2. Busca la cuenta del sistema', desc: 'Debe aparecer con el nombre institucional configurado para el sistema.' },
          { icon: <SecurityIcon color="primary" />, title: '3. Ingresa el código de 6 dígitos', desc: 'No lo guardes en notas, capturas ni mensajes. Es temporal y personal.' },
        ].map(({ icon, title, desc }) => (
          <Box key={title} sx={{ display: 'flex', gap: 1.5 }}>
            {icon}
            <Box>
              <Typography variant="body2" fontWeight={700}>{title}</Typography>
              <Typography variant="body2" color="text.secondary">{desc}</Typography>
            </Box>
          </Box>
        ))}
      </Stack>

      <Divider />

      <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px !important', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <QrCodeScannerIcon color="primary" fontSize="small" />
            <Typography variant="body2" fontWeight={700}>¿Cómo leo el QR la primera vez?</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              El QR se muestra cuando activas 2FA desde la configuración de seguridad de tu cuenta.
            </Typography>
            <Box component="ol" sx={{ pl: 2.5, m: 0 }}>
              {[
                'Instala o abre una app autenticadora en tu teléfono.',
                'En la app, selecciona agregar cuenta o escanear código QR.',
                'Apunta la cámara al QR que muestra el sistema.',
                'La app agregará la cuenta y empezará a mostrar códigos de 6 dígitos.',
                'Guarda los códigos de recuperación en un lugar seguro.',
              ].map((paso) => (
                <Typography key={paso} component="li" variant="body2" sx={{ mb: 0.75 }}>{paso}</Typography>
              ))}
            </Box>
            <Alert severity="warning">
              Si pierdes el teléfono sin códigos de recuperación, necesitarás soporte administrativo.
            </Alert>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );

  if (compacto) {
    return (
      <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', bgcolor: 'background.paper', '&:before': { display: 'none' }, overflow: 'hidden' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon color="primary" />} sx={{ px: 2, py: 1, '& .MuiAccordionSummary-content': { my: 0 } }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 34, height: 34 }}>
              <SecurityIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} lineHeight={1.2}>Autenticación en dos pasos</Typography>
              <Typography variant="caption" color="text.secondary">¿Necesitas ayuda? Despliega para ver el tutorial.</Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pb: 2.5, pt: 0 }}>{contenido}</AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Card elevation={3} sx={{ borderRadius: 2, bgcolor: '#ffffff' }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>{contenido}</CardContent>
    </Card>
  );
}

/**
 * Página principal de login.
 *
 * Flujo normal:
 *
 * 1. El usuario ingresa correo y contraseña.
 * 2. Se envían credenciales al backend mediante `authApi.login`.
 * 3. Si el backend responde `auth: true`, se carga la sesión desde `AuthContext`.
 * 4. El usuario es redirigido a `/riesgos`.
 *
 * Flujo con 2FA:
 *
 * 1. El usuario ingresa correo y contraseña.
 * 2. Si el backend responde `requiere2FA: true`, se muestra el formulario 2FA.
 * 3. El usuario ingresa código TOTP o código de recuperación.
 * 4. Se valida con `authApi.verificar2FA`.
 * 5. Si es correcto, se carga sesión y se redirige a `/riesgos`.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { cargarSesion } = useAuth();

  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [codigo2FA, setCodigo2FA] = React.useState("");

  const [mostrar, setMostrar] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [paso2FA, setPaso2FA] = React.useState(false);

  const [alerta, setAlerta] = React.useState({
    open: false,
    tipo: "success",
    mensaje: "",
  });

  /**
   * Limpia cualquier sesión local previa al montar el login.
   *
   * Esto evita que queden tokens antiguos, datos viejos o residuos de sesión
   * si el usuario vuelve manualmente al login.
   */
  React.useEffect(() => {
    limpiarSesionLocal();
  }, []);

  /**
   * Muestra una alerta en pantalla.
   *
   * @param {"success"|"info"|"warning"|"error"} tipo Tipo visual de alerta.
   * @param {string} mensaje Mensaje que se mostrará al usuario.
   * @returns {void}
   */
  const mostrarAlerta = (tipo, mensaje) => {
    setAlerta({
      open: true,
      tipo,
      mensaje,
    });
  };

  /**
   * Cierra la alerta activa.
   *
   * Ignora el cierre por clickaway para evitar que desaparezca accidentalmente.
   *
   * @param {React.SyntheticEvent | Event} _e Evento de cierre.
   * @param {string} reason Razón del cierre.
   * @returns {void}
   */
  const handleCloseAlerta = (_e, reason) => {
    if (reason === "clickaway") return;
    setAlerta((prev) => ({ ...prev, open: false }));
  };

  /**
   * Finaliza el inicio de sesión.
   *
   * Limpia residuos locales, solicita al AuthContext cargar la sesión actual
   * desde el backend y redirige al módulo de Riesgos.
   *
   * @param {string} mensaje Mensaje de éxito.
   * @returns {Promise<void>}
   */
  const finalizarLogin = async (mensaje) => {
    limpiarSesionLocal();

    await cargarSesion();

    mostrarAlerta("success", mensaje || "Inicio de sesión exitoso");

    navigate("/riesgos", { replace: true });
  };

  /**
   * Envía las credenciales principales al backend.
   *
   * Puede terminar en tres escenarios:
   *
   * - Credenciales inválidas.
   * - Login exitoso sin 2FA.
   * - Login correcto, pero pendiente de verificar 2FA.
   *
   * @param {React.FormEvent<HTMLFormElement>} e Evento de envío.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!email || !pass) {
      mostrarAlerta("info", "Ingrese correo y contraseña");
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.login({
        usuario: email,
        contra: pass,
      });

      const data = response?.data || {};

      if (data.requiere2FA) {
        setPaso2FA(true);
        setCodigo2FA("");
        mostrarAlerta(
          "info",
          data.message || "Ingrese el código de su aplicación autenticadora"
        );
        return;
      }

      if (!data.auth) {
        mostrarAlerta("error", data.message || "Credenciales inválidas");
        return;
      }

      await finalizarLogin(data.message || "Inicio de sesión exitoso");
    } catch (err) {
      console.error("[LOGIN][ERR]", err);

      mostrarAlerta(
        "error",
        err?.response?.data?.message ||
        err?.message ||
        "Error al iniciar sesión"
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica el código 2FA ingresado por el usuario.
   *
   * Acepta:
   *
   * - Código TOTP de 6 dígitos.
   * - Código de recuperación.
   *
   * @param {React.FormEvent<HTMLFormElement>} e Evento de envío.
   * @returns {Promise<void>}
   */
  const handleVerificar2FA = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!codigo2FA) {
      mostrarAlerta("info", "Ingrese el código de verificación");
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.verificar2FA({
        codigo: codigo2FA,
      });

      const data = response?.data || {};

      if (!data.auth) {
        mostrarAlerta("error", data.message || "Código inválido");
        return;
      }

      await finalizarLogin(data.message || "Inicio de sesión exitoso");
    } catch (err) {
      console.error("[LOGIN_2FA][ERR]", err);

      mostrarAlerta(
        "error",
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo verificar el código"
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Regresa del paso 2FA al formulario principal de login.
   *
   * Limpia:
   * - Código 2FA.
   * - Contraseña.
   * - Estado del paso 2FA.
   *
   * @returns {void}
   */
  const volverAlLogin = () => {
    setPaso2FA(false);
    setCodigo2FA("");
    setPass("");
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
          py: { xs: 4, md: 6 },
          backgroundColor: "background.default",
        }}
      >
        <Container maxWidth={paso2FA ? "md" : "sm"} disableGutters>


          {paso2FA ? (
            <Box sx={{ textAlign: "center", mb: 4, mt: 8 }}>
              <Avatar
                sx={{
                  mx: "auto",
                  mb: 2.5,
                  width: 64,
                  height: 64,
                  bgcolor: paso2FA ? "primary.main" : "grey.200",
                  color: paso2FA ? "primary.contrastText" : "grey.600",
                }}
              >
                <SecurityIcon fontSize="large" />
              </Avatar>
              <Typography
                variant="h5"
                fontWeight={800}
                color="text.primary"
                sx={{ mb: 1, letterSpacing: '-0.02em' }}
              >
                Verificación de seguridad
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  lineHeight: 1.2,
                  mb: 1
                }}
              >
                Ingrese el código generado por su aplicación autenticadora
              </Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <img
                src={inicio}
                alt="Sistema de Gestión de Riesgos"
                style={{ width: '70%', maxWidth: 420, height: 'auto', objectFit: 'contain' }}
              />
            </Box>
          )}


          {!paso2FA ? (
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                overflow: 'visible',
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
                <Box sx={{ textAlign: "center", mb: 4 }}>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color="text.primary"
                    sx={{ mb: 1, letterSpacing: '-0.02em' }}
                  >
                    Iniciar Sesión
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 600,
                      color: 'primary.main',
                      lineHeight: 1.2,
                      mb: 1
                    }}
                  >
                    Sistema de Gestión de Riesgos
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 400, mb: 3 }}
                  >
                    Ingrese sus credenciales para acceder
                  </Typography>
                </Box>
                <Box component="form" noValidate onSubmit={handleSubmit}>
                  <Stack spacing={2.5}>
                    <TextField
                      id="email"
                      name="email"
                      label="Correo Electrónico"
                      placeholder="ejemplo@correo.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                    />

                    <TextField
                      id="password"
                      name="password"
                      label="Contraseña"
                      placeholder="••••••••"
                      type={mostrar ? "text" : "password"}
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      required
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setMostrar((m) => !m)}
                              edge="end"
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
                      sx={{
                        py: 1.8,
                        mt: 1.5,
                        fontWeight: 700,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontSize: '1rem',
                        boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)', // Ajusta al color de tu tema
                      }}
                    >
                      {loading ? "Ingresando..." : "Iniciar Sesión"}
                    </Button>

                    <Box sx={{ textAlign: "center" }}>
                      <Link
                        href="/recuperar"
                        underline="none"
                        color="primary"
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </Box>

                    <Divider />

                    <TutorialAutenticador compacto />
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" },
                gap: 3,
                alignItems: "start",
              }}
            >
              <Card elevation={6} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  <Box component="form" noValidate onSubmit={handleVerificar2FA}>
                    <Stack spacing={2.5}>
                      <Box>
                        <Chip
                          icon={<SecurityIcon />}
                          label="Segundo factor requerido"
                          color="primary"
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />

                        <Typography variant="body2" color="text.secondary">
                          Ya validamos su correo y contraseña. Para completar el
                          inicio de sesión, ingrese el código temporal de su app
                          autenticadora.
                        </Typography>
                      </Box>

                      <TextField
                        id="codigo2FA"
                        name="codigo2FA"
                        label="Código de autenticación"
                        placeholder="123456"
                        type="text"
                        autoComplete="one-time-code"
                        value={codigo2FA}
                        onChange={(e) => setCodigo2FA(e.target.value)}
                        required
                        fullWidth
                        inputProps={{
                          inputMode: "numeric",
                          maxLength: 20,
                        }}
                        helperText="Puede ingresar el código de 6 dígitos o un código de recuperación."
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                        fullWidth
                        sx={{ py: 1.25, fontWeight: 700 }}
                      >
                        {loading ? "Verificando..." : "Verificar e ingresar"}
                      </Button>

                      <Button
                        type="button"
                        variant="text"
                        color="inherit"
                        startIcon={<ArrowBackIcon />}
                        disabled={loading}
                        onClick={volverAlLogin}
                        fullWidth
                      >
                        Cambiar usuario
                      </Button>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>

              <TutorialAutenticador />
            </Box>
          )}
        </Container>
      </Box>

      <Snackbar
        open={alerta.open}
        autoHideDuration={4000}
        onClose={handleCloseAlerta}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseAlerta}
          severity={alerta.tipo}
          variant="filled"
          elevation={6}
          sx={{ width: "100%" }}
        >
          {alerta.mensaje}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
