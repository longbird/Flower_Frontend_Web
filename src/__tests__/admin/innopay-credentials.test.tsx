import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/innopay-credentials',
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// Mock innopay-credentials API
vi.mock('@/lib/api/innopay-credentials', () => ({
  getInnopayCredentials: vi.fn(),
  updateInnopayCredentials: vi.fn(),
}));

import InnopayCredentialsPage from '@/app/admin/innopay-credentials/page';
import {
  getInnopayCredentials,
  updateInnopayCredentials,
} from '@/lib/api/innopay-credentials';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('Innopay Credentials Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('현재 설정 표시: merchantId와 mode를 렌더링한다', async () => {
    (getInnopayCredentials as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      mode: 'TEST',
      merchantId: 'testpay01',
      apiBaseUrl: 'https://api.innopay.co.kr',
      updatedAt: '2026-04-27T00:00:00Z',
    });

    render(
      <Wrapper>
        <InnopayCredentialsPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('testpay01')).toBeInTheDocument();
    });

    expect(screen.getAllByText('TEST').length).toBeGreaterThan(0);
  });

  it('저장 호출: merchantId와 licenseKey로 updateInnopayCredentials를 호출한다', async () => {
    (getInnopayCredentials as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      mode: 'TEST',
      merchantId: 'testpay01',
      apiBaseUrl: 'https://api.innopay.co.kr',
      updatedAt: '2026-04-27T00:00:00Z',
    });
    (updateInnopayCredentials as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    });

    render(
      <Wrapper>
        <InnopayCredentialsPage />
      </Wrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByLabelText('Merchant ID (MID)')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Merchant ID (MID)'), {
      target: { value: 'realpay99' },
    });
    fireEvent.change(screen.getByLabelText('License Key'), {
      target: { value: 'key123' },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(updateInnopayCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ merchantId: 'realpay99', licenseKey: 'key123' })
      );
    });
  });
});
