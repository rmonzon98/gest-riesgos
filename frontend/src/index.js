/**
 * @fileoverview 
 * Punto de entrada del frontend. Configura Axios (baseURL) y monta el árbol de React.
 *
 * @module /index
 * @version 1.0
 * @author Equipo de Desarrollo
 */
import { createRoot } from "react-dom/client";
import App from "./App";
import "./api/apiClient";
import { AuthProvider } from "./context/AuthContext";
import "./styles/global.scss";

/**
 * Montaje del árbol de React en el contenedor raíz.
 */
const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
    <AuthProvider>
        <App />
    </AuthProvider>
);

