import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─── Base Axios Instance ──────────────────────────────────────────────────────

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true,       // send httpOnly refresh-token cookie automatically
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Access Token (in-memory store) ──────────────────────────────────────────
// Storing the JWT in memory (not localStorage) avoids XSS token theft.
// The refresh token lives in an httpOnly cookie managed by the browser.

let _accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export const getAccessToken = () => _accessToken;

// ─── Request Interceptor — attach Bearer token ────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ─── Response Interceptor — silent refresh on 401 ────────────────────────────

let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string) => {
  _refreshQueue.forEach((resolve) => resolve(token));
  _refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt a token refresh for 401 errors that haven't been retried yet
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/register')
    ) {
      original._retry = true;

      if (_isRefreshing) {
        // Queue this request until the in-flight refresh completes
        return new Promise((resolve) => {
          _refreshQueue.push((newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(original));
          });
        });
      }

      _isRefreshing = true;

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        _accessToken = data.accessToken;
        processQueue(data.accessToken);

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh failed — clear token and redirect to login
        _accessToken = null;
        processQueue('');
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path !== '/' && path !== '/auth/login' && path !== '/auth/register') {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
