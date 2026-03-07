/**
 * 화원 사진 변경 로그 모듈
 *
 * 사진 등록/수정/삭제 시 복원 가능한 스냅샷을 localStorage에 기록합니다.
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

const STORAGE_KEY = 'photo_change_logs';
const MAX_ENTRIES = 500;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 모든 로그 조회 (최신순) */
export function getPhotoLogs(): PhotoLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PhotoLogEntry[];
  } catch {
    return [];
  }
}

/** 로그 저장 (내부용) */
function saveLogs(logs: PhotoLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // localStorage 용량 초과 시 오래된 로그 절반 삭제 후 재시도
    try {
      const trimmed = logs.slice(0, Math.floor(logs.length / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // 포기
    }
  }
}

/** 새 로그 기록 */
export function addPhotoLog(entry: Omit<PhotoLogEntry, 'id' | 'timestamp'>): PhotoLogEntry {
  const newEntry: PhotoLogEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  const logs = getPhotoLogs();
  logs.unshift(newEntry);

  // 최대 개수 제한
  if (logs.length > MAX_ENTRIES) {
    logs.length = MAX_ENTRIES;
  }

  saveLogs(logs);
  return newEntry;
}

/** 특정 화원의 로그만 조회 */
export function getPhotoLogsByFlorist(floristId: string): PhotoLogEntry[] {
  return getPhotoLogs().filter((log) => log.floristId === floristId);
}

/** 특정 사진의 로그만 조회 */
export function getPhotoLogsByPhotoId(photoId: number): PhotoLogEntry[] {
  return getPhotoLogs().filter((log) => log.photoId === photoId);
}

/** 필터 조건으로 로그 조회 */
export function searchPhotoLogs(filters: {
  action?: PhotoLogAction;
  floristId?: string;
  keyword?: string;
  from?: string;
  to?: string;
}): PhotoLogEntry[] {
  let logs = getPhotoLogs();

  if (filters.action) {
    logs = logs.filter((l) => l.action === filters.action);
  }
  if (filters.floristId) {
    logs = logs.filter((l) => l.floristId === filters.floristId);
  }
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.floristName.toLowerCase().includes(kw) ||
        l.userName.toLowerCase().includes(kw) ||
        l.note?.toLowerCase().includes(kw) ||
        String(l.photoId).includes(kw)
    );
  }
  if (filters.from) {
    logs = logs.filter((l) => l.timestamp >= filters.from!);
  }
  if (filters.to) {
    const toEnd = filters.to + 'T23:59:59.999Z';
    logs = logs.filter((l) => l.timestamp <= toEnd);
  }

  return logs;
}

/** 로그 전체 내보내기 (JSON) */
export function exportPhotoLogs(): string {
  return JSON.stringify(getPhotoLogs(), null, 2);
}

/** 오래된 로그 삭제 (기본 90일) */
export function clearOldLogs(days = 90): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  const logs = getPhotoLogs();
  const filtered = logs.filter((l) => l.timestamp >= cutoffStr);
  const removed = logs.length - filtered.length;

  if (removed > 0) {
    saveLogs(filtered);
  }
  return removed;
}

/** 전체 로그 삭제 */
export function clearAllLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** 삭제된 사진의 로그에서 복원 데이터 추출 */
export function getRestorationData(logId: string): {
  floristId: string;
  floristName: string;
  photo: Partial<FloristPhoto>;
} | null {
  const logs = getPhotoLogs();
  const log = logs.find((l) => l.id === logId);
  if (!log) return null;

  // DELETE 로그: before에 원본 데이터
  // UPDATE 로그: before에 수정 전 데이터
  // UPLOAD 로그: after에 등록된 데이터
  const photo = log.action === 'UPLOAD' ? log.after : log.before;
  if (!photo) return null;

  return {
    floristId: log.floristId,
    floristName: log.floristName,
    photo,
  };
}
