import { api } from './client';

// ─── Types ─────────────────────────────────────────────────────────

export type AircpmCertStatus = 'pending' | 'approved' | 'rejected';

export interface AircpmCertRequest {
  id: number;
  userId: string;
  name: string | null;
  brchCd: string | null;
  serial: string;
  macAddress: string | null;
  computerName: string | null;
  realIp: string | null;
  phone: string | null;
  status: AircpmCertStatus;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  rejectReason: string | null;
}

export interface AircpmCertListResponse {
  items: AircpmCertRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface AircpmUser {
  id: number;
  userId: string;
  name: string | null;
  brchCd: string | null;
  power: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AircpmUserListResponse {
  items: AircpmUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AircpmUserSettings {
  // 백엔드는 미설정 시 null을 반환. UI에서는 기본값 "AirCPM"로 대체.
  appTitle: string | null;
  copyApps: [boolean, boolean, boolean, boolean];
  pasteApps: [boolean, boolean, boolean, boolean];
  priceUp: boolean;
}

// ─── Cert requests ─────────────────────────────────────────────────

export interface ListCertRequestsParams {
  status?: AircpmCertStatus | 'all';
  userId?: string;
  page?: number;
  limit?: number;
}

export async function listAircpmCertRequests(params: ListCertRequestsParams = {}) {
  const sp = new URLSearchParams();
  if (params.status) sp.set('status', params.status);
  if (params.userId) sp.set('userId', params.userId);
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 50));
  return api<AircpmCertListResponse>(`/admin/aircpm/cert/requests?${sp.toString()}`);
}

export async function approveAircpmCert(id: number) {
  return api<{ ok: true }>(`/admin/aircpm/cert/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export async function rejectAircpmCert(id: number, reason: string) {
  return api<{ ok: true }>(`/admin/aircpm/cert/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function revokeAircpmCert(id: number, reason?: string) {
  return api<{ ok: true }>(`/admin/aircpm/cert/${id}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

// ─── Users (P1) ────────────────────────────────────────────────────

export interface ListAircpmUsersParams {
  page?: number;
  limit?: number;
  q?: string;
}

export async function listAircpmUsers(params: ListAircpmUsersParams = {}) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 50));
  if (params.q) sp.set('q', params.q);
  return api<AircpmUserListResponse>(`/admin/aircpm/users?${sp.toString()}`);
}

export interface CreateAircpmUserBody {
  userId: string;
  password: string;
  brchCd?: string;
  name?: string;
  power?: number;
}

export async function createAircpmUser(body: CreateAircpmUserBody) {
  return api<{ ok: true; user: AircpmUser }>(`/admin/aircpm/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export interface UpdateAircpmUserBody {
  password?: string;
  brchCd?: string | null;
  name?: string | null;
  power?: number;
  isActive?: boolean;
}

export async function updateAircpmUser(userId: string, body: UpdateAircpmUserBody) {
  return api<{ ok: true; user: AircpmUser }>(`/admin/aircpm/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteAircpmUser(userId: string) {
  return api<{ ok: true }>(`/admin/aircpm/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export async function getAircpmUserSettings(userId: string) {
  return api<AircpmUserSettings>(`/admin/aircpm/users/${encodeURIComponent(userId)}/settings`);
}

export async function updateAircpmUserSettings(userId: string, body: AircpmUserSettings) {
  return api<{ ok: true; settings: AircpmUserSettings }>(
    `/admin/aircpm/users/${encodeURIComponent(userId)}/settings`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}
