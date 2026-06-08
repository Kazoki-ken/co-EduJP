'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import api, { setAccessToken, getAccessToken } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  streak: number;
  coins: number;
  xp: number;
  league: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  lastLoginDate: string | null;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  profile: UserProfile | null;
  _count: { savedWords: number; badges: number };
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsUsername: boolean;
  pendingGoogleToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  googleLogin: (idToken?: string, accessToken?: string) => Promise<boolean>;
  setUsername: (username: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setTokensAndUser: (newAccessToken: string, newUser: AuthUser, isNew: boolean) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState<string | null>(null);
  // Prevent double-init in React StrictMode
  const initialised = useRef(false);

  // ── Fetch current user from /auth/me ────────────────────────────────────
  const fetchMe = useCallback(async (): Promise<void> => {
    try {
      const { data } = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  // ── Silent refresh on mount ──────────────────────────────────────────────
  // On page load, try to get a new access token from the httpOnly refresh
  // cookie, then fetch /me. If the cookie has expired, user stays null.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const init = async () => {
      try {
        const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
        setAccessToken(data.accessToken);
        await fetchMe();
      } catch {
        // No valid refresh cookie — user is logged out
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [fetchMe]);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const { data } = await api.post<{
        accessToken: string;
        user: AuthUser;
      }>('/auth/login', { email, password });

      setAccessToken(data.accessToken);
      setUser(data.user);
    },
    [],
  );

  // ── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(
    async (username: string, email: string, password: string): Promise<void> => {
      const { data } = await api.post<{
        accessToken: string;
        user: AuthUser;
      }>('/auth/register', { username, email, password });

      setAccessToken(data.accessToken);
      setUser(data.user);
    },
    [],
  );

  // ── Google Login ─────────────────────────────────────────────────────────
  const googleLogin = useCallback(async (idToken?: string, accessToken?: string): Promise<boolean> => {
    const { data } = await api.post<{
      accessToken?: string;
      user?: AuthUser;
      isNewUser?: boolean;
    }>('/auth/google', { idToken, accessToken });

    if (data.isNewUser) {
      // Yangi foydalanuvchi — username setup kerak
      if (data.accessToken) setAccessToken(data.accessToken);
      if (data.user) setUser(data.user);
      setNeedsUsername(true);
      return true; // caller modal ko'rsatadi
    } else if (data.accessToken && data.user) {
      setAccessToken(data.accessToken);
      setUser(data.user);
      setNeedsUsername(false);
      return false; // caller redirect qiladi
    }
    return false;
  }, []);

  // ── Phone Login (External Update) ────────────────────────────────────────
  const setTokensAndUser = useCallback((newAccessToken: string, newUser: AuthUser, isNew: boolean) => {
    setAccessToken(newAccessToken);
    setUser(newUser);
    if (isNew) {
      setNeedsUsername(true);
    }
  }, []);

  // ── Set Username (after Google login) ────────────────────────────────────
  const setUsername = useCallback(async (username: string): Promise<void> => {
    const { data } = await api.patch<{
      message: string;
      user: AuthUser;
    }>('/auth/set-username', { username });
    setUser(data.user);        // username ni yangilash
    setNeedsUsername(false);   // setup modal yopiladi
    setPendingGoogleToken(null);
  }, []);

  // ── Set Password (after Google login, optional) ──────────────────────
  const setPassword = useCallback(async (password: string): Promise<void> => {
    await api.patch('/auth/set-password', { password });
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      setNeedsUsername(false);
      setPendingGoogleToken(null);
    }
  }, []);

  // ── Refresh user data (call after profile updates) ───────────────────────
  const refreshUser = useCallback(async (): Promise<void> => {
    if (getAccessToken()) await fetchMe();
  }, [fetchMe]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        needsUsername,
        pendingGoogleToken,
        login,
        register,
        googleLogin,
        setUsername,
        setPassword,
        logout,
        refreshUser,
        setTokensAndUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
