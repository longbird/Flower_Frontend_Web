import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerDetailPage from '@/app/aircpm/customers/[id]/page';

let mockSearchParams = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: '9' }),
  useSearchParams: () => new URLSearchParams(mockSearchParams),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/aircpm-payments', () => ({
  getAircpmCustomer: vi.fn(),
  updateAircpmCustomer: vi.fn(),
  deactivateAircpmCard: vi.fn(),
  cancelAircpmPayment: vi.fn(),
}));
vi.mock('@/lib/auth/store', () => ({
  useAuthStore: (sel: any) => sel({ user: { isSuper: false, brchCd: 'S001' } }),
}));
import { getAircpmCustomer } from '@/lib/api/aircpm-payments';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = '';
  });

  it('고객 상세·카드·결제를 렌더링한다', async () => {
    (getAircpmCustomer as any).mockResolvedValueOnce({
      customer: { id: 9, brchCd: 'S001', customerPhone: '01012345678', name: '홍길동', memo: '단골' },
      cards: [{ id: 11, cardCompany: '신한', cardNumberMasked: '1234-****-****-5678', cardType: '신용', registeredAt: new Date().toISOString() }],
      payments: [{ id: 21, amount: 25000, status: 'DONE', createdAt: new Date().toISOString() }],
    });
    render(<Wrapper><CustomerDetailPage /></Wrapper>);
    await waitFor(() => expect(screen.getByText('홍길동')).toBeInTheDocument());
    expect(screen.getByText('1234-****-****-5678')).toBeInTheDocument();
    expect(screen.getByText(/25,?000/)).toBeInTheDocument();
  });

  it('지사 관리자는 URL의 brchCd를 API로 전달하지 않는다', async () => {
    mockSearchParams = 'brchCd=S999';
    (getAircpmCustomer as any).mockResolvedValueOnce({
      customer: { id: 9, brchCd: 'S001', customerPhone: '01012345678', name: '홍길동', memo: '단골' },
      cards: [{ id: 11, cardCompany: '신한', cardNumberMasked: '1234-****-****-5678', cardType: '신용', registeredAt: new Date().toISOString() }],
      payments: [{ id: 21, amount: 25000, status: 'DONE', createdAt: new Date().toISOString() }],
    });
    render(<Wrapper><CustomerDetailPage /></Wrapper>);
    await waitFor(() => expect(screen.getByText('홍길동')).toBeInTheDocument());
    expect((getAircpmCustomer as any).mock.calls[0][1].brchCd).toBeUndefined();
  });
});
