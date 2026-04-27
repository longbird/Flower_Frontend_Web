import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/branch/branch-api', () => ({
  getMyTopupVbank: vi.fn(),
  fetchMyBranchWallet: vi.fn(),
  fetchMyBranchWalletTransactions: vi.fn(),
}));

import { MyTopupVbankCard } from '@/app/branch/[slug]/manage/wallet/page';
import { getMyTopupVbank } from '@/lib/branch/branch-api';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('MyTopupVbankCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('null → 미발급 안내 표시', async () => {
    (getMyTopupVbank as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    render(
      <Wrapper>
        <MyTopupVbankCard />
      </Wrapper>
    );

    await screen.findByText('충전용 가상계좌가 아직 발급되지 않았습니다. 본사에 문의해 주세요.');
  });

  it('active vbank → 계좌번호 표시', async () => {
    (getMyTopupVbank as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      accountNumber: '110-1234-5678',
      bankCode: '088',
      bankName: '신한',
      holderName: '서울지사',
      active: true,
      issuedAt: '2026-04-27T00:00:00Z',
    });

    render(
      <Wrapper>
        <MyTopupVbankCard />
      </Wrapper>
    );

    await screen.findByText('110-1234-5678');
    screen.getByText('신한');
    screen.getByText('서울지사');
  });

  it('inactive vbank → 미발급 안내 표시', async () => {
    (getMyTopupVbank as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      accountNumber: '110-1234-5678',
      bankCode: '088',
      bankName: '신한',
      holderName: '서울지사',
      active: false,
      issuedAt: '2026-04-27T00:00:00Z',
    });

    render(
      <Wrapper>
        <MyTopupVbankCard />
      </Wrapper>
    );

    await screen.findByText('충전용 가상계좌가 아직 발급되지 않았습니다. 본사에 문의해 주세요.');
  });

  it('bankName 없을 때 bankCode fallback', async () => {
    (getMyTopupVbank as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      accountNumber: '110-0000-0001',
      bankCode: '088',
      holderName: '테스트지사',
      active: true,
      issuedAt: null,
    });

    render(
      <Wrapper>
        <MyTopupVbankCard />
      </Wrapper>
    );

    await screen.findByText('088');
  });
});
