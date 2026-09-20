import axios from "axios";
import { toast } from "sonner";

const TOKEN_KEY = "lunor_auth";
export const AUTH_STORAGE_KEY = TOKEN_KEY;

const rawAPIURL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_URL = rawAPIURL.includes("/api")
  ? rawAPIURL
  : `${rawAPIURL.replace(/\/+$/, "")}/api`;

export function getStoredAuth() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY));
  } catch {
    return null;
  }
}

export function storeAuth(auth) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";
    if (status === 401) {
      const auth = getStoredAuth();
      const isCredentials = message.toLowerCase().includes("invalid email or password");
      if (auth?.token && !isCredentials) {
        const failedToken = error.config?.headers?.Authorization?.replace(/^Bearer\s+/i, "");
        const isLoginPage = typeof window !== "undefined" && window.location.pathname === "/login";
        if (!failedToken || failedToken === auth.token) {
          clearAuth();
          toast.error(message === "Account is deactivated" ? "Your account has been deactivated" : "Session expired, please sign in again.");
          if (typeof window !== "undefined" && !isLoginPage) {
            window.location.assign("/login");
          }
        }
      }
    }
    return Promise.reject(Object.assign(new Error(message), { status, data: error.response?.data }));
  }
);

export const request = async (config) => {
  try {
    return await api(config);
  } catch (e) {
    throw e;
  }
};

export default api;