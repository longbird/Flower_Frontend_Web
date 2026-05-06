import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/lib/auth/store', () => ({
  useAuthStore: () => ({
    user: { name: '관리자', username: 'admin' },
    refreshToken: null,
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/api/admin', () => ({
  adminLogout: vi.fn(),
}));

describe('AdminSidebar vbank navigation', () => {
  it('shows the payment queue as a primary operations entry', () => {
    render(<AdminSidebar />);

    expect(screen.getByRole('link', { name: /오늘 결제 큐/ })).toHaveAttribute('href', '/admin/payments');
  });

  it('keeps the payment list entry under the payment group', () => {
    render(<AdminSidebar />);

    fireEvent.click(screen.getByRole('button', { name: /결제/ }));
    const paymentGroup = screen.getByRole('button', { name: /결제/ }).parentElement!;
    expect(within(paymentGroup).getByRole('link', { name: /결제 목록/ })).toHaveAttribute('href', '/admin/payments');
  });

  it('places vbank operations under audit and vbank credentials under settings', async () => {
    render(<AdminSidebar />);

    fireEvent.click(screen.getByRole('button', { name: /결제/ }));
    const paymentGroup = screen.getByRole('button', { name: /결제/ }).parentElement!;
    expect(within(paymentGroup).queryByRole('link', { name: /가상계좌/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /감사/ }));
    const auditGroup = screen.getByRole('button', { name: /감사/ }).parentElement!;
    expect(
      within(auditGroup).getByRole('link', { name: /가상계좌 운영 로그/ }),
    ).toHaveAttribute('href', '/admin/payments/vbank');

    fireEvent.click(screen.getByRole('button', { name: /설정/ }));
    const settingsGroup = screen.getByRole('button', { name: /설정/ }).parentElement!;
    expect(
      within(settingsGroup).getByRole('link', { name: /가상계좌 설정/ }),
    ).toHaveAttribute('href', '/admin/innopay-credentials');
  });
});
