import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

import { listAircpmBranches, upsertAircpmBranch } from '@/lib/api/aircpm-payments';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('BranchesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('지사 목록을 렌더링한다', async () => {
    (listAircpmBranches as any).mockResolvedValueOnce([
      { brchCd: 'S001', name: '강남', cardPaymentEnabled: true,
        copyApps: [true, true, true, true, true], pasteApps: [true, true, true, true, true] },
    ]);
    render(<Wrapper><BranchesPage /></Wrapper>);
    await waitFor(() => expect(screen.getByText('S001')).toBeInTheDocument());
    expect(screen.getByText('강남')).toBeInTheDocument();
  });

  it('편집 다이얼로그에서 지원 프로그램 토글 후 저장 → 길이 5 배열 전달', async () => {
    (listAircpmBranches as any).mockResolvedValueOnce([
      { brchCd: 'S001', name: '강남', cardPaymentEnabled: true,
        copyApps: [true, true, true, true, true], pasteApps: [true, true, true, true, true] },
    ]);
    (upsertAircpmBranch as any).mockResolvedValueOnce({ ok: true });
    render(<Wrapper><BranchesPage /></Wrapper>);
    await waitFor(() => expect(screen.getByText('S001')).toBeInTheDocument());

    fireEvent.click(screen.getByText('편집'));
    const copyAuto = await screen.findByTestId('copy-app-0');
    fireEvent.click(copyAuto); // true → false
    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => expect(upsertAircpmBranch).toHaveBeenCalled());
    const arg = (upsertAircpmBranch as any).mock.calls[0][0];
    expect(arg.copyApps).toHaveLength(5);
    expect(arg.copyApps[0]).toBe(false);
    expect(arg.pasteApps).toHaveLength(5);
  });
});
