import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BranchesPage from '@/app/aircpm/branches/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/aircpm-payments', () => ({
  listAircpmBranches: vi.fn(),
  upsertAircpmBranch: vi.fn(),
}));
// isSuper=true 로 모킹
vi.mock('@/lib/auth/store', () => ({
  useAuthStore: (sel: any) => sel({ user: { isSuper: true, brchCd: null } }),
}));

import { listAircpmBranches } from '@/lib/api/aircpm-payments';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('BranchesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('지사 목록을 렌더링한다', async () => {
    (listAircpmBranches as any).mockResolvedValueOnce([
      { brchCd: 'S001', name: '강남', cardPaymentEnabled: true },
    ]);
    render(<Wrapper><BranchesPage /></Wrapper>);
    await waitFor(() => expect(screen.getByText('S001')).toBeInTheDocument());
    expect(screen.getByText('강남')).toBeInTheDocument();
  });
});
