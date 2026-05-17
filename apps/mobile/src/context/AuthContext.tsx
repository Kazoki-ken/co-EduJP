import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, AuthResponse } from '@vocabjp/shared';
import apiClient, {
  setAccessToken,
  loadRefreshToken,
  storeRefreshToken,
  clearRefreshToken,
} from '../api/client';

// ─── Context shape ────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Silently refetch /auth/me to refresh XP, coins, streak, etc. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate session from stored refresh token on app launch
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadRefreshToken();
        if (stored) {
          const { data } = await apiClient.post<{ accessToken: string }>(
            '/auth/refresh',
            { refreshToken: stored },
          );
          setAccessToken(data.accessToken);

          const me = await apiClient.get<{ user: User }>('/auth/me');
          setUser(me.data.user);
        }
      } catch {
        // Refresh invalid — start fresh
        await clearRefreshToken();
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<AuthResponse & { refreshToken?: string }>('/auth/login', {
      email,
      password,
    });
    setAccessToken(data.accessToken);
    if (data.refreshToken) await storeRefreshToken(data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const { data } = await apiClient.post<AuthResponse & { refreshToken?: string }>('/auth/register', {
        username,
        email,
        password,
      });
      setAccessToken(data.accessToken);
      if (data.refreshToken) await storeRefreshToken(data.refreshToken);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setAccessToken(null);
      await clearRefreshToken();
      setUser(null);
    }
  }, []);

  /** Silently pull fresh user data from the server */
  const refreshUser = useCallback(async () => {
    try {
      const me = await apiClient.get<{ user: User }>('/auth/me');
      setUser(me.data.user);
    } catch {
      // silent — keep stale data
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
