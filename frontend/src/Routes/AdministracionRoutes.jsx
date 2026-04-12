/**
 * @fileoverview 
 * Rutas del módulo de Administración (aplicaciones, colaboradores, direcciones, instituciones, unidades).
 * Gestiona el enrutamiento interno bajo el segmento de administración.
 *
 * @module Routes/AdministracionRoutes
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { lazy } from "react";
import { Route, Routes } from "react-router-dom";

//Vistas
const AdministracionMain = lazy(() => import("Administracion/AdministracionMain.jsx"));
const Aplicaciones = lazy(() => import("Administracion/Aplicaciones.jsx"));
const Direcciones = lazy(() => import("Administracion/Direcciones.jsx"));
const Instituciones = lazy(() => import("Administracion/Instituciones.jsx"));
const Personas = lazy(() => import("Administracion/Personas.jsx"));
const Unidades = lazy(() => import("Administracion/Unidades.jsx"));

/**
 * AdministracionRoutes
 *
 * Define las rutas internas del módulo de Administración y su vista índice.
 *
 * - Carga diferida (lazy) de pantallas.
 * - Mapea `path` → `element` bajo el contenedor de administración.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function AdministracionRoutes() {
    return (
        <Routes>
            <Route index element={<AdministracionMain />} />
            <Route path="aplicaciones" element={<Aplicaciones />} />
            <Route path="colaboradores" element={<Personas />} />
            <Route path="direcciones" element={<Direcciones />} />
            <Route path="instituciones" element={<Instituciones />} />
            <Route path="unidades" element={<Unidades />} />
        </Routes>
    );
}