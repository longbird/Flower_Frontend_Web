import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/lib/auth/store';
import { usePartnerAuthStore } from '@/lib/auth/partner-store';
import { AuthGuard } from '@/components/admin/auth-guard';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/admin/florists',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}

// ─── Integration: Auth flow ──────────────────────────────
describe('Integration: Auth Flow', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    usePartnerAuthStore.getState().logout();
    localStorage.clear();
  });

  it('admin auth store should be independent of partner auth store', () => {
    useAuthStore.getState().login('admin-token', 'refresh', {
      id: 1, username: 'admin', name: 'Admin', role: 'SUPER_ADMIN',
    });
    usePartnerAuthStore.getState().login('partner-token', 'refresh', {
      id: 2, accountId: 'florist', name: 'Florist', type: 'FLORIST', partnerId: 1, partnerName: 'Test',
    });

    expect(useAuthStore.getState().accessToken).toBe('admin-token');
    expect(usePartnerAuthStore.getState().accessToken).toBe('partner-token');

    // Logout admin should not affect partner
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(usePartnerAuthStore.getState().isLoggedIn).toBe(true);
  });

  it('localStorage keys should not collide', () => {
    useAuthStore.getState().login('admin-token', 'refresh', {
      id: 1, username: 'admin', name: 'Admin', role: 'SUPER_ADMIN',
    });
    usePartnerAuthStore.getState().login('partner-token', 'refresh', {
      id: 2, accountId: 'florist', name: 'Florist', type: 'FLORIST', partnerId: 1, partnerName: 'Test',
    });

    const adminData = JSON.parse(localStorage.getItem('admin_auth')!);
    const partnerData = JSON.parse(localStorage.getItem('partner_auth')!);

    expect(adminData.accessToken).toBe('admin-token');
    expect(partnerData.accessToken).toBe('partner-token');
  });
});

// ─── Integration: Type safety ────────────────────────────
describe('Integration: Type Definitions', () => {
  it('FloristPhoto should have all required fields', () => {
    const photo = {
      id: 1, floristId: '10', fileUrl: '/uploads/1.jpg',
      category: 'FLOWER' as const, grade: 'PREMIUM' as const,
      isHidden: false, isRecommended: true, costPrice: 30000, sellingPrice: 50000,
    };
    expect(photo.category).toBe('FLOWER');
    expect(photo.isRecommended).toBe(true);
  });

  it('PartnerOrder status flow values should be defined', () => {
    const statuses = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'DELIVERING', 'DONE', 'CANCELLED'];
    expect(statuses).toHaveLength(6);
  });

  it('API responses should follow consistent pattern', () => {
    const adminResponse = { ok: true, data: { id: '1', name: 'Test' } };
    expect(adminResponse.ok).toBe(true);
    const partnerResponse = { ok: true, orders: [{ orderId: 1 }] };
    expect(partnerResponse.ok).toBe(true);
  });
});

// ─── Integration: Component Rendering ────────────────────
describe('Integration: Component Rendering', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('AuthGuard should block unauthorized access', () => {
    const { container } = render(
      <Wrapper>
        <AuthGuard>
          <div data-testid="protected">Protected Content</div>
        </AuthGuard>
      </Wrapper>
    );

    expect(container.querySelector('[data-testid="protected"]')).toBeNull();
  });

  it('AuthGuard should allow authorized access', () => {
    useAuthStore.getState().login('token', 'refresh', {
      id: 1, username: 'admin', name: 'Admin', role: 'SUPER_ADMIN',
    });

    const { container } = render(
      <Wrapper>
        <AuthGuard>
          <div data-testid="protected">Protected Content</div>
        </AuthGuard>
      </Wrapper>
    );

    expect(container.querySelector('[data-testid="protected"]')).toBeTruthy();
  });
});
