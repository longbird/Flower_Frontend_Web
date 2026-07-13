import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/aircpm', () => ({ listAircpmCalls: vi.fn(), getAircpmCallLog: vi.fn() }));
vi.mock('@/lib/api/aircpm-payments', () => ({ listAircpmBranches: vi.fn() }));

// isSuper 를 테스트별로 전환하기 위한 가변 상태 — customer-detail-page.test.tsx 의 let 패턴.
// (vi.mock 팩토리는 호이스팅되지만 셀렉터 함수는 렌더 시점에 mockUser 를 읽으므로 TDZ 문제 없음)
let mockUser: { isSuper: boolean; brchCd: string | null } = { isSuper: true, brchCd: null };
vi.mock('@/lib/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: mockUser }),
}));

import CallsPage from '@/app/aircpm/calls/page';
import { listAircpmCalls, getAircpmCallLog } from '@/lib/api/aircpm';
import { listAircpmBranches } from '@/lib/api/aircpm-payments';
import { businessDayToday } from '@/app/aircpm/calls/business-day';

const mockList = listAircpmCalls as ReturnType<typeof vi.fn>;
const mockLog = getAircpmCallLog as ReturnType<typeof vi.fn>;
const mockBranches = listAircpmBranches as ReturnType<typeof vi.fn>;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CallsPage />
    </QueryClientProvider>,
  );
}

function callItem(over: Partial<Record<string, unknown>> = {}) {
  return {
    callId: 9, brchCd: 'B001', businessYmd: '2026-06-30',
    targetStatus: 'DISPATCHED', targetStatusAt: null, sourceStatus: null, sourceStatusAt: null,
    postProcessStatus: 'DONE', postProcessError: null, pasteOk: true, pasteTotalMs: 8200,
    sourceApp: 'D5', orderNo: 'A-1', customerPhoneMasked: '010-42**-1188',
    originName: '출발화원', originAddr: '서울 강남구', destName: '도착지', destAddr: '서울 서초구',
    amount: 35000, firstReceivedAt: '2026-06-30T05:00:00.000Z',
    dispatchedAt: '2026-06-30T05:05:00.000Z', lastEventAt: '2026-06-30T05:05:00.000Z',
    hasLog: false,
    ...over,
  };
}

