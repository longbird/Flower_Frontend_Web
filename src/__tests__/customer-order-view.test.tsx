import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/api/order-link', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/order-link')>(
    '@/lib/api/order-link',
  );
  return {
    ...actual,
    fetchCustomerOrderView: vi.fn(),
    confirmCustomerOrder: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { OrderView } from '@/app/o/[code]/page';
import {
  confirmCustomerOrder,
  type CustomerOrderView,
} from '@/lib/api/order-link';

const mockConfirm = confirmCustomerOrder as ReturnType<typeof vi.fn>;

/**
 * page.tsx의 inner OrderView를 직접 렌더 (use(params) 우회).
 * page.tsx의 default export는 use(params) 때문에 jsdom에서 suspend.
 * 표시 로직은 OrderView에 전부 위임되어 있으므로 OrderView만 테스트해도 충분.
 */
function renderView(view: CustomerOrderView, code = 'ABC12345') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrderView view={view} code={code} />
    </QueryClientProvider>,
  );
}

function baseView(
  overrides: Partial<CustomerOrderView['order']> = {},
  rootOverrides: Partial<CustomerOrderView> = {},
): CustomerOrderView {
  return {
    orderId: 1,
    editable: true,
    branchName: '강남지사',
    branchPhone: '02-1234-5678',
    order: {
      orderNo: 'ORD-001',
      receiverName: '김철수',
      receiverPhone: '010-0000-0000',
      deliveryAddress1: '서울시 강남구',
      status: 'RECEIVED',
      productName: '동양란',
      amountTotal: 78000,
      ...overrides,
    },
    deliveryPhotos: [],
    scenePhotos: [],
    ...rootOverrides,
  };
}

describe('OrderView (customer page)', () => {
  beforeEach(() => {
    mockConfirm.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('RECEIVED 상태에서 인수자 카드는 렌더되지 않는다', () => {
    renderView(baseView({ status: 'RECEIVED' }));
    expect(screen.getByText('동양란')).toBeInTheDocument();
    expect(screen.queryByText('인수자 정보')).not.toBeInTheDocument();
  });

  it('DELIVERED 상태에서 인수자 카드 + 사진 + 필드 렌더', () => {
    renderView(
      baseView(
        {
          status: 'DELIVERED',
          recipientActualName: '박상덕',
          receivedAt: '2025-12-22T16:07:00',
          recipientRelationship: '친척',
        },
        {
          deliveryPhotos: [{ id: 1, url: '/uploads/a.jpg', createdAt: '2025-12-22T16:00:00' }],
          scenePhotos: [{ id: 2, url: '/uploads/b.jpg', createdAt: '2025-12-22T16:05:00' }],
        },
      ),
    );
    expect(screen.getByText('인수자 정보')).toBeInTheDocument();
    expect(screen.getByText('배송 사진')).toBeInTheDocument();
    expect(screen.getByText('현장 사진')).toBeInTheDocument();
    expect(screen.getByText('박상덕')).toBeInTheDocument();
    expect(screen.getByText('친척')).toBeInTheDocument();
  });

  it('미확인 상태: [주문 확인 완료] 버튼 렌더, 클릭 시 confirm POST', async () => {
    mockConfirm.mockResolvedValue({
      ok: true,
      customerConfirmedAt: '2026-04-14T10:30:00',
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderView(baseView({ customerConfirmedAt: null }));
    expect(screen.getByRole('button', { name: /주문 확인 완료/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /주문 확인 완료/ }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith('ABC12345'));
    await waitFor(() => expect(screen.getByText(/확인 완료됨/)).toBeInTheDocument());
  });

  it('이미 confirmed 상태: 처음부터 텍스트만 표시', () => {
    renderView(baseView({ customerConfirmedAt: '2026-04-13T09:00:00' }));
    expect(screen.getByText(/확인 완료됨/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /주문 확인 완료/ })).not.toBeInTheDocument();
  });

  it('수정 요청 링크는 confirmed 여부 무관 항상 표시', () => {
    renderView(baseView({ customerConfirmedAt: '2026-04-13T09:00:00' }));
    const link = screen.getByRole('link', { name: /수정 요청 전화/ });
    expect(link).toHaveAttribute('href', 'tel:02-1234-5678');
  });

  it('branchPhone null + confirmed 조합: 수정 요청 비활성 + 확인 텍스트 동시 표시', () => {
    renderView(baseView({ customerConfirmedAt: '2026-04-13T09:00:00' }, { branchPhone: null }));
    expect(screen.getByText(/확인 완료됨/)).toBeInTheDocument();
    expect(screen.getByText(/지사 연락처 미등록/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /수정 요청 전화/ })).not.toBeInTheDocument();
  });

  it('상품명 + 배송 장소 + 보내는 분 + 발행 방식 섹션 표시 (매트릭스)', () => {
    renderView(
      baseView({
        productName: '동양란',
        senderName: '한국전기기술인협회',
        invoiceMethod: '세금계산서',
        funeralHall: '고려대병원',
        hallName: '장례식장',
        roomNumber: '202호',
      }),
    );
    expect(screen.getByText('동양란')).toBeInTheDocument();
    expect(screen.getByText('한국전기기술인협회')).toBeInTheDocument();
    expect(screen.getByText('세금계산서')).toBeInTheDocument();
    expect(screen.getByText(/고려대병원/)).toBeInTheDocument();
  });
});
