import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/partner/login',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/lib/api/partner', () => ({
  partnerLoginStep1: vi.fn(),
  partnerLoginStep2: vi.fn(),
  partnerSimpleLogin: vi.fn(),
}));

import PartnerLoginPage from '@/app/partner/login/page';
import { partnerLoginStep1 } from '@/lib/api/partner';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}

describe('Partner Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form', () => {
    render(
      <Wrapper>
        <PartnerLoginPage />
      </Wrapper>
    );
    expect(screen.getByText('파트너 로그인')).toBeInTheDocument();
    expect(screen.getByLabelText('아이디')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
  });

  it('should call login API on submit', async () => {
    const mock = partnerLoginStep1 as ReturnType<typeof vi.fn>;
    mock.mockResolvedValueOnce({
      twoFactorStatus: undefined,
    });

    // Also mock simple login for fallback
    const { partnerSimpleLogin } = await import('@/lib/api/partner');
    (partnerSimpleLogin as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      token: 'token',
      partnerId: 1,
    });

    render(
      <Wrapper>
        <PartnerLoginPage />
      </Wrapper>
    );

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'demo' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'demo1234' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith('demo', 'demo1234');
    });
  });

  it('should show 2FA form when required', async () => {
    const mock = partnerLoginStep1 as ReturnType<typeof vi.fn>;
    mock.mockResolvedValueOnce({
      twoFactorStatus: 'REQUIRED',
      sessionToken: 'session-123',
      maskedPhone: '010****5678',
    });

    render(
      <Wrapper>
        <PartnerLoginPage />
      </Wrapper>
    );

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'demo' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'demo1234' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByLabelText('인증번호')).toBeInTheDocument();
    });

    expect(screen.getByText(/010\*{4}5678/)).toBeInTheDocument();
  });
});