describe('AircpmCallsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: [callItem()], total: 1, page: 1, limit: 50 });
    mockBranches.mockResolvedValue([{ brchCd: 'B001', name: '강남' }]);
  });

  it('super + hasLog: 펼침 상세에 실패 로그 보기 버튼, 클릭 시 로그 표시', async () => {
    mockUser = { isSuper: true, brchCd: null };
    mockList.mockResolvedValue({
      items: [callItem({ postProcessStatus: 'FAILED', postProcessError: 'aborted', hasLog: true })],
      total: 1, page: 1, limit: 50,
    });
    mockLog.mockResolvedValue({ log: 'line1\n[HOOK] ESC -> abort (injected=0)' });
    renderPage();
    await waitFor(() => expect(screen.getByText('010-42**-1188')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '실패 로그 보기' }));
    await waitFor(() => expect(mockLog).toHaveBeenCalledWith(9));
    expect(await screen.findByText(/\[HOOK\] ESC -> abort \(injected=0\)/)).toBeInTheDocument();
  });

  it('super: 로그 복사 버튼 → clipboard.writeText(로그), 라벨 복사됨', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    mockUser = { isSuper: true, brchCd: null };
    mockList.mockResolvedValue({ items: [callItem({ hasLog: true })], total: 1, page: 1, limit: 50 });
    mockLog.mockResolvedValue({ log: 'line1\nline2\nboom' });
    renderPage();
    await waitFor(() => expect(screen.getByText('010-42**-1188')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '실패 로그 보기' }));
    fireEvent.click(await screen.findByRole('button', { name: '복사' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('line1\nline2\nboom'));
    expect(await screen.findByRole('button', { name: '복사됨 ✓' })).toBeInTheDocument();
  });

  it('branch admin: hasLog=true 여도 실패 로그 보기 버튼 없음(슈퍼 전용)', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    mockList.mockResolvedValue({ items: [callItem({ hasLog: true })], total: 1, page: 1, limit: 50 });
    renderPage();
    await waitFor(() => expect(screen.getByText('010-42**-1188')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    expect(screen.queryByRole('button', { name: '실패 로그 보기' })).not.toBeInTheDocument();
  });

  it('super + hasLog=false: 실패 로그 보기 버튼 없음', async () => {
    mockUser = { isSuper: true, brchCd: null };
    mockList.mockResolvedValue({ items: [callItem({ hasLog: false })], total: 1, page: 1, limit: 50 });
    renderPage();
    await waitFor(() => expect(screen.getByText('010-42**-1188')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    expect(screen.queryByRole('button', { name: '실패 로그 보기' })).not.toBeInTheDocument();
  });

  it('super: 로그 404 → 로그 없음 안내', async () => {
    mockUser = { isSuper: true, brchCd: null };
    mockList.mockResolvedValue({ items: [callItem({ hasLog: true })], total: 1, page: 1, limit: 50 });
    mockLog.mockRejectedValue(new ApiError(404, 'Not Found', { code: 'LOG_NOT_FOUND' }));
    renderPage();
    await waitFor(() => expect(screen.getByText('010-42**-1188')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '실패 로그 보기' }));
    expect(await screen.findByText('이 콜에는 저장된 로그가 없습니다.')).toBeInTheDocument();
  });

  it('super: 지사 필터 노출 + 지사 컬럼 + brchCd 미선택 시 미전송(전체)', async () => {
    mockUser = { isSuper: true, brchCd: null };
    renderPage();
    await waitFor(() => expect(screen.getByText('010-42**-1188')).toBeInTheDocument());
    // Radix SelectValue 의 표시 텍스트는 jsdom 에서 신뢰 불가 — 라벨/컬럼헤더로 단언한다.
    expect(screen.getByText('지사 필터')).toBeInTheDocument(); // super 전용 필터 라벨
    expect(screen.getByRole('columnheader', { name: '지사' })).toBeInTheDocument(); // 테이블 컬럼
    expect(mockList.mock.calls[0][0]).toMatchObject({ brchCd: undefined });
    expect(mockBranches).toHaveBeenCalled();
  });

  it('branch admin: 지사 필터 미노출, brchCd 미전송, 지사 목록 미조회', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    renderPage();
    await waitFor(() => expect(screen.getByText('010-42**-1188')).toBeInTheDocument());
    expect(screen.queryByText('지사 필터')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '지사' })).not.toBeInTheDocument();
    expect(mockList.mock.calls[0][0]).toMatchObject({ brchCd: undefined });
    expect(mockBranches).not.toHaveBeenCalled();
  });

  it('대상앱 뱃지: DISPATCHED → 배차, CALLPASSED → 콜패스', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    mockList.mockResolvedValue({
      items: [callItem(), callItem({ callId: 10, targetStatus: 'CALLPASSED', dispatchedAt: null })],
      total: 2, page: 1, limit: 50,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('배차')).toBeInTheDocument());
    expect(screen.getByText('콜패스')).toBeInTheDocument();
  });

  // 사용자 요구의 핵심: 원본콜과 복사된 콜의 상태는 다를 수 있다 → 각각 보여야 한다.
  it('두 축을 각각 표시한다 — 원본은 취소인데 우리 콜은 배차일 수 있다', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    mockList.mockResolvedValue({
      items: [callItem({ targetStatus: 'DISPATCHED', sourceStatus: 'CANCELLED' })],
      total: 1, page: 1, limit: 50,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('배차')).toBeInTheDocument());
    expect(screen.getByText('취소')).toBeInTheDocument();
  });

  it('소스앱 판정이 없으면(원본이 아직 살아있음) 원본콜 칸은 비운다', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    mockList.mockResolvedValue({
      items: [callItem({ targetStatus: 'CALLPASSED', sourceStatus: null })],
      total: 1, page: 1, limit: 50,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('콜패스')).toBeInTheDocument());
    expect(screen.queryByText('취소')).not.toBeInTheDocument();
    expect(screen.queryByText('종료')).not.toBeInTheDocument();
  });

  // 서버가 어휘를 늘렸는데 프론트가 모르면, 라벨 조회가 undefined 를 내고 .label 에서 페이지가
  // 통째로 죽는다. 뱃지 하나 못 그리는 것과 화면 전체가 죽는 것은 전혀 다른 문제다.
  it('모르는 상태 코드가 와도 페이지가 죽지 않는다', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    mockList.mockResolvedValue({
      items: [callItem({ targetStatus: 'TELEPORTED', sourceStatus: 'ABDUCTED' })],
      total: 1, page: 1, limit: 50,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('TELEPORTED')).toBeInTheDocument());
    expect(screen.getByText('ABDUCTED')).toBeInTheDocument();
  });

  it('검색: 기간 입력 후 검색 버튼 → from/to 전달, page 리셋', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    renderPage();
    await waitFor(() => expect(screen.getByText('010-42**-1188')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: '2026-06-01', to: '2026-06-30', page: 1 }),
      ),
    );
  });

  it('초기 호출: errorOnly=false, status 미전송', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    renderPage();
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(mockList.mock.calls[0][0]).toMatchObject({ errorOnly: false, status: undefined });
  });

  it('초기 기간 기본값: from/to = 오늘 업무일(businessDayToday) 자동 전송', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    renderPage();
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    const today = businessDayToday();
    expect(mockList.mock.calls[0][0]).toMatchObject({ from: today, to: today });
  });

  it('펼침 상세: 주문번호/후처리 오류 표시', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    mockList.mockResolvedValue({
      items: [callItem({ postProcessStatus: 'FAILED', postProcessError: 'boom' })],
      total: 1, page: 1, limit: 50,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('010-42**-1188')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    expect(screen.getByText('A-1')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('403 BRANCH_NOT_ASSIGNED → 지사 미배정 안내', async () => {
    mockUser = { isSuper: false, brchCd: null };
    mockList.mockRejectedValue(new ApiError(403, 'Forbidden', { code: 'BRANCH_NOT_ASSIGNED' }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/담당 지사가 배정되지 않았습니다/)).toBeInTheDocument(),
    );
  });

  it('400 INVALID_RANGE → 기간 오류 안내(일반 오류 문구 아님)', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    mockList.mockRejectedValue(new ApiError(400, 'Bad Request', { code: 'INVALID_RANGE' }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/조회 기간이 올바르지 않습니다/)).toBeInTheDocument(),
    );
    expect(screen.queryByText('콜 목록을 불러오지 못했습니다.')).not.toBeInTheDocument();
  });

  it('400 INVALID_DATE → 기간 오류 안내', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    mockList.mockRejectedValue(new ApiError(400, 'Bad Request', { code: 'INVALID_DATE' }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/조회 기간이 올바르지 않습니다/)).toBeInTheDocument(),
    );
  });

  it('페이지네이션: total 137 → 3 페이지, 다음 버튼으로 page=2', async () => {
    mockUser = { isSuper: false, brchCd: 'B001' };
    mockList.mockResolvedValue({ items: [callItem()], total: 137, page: 1, limit: 50 });
    renderPage();
    await waitFor(() => expect(screen.getByText(/전체 137건/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );
  });
});
