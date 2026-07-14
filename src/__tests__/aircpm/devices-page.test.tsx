import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/aircpm', () => ({
  listAircpmCertRequests: vi.fn(),
  listAircpmMobileDevices: vi.fn(),
  approveAircpmCert: vi.fn(),
  rejectAircpmCert: vi.fn(),
  revokeAircpmCert: vi.fn(),
  approveAircpmMobileDevice: vi.fn(),
  rejectAircpmMobileDevice: vi.fn(),
  unbindAircpmMobileDevice: vi.fn(),
}));

import DevicesPage from '@/app/aircpm/certs/page';
import {
  approveAircpmCert,
  approveAircpmMobileDevice,
  listAircpmCertRequests,
  listAircpmMobileDevices,
  revokeAircpmCert,
  unbindAircpmMobileDevice,
} from '@/lib/api/aircpm';

const mockListCerts = listAircpmCertRequests as ReturnType<typeof vi.fn>;
const mockListMobiles = listAircpmMobileDevices as ReturnType<typeof vi.fn>;
const mockApproveCert = approveAircpmCert as ReturnType<typeof vi.fn>;
const mockApproveMobile = approveAircpmMobileDevice as ReturnType<typeof vi.fn>;
const mockRevokeCert = revokeAircpmCert as ReturnType<typeof vi.fn>;
const mockUnbindMobile = unbindAircpmMobileDevice as ReturnType<typeof vi.fn>;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DevicesPage />
    </QueryClientProvider>,
  );
}

// 두 테이블 모두 id=1 을 갖게 해서, 종류를 무시한 배선이면 반드시 틀리게 만든다.
const CERT = {
  id: 1,
  userId: 'cpm07',
  name: '김철수',
  brchCd: 'm8282_1',
  serial: 'MB-A93F',
  macAddress: '3C-7C-3F-00-11-22',
  computerName: 'DESK-07',
  realIp: null,
  phone: null,
  status: 'pending' as const,
  requestedAt: '2026-07-14T08:40:00.000Z',
  decidedAt: null,
  decidedBy: null,
  rejectReason: null,
};

const MOBILE = {
  id: 1,
  userId: 'mob01',
  name: '홍길동',
  brchCd: 'demo',
  deviceId: 'android:9f2a1c',
  platform: 'android',
  status: 'pending' as const,
  requestedAt: '2026-07-14T09:12:00.000Z',
  boundAt: null,
  lastSeenAt: null,
  revokedAt: null,
  decidedAt: null,
  decidedBy: null,
  rejectReason: null,
};

/** 카드 안의 버튼을 찾는다 — 다이얼로그의 같은 이름 버튼과 섞이지 않게 사용자ID 기준으로 좁힌다. */
function rowButton(userId: string, label: string): HTMLElement {
  const card = screen.getByText(userId).closest('[data-slot="card"]');
  if (!card) throw new Error(`${userId} 행을 찾지 못했습니다.`);
  const btn = Array.from(card.querySelectorAll('button')).find((b) => b.textContent?.trim() === label);
  if (!btn) throw new Error(`${userId} 행에 '${label}' 버튼이 없습니다.`);
  return btn;
}

/** 다이얼로그(카드 밖) 확인 버튼. */
function dialogButton(label: string): HTMLElement {
  const btns = screen.getAllByRole('button', { name: label });
  const inDialog = btns.find((b) => b.closest('[role="dialog"]'));
  if (!inDialog) throw new Error(`다이얼로그에 '${label}' 버튼이 없습니다.`);
  return inDialog;
}

beforeEach(() => {
  // jsdom 이 구현하지 않는 DOM API — Radix Select 가 열릴 때 부른다.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();

  vi.clearAllMocks();
  mockListCerts.mockResolvedValue({ items: [CERT], total: 1, page: 1, limit: 200 });
  mockListMobiles.mockResolvedValue({ items: [MOBILE] });
  mockApproveCert.mockResolvedValue({ ok: true });
  mockApproveMobile.mockResolvedValue({ ok: true });
  mockRevokeCert.mockResolvedValue({ ok: true });
  mockUnbindMobile.mockResolvedValue({ ok: true });
});

describe('기기 인증 (통합 목록)', () => {
  it('데스크톱과 모바일 기기를 한 목록에 함께 보여준다', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    expect(screen.getByText('mob01')).toBeInTheDocument();
    expect(screen.getByText('💻 데스크톱')).toBeInTheDocument();
    expect(screen.getByText('📱 모바일')).toBeInTheDocument();
  });

  it('모바일 행의 승인은 모바일 API 로만 간다', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('mob01')).toBeInTheDocument());

    fireEvent.click(rowButton('mob01', '승인'));
    fireEvent.click(dialogButton('승인'));

    await waitFor(() => expect(mockApproveMobile).toHaveBeenCalledWith(1));
    // 두 기기의 id 가 똑같이 1 이라, 종류를 무시했다면 여기서 잡힌다.
    expect(mockApproveCert).not.toHaveBeenCalled();
  });

  it('데스크톱 행의 승인은 데스크톱 API 로만 간다', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());

    fireEvent.click(rowButton('cpm07', '승인'));
    fireEvent.click(dialogButton('승인'));

    await waitFor(() => expect(mockApproveCert).toHaveBeenCalledWith(1));
    expect(mockApproveMobile).not.toHaveBeenCalled();
  });

  it('승인 해제는 종류에 맞는 API 를 부른다 — 모바일은 userId, 데스크톱은 id 로', async () => {
    mockListCerts.mockResolvedValue({
      items: [{ ...CERT, status: 'approved' }],
      total: 1,
      page: 1,
      limit: 200,
    });
    mockListMobiles.mockResolvedValue({ items: [{ ...MOBILE, status: 'bound' }] });

    renderPage();
    await waitFor(() => expect(screen.getByText('mob01')).toBeInTheDocument());

    fireEvent.click(rowButton('mob01', '승인 해제'));
    fireEvent.click(dialogButton('승인 해제'));
    // 모바일 언바인드는 id 가 아니라 userId 를 받는다 — 계약이 다르다.
    await waitFor(() => expect(mockUnbindMobile).toHaveBeenCalledWith('mob01'));
    expect(mockRevokeCert).not.toHaveBeenCalled();

    fireEvent.click(rowButton('cpm07', '승인 해제'));
    fireEvent.click(dialogButton('승인 해제'));
    await waitFor(() => expect(mockRevokeCert).toHaveBeenCalledWith(1, undefined));
  });

  it('폐기 필터에서는 데스크톱을 조회하지 않는다 — 데스크톱에 없는 상태다', async () => {
    renderPage();
    await waitFor(() => expect(mockListCerts).toHaveBeenCalled());
    mockListCerts.mockClear();

    fireEvent.click(screen.getByText('승인 대기'));
    fireEvent.click(await screen.findByText('폐기 (모바일)'));

    await waitFor(() =>
      expect(mockListMobiles).toHaveBeenCalledWith(expect.objectContaining({ status: 'revoked' })),
    );
    expect(mockListCerts).not.toHaveBeenCalled();
  });

  it('데스크톱 목록이 잘리면 숨겨진 건수를 표시한다 — 조용히 자르지 않는다', async () => {
    mockListCerts.mockResolvedValue({ items: [CERT], total: 250, page: 1, limit: 200 });

    renderPage();

    expect(await screen.findByText(/숨겨진 249건/)).toBeInTheDocument();
  });
});
