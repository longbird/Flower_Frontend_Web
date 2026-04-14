import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/api/admin-orders', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/admin-orders')>(
    '@/lib/api/admin-orders',
  );
  return {
    ...actual,
    listAdminProofs: vi.fn(),
    uploadAdminProof: vi.fn(),
    updateAdminRecipientInfo: vi.fn(),
    deleteAdminProof: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { OrderDeliveryCard } from '@/components/admin/order-delivery-card';
import {
  listAdminProofs,
  uploadAdminProof,
  updateAdminRecipientInfo,
  deleteAdminProof,
} from '@/lib/api/admin-orders';

const mockList = listAdminProofs as ReturnType<typeof vi.fn>;
const mockUpload = uploadAdminProof as ReturnType<typeof vi.fn>;
const mockUpdateRecipient = updateAdminRecipientInfo as ReturnType<typeof vi.fn>;
const mockDelete = deleteAdminProof as ReturnType<typeof vi.fn>;

function renderCard(props: Partial<React.ComponentProps<typeof OrderDeliveryCard>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <OrderDeliveryCard orderId={123} {...props} />
    </QueryClientProvider>,
  );
}

describe('OrderDeliveryCard', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockUpload.mockReset();
    mockUpdateRecipient.mockReset();
    mockDelete.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('사진 0개일 때 "등록된 사진이 없습니다" 안내', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    renderCard();
    await waitFor(() => expect(screen.getByText(/등록된 사진이 없습니다/)).toBeInTheDocument());
  });

  it('탭별 proofType 분리 카운트 표시', async () => {
    mockList.mockResolvedValue({
      ok: true,
      items: [
        { proofType: 'DELIVERY_PHOTO', fileUrl: '/a.jpg' },
        { proofType: 'DELIVERY_PHOTO', fileUrl: '/b.jpg' },
        { proofType: 'SCENE_PHOTO', fileUrl: '/c.jpg' },
      ],
    });
    renderCard();
    await waitFor(() => expect(screen.getByText(/배송사진 \(2\)/)).toBeInTheDocument());
    expect(screen.getByText(/현장사진 \(1\)/)).toBeInTheDocument();
  });

  it('현장사진 탭 클릭 시 해당 그리드 렌더', async () => {
    mockList.mockResolvedValue({
      ok: true,
      items: [
        { proofType: 'DELIVERY_PHOTO', fileUrl: '/a.jpg' },
        { proofType: 'SCENE_PHOTO', fileUrl: '/c.jpg' },
      ],
    });
    renderCard();
    await waitFor(() => expect(screen.getByText(/배송사진 \(1\)/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /현장사진/ }));
    await waitFor(() => {
      const img = screen.getByRole('img', { name: /현장사진 1/ });
      expect(img).toHaveAttribute('src', expect.stringContaining('/c.jpg'));
    });
  });

  it('초기 인수자 값이 폼에 로드됨', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    renderCard({
      initialRecipientName: '박상덕',
      initialReceivedAt: '2025-12-22T16:07:00',
      initialRecipientRelationship: '친척',
    });
    await waitFor(() => {
      expect((screen.getByLabelText('인수자명') as HTMLInputElement).value).toBe('박상덕');
      expect((screen.getByLabelText('관계') as HTMLInputElement).value).toBe('친척');
    });
  });

  it('인수자 폼 저장 호출 검증', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    mockUpdateRecipient.mockResolvedValue({ ok: true });
    renderCard({ initialRecipientName: '김영희', initialRecipientRelationship: '본인' });

    await waitFor(() =>
      expect((screen.getByLabelText('인수자명') as HTMLInputElement).value).toBe('김영희'),
    );

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(mockUpdateRecipient).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ name: '김영희', relationship: '본인' }),
      ),
    );
  });

  it('업로드: uploadAdminProof 호출 (DELIVERY_PHOTO 탭)', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    mockUpload.mockResolvedValue({ ok: true, proofId: 1, fileUrl: '/uploads/x.jpg' });

    renderCard();
    await waitFor(() => expect(screen.getByText(/등록된 사진이 없습니다/)).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(123, file, 'DELIVERY_PHOTO');
    });
  });

  it('사진 삭제 버튼 클릭 시 confirm 후 deleteAdminProof 호출', async () => {
    mockList.mockResolvedValue({
      ok: true,
      items: [
        { id: 99, proofType: 'DELIVERY_PHOTO', fileUrl: '/uploads/x.jpg' },
      ],
    });
    mockDelete.mockResolvedValue({ ok: true, deletedId: 99 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderCard();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '사진 삭제' })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: '사진 삭제' }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(123, 99));
  });

  it('id 없는 사진은 삭제 버튼 미표시 (legacy 데이터)', async () => {
    mockList.mockResolvedValue({
      ok: true,
      items: [{ proofType: 'DELIVERY_PHOTO', fileUrl: '/legacy.jpg' }],
    });
    renderCard();
    await waitFor(() => {
      const img = screen.getByRole('img', { name: /배송사진/ });
      expect(img).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: '사진 삭제' })).not.toBeInTheDocument();
  });

  it('현장사진 탭에서 업로드 시 proofType=SCENE_PHOTO로 전송', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    mockUpload.mockResolvedValue({ ok: true, proofId: 2, fileUrl: '/uploads/y.jpg' });

    renderCard();
    await waitFor(() => expect(screen.getByText(/현장사진 \(0\)/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /현장사진/ }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['y'], 'scene.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(123, file, 'SCENE_PHOTO');
    });
  });
});
