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

// ─── TargetApps (P1) ───────────────────────────────────────────────
//
// AirCPM 데스크톱 클라이언트가 배차앱(LogiD5/ManerXE4/iDriver) 창 클래스·컨트롤
// ID를 서버에서 받아간다. 버전 기반 이력 + 롤백 (롤백도 새 version 생성).

// config 본문은 자유 형태 (백엔드는 최소 필수 키만 검증) — `Record<string, unknown>` 로 둔다.
export type TargetAppsConfig = Record<string, unknown>;

export interface TargetAppsActiveResponse extends TargetAppsConfig {
  version: number;
}

export interface TargetAppsHistoryItem {
  version: number;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
  note?: string | null;
}

export interface TargetAppsHistoryResponse {
  items: TargetAppsHistoryItem[];
}

export async function getTargetAppsActive() {
  return api<TargetAppsActiveResponse>(`/admin/aircpm/config/targetapps`);
}

export async function getTargetAppsHistory(limit = 50) {
  return api<TargetAppsHistoryResponse>(
    `/admin/aircpm/config/targetapps/history?limit=${limit}`,
  );
}

export async function updateTargetApps(body: { config: TargetAppsConfig; note?: string }) {
  return api<{ ok: true; version: number }>(`/admin/aircpm/config/targetapps`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function revertTargetApps(body: { toVersion?: number } = {}) {
  return api<{ ok: true; version: number; revertedFrom: number }>(
    `/admin/aircpm/config/targetapps/revert`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

/** 백엔드 필수 키 사전 검증 (저장 전 즉시 안내용). */
export function validateTargetAppsConfig(cfg: unknown): string[] {
  const errors: string[] = [];
  if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) {
    return ['config는 객체여야 합니다.'];
  }
  const c = cfg as Record<string, Record<string, unknown> | undefined>;
  if (!c.logiD5?.window || !c.logiD5?.fields) {
    errors.push('logiD5.window / logiD5.fields 필수');
  }
  if (!c.manerXE4?.window) {
    errors.push('manerXE4.window 필수');
  }
  if (!c.iDriver?.window || !c.iDriver?.fields) {
    errors.push('iDriver.window / iDriver.fields 필수');
  }
  return errors;
}
