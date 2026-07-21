import { z } from 'zod';

/**
 * 공개 다운로드 페이지(/downloads)가 읽는 정적 매니페스트.
 *
 * APK 는 Cloudflare 엣지 캐시를 피하려 파일명에 버전/커밋을 박는다 → 파일명이 릴리스마다 바뀐다.
 * 그래서 프론트에 파일명을 하드코딩하지 않고, no-cache 로 서빙되는 이 매니페스트에서 현재 파일명을
 * 읽어온다. 릴리스 시 프론트 재배포 없이 서버의 downloads.json 한 곳만 갱신하면 된다.
 *
 * 매니페스트/정적 파일 위치: nginx `location ^~ /aircpm/updates/` (호스트 레벨, no-cache).
 */
const UPDATES_BASE = '/aircpm/updates';
const MANIFEST_URL = `${UPDATES_BASE}/downloads.json`;

/**
 * 매니페스트의 file 은 정적 호스트 아래 **상대 경로**여야 한다.
 * 매니페스트가 잘못 배포/변조돼도 scheme(`https:`)·프로토콜상대(`//`)·경로탈출(`..`)로
 * 의도치 않은 곳을 가리키는 링크가 만들어지지 않도록 경계에서 막는다.
 */
function isSafeRelativeFile(file: string): boolean {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(file)) return false; // https:, file: 등 scheme
  if (file.startsWith('//')) return false; // //evil.example 프로토콜상대
  return !file.split('/').some((seg) => seg === '..'); // .. 세그먼트
}

const artifactSchema = z.object({
  file: z
    .string()
    .min(1)
    .refine(isSafeRelativeFile, { message: 'file must be a relative path (no scheme/"//"/".." )' }),
  version: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  updatedAt: z.string().min(1),
});

const manifestSchema = z.object({
  desktop: artifactSchema,
  mobile: artifactSchema,
});

export type DownloadArtifact = z.infer<typeof artifactSchema>;
export type DownloadsManifest = z.infer<typeof manifestSchema>;

/** 매니페스트의 상대 파일명을 정적 다운로드 URL 로. 앞 슬래시 중복을 막는다. */
export function buildDownloadHref(file: string): string {
  return `${UPDATES_BASE}/${file.replace(/^\/+/, '')}`;
}

/** 바이트 수를 사람이 읽는 단위로. 음수·비유한 값은 대시. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  const exponent =
    bytes < 1 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  if (exponent === 0) return `${bytes} B`;
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(1)} ${units[exponent]}`;
}

/**
 * 다운로드 매니페스트를 no-store 로 받아 스키마 검증 후 반환.
 * 외부 경계이므로 zod 로 검증한다 — 형식이 어긋나면 예외를 던져 페이지가 에러 상태를 보이게 한다.
 */
export async function fetchDownloadsManifest(): Promise<DownloadsManifest> {
  const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`다운로드 정보를 불러오지 못했습니다 (HTTP ${res.status})`);
  }
  const json = await res.json();
  return manifestSchema.parse(json);
}
