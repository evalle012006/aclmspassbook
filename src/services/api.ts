import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { getToken, getRefreshToken, setAccessToken, setRefreshToken, clearToken } from "./auth-storage";

const baseURL = Constants.expoConfig?.extra?.apiBaseUrl as string;

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

// A separate, bare instance for the refresh call itself — it must NOT carry
// the request/response interceptors below, or a failed refresh would trigger
// another refresh attempt on itself.
const refreshClient = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListener = listener;
}

// Concurrent requests can all hit 401 around the same moment (React Query
// fires several queries in parallel) — without this, each one would start
// its own refresh call and race to rotate the same refresh token, and the
// backend's rotation means only the first would succeed. One shared in-flight
// promise means every 401 waits on the same refresh instead of racing it.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const storedRefreshToken = await getRefreshToken();
  if (!storedRefreshToken) return null;

  try {
    const { data } = await refreshClient.post("/auth/refresh", { refreshToken: storedRefreshToken });
    if (data.success && data.token && data.refreshToken) {
      await setAccessToken(data.token);
      await setRefreshToken(data.refreshToken);
      return data.token as string;
    }
    return null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true; // never retry the same request twice

      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh itself failed (expired/revoked/reused refresh token) —
      // this is the actual "session is over" case, not just an expired
      // access token, so now we sign the user out for real.
      await clearToken();
      unauthorizedListener?.();
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (error.code === "ECONNABORTED") return "Request timed out. Check your connection.";
    if (!error.response) return "Can't reach the server. Check your connection.";
  }
  return "Something went wrong. Please try again.";
}
