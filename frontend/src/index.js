/**
 * @fileoverview 
 * Punto de entrada del frontend. Configura Axios (baseURL) y monta el árbol de React.
 *
 * @module /index
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { createRoot } from 'react-dom/client';
import App from './App';
import Axios from 'axios';
import './styles/global.scss';

/**
 * Configuración global de Axios para llamadas HTTP.
 * Toma la URL base desde la variable de entorno de la app.
 */
Axios.defaults.baseURL = process.env.REACT_APP_API_URL;

/**
 * Montaje del árbol de React en el contenedor raíz.
 */
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<App />);
