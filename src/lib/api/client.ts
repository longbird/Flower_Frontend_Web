import { useAuthStore } from '@/lib/auth/store';
import type { TokenRefreshResponse } from '@/lib/types/auth';

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
// 개발환경: Next.js rewrites 프록시를 통해 CORS 우회
const API_BASE_URL = RAW_API_BASE ? '/api/proxy' : '';

let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  // 이미 진행 중인 refresh가 있으면 동일한 Promise를 반환 (race condition 방지)
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken, setTokens, logout, user } = useAuthStore.getState();

    if (!refreshToken) {
      logout();
      throw new Error('No refresh token');
    }

    // aircpm_user 출처 토큰은 사이트 전용 refresh 엔드포인트로 회전
    const refreshPath =
      user?.tokenSource === 'aircpm_user'
        ? '/aircpm/admin-site/auth/refresh'
        : '/admin/auth/refresh';

    try {
      const res = await fetch(`${API_BASE_URL}${refreshPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        logout();
        throw new Error('Token refresh failed');
      }

      const data: TokenRefreshResponse = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch (e) {
      logout();
      throw e;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    const msg =
      data && typeof data === 'object' && 'message' in data
        ? String((data as Record<string, unknown>).message)
        : statusText;
    super(msg);
    this.name = 'ApiError';
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  // 401 -> try refresh (동시 요청은 동일한 refreshPromise를 공유)
  if (res.status === 401 && !path.includes('/auth/')) {
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    } catch {
      throw new ApiError(401, 'Unauthorized');
    }
  }

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {}
    throw new ApiError(res.status, res.statusText, data);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}
