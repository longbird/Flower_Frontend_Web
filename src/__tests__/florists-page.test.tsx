import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/florists',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/lib/api/admin', () => ({
  listFlorists: vi.fn(),
  updateFloristStatus: vi.fn(),
}));

import FloristsPage from '@/app/admin/florists/page';
import { listFlorists } from '@/lib/api/admin';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}

const mockData = {
  ok: true,
  data: [
    {
      id: 'fs_1',
      name: '꽃나라',
      phone: '010-1234-5678',
      sido: '서울',
      gugun: '강남구',
      status: 'ACTIVE',
      priority: 1,
      source: 'flower_shop',
    },
    {
      id: 'fs_2',
      name: '장미원',
      phone: '010-9876-5432',
      sido: '경기',
      gugun: '성남시',
      status: 'INACTIVE',
      priority: 5,
      source: 'partner',
    },
  ],
  total: 2,
  page: 1,
  size: 30,
};

describe('Florists Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listFlorists as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
  });

  it('should render florist list with names', async () => {
    render(
      <Wrapper>
        <FloristsPage />
      </Wrapper>
    );

    expect(screen.getByText('화원 관리')).toBeInTheDocument();

    await waitFor(() => {
      // Desktop table + mobile card both render, so use getAllByText
      expect(screen.getAllByText('꽃나라').length).toBeGreaterThan(0);
      expect(screen.getAllByText('장미원').length).toBeGreaterThan(0);
    });
  });

  it('should show status badges', async () => {
    render(
      <Wrapper>
        <FloristsPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('활성').length).toBeGreaterThan(0);
      expect(screen.getAllByText('비활성').length).toBeGreaterThan(0);
    });
  });

  it('should show total count', async () => {
    render(
      <Wrapper>
        <FloristsPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/총 2개/)).toBeInTheDocument();
    });
  });

  it('should call listFlorists with search query', async () => {
    const mockList = listFlorists as ReturnType<typeof vi.fn>;
    render(
      <Wrapper>
        <FloristsPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('꽃나라').length).toBeGreaterThan(0);
    });

    const input = screen.getByPlaceholderText('검색 (화원명, 서비스지역명, 전화번호)');
    fireEvent.change(input, { target: { value: '꽃나라' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ q: '꽃나라', page: 1, size: 30 })
      );
    });
  });

  it('should default to ACTIVE status filter', async () => {
    render(
      <Wrapper>
        <FloristsPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(listFlorists).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ACTIVE' })
      );
    });
  });
});
