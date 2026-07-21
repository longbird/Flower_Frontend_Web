import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/aircpm/downloads', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/aircpm/downloads')>()),
  fetchDownloadsManifest: vi.fn(),
}));

import DownloadsPage from '@/app/downloads/page';
import { fetchDownloadsManifest } from '@/lib/aircpm/downloads';

const mockFetch = fetchDownloadsManifest as ReturnType<typeof vi.fn>;

const manifest = {
  desktop: { file: 'update.exe', version: '1.1.0.35', sizeBytes: 162816, updatedAt: '2026-07-21' },
  mobile: {
    file: 'mobile/cpm-mobile-0.1.0-20d4a8c.apk',
    version: '0.1.0',
    sizeBytes: 72831898,
    updatedAt: '2026-07-20',
  },
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('DownloadsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('데스크톱·모바일 두 다운로드 카드를 렌더한다', async () => {
    mockFetch.mockResolvedValueOnce(manifest);
    render(<DownloadsPage />, { wrapper: Wrapper });

    expect(await screen.findByText('CPM 데스크톱 업데이터')).toBeInTheDocument();
    expect(screen.getByText('CPM 모바일 앱')).toBeInTheDocument();
  });

  it('각 카드 버전·용량을 표시한다', async () => {
    mockFetch.mockResolvedValueOnce(manifest);
    render(<DownloadsPage />, { wrapper: Wrapper });

    await screen.findByText('CPM 데스크톱 업데이터');
    expect(screen.getByText('v1.1.0.35')).toBeInTheDocument();
    expect(screen.getByText('159.0 KB')).toBeInTheDocument();
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
    expect(screen.getByText('69.5 MB')).toBeInTheDocument();
  });

  it('다운로드 버튼이 정적 파일 경로를 가리킨다', async () => {
    mockFetch.mockResolvedValueOnce(manifest);
    render(<DownloadsPage />, { wrapper: Wrapper });

    const desktopLink = await screen.findByRole('link', { name: '데스크톱 업데이터 다운로드' });
    const mobileLink = screen.getByRole('link', { name: '모바일 앱 다운로드' });
    expect(desktopLink).toHaveAttribute('href', '/aircpm/updates/update.exe');
    expect(mobileLink).toHaveAttribute(
      'href',
      '/aircpm/updates/mobile/cpm-mobile-0.1.0-20d4a8c.apk',
    );
  });

  it('불러오기 실패 시 에러와 다시 시도 버튼을 보인다', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    render(<DownloadsPage />, { wrapper: Wrapper });

    expect(await screen.findByText(/불러오지 못했습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('다시 시도를 누르면 매니페스트를 재요청한다', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(manifest);
    render(<DownloadsPage />, { wrapper: Wrapper });

    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('CPM 데스크톱 업데이터')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
