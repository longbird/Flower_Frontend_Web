import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api/aircpm', () => ({
  listAircpmDeviceSummary: vi.fn(),
}));

import { AccountDeviceSummary } from '@/components/aircpm/account-device-summary';
import { listAircpmDeviceSummary } from '@/lib/api/aircpm';

const mockList = listAircpmDeviceSummary as ReturnType<typeof vi.fn>;

const DESKTOP_OVER = {
  userId: 'cpm07',
  name: '김철수',
  brchCd: 'm8282_1',
  isMobile: false,
  isActive: true,
  desktopApproved: 3,
  desktopPending: 1,
  mobileBound: 0,
  mobilePending: 0,
  overLimit: true,
};

const MOBILE_OK = {
  userId: 'mob01',
  name: '홍길동',
  brchCd: 'demo',
  isMobile: true,
  isActive: true,
  desktopApproved: 0,
  desktopPending: 0,
  mobileBound: 1,
  mobilePending: 0,
  overLimit: false,
};

// 모바일 사용자인데 데스크톱 cert 도 보유한 혼합 계정 — 두 배지가 동시에 떠야 한다.
const MIXED = {
  userId: 'mix01',
  name: '박영희',
  brchCd: 'demo',
  isMobile: true,
  isActive: true,
  desktopApproved: 3,
  desktopPending: 0,
  mobileBound: 1,
  mobilePending: 0,
  overLimit: true,
};

function renderTab(onShowDevices = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <AccountDeviceSummary onShowDevices={onShowDevices} />
    </QueryClientProvider>,
  );
  return onShowDevices;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ items: [DESKTOP_OVER, MOBILE_OK], total: 2, page: 1, limit: 50 });
});

describe('AccountDeviceSummary', () => {
  it('계정 행 렌더 — 데스크톱 n/2, 모바일 n/1 표기', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    expect(screen.getByText('3/2')).toBeInTheDocument(); // 초과
    expect(screen.getByText('1/1')).toBeInTheDocument(); // 모바일 정상
    expect(screen.getByText('mob01')).toBeInTheDocument();
  });

  it('초과 계정에 한도 초과 배지 표시', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    expect(screen.getByText('한도 초과')).toBeInTheDocument();
  });

  it('초과만 보기 토글 → overLimitOnly=true 로 재조회', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '초과만 보기' }));
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ overLimitOnly: true })),
    );
  });

  it('기기 보기 클릭 → onShowDevices(userId)', async () => {
    const cb = renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    const row = screen.getByText('cpm07').closest('tr')!;
    const btn = Array.from(row.querySelectorAll('button')).find((b) => b.textContent === '기기 보기')!;
    fireEvent.click(btn);
    expect(cb).toHaveBeenCalledWith('cpm07');
  });

  it('혼합 계정 — 모바일 사용자가 데스크톱도 보유하면 두 배지가 함께 표시된다', async () => {
    mockList.mockResolvedValueOnce({ items: [MIXED], total: 1, page: 1, limit: 50 });
    renderTab();
    await waitFor(() => expect(screen.getByText('mix01')).toBeInTheDocument());
    expect(screen.getByText('3/2')).toBeInTheDocument(); // 데스크톱, 초과
    expect(screen.getByText('1/1')).toBeInTheDocument(); // 모바일, 정상
    expect(screen.getByText('한도 초과')).toBeInTheDocument();
  });

  it('빈 목록 → 안내 문구', async () => {
    mockList.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    renderTab();
    await waitFor(() => expect(screen.getByText('표시할 계정이 없습니다.')).toBeInTheDocument());
  });

  it('에러 → 에러 문구만 뜨고 "표시할 계정이 없습니다" 는 뜨지 않는다', async () => {
    mockList.mockRejectedValueOnce(new Error('boom'));
    renderTab();
    await waitFor(() =>
      expect(screen.getByText('계정 현황을 불러오지 못했습니다.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('표시할 계정이 없습니다.')).not.toBeInTheDocument();
  });

  it('성공 후 폴링(refetchInterval) 재조회 실패 — 에러 문구만 뜨고 페이지네이션은 숨겨진다', async () => {
    // react-query v5: 이미 성공한 queryKey 가 나중에 실패하면 캐시의 data 는 남긴 채 isError 만 세운다.
    // total 을 그 stale data.total 에서 읽는 페이지네이션 블록이 !isError 가드 없이 노출되면 안 된다.
    mockList
      .mockResolvedValueOnce({ items: [DESKTOP_OVER], total: 1, page: 1, limit: 50 })
      .mockRejectedValue(new Error('boom'));

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AccountDeviceSummary onShowDevices={vi.fn()} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    expect(screen.getByText(/총 1건/)).toBeInTheDocument();

    // downloads-page.test.tsx 관례: refetchInterval 을 실제로 기다리는 대신
    // queryClient.refetchQueries() 로 "성공 후 실패" 상태를 직접 만든다.
    await act(async () => {
      await qc.refetchQueries({ queryKey: ['admin-aircpm-device-summary'] });
    });
    // 옵저버의 error 알림이 커밋되도록 한 틱 더 flush 한다.
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByText('계정 현황을 불러오지 못했습니다.')).toBeInTheDocument(),
    );
    expect(screen.queryByText(/총 1건/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '이전' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다음' })).not.toBeInTheDocument();
  });

  it('검색창에서 Enter → q 파라미터로 재조회', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    const input = screen.getByPlaceholderText('userId / 이름 / 지사코드');
    fireEvent.change(input, { target: { value: 'hong' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'hong' })),
    );
  });

  it('초과만 보기를 껐다 켰다 다시 끄면 overLimitOnly 가 undefined 로 전달된다', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    const toggleBtn = screen.getByRole('button', { name: '초과만 보기' });

    fireEvent.click(toggleBtn); // on
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ overLimitOnly: true })),
    );

    fireEvent.click(toggleBtn); // off
    await waitFor(() => {
      const lastCall = mockList.mock.calls[mockList.mock.calls.length - 1][0];
      expect(lastCall.overLimitOnly).toBeUndefined();
    });
  });
});
