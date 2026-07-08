import { api } from './client';
import type { AdminUser } from '@/lib/types/auth';

// ─── Admin site auth (aircpm_user power=9 → 사이트 로그인) ─────────

export interface AircpmAdminSiteLoginResponse {
  ok: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  admin: AdminUser & { tokenSource: 'aircpm_user' };
}

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const ADMIN_SITE_BASE = RAW_API_BASE ? '/api/proxy' : '';

/**
 * AirCPM 사이트 전용 로그인. aircpm_user 테이블의 power=9 사용자만 통과.
 * client 모듈의 401 자동 refresh를 우회해서 직접 호출 (로그인 자체는 토큰이 없는 상태).
 */
export async function aircpmAdminSiteLogin(username: string, password: string) {
  const res = await fetch(`${ADMIN_SITE_BASE}/aircpm/admin-site/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store',
  });
  if (!res.ok) {
    let data: unknown;
    try { data = await res.json(); } catch {}
    const msg =
      data && typeof data === 'object' && 'message' in data
        ? String((data as Record<string, unknown>).message)
        : '로그인에 실패했습니다.';
    const err = new Error(msg) as Error & { status?: number; code?: string };
    err.status = res.status;
    if (data && typeof data === 'object' && 'code' in data) {
      err.code = String((data as Record<string, unknown>).code);
    }
    throw err;
  }
  return (await res.json()) as AircpmAdminSiteLoginResponse;
}

export async function aircpmAdminSiteLogout(refreshToken: string | null) {
  return api<void>(`/aircpm/admin-site/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });
}

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
  // 클라이언트 유형: true=모바일 앱 사용자, false=데스크톱 클라이언트(기본).
  isMobile: boolean;
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

export interface AircpmTelegramCreds {
  botToken: string;
  chatId: string;
}

export interface AircpmUserSettings {
  // 백엔드는 미설정 시 null을 반환. UI에서는 기본값 "AirCPM"로 대체.
  appTitle: string | null;
  // copy/paste는 지사 단위로 이전됨 — 사용자 설정 화면에서는 미사용(5슬롯, 지사에서 파생).
  copyApps: boolean[];
  pasteApps: boolean[];
  priceUp: boolean;
  // 진단 로그 전송용 Telegram 자격. 둘 다 비어있지 않을 때만 객체, 그 외 null.
  // 응답에 키는 항상 존재 (명시적 null) — `telegram == null` 검사로 전송 비활성 판단.
  telegram: AircpmTelegramCreds | null;
}

