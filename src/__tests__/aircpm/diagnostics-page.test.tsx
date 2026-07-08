import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/aircpm', () => ({
  listAircpmDiagnostics: vi.fn(),
  getAircpmDiagnosticLog: vi.fn(),
}));
vi.mock('@/lib/api/aircpm-payments', () => ({ listAircpmBranches: vi.fn() }));

let mockUser: { isSuper: boolean; brchCd: string | null } = { isSuper: true, brchCd: null };
vi.mock('@/lib/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: mockUser }),
}));

import DiagnosticsPage from '@/app/aircpm/diagnostics/page';
import { listAircpmDiagnostics, getAircpmDiagnosticLog } from '@/lib/api/aircpm';
import { listAircpmBranches } from '@/lib/api/aircpm-payments';

const mockList = listAircpmDiagnostics as ReturnType<typeof vi.fn>;
const mockLog = getAircpmDiagnosticLog as ReturnType<typeof vi.fn>;
const mockBranches = listAircpmBranches as ReturnType<typeof vi.fn>;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DiagnosticsPage />
    </QueryClientProvider>,
  );
}

function diagItem(over: Partial<Record<string, unknown>> = {}) {
  return {
    callId: 5,
    brchCd: 'B001',
    orderNo: 'A-1',
    appType: 'XE4',
    totalMs: null,
    pasteOk: false,
    bottleneck: null,
    postProcessStatus: 'FAILED',
    postProcessError: 'aborted',
    hasLog: true,
    createdAt: '2026-07-08T01:23:45.000Z',
    ...over,
  };
}

describe('AircpmDiagnosticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { isSuper: true, brchCd: null };
    mockList.mockResolvedValue([diagItem()]);
    mockBranches.mockResolvedValue([{ brchCd: 'B001', name: '강남' }]);
  });

  it('비-슈퍼 → 전용 안내, 목록 미조회', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    renderPage();
    expect(screen.getByText('슈퍼 관리자 전용 화면입니다.')).toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();
  });

  it('슈퍼: 행 렌더 + 후처리 실패 배지 + 사유 표시', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('A-1')).toBeInTheDocument());
    // '실패' 는 두 곳 — 붙여넣기 셀(pasteOk=false)과 후처리 배지(FAILED).
    expect(screen.getAllByText('실패')).toHaveLength(2);
    expect(screen.getByText('aborted')).toBeInTheDocument(); // postProcessError
  });

  it('hasLog=false → "로그 보기" 버튼 없음', async () => {
    mockList.mockResolvedValue([diagItem({ hasLog: false, callId: 6 })]);
    renderPage();
    await waitFor(() => expect(screen.getByText('A-1')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '로그 보기' })).not.toBeInTheDocument();
  });

  it('로그 보기 클릭 → 로그 조회 + 본문 표시', async () => {
    mockLog.mockResolvedValue({ log: 'line1\nline2\n[HOOK] ESC -> abort' });
    renderPage();
    await waitFor(() => expect(screen.getByText('A-1')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '로그 보기' }));
    await waitFor(() => expect(mockLog).toHaveBeenCalledWith(5));
    expect(await screen.findByText(/\[HOOK\] ESC -> abort/)).toBeInTheDocument();
  });

  it('로그 404 → 로그 없음 안내', async () => {
    mockLog.mockRejectedValue(new ApiError(404, 'Not Found', { code: 'LOG_NOT_FOUND' }));
    renderPage();
    await waitFor(() => expect(screen.getByText('A-1')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '로그 보기' }));
    expect(
      await screen.findByText('이 콜에는 저장된 로그가 없습니다.'),
    ).toBeInTheDocument();
  });

  it('목록 403 → 슈퍼 전용 안내', async () => {
    mockList.mockRejectedValue(new ApiError(403, 'Forbidden', {}));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('슈퍼 관리자만 접근할 수 있습니다.')).toBeInTheDocument(),
    );
  });

  it('빈 목록 → 안내 문구', async () => {
    mockList.mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('진단 대상 콜이 없습니다.')).toBeInTheDocument(),
    );
  });
});
