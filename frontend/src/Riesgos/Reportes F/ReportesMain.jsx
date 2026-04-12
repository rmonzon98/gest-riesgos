/**
 * @fileoverview
 * Vista principal de reportes de riesgos: carga catálogos y muestra
 * las tarjetas de reportes por unidad e institucionales.
 *
 * @module Reportes/Riesgos/ReportesMain
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { Box, Stack, Typography } from '@mui/material';
import ReportesRiesgosUnidadCard from './ReportesRiesgosUnidadCard';
import ReportesInstitucionalesCard from './ReportesInstitucionalesCard';
import axios from 'axios';
import { useState, useEffect } from 'react';
import ReportesControlFraudeUnidadCard from './ReportesControlFraudeUnidadCard';

/**
 * ReportesMain
 *
 * Contenedor principal del submódulo de reportes de riesgos.
 *
 * - Obtiene de la API los catálogos (tipos de riesgo, períodos, unidades).
 * - Obtiene el logo e información de la institución para incrustar en los reportes.
 * - Renderiza las tarjetas de reportes por unidad e institucionales.
 *
 * @component
 * @returns {JSX.Element}
 */
function ReportesMain() {

  const [tipos, setTipos] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [logo, setLogo] = useState('');
  const [institucion, setInstitucion] = useState('')

  /**
 * fetchData
 *
 * Carga los catálogos necesarios para los filtros de reportes.
 *
 * - Consulta tipos de riesgo, períodos y unidades disponibles.
 * - Almacena los resultados en el estado local.
 *
 * @returns {Promise<void>}
 */
  const fetchData = async () => {
    try {
      const { data } = await axios.get('/api/reportes-actualizados/informacion-select', {
        headers: { 'x-access-token': localStorage.getItem('token') }
      });
      setTipos(data.tipos || []);
      setPeriodos(data.periodos || []);
      setUnidades(data.unidades || []);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  /**
   * obtenerLogo
   *
   * Obtiene el logo e información de la institución para los reportes.
   *
   * - Llama al endpoint de logo institucional.
   * - Guarda también el nombre de la institución.
   *
   * @returns {Promise<void>}
   */
  const obtenerLogo = async () => {
    try {
      const { data } = await axios.get('/api/reportes-actualizados/obtener-logo', { headers: { 'x-access-token': localStorage.getItem('token') } });
      setLogo('data:image/png;base64,' + data.logo ?? '');
      setInstitucion(data.nombre)
    } catch (e) {
      console.error('Error cargando períodos', e);
      setPeriodos([]);
    }
  }

  useEffect(() => {
    fetchData();
    obtenerLogo();
  }, []);


  return (
    <Box p={1}>
      <Stack spacing={2} direction="column" mt={2}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Reportes
        </Typography>

        <ReportesControlFraudeUnidadCard unidades={unidades} periodos={periodos} tipos={tipos} logoBase64={logo} />
        <ReportesRiesgosUnidadCard unidades={unidades} periodos={periodos} tipos={tipos} logoBase64={logo} />
        <ReportesInstitucionalesCard periodos={periodos} tipos={tipos} logoBase64={logo} institucion={institucion} />
        {/*<ReportesMonitoreosCard periodos={periodos} unidades={unidades} tipos={tipos} logoBase64={logo} />*/}
      </Stack>
    </Box>
  );
}

export default ReportesMain;
