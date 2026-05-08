export type AdminTokenSource = 'admin_user' | 'aircpm_user';

export interface AdminUser {
  id: number;
  username: string;
  name: string;
  role: string;
  organization?: unknown;
  // 토큰 발급 출처. 미지정시 'admin_user' 로 간주 (기존 호환).
  tokenSource?: AdminTokenSource;
  // AirCPM 사이트 로그인 한정: 슈퍼 관리자 여부 + 소속 brch_cd.
  isSuper?: boolean;
  brchCd?: string | null;
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
