import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AircpmUserSettingsPage from '@/app/aircpm/users/[userId]/settings/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ userId: 'user01' }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/aircpm', () => ({
  getAircpmUserSettings: vi.fn(),
  updateAircpmUserSettings: vi.fn(),
}));
import { getAircpmUserSettings } from '@/lib/api/aircpm';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('AircpmUserSettingsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('copy/paste 섹션을 렌더하지 않는다 (지사로 이전)', async () => {
    (getAircpmUserSettings as any).mockResolvedValueOnce({
      appTitle: 'AirCPM',
      copyApps: [true, true, true, true, true],
      pasteApps: [true, true, true, true, true],
      priceUp: false,
      telegram: null,
    });
    render(<Wrapper><AircpmUserSettingsPage /></Wrapper>);
    await waitFor(() => expect(screen.getByText(/앱 타이틀/)).toBeInTheDocument());
    expect(screen.queryByText(/복사 대상 앱/)).not.toBeInTheDocument();
    expect(screen.queryByText(/붙여넣기 대상 앱/)).not.toBeInTheDocument();
  });
});
