/**
 * @fileoverview 
 * Rutas del dominio de Riesgos (administración, anexos, evaluación/gestión, continuidad y monitoreo,
 * mapa de riesgos, informe anual, seguimiento, catálogos, reportes y 404).
 * Centraliza el enrutamiento de todas las secciones funcionales de riesgos.
 *
 * @module Routes/RiesgosRoutes
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { lazy } from "react";
import { Route, Routes } from "react-router-dom";

// Rutas de RIESGOS (todas viven bajo HomeContainer)
const AdminView = lazy(() => import("./../Riesgos/Admin F/General/AdminView.jsx"));
const AdminDireccion = lazy(() => import("./../Riesgos/Admin F/Direccion/AdminDireccion.jsx"));
const AreasMain = lazy(() => import("../Riesgos/Areas/AreasMain.jsx"));
const Anexo1Form = lazy(() => import("../Riesgos/Anexo 1/Anexo1Form.jsx"));
const Anexo1Institucional = lazy(() => import("../Riesgos/Anexo 1/Anexo1Institucional.jsx"));
const Anexo1Mant = lazy(() => import("../Riesgos/Anexo 1/Anexo1Mant.jsx"));
const Anexo1Sup = lazy(() => import("../Riesgos/Anexo 1/Anexo1Sup.jsx"));
const Anexo1Superior = lazy(() => import("../Riesgos/Anexo 1/Anexo1Superior.jsx"));
const Anexo2Form = lazy(() => import("../Riesgos/Anexo 2/Anexo2Form.jsx"));
const Anexo2Institucional = lazy(() => import("../Riesgos/Anexo 2/Anexo2Institucional.jsx"));
const Anexo2Mant = lazy(() => import("../Riesgos/Anexo 2/Anexo2Mant.jsx"));
const Anexo2Sup = lazy(() => import("../Riesgos/Anexo 2/Anexo2Sup.jsx"));
const Anexo2Superior = lazy(() => import("../Riesgos/Anexo 2/Anexo2Superior.jsx"));
const ConsolidacionReporteModulos = lazy(() => import("../Riesgos/Consolidacion/ConsolidacionReporteModulos.jsx"))
const Continuidad = lazy(() => import("./../Riesgos/Comportamiento/Relaciones riesgos/Continuidad.jsx"));
const DireccionesMain = lazy(() => import("../Riesgos/Unidades/DireccionesMain.jsx"));
const Home = lazy(() => import("../Riesgos/Home/Home.jsx"));
const InformeAnual = lazy(() => import("../Riesgos/Informe Anual/InformeAnual.jsx"));
const IngresoRiesgos = lazy(() => import("./../Riesgos/Evaluacion riesgos F/Ingreso/IngresoRiesgos.jsx"));
const Logs = lazy(() => import("./../Riesgos/Admin F/General/Logs.jsx"))
const JuntarPDF = lazy(() => import("./../Riesgos/Juntar PDF/JuntarPDF.jsx"));
const MantenimientoRiesgosMain = lazy(() => import("./../Riesgos/Evaluacion riesgos F/Mantenimiento/MantenimientoRiesgosMain.jsx"))
const MetricasDashboard = lazy(() => import("./../Riesgos/Admin F/General/MetricasDashboard.jsx"))
const ObjetivosMain = lazy(() => import("../Riesgos/Objetivos/ObjetivosMain.jsx"));
const OrganosMain = lazy(() => import("../Riesgos/Organos/OrganosMain.jsx"));
const PageNotFound = lazy(() => import("./../PageNotFound/PageNotFound.jsx"))
const PeriodosMain = lazy(() => import("../Riesgos/Periodo/PeriodosMain.jsx"));
const Perfil = lazy(() => import("../Riesgos/Perfil/Perfil.jsx"))
const ReportesMain = lazy(() => import("./../Riesgos/Reportes F/ReportesMain.jsx"));
const RiesgoInstitucional = lazy(() => import("./../Riesgos/Evaluacion riesgos F/Institucion/RiesgosInstitucional.jsx"))
const RiesgosRevision = lazy(() => import("./../Riesgos/Evaluacion riesgos F/Revision/RiesgosRevision.jsx"));
const RiesgosRevisionSuperior = lazy(() => import("Riesgos/Evaluacion riesgos F/Revision/RiesgosRevisionSuperior.jsx"));
const SeguimientoGeneral = lazy(() => import("./../Riesgos/Comportamiento/Seguimiento/SeguimientoGeneral.jsx"));
const TipoObjetivoMain = lazy(() => import("../Riesgos/Tipo Objetivo/TipoObjetivoMain.jsx"));
const VisualizacionArchivos = lazy(() => import("../Riesgos/Visualizacion Archivos/VisualizacionArchivos.jsx"));
const VisualizacionArchivosInstitucionales = lazy(() => import("../Riesgos/Visualizacion Archivos/VisualizacionArchivosInstitucionales.jsx"));
const ViceministeriosMain = lazy(() => import("../Riesgos/Viceministerio/ViceministeriosMain.jsx"));
const VisualizacionSeguimientos = lazy(() => import("./../Riesgos/Comportamiento/Consolidado/VisualizacionSeguimientos.jsx"));

/**
 * RiesgosRoutes
 *
 * Declara el árbol de rutas del dominio de Riesgos, incluyendo administración,
 * anexos, evaluación y gestión, continuidad/monitoreo, mapa, informe, seguimiento,
 * catálogos y reportes.
 *
 * - Carga diferida (lazy) por sección.
 * - Mapea rutas con parámetros estáticos y variantes por tipo/categoría.
 * - Incluye la ruta de “no encontrado” como catch-all.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function RiesgosRoutes() {
    return (
        <Routes>
            <Route index element={<Home />} />

            {/* Administración */}
            <Route path="administracion" element={<AdminView />} />
            <Route path="administracion-direccion" element={<AdminDireccion />} />
            <Route path="logs-riesgos" element={<Logs />} />
            <Route path="metricas" element={<MetricasDashboard />} />

            {/* Módulo de Control Interno y Gobernanza */}
            <Route path="control-interno-gobernanza-consolidado" element={<ConsolidacionReporteModulos categoria={1} titulo={'Consolidado de documentos de evaluación de la eficiencia del control interno y gobernanza'} />} />
            <Route path="control-interno-gobernanza" element={<Anexo1Form />} />
            <Route path="control-interno-gobernanza-institucional" element={<Anexo1Institucional />} />
            <Route path="control-interno-gobernanza-mantenimiento" element={<Anexo1Mant />} />
            <Route path="control-interno-gobernanza-revision" element={<Anexo1Sup />} />
            <Route path="control-interno-gobernanza-revision-superior" element={<Anexo1Superior />} />

            {/* Módulo de Evaluación de Riesgos asociados al Fraude o Corrupción */}
            <Route path="riesgos-fraude-corrupcion-consolidado" element={<ConsolidacionReporteModulos categoria={2} titulo={'Consolidado de documentos de riesgos de fraude o corrupción'} />} />
            <Route path="riesgos-fraude-corrupcion" element={<Anexo2Form />} />
            <Route path="riesgos-fraude-corrupcion-institucional" element={<Anexo2Institucional />} />
            <Route path="riesgos-fraude-corrupcion-mantenimiento" element={<Anexo2Mant />} />
            <Route path="riesgos-fraude-corrupcion-revision-superior" element={<Anexo2Superior />} />
            <Route path="riesgos-fraude-corrupcion-revision" element={<Anexo2Sup />} />

            {/* Módulo de Evaluación y Gestión del Riesgo */}
            <Route path="evaluacion-gestion-riesgos-consolidado" element={<ConsolidacionReporteModulos categoria={3} titulo={'Consolidación de evaluación y gestión de riesgos'} />} />
            <Route path="evaluacion-gestion-riesgos" element={<IngresoRiesgos tipo={'ME'} titulo={'Entrada de evaluación y gestión de riesgos'} />} />
            <Route path="evaluacion-gestion-riesgos-revision" element={<RiesgosRevision tipo={'ME'} titulo={'Revisión de evaluación y gestión de riesgos'} />} />
            <Route path="evaluacion-gestion-riesgos-revision-superior" element={<RiesgosRevisionSuperior tipo={'ME'} titulo={'Revisión de superior de evaluación y gestión de riesgos'} />} />
            <Route path="riesgos-institucional" element={<RiesgoInstitucional />} />


            {/* Módulo de Continuidad y monitoreo */}
            <Route path="continuidad-monitoreo-consolidado" element={<ConsolidacionReporteModulos categoria={3} titulo={'Consolidación de continuidad y monitoreo'} />} />
            <Route path="continuidad-monitoreo-revision" element={<RiesgosRevision tipo={'MCE'} titulo={'Revisión de continuidad y monitoreo'} />} />
            <Route path="continuidad-monitoreo-revision-superior" element={<RiesgosRevisionSuperior tipo={'MCE'} titulo={'Revisión de superior de continuidad y monitoreo'} />} />
            <Route path="continuidad-monitoreo" element={<IngresoRiesgos tipo={'MCE'} titulo={'Entrada de continuidad y monitoreo'} />} />

            {/* Módulo de Mapa de Riesgos */}
            <Route path="mapa-riesgos-consolidado" element={<ConsolidacionReporteModulos categoria={3} titulo={'Consolidación de mapa de riesgos'} />} />
            <Route path="mapa-riesgos-revision" element={<RiesgosRevision tipo={'MC'} titulo={'Revisión de mapa de riesgos'} />} />
            <Route path="/mapa-riesgos-revision-superior" element={<RiesgosRevisionSuperior tipo={'MC'} titulo={'Revisión de superior de mapa de riesgos'} />} />
            <Route path="mapa-riesgos" element={<IngresoRiesgos tipo={'MC'} titulo={'Entrada de mapa de riesgos'} />} />

            {/* Módulo de Informe Anual */}
            <Route path="informe-anual" element={<InformeAnual />} />

            {/* Módulo de Monitoreo del Comportamiento de los Riesgos */}
            <Route path="seguimiento-riesgos" element={<SeguimientoGeneral />} />
            <Route path="seguimiento-riesgos-institucional" element={<VisualizacionSeguimientos />} />
            <Route path="continuidad-monitoreo-riesgos" element={<Continuidad />} />

            {/* Módulo de Reportes */}
            <Route path="reportes-riesgos" element={<ReportesMain />} />

            {/* Catalogos */}
            <Route path="areas" element={<AreasMain />} />
            <Route path="direccion" element={<DireccionesMain />} />
            <Route path="tiposobjetivos" element={<TipoObjetivoMain />} />
            <Route path="objetivos" element={<ObjetivosMain />} />
            <Route path="organos" element={<OrganosMain />} />
            <Route path="periodos" element={<PeriodosMain />} />
            <Route path="riesgos-mantenimiento" element={<MantenimientoRiesgosMain />} />
            <Route path="viceministerio" element={<ViceministeriosMain />} />

            {/* Perfil */}
            <Route path="perfil" element={<Perfil />} />

            {/* Otros */}
            {/* Archivos / PDFs */}
            <Route path="archivos" element={<VisualizacionArchivos />} />
            <Route path="archivos-institucionales" element={<VisualizacionArchivosInstitucionales />} />
            <Route path="juntar-pdf" element={<JuntarPDF />} />
            {/* Institucionales */}


            {/* 404 */}
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
}
