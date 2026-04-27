import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// Mock branch-topup-vbank API
vi.mock('@/lib/api/branch-topup-vbank', () => ({
  getBranchTopupVbank: vi.fn(),
  issueBranchTopupVbank: vi.fn(),
  reissueBranchTopupVbank: vi.fn(),
}));

import { BranchTopupVbankPanel } from '@/app/admin/branches/[id]/topup-vbank-panel';
import { getBranchTopupVbank } from '@/lib/api/branch-topup-vbank';

const issued = {
  accountNumber: '1234-5678',
  bankCode: '004',
  bankName: '국민',
  holderName: '서울지사',
  active: true,
  issuedAt: '2026-04-27T00:00:00Z',
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('BranchTopupVbankPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('미발급 → 발급 안내 노출', async () => {
    (getBranchTopupVbank as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    render(
      <Wrapper>
        <BranchTopupVbankPanel branchId={1} />
      </Wrapper>
    );

    await screen.findByText('아직 발급되지 않았습니다.');
  });

  it('발급된 vbank 정보 표시', async () => {
    (getBranchTopupVbank as ReturnType<typeof vi.fn>).mockResolvedValueOnce(issued);

    render(
      <Wrapper>
        <BranchTopupVbankPanel branchId={1} />
      </Wrapper>
    );

    await screen.findByText('1234-5678');
    screen.getByText('서울지사');
  });
});