// 설정 PATCH 페이로드. telegram은 단일 객체가 아니라 평탄화된 두 필드로 분리.
// 부분 업데이트 의미: undefined 필드는 기존 값을 유지, null은 명시적으로 비움.
export interface AircpmUserSettingsPatch {
  appTitle?: string | null;
  priceUp?: boolean;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
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
  // 미전달 시 백엔드 기본값 false(데스크톱). 슈퍼 관리자만 지정.
  isMobile?: boolean;
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
  // undefined면 기존 유지. 슈퍼 관리자만 변경.
  isMobile?: boolean;
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

export async function updateAircpmUserSettings(
  userId: string,
  body: AircpmUserSettingsPatch,
) {
  return api<AircpmUserSettings>(
    `/admin/aircpm/users/${encodeURIComponent(userId)}/settings`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

// ─── Login logs ────────────────────────────────────────────────────

export type AircpmLoginLogEndpoint = 'login' | 'cert_request';
export type AircpmLoginLogResult =
  | 'success'
  | 'invalid_credentials'
  | 'account_disabled'
  | 'cert_not_approved'
  | 'cert_rejected'
  | 'already_approved'
  | 'pending';

export interface AircpmLoginLogItem {
  id: number;
  attemptedAt: string;
  endpoint: AircpmLoginLogEndpoint;
  result: AircpmLoginLogResult;
  userId: string | null;
  aircpmUserId: number | null;
  rejectReason: string | null;
  serial: string | null;
  macAddress: string | null;
  computerName: string | null;
  realIp: string | null;
  userAgent: string | null;
}

export interface AircpmLoginLogListResponse {
  items: AircpmLoginLogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListAircpmLoginLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  endpoint?: AircpmLoginLogEndpoint | 'all';
  result?: AircpmLoginLogResult | 'all';
  fromDate?: string;
  toDate?: string;
}

export async function listAircpmLoginLogs(params: ListAircpmLoginLogsParams = {}) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 50));
  if (params.userId) sp.set('userId', params.userId);
  if (params.endpoint && params.endpoint !== 'all') sp.set('endpoint', params.endpoint);
  if (params.result && params.result !== 'all') sp.set('result', params.result);
  if (params.fromDate) sp.set('fromDate', params.fromDate);
  if (params.toDate) sp.set('toDate', params.toDate);
  return api<AircpmLoginLogListResponse>(`/admin/aircpm/login-logs?${sp.toString()}`);
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

// ─── Calls (관리자 콜패스 조회) ─────────────────────────────────────

export type AircpmCallStatus = 'CALLPASSED' | 'DISPATCHED';

export interface AircpmCallItem {
  callId: number;
  brchCd: string;
  businessYmd: string;
  status: AircpmCallStatus;
  // union 값은 백엔드 CallpassCallRow(callpass_calls.db.ts:8,12)의 실제 enum 을 미러링
  postProcessStatus: 'NONE' | 'PENDING' | 'DONE' | 'FAILED';
  postProcessError: string | null;
  pasteOk: boolean | null;
  pasteTotalMs: number | null;
  sourceApp: 'D5' | 'XE4' | 'D2' | 'ICON' | 'AUTO';
  orderNo: string | null;
  customerPhoneMasked: string;
  originName: string | null;
  originAddr: string | null;
  destName: string | null;
  destAddr: string | null;
  amount: number | null;
  firstReceivedAt: string;
  dispatchedAt: string | null;
  lastEventAt: string;
  // 후처리 실패 로그 존재 여부 — true면 상세에서 '실패 로그 보기'(슈퍼 전용) 노출.
  hasLog: boolean;
}

export interface AircpmCallListResponse {
  items: AircpmCallItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListAircpmCallsParams {
  page?: number;
  limit?: number;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  status?: AircpmCallStatus;
  errorOnly?: boolean;
  // 오류 유형 세분화: postprocess=후처리 실패(FAILED), paste=붙여넣기 실패(paste_ok=0).
  // 미지정 시 errorOnly 동작. 백엔드 미지원 시 무시되고 errorOnly 로 폴백.
  errorType?: 'postprocess' | 'paste';
  // super 전용 — 비-super는 전달하지 말 것(서버가 무시하고 자기 지사 강제)
  brchCd?: string;
}

export async function listAircpmCalls(params: ListAircpmCallsParams = {}) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 50));
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.status) sp.set('status', params.status);
  if (params.errorOnly) sp.set('errorOnly', 'true');
  if (params.errorType) sp.set('errorType', params.errorType);
  if (params.brchCd) sp.set('brchCd', params.brchCd);
  return api<AircpmCallListResponse>(`/admin/aircpm/calls?${sp.toString()}`);
}

// ─── 콜 후처리 실패 로그 (슈퍼 전용 — 콜 조회 상세에서 조회) ──────────
//
// 콜 조회 목록 항목의 hasLog=true 인 콜만 로그가 있다. 백엔드는 AircpmSiteGuard +
// ensureSuper 로 슈퍼 전용(비-슈퍼 403). 404 LOG_NOT_FOUND / 400 INVALID_CALL_ID.
export async function getAircpmCallLog(callId: number) {
  return api<{ log: string }>(`/admin/aircpm/calls/${callId}/log`);
}
