import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TossCredentialsPage from '@/app/aircpm/branches/[brchCd]/toss-credentials/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ brchCd: 'S001' }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/aircpm-payments', () => ({
  listAircpmTossCredentials: vi.fn().mockResolvedValue([]),
  upsertAircpmTossCredentials: vi.fn(),
}));
vi.mock('@/lib/auth/store', () => ({
  useAuthStore: (sel: any) => sel({ user: { isSuper: true, brchCd: null } }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('TossCredentialsPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('TEST/LIVE 탭을 렌더링한다', async () => {
    render(<Wrapper><TossCredentialsPage /></Wrapper>);
    await waitFor(() => expect(screen.getByText(/테스트/)).toBeInTheDocument());
    expect(screen.getByText(/운영|LIVE/)).toBeInTheDocument();
  });
});
