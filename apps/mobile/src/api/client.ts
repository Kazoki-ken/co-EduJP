import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ─────────────────────────────────────────────────────────────────────────────
// Base URL — three-tier resolution
//
//  1. EXPO_PUBLIC_API_URL in .env  ← best for physical devices (set your LAN IP)
//  2. app.json  extra.apiUrl       ← fallback per-environment override
//  3. Platform fallback            ← Android emulator uses 10.0.2.2,
//                                     iOS simulator / web use localhost
//
// To change for your device: edit apps/mobile/.env
//   EXPO_PUBLIC_API_URL=http://192.168.0.168:4000
// ─────────────────────────────────────────────────────────────────────────────
const PLATFORM_FALLBACK =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000'      // Android emulator loopback → host machine
    : 'http://localhost:4000';    // iOS simulator / web

const BASE_URL: string =
  // Priority 1 — .env variable (inlined by Expo at bundle time)
  (process.env.EXPO_PUBLIC_API_URL?.trim() || undefined) ??
  // Priority 2 — app.json extra (runtime, changed without rebuild)
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  // Priority 3 — platform-aware default
  PLATFORM_FALLBACK;

if (__DEV__) {
  console.log(`[API] baseURL → ${BASE_URL}/api`);
}

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    // Bypass tunnel interstitial pages (no-op on real servers):
    'ngrok-skip-browser-warning': 'true',   // ngrok free tier
    'bypass-tunnel-reminder': 'true',       // localtunnel
  },
});

// ─── Secure token helpers ─────────────────────────────────────────
const REFRESH_KEY = 'vocabjp_refresh_token';

export const storeRefreshToken = (token: string) =>
  SecureStore.setItemAsync(REFRESH_KEY, token);

export const loadRefreshToken = () =>
  SecureStore.getItemAsync(REFRESH_KEY);

export const clearRefreshToken = () =>
  SecureStore.deleteItemAsync(REFRESH_KEY);

// ─── In-memory access token ───────────────────────────────────────
let _accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export const getAccessToken = () => _accessToken;

// ─── Request interceptor — attach Bearer header ───────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  if (config.headers) {
    config.headers['x-timezone-offset'] = String(new Date().getTimezoneOffset());
  }
  return config;
});

// ─── Response interceptor — silent refresh on 401 ────────────────
let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string) => {
  _refreshQueue.forEach((resolve) => resolve(token));
  _refreshQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthRoute =
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/register');

    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;

      if (_isRefreshing) {
        return new Promise((resolve) => {
          _refreshQueue.push((newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(original));
          });
        });
      }

      _isRefreshing = true;

      try {
        const storedRefresh = await loadRefreshToken();
        if (!storedRefresh) throw new Error('No refresh token stored');

        const { data } = await axios.post<{ accessToken: string }>(
          `${BASE_URL}/api/auth/refresh`,
          { refreshToken: storedRefresh },
        );

        _accessToken = data.accessToken;
        processQueue(data.accessToken);

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch {
        _accessToken = null;
        processQueue('');
        await clearRefreshToken();
        return Promise.reject(error);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
