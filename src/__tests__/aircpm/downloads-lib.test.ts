import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatBytes, buildDownloadHref, fetchDownloadsManifest } from '@/lib/aircpm/downloads';

describe('formatBytes', () => {
  it('1024 미만은 B 단위로', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });

  it('KB·MB 단위로 환산해 소수 1자리로', () => {
    expect(formatBytes(162816)).toBe('159.0 KB');
    expect(formatBytes(72831898)).toBe('69.5 MB');
  });

  it('음수·비유한 값은 대시로', () => {
    expect(formatBytes(-1)).toBe('-');
    expect(formatBytes(NaN)).toBe('-');
  });
});

describe('buildDownloadHref', () => {
  it('정적 업데이트 경로에 파일명을 이어붙인다', () => {
    expect(buildDownloadHref('update.exe')).toBe('/aircpm/updates/update.exe');
    expect(buildDownloadHref('mobile/app.apk')).toBe('/aircpm/updates/mobile/app.apk');
  });

  it('파일명 앞의 슬래시는 중복되지 않게 제거한다', () => {
    expect(buildDownloadHref('/update.exe')).toBe('/aircpm/updates/update.exe');
  });
});

describe('fetchDownloadsManifest', () => {
  const validManifest = {
    desktop: { file: 'update.exe', version: '1.1.0.35', sizeBytes: 162816, updatedAt: '2026-07-21' },
    mobile: {
      file: 'mobile/cpm-mobile-0.1.0-20d4a8c.apk',
      version: '0.1.0',
      sizeBytes: 72831898,
      updatedAt: '2026-07-20',
    },
  };

  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('no-store 로 매니페스트를 받아 검증 후 반환한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => validManifest });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchDownloadsManifest();

    expect(result).toEqual(validManifest);
    expect(fetchMock).toHaveBeenCalledWith('/aircpm/updates/downloads.json', { cache: 'no-store' });
  });

  it('mobile 이 없어도 통과한다 — 서버가 데스크톱만 제공할 수 있다', async () => {
    // 관리 서버(callpass.ga-bin.co.kr)는 업데이터만 배포하고 APK 는 두지 않는다.
    // mobile 을 필수로 두면 그 서버의 다운로드 페이지가 통째로 에러가 된다.
    const desktopOnly = { desktop: validManifest.desktop };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => desktopOnly }),
    );

    const result = await fetchDownloadsManifest();

    expect(result.desktop).toEqual(validManifest.desktop);
    expect(result.mobile).toBeUndefined();
  });

  it('desktop 은 여전히 필수다', async () => {
    const mobileOnly = { mobile: validManifest.mobile };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => mobileOnly }),
    );
    await expect(fetchDownloadsManifest()).rejects.toThrow();
  });

  it('HTTP 실패면 상태코드를 담아 에러를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
    await expect(fetchDownloadsManifest()).rejects.toThrow(/404/);
  });

  it('스키마에 안 맞으면(필드 누락) 에러를 던진다', async () => {
    const bad = { desktop: { file: 'update.exe' } };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => bad }),
    );
    await expect(fetchDownloadsManifest()).rejects.toThrow();
  });

  it('file 이 scheme/프로토콜상대/.. 경로면 거부한다(경계 검증)', async () => {
    const cases = ['https://evil.example/x.apk', '//evil.example/x.apk', '../../etc/passwd'];
    for (const badFile of cases) {
      const bad = {
        ...validManifest,
        mobile: { ...validManifest.mobile, file: badFile },
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => bad }),
      );
      await expect(fetchDownloadsManifest()).rejects.toThrow();
    }
  });
});
