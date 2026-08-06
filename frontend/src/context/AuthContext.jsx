import React from "react";
import { authApi, limpiarSesionLocal } from "../api/apiClient";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = React.useState(null);
    const [authLoading, setAuthLoading] = React.useState(true);

    const cargarSesion = React.useCallback(async () => {
        try {
            limpiarSesionLocal();

            const response = await authApi.me();

            if (response?.data?.auth && response?.data?.user) {
                setUsuario(response.data.user);
                return response.data.user;
            }

            setUsuario(null);
            return null;
        } catch (_err) {
            setUsuario(null);
            return null;
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const logout = React.useCallback(async () => {
        try {
            await authApi.logout();
        } catch (_err) {
            // Aunque falle el logout en backend, limpiamos estado local.
        } finally {
            limpiarSesionLocal();
            setUsuario(null);
        }
    }, []);

    React.useEffect(() => {
        cargarSesion();

        const handleLogout = () => {
            limpiarSesionLocal();
            setUsuario(null);
            setAuthLoading(false);
        };

        window.addEventListener("auth:logout", handleLogout);

        return () => {
            window.removeEventListener("auth:logout", handleLogout);
        };
    }, [cargarSesion]);

    const value = React.useMemo(
        () => ({
            usuario,
            authLoading,
            autenticado: Boolean(usuario),
            cargarSesion,
            logout,
            setUsuario,
        }),
        [usuario, authLoading, cargarSesion, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = React.useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth debe usarse dentro de AuthProvider");
    }

    return context;
}