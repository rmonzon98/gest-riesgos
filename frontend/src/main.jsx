import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./api/apiClient";
import { AuthProvider } from "./context/AuthContext";
import "./styles/global.scss";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
