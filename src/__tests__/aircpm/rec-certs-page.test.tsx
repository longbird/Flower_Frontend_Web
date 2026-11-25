import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const auth = vi.hoisted(() => ({
  state: {
    user: { isSuper: true, role: 'AIRCPM_SUPER_ADMIN', name: '관리자', brchCd: null as string | null },
    isLoggedIn: true,
    refreshToken: null,
    logout: () => {},
    loadSession: () => {},
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/aircpm/rec-certs',
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@/lib/auth/store', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => (sel ? sel(auth.state) : auth.state),
}));
vi.mock('@/lib/api/airrec', () => ({
  listAirrecCerts: vi.fn(),
  approveAirrecCert: vi.fn(),
  rejectAirrecCert: vi.fn(),
  revokeAirrecCert: vi.fn(),
}));
vi.mock('@/lib/api/admin', () => ({ adminLogout: vi.fn() }));
vi.mock('@/lib/api/aircpm', () => ({ aircpmAdminSiteLogout: vi.fn() }));

import RecCertsPage from '@/app/aircpm/rec-certs/page';
import AircpmLayout from '@/app/aircpm/layout';
import { toast } from 'sonner';
import {
  approveAirrecCert,
  listAirrecCerts,
  rejectAirrecCert,
  revokeAirrecCert,
  type AirrecCert,
} from '@/lib/api/airrec';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function cert(over: Partial<AirrecCert> = {}): AirrecCert {
  return {
    id: 7,
    siteName: '시험업체',
    phone: '02-000-0000',
    computerName: 'PC-A',
    serial: 'UUID-A|MB-A',
    macAddress: 'a0b1c2d3e4f5|',
    publicIp: '1.2.3.4',
    appVersion: '2026.11.25.1',
    status: 'pending',
    requestedAt: '2026-11-25T05:00:00.000Z',
    decidedAt: null,
    decidedBy: null,
    rejectReason: null,
    lastCheckedAt: null,
    ...over,
  };
}

const listOf = (...items: AirrecCert[]) =>
  vi.mocked(listAirrecCerts).mockResolvedValue({ items, total: items.length, page: 1, limit: 50 });
const asSuper = (isSuper: boolean) => {
  auth.state.user = isSuper
    ? { isSuper: true, role: 'AIRCPM_SUPER_ADMIN', name: '관리자', brchCd: null }
    : { isSuper: false, role: 'AIRCPM_BRANCH_ADMIN', name: '지사', brchCd: 'B001' };
};

describe('녹취 인증 화면', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSuper(true);
  });

  it('지사 관리자에게는 목록을 보이지 않고 API 도 부르지 않는다', async () => {
    asSuper(false);
    listOf(cert());
    render(<Wrapper><RecCertsPage /></Wrapper>);
    expect(screen.getByText('슈퍼 관리자 전용 메뉴입니다.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(listAirrecCerts).not.toHaveBeenCalled();
    expect(screen.queryByText('시험업체')).toBeNull();
  });

  it('처음에는 승인 대기를 보인다', async () => {
    listOf(cert());
    render(<Wrapper><RecCertsPage /></Wrapper>);
    await screen.findByText('시험업체');
    expect(listAirrecCerts).toHaveBeenCalledWith({ status: 'pending', q: undefined, page: 1, limit: 50 });
    expect(screen.getByText('승인')).toBeInTheDocument();
    expect(screen.getByText('거부')).toBeInTheDocument();
    expect(screen.queryByText('승인 해제')).toBeNull();
    expect(screen.queryByText('MAC 만으로 등록')).toBeNull();
  });

  it('승인은 확인 창을 거친다', async () => {
    listOf(cert());
    vi.mocked(approveAirrecCert).mockResolvedValue({ ok: true });
    render(<Wrapper><RecCertsPage /></Wrapper>);
    fireEvent.click(await screen.findByText('승인'));
    expect(approveAirrecCert).not.toHaveBeenCalled();
    await screen.findByText('이 PC 를 승인하시겠습니까?');
    fireEvent.click(screen.getAllByText('승인').at(-1)!);
    await waitFor(() => expect(approveAirrecCert).toHaveBeenCalledWith(7));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('승인되었습니다.'));
  });

  it('거부 사유를 보낸다', async () => {
    listOf(cert());
    vi.mocked(rejectAirrecCert).mockResolvedValue({ ok: true });
    render(<Wrapper><RecCertsPage /></Wrapper>);
    fireEvent.click(await screen.findByText('거부'));
    fireEvent.change(await screen.findByPlaceholderText(/사유/), { target: { value: ' 확인 안 됨 ' } });
    fireEvent.click(screen.getAllByText('거부').at(-1)!);
    await waitFor(() => expect(rejectAirrecCert).toHaveBeenCalledWith(7, '확인 안 됨'));
  });

  it('사용 중인 PC 는 승인 해제만 할 수 있다', async () => {
    listOf(cert({ status: 'approved', decidedAt: '2026-11-25T05:10:00.000Z', decidedBy: 'super1' }));
    vi.mocked(revokeAirrecCert).mockResolvedValue({ ok: true });
    render(<Wrapper><RecCertsPage /></Wrapper>);
    fireEvent.click(await screen.findByText('승인 해제'));
    expect(screen.queryByText('승인')).toBeNull();
    fireEvent.click(screen.getAllByText('승인 해제').at(-1)!);
    await waitFor(() => expect(revokeAirrecCert).toHaveBeenCalledWith(7, undefined));
  });

  it('다른 관리자가 먼저 처리했으면(409) 알리고 목록을 다시 읽는다', async () => {
    listOf(cert());
    vi.mocked(approveAirrecCert).mockRejectedValue(Object.assign(new Error('x'), { status: 409 }));
    render(<Wrapper><RecCertsPage /></Wrapper>);
    fireEvent.click(await screen.findByText('승인'));
    await screen.findByText('이 PC 를 승인하시겠습니까?');
    const before = vi.mocked(listAirrecCerts).mock.calls.length;
    fireEvent.click(screen.getAllByText('승인').at(-1)!);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('이미 처리된 요청입니다. 새로고침해 주세요.'));
    await waitFor(() => expect(vi.mocked(listAirrecCerts).mock.calls.length).toBeGreaterThan(before));
  });

  it('MAC 만으로 등록된 PC 를 표시한다', async () => {
    listOf(cert({ serial: '' }));
    render(<Wrapper><RecCertsPage /></Wrapper>);
    expect(await screen.findByText('MAC 만으로 등록')).toBeInTheDocument();
  });

  it('확인 창에 PC 를 구분하는 값(serial·IP·MAC 만으로 등록)이 보인다', async () => {
    listOf(cert());
    const { unmount } = render(<Wrapper><RecCertsPage /></Wrapper>);
    fireEvent.click(await screen.findByText('승인'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('UUID-A|MB-A');
    expect(dialog).toHaveTextContent('1.2.3.4');
    expect(dialog).not.toHaveTextContent('MAC 만으로 등록');
    unmount();

    listOf(cert({ serial: '' }));
    render(<Wrapper><RecCertsPage /></Wrapper>);
    fireEvent.click(await screen.findByText('승인'));
    expect(await screen.findByRole('dialog')).toHaveTextContent('MAC 만으로 등록');
  });

  it('해제된 PC 가 다시 요청하면 앞의 사유가 보인다', async () => {
    listOf(cert({ rejectReason: '계약 종료', decidedAt: '2026-11-25T05:10:00.000Z', decidedBy: 'super1' }));
    render(<Wrapper><RecCertsPage /></Wrapper>);
    expect(await screen.findByText('이전 사유: 계약 종료')).toBeInTheDocument();
    expect(screen.getByText(/이전 처리:/)).toBeInTheDocument();
  });

  it('마지막 쪽이 비면 있는 쪽으로 돌아간다', async () => {
    let total = 51;
    vi.mocked(listAirrecCerts).mockImplementation(async (p) => ({
      items: p?.page === 2 ? (total > 50 ? [cert({ id: 51, siteName: '마지막업체' })] : []) : [cert()],
      total,
      page: p?.page ?? 1,
      limit: 50,
    }));
    vi.mocked(approveAirrecCert).mockImplementation(async () => {
      total = 50;
      return { ok: true };
    });
    render(<Wrapper><RecCertsPage /></Wrapper>);
    fireEvent.click(await screen.findByText('다음'));
    await screen.findByText('마지막업체');
    fireEvent.click(screen.getByText('승인'));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getAllByText('승인').at(-1)!);
    await screen.findByText('총 50건 · 1/1');
    expect(await screen.findByText('시험업체')).toBeInTheDocument();
  });

  it('목록을 못 읽으면 빈 목록이 아니라 오류를 보인다', async () => {
    vi.mocked(listAirrecCerts).mockRejectedValue(new Error('down'));
    render(<Wrapper><RecCertsPage /></Wrapper>);
    expect(await screen.findByText(/목록을 불러오지 못했습니다/)).toBeInTheDocument();
    expect(screen.queryByText('표시할 PC 가 없습니다.')).toBeNull();
  });
});

describe('메뉴', () => {
  it('슈퍼 관리자에게만 녹취 인증 메뉴가 보인다', () => {
    asSuper(true);
    const { unmount } = render(<Wrapper><AircpmLayout><div /></AircpmLayout></Wrapper>);
    expect(screen.getAllByText('녹취 인증').length).toBeGreaterThan(0);
    unmount();
    asSuper(false);
    render(<Wrapper><AircpmLayout><div /></AircpmLayout></Wrapper>);
    expect(screen.queryByText('녹취 인증')).toBeNull();
    expect(screen.getAllByText('기기 인증').length).toBeGreaterThan(0);
  });
});
