import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomersPage from '@/app/aircpm/customers/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/aircpm-payments', () => ({
  listAircpmCustomers: vi.fn(),
  listAircpmBranches: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/auth/store', () => ({
  useAuthStore: (sel: any) => sel({ user: { isSuper: false, brchCd: 'S001' } }),
}));
import { listAircpmCustomers } from '@/lib/api/aircpm-payments';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('CustomersPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('지사 관리자 — brchCd 없이 본인 지사 고객 조회', async () => {
    (listAircpmCustomers as any).mockResolvedValueOnce({ customers: [
      { id: 9, brchCd: 'S001', customerPhone: '01012345678', name: '홍길동', memo: null },
    ]});
    render(<Wrapper><CustomersPage /></Wrapper>);
    await waitFor(() => expect(screen.getByText('홍길동')).toBeInTheDocument());
    // 지사 관리자는 brchCd 미전송(백엔드가 본인 지사 강제)
    expect((listAircpmCustomers as any).mock.calls[0][0].brchCd).toBeUndefined();
  });
});
