/**
 * @fileoverview
 * Composición principal del frontend y enrutamiento de alto nivel.
 * Define rutas públicas, rutas protegidas y el contenedor principal de Riesgos.
 *
 * @module /App
 * @version 1.1
 * @author Equipo de Desarrollo
 */

import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Rutas hijas
import RiesgosRoutes from "Routes/RiesgosRoutes";

// Guards
import RequirePermission from "funciones/RequirePermission.jsx";

// Contexto de autenticación
import { useAuth } from "./context/AuthContext";

// Layouts y componentes
const HomeContainer = lazy(() => import("Riesgos/Home/HomeContainer.jsx"));
const Login = lazy(() => import("Login/login.jsx"));
const PasswordRecovery = lazy(() => import("./RecuperarContra/PasswordRecovery"));
const PageNotFound = lazy(() => import("PageNotFound/PageNotFound.jsx"));

/**
 * Pantalla de carga global.
 *
 * Se muestra mientras:
 * - Se carga una ruta lazy.
 * - Se valida la sesión actual.
 *
 * @component
 * @returns {JSX.Element}
 */
function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "Inter, Noto Sans, sans-serif",
        color: "#4a5568",
      }}
    >
      Cargando…
    </div>
  );
}

/**
 * Wrapper para rutas protegidas.
 *
 * Si la autenticación aún se está validando, muestra pantalla de carga.
 * Si no hay sesión activa, redirige al login.
 *
 * @component
 * @param {object} props
 * @param {React.ReactNode} props.children Contenido protegido.
 * @returns {JSX.Element}
 */
function RequireAuth({ children }) {
  const { autenticado, authLoading } = useAuth();

  if (authLoading) return <LoadingScreen />;

  if (!autenticado) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * Wrapper para rutas públicas exclusivas de usuarios anónimos.
 *
 * Si el usuario ya está autenticado, lo redirige al módulo de Riesgos.
 *
 * @component
 * @param {object} props
 * @param {React.ReactNode} props.children Contenido público.
 * @returns {JSX.Element}
 */
function RequireAnon({ children }) {
  const { autenticado, authLoading } = useAuth();

  if (authLoading) return <LoadingScreen />;

  if (autenticado) {
    return <Navigate to="/riesgos" replace />;
  }

  return children;
}

/**
 * App
 *
 * Componente raíz del frontend.
 *
 * Define:
 * - Login.
 * - Recuperación de contraseña.
 * - Rutas protegidas de Riesgos.
 * - Validación de permisos por aplicación.
 * - Página 404.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/"
            element={
              <RequireAnon>
                <Login />
              </RequireAnon>
            }
          />

          <Route
            path="/recuperar"
            element={
              <RequireAnon>
                <PasswordRecovery />
              </RequireAnon>
            }
          />

          <Route
            path="/recuperar-contraseña"
            element={
              <RequireAnon>
                <PasswordRecovery />
              </RequireAnon>
            }
          />

          <Route
            path="/riesgos/*"
            element={
              <RequireAuth>
                <RequirePermission app="riesgos">
                  <HomeContainer />
                </RequirePermission>
              </RequireAuth>
            }
          >
            <Route path="*" element={<RiesgosRoutes />} />
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}