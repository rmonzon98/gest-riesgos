import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function getCookie(nombre) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${nombre}=`);
    if (parts.length === 2) {
        return decodeURIComponent(parts.pop().split(";").shift());
    }
    return "";
}

export function getCsrfToken() {
    return getCookie("csrf_token");
}

export function limpiarSesionLocal() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
}

const plainClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
});

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
});

let isRefreshing = false;
let refreshQueue = [];

function processRefreshQueue(error) {
    refreshQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve();
    });

    refreshQueue = [];
}

function isSafeMethod(method) {
    return ["get", "head", "options"].includes(String(method || "get").toLowerCase());
}

function shouldSkipRefresh(url = "") {
    const cleanUrl = String(url);

    return (
        cleanUrl.includes("/api/login-actualizados/refresh") ||
        cleanUrl.includes("/api/login-actualizados/logout") ||
        cleanUrl.endsWith("/api/login-actualizados") ||
        cleanUrl.includes("/api/login-actualizados/verificar-2fa")
    );
}

function addCsrfHeader(config) {
    const method = String(config.method || "get").toLowerCase();

    if (!isSafeMethod(method)) {
        const csrfToken = getCsrfToken();

        if (csrfToken) {
            config.headers = config.headers || {};
            config.headers["X-CSRF-Token"] = csrfToken;
        }
    }

    return config;
}

function installInterceptors(instance) {
    if (instance.__gestionRiesgosInterceptorsInstalled) return;

    instance.interceptors.request.use(
        (config) => addCsrfHeader(config),
        (error) => Promise.reject(error)
    );

    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error?.config;
            const status = error?.response?.status;
            const url = originalRequest?.url || "";

            if (!originalRequest || status !== 401 || originalRequest._retry || shouldSkipRefresh(url)) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    refreshQueue.push({ resolve, reject });
                })
                    .then(() => {
                        const csrfToken = getCsrfToken();

                        if (csrfToken) {
                            originalRequest.headers = originalRequest.headers || {};
                            originalRequest.headers["X-CSRF-Token"] = csrfToken;
                        }

                        return instance(originalRequest);
                    })
                    .catch((queueError) => Promise.reject(queueError));
            }

            isRefreshing = true;

            try {
                await plainClient.post("/api/login-actualizados/refresh");

                processRefreshQueue(null);

                const csrfToken = getCsrfToken();

                if (csrfToken) {
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers["X-CSRF-Token"] = csrfToken;
                }

                return instance(originalRequest);
            } catch (refreshError) {
                processRefreshQueue(refreshError);
                limpiarSesionLocal();

                window.dispatchEvent(new Event("auth:logout"));

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
    );

    instance.__gestionRiesgosInterceptorsInstalled = true;
}

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;
axios.defaults.timeout = 30000;

installInterceptors(apiClient);
installInterceptors(axios);

export const authApi = {
    login: ({ usuario, contra }) =>
        apiClient.post("/api/login-actualizados", {
            usuario,
            contra,
        }),

    verificar2FA: ({ codigo }) =>
        apiClient.post("/api/login-actualizados/verificar-2fa", {
            codigo,
        }),

    refresh: () => plainClient.post("/api/login-actualizados/refresh"),

    logout: () => apiClient.post("/api/login-actualizados/logout"),

    me: () => apiClient.get("/api/login-actualizados/me"),

    setupTOTP: () => apiClient.post("/api/login-actualizados/2fa/totp/setup"),

    confirmarTOTP: ({ codigo }) =>
        apiClient.post("/api/login-actualizados/2fa/totp/confirmar", {
            codigo,
        }),

    desactivarTOTP: ({ codigo }) =>
        apiClient.post("/api/login-actualizados/2fa/totp/desactivar", {
            codigo,
        }),
};

export default apiClient;
