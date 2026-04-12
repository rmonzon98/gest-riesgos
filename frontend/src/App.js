/**
 * @fileoverview 
 * Composición principal del frontend y enrutamiento de alto nivel.
 * Define rutas públicas (login, recuperación), rutas protegidas y el contenedor de Riesgos.
 *
 * @module /App
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Rutas hijas
import RiesgosRoutes from "Routes/RiesgosRoutes";

// Guards
import RequirePermission from "funciones/RequirePermission.jsx";

// Layouts y componentes
const HomeContainer = lazy(() => import("Riesgos/Home/HomeContainer.jsx"));
const Login = lazy(() => import("Login/login.jsx"));
const PasswordRecovery = lazy(() => import("./RecuperarContra/PasswordRecovery"));
const PageNotFound = lazy(() => import("PageNotFound/PageNotFound.jsx"));

/**
 * Determina si existe sesión activa (token JWT presente).
 * @returns {boolean}
 */
const isLoggedIn = () => localStorage.getItem("token") !== null;

/**
 * Wrapper para rutas que requieren estar autenticado.
 * Si no hay sesión, redirige al login.
 * @component
 */
const RequireAuth = ({ children }) =>
  isLoggedIn() ? children : <Navigate to="/" replace />;

/**
 * Wrapper para rutas solo para anónimos (login, recuperación).
 * Si ya hay sesión, redirige al dominio de riesgos.
 * @component
 */
const RequireAnon = ({ children }) =>
  isLoggedIn() ? <Navigate to="/riesgos" replace /> : children;

/**
 * App: Componente raíz de enrutamiento.
 *
 * - Orquesta el router y la carga diferida (lazy) de páginas.
 * - Define rutas públicas y protegidas por permiso específico (`RequirePermission`).
 * - Maneja pantalla 404 como catch-all.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <Router>
      <Suspense fallback={<div>Cargando…</div>}>
        <Routes>
          {/* Raíz pública: Login */}
          <Route
            path="/"
            element={
              <RequireAnon>
                <Login />
              </RequireAnon>
            }
          />

          {/* Recuperación de contraseña (solo anónimos) */}
          <Route
            path="/recuperar-contraseña"
            element={
              <RequireAnon>
                <PasswordRecovery />
              </RequireAnon>
            }
          />

          {/* Dominio RIESGOS (requiere permiso "riesgos") */}
          <Route
            path="/riesgos/*"
            element={
              <RequirePermission app="riesgos">
                <HomeContainer />
              </RequirePermission>
            }
          >
            {/* Las rutas hijas viven dentro de HomeContainer (Outlet) */}
            <Route path="*" element={<RiesgosRoutes />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
