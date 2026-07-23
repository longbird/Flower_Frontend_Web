import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
});
