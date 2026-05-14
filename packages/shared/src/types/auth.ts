// ─── Auth Request / Response Types ───────────────────────────────────────────

import type { User } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  user: User;
}

export interface ApiError {
  error: string;
}
