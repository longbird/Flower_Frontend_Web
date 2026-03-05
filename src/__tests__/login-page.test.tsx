import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => '/admin/login',
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// Mock admin API
vi.mock('@/lib/api/admin', () => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn(),
}));

import AdminLoginPage from '@/app/admin/login/page';
import { adminLogin } from '@/lib/api/admin';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}

describe('Admin Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form', () => {
    render(
      <Wrapper>
        <AdminLoginPage />
      </Wrapper>
    );
    expect(screen.getByText('달려라 꽃배달')).toBeInTheDocument();
    expect(screen.getByLabelText('아이디')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('should call login API on submit', async () => {
    const mockLogin = adminLogin as ReturnType<typeof vi.fn>;
    mockLogin.mockResolvedValueOnce({
      ok: true,
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresIn: 900,
      refreshExpiresIn: 604800,
      token: 'token',
      admin: { id: 1, username: 'admin', name: '관리자', role: 'SUPER_ADMIN' },
    });

    render(
      <Wrapper>
        <AdminLoginPage />
      </Wrapper>
    );

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'password');
    });
  });

  it('should show error on login failure', async () => {
    const mockLogin = adminLogin as ReturnType<typeof vi.fn>;
    mockLogin.mockRejectedValueOnce(new Error('아이디 또는 비밀번호가 일치하지 않습니다.'));

    const { toast } = await import('sonner');

    render(
      <Wrapper>
        <AdminLoginPage />
      </Wrapper>
    );

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('아이디 또는 비밀번호가 일치하지 않습니다.');
    });
  });
});
