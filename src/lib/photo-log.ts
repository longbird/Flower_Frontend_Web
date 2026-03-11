/**
 * 화원 사진 변경 로그 모듈
 *
 * 서버 API(/api/photo-logs)에 기록합니다.
 * - UPLOAD: 새 사진 등록 후 반환된 데이터 기록
 * - UPDATE: 수정 전(before) / 수정 후(after) 스냅샷 기록
 * - DELETE: 삭제 전 전체 사진 데이터 기록
 * - TOGGLE_VISIBILITY: 표시/숨김 전환 기록
 */

import type { FloristPhoto } from '@/lib/types/florist';

export type PhotoLogAction = 'UPLOAD' | 'UPDATE' | 'DELETE' | 'TOGGLE_VISIBILITY';

export interface PhotoLogEntry {
  id: string;
  timestamp: string;
  action: PhotoLogAction;
  floristId: string;
  floristName: string;
  photoId: number | null;
  before: Partial<FloristPhoto> | null;
  after: Partial<FloristPhoto> | null;
  userName: string;
  note?: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 새 로그 기록 (서버에 저장) */
export function addPhotoLog(entry: Omit<PhotoLogEntry, 'id' | 'timestamp'>): PhotoLogEntry {
  const newEntry: PhotoLogEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  // fire-and-forget: 서버에 비동기 저장
  fetch('/api/photo-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newEntry),
  }).catch(() => {
    // 실패 시 무시 (로그 손실은 허용)
  });

  return newEntry;
}

/** 서버에서 로그 조회 */
export async function fetchPhotoLogs(filters?: {
  action?: PhotoLogAction;
  floristId?: string;
  keyword?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<{ data: PhotoLogEntry[]; total: number }> {
  const sp = new URLSearchParams();
  if (filters?.action) sp.set('action', filters.action);
  if (filters?.floristId) sp.set('floristId', filters.floristId);
  if (filters?.keyword) sp.set('keyword', filters.keyword);
  if (filters?.from) sp.set('from', filters.from);
  if (filters?.to) sp.set('to', filters.to);
  if (filters?.page) sp.set('page', String(filters.page));
  if (filters?.size) sp.set('size', String(filters.size));
  const qs = sp.toString();

  try {
    const res = await fetch(`/api/photo-logs${qs ? `?${qs}` : ''}`);
    if (!res.ok) return { data: [], total: 0 };
    const json = await res.json();
    return { data: json.data ?? [], total: json.total ?? 0 };
  } catch {
    return { data: [], total: 0 };
  }
}

// ─── 하위호환: 기존 코드에서 호출하는 함수들 ───

/** @deprecated fetchPhotoLogs 사용 권장 */
export function getPhotoLogs(): PhotoLogEntry[] {
  // 동기 함수 유지 (빈 배열 반환, 실제 데이터는 fetchPhotoLogs 사용)
  return [];
}

/** @deprecated fetchPhotoLogs 사용 권장 */
export function searchPhotoLogs(filters: {
  action?: PhotoLogAction;
  floristId?: string;
  keyword?: string;
  from?: string;
  to?: string;
}): PhotoLogEntry[] {
  // 동기 함수 — 빈 배열 반환
  void filters;
  return [];
}

/** @deprecated 서버 저장으로 불필요 */
export function exportPhotoLogs(): string {
  return '[]';
}

/** @deprecated 서버 저장으로 불필요 */
export function clearOldLogs(_days = 90): number {
  return 0;
}

/** @deprecated 서버 저장으로 불필요 */
export function clearAllLogs(): void {}

/** @deprecated */
export function getPhotoLogsByFlorist(_floristId: string): PhotoLogEntry[] {
  return [];
}

/** @deprecated */
export function getPhotoLogsByPhotoId(_photoId: number): PhotoLogEntry[] {
  return [];
}

/** @deprecated */
export function getRestorationData(_logId: string): {
  floristId: string;
  floristName: string;
  photo: Partial<FloristPhoto>;
} | null {
  return null;
}
