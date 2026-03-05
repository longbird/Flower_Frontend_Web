export interface AdminUser {
  id: number;
  username: string;
  name: string;
  role: string;
  organization?: unknown;
}

export interface LoginResponse {
  ok: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  token: string; // backward compat duplicate of accessToken
  admin: AdminUser;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}
