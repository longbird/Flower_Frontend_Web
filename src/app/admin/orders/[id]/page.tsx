'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomerLinkCard } from '@/components/admin/customer-link-card';
import { OrderDeliveryCard } from '@/components/admin/order-delivery-card';

const STATUS_LABELS: Record<string, string> = {
  UNCONFIRMED: '미확인', RECEIVED: '접수', PENDING: '대기', CONFIRMED: '확인',
  ASSIGNED: '배정', ACCEPTED: '수락', PREPARING: '준비중', DELIVERING: '배송중',
  DELIVERED: '배송완료', CANCELED: '취소',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => api<any>(`/admin/orders/${id}`).catch(() => null),
  });

  if (isLoading) return <div className="text-center py-12 text-slate-400">로딩 중...</div>;
  if (!order) return <div className="text-center py-12 text-red-500">주문을 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          목록
        </Button>
        <h1 className="text-xl font-bold">주문 상세 {order.orderNo || `#${id}`}</h1>
        <Badge>{STATUS_LABELS[order.status] || order.status}</Badge>
      </div>

      <CustomerLinkCard orderId={Number(id)} />

      <Card>
        <CardHeader><CardTitle className="text-base">주문 정보</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-400 text-xs">주문번호</dt><dd className="font-medium">{order.orderNo || order.id}</dd></div>
            <div><dt className="text-slate-400 text-xs">상태</dt><dd>{STATUS_LABELS[order.status] || order.status}</dd></div>
            <div><dt className="text-slate-400 text-xs">수령인</dt><dd>{order.receiverName || '-'}</dd></div>
            <div><dt className="text-slate-400 text-xs">수령인 연락처</dt><dd>{order.receiverPhone || '-'}</dd></div>
            <div><dt className="text-slate-400 text-xs">주문자 연락처</dt><dd>{order.customerPhone || order.senderPhone || '-'}</dd></div>
            <div><dt className="text-slate-400 text-xs">금액</dt><dd>{order.totalPrice != null ? `${Number(order.totalPrice).toLocaleString()}원` : '-'}</dd></div>
            <div className="col-span-2"><dt className="text-slate-400 text-xs">배송지</dt><dd>{[order.addressLine1, order.addressLine2].filter(Boolean).join(' ') || '-'}</dd></div>
            {order.deliveryAt && <div><dt className="text-slate-400 text-xs">배송일시</dt><dd>{new Date(order.deliveryAt).toLocaleString('ko-KR')}</dd></div>}
            {order.memo && <div className="col-span-2"><dt className="text-slate-400 text-xs">메모</dt><dd>{order.memo}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      {(order.floristName || order.floristPhone) && (
        <Card>
          <CardHeader><CardTitle className="text-base">배정 화원</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><dt className="text-slate-400 text-xs">화원명</dt><dd>{order.floristName || '-'}</dd></div>
              <div><dt className="text-slate-400 text-xs">연락처</dt><dd>{order.floristPhone || '-'}</dd></div>
            </dl>
          </CardContent>
        </Card>
      )}

      {(order.funeralHall || order.ribbonLeft || order.venue) && (
        <Card>
          <CardHeader><CardTitle className="text-base">추가 정보</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {order.funeralHall && <div><dt className="text-slate-400 text-xs">장례식장</dt><dd>{order.funeralHall}</dd></div>}
              {order.roomNumber && <div><dt className="text-slate-400 text-xs">호실</dt><dd>{order.roomNumber}</dd></div>}
              {order.deceasedName && <div><dt className="text-slate-400 text-xs">고인</dt><dd>{order.deceasedName}</dd></div>}
              {order.chiefMourner && <div><dt className="text-slate-400 text-xs">상주</dt><dd>{order.chiefMourner}</dd></div>}
              {order.ribbonLeft && <div><dt className="text-slate-400 text-xs">리본 왼쪽</dt><dd>{order.ribbonLeft}</dd></div>}
              {order.ribbonRight && <div><dt className="text-slate-400 text-xs">리본 오른쪽</dt><dd>{order.ribbonRight}</dd></div>}
              {order.venue && <div><dt className="text-slate-400 text-xs">장소</dt><dd>{order.venue}</dd></div>}
              {order.hallName && <div><dt className="text-slate-400 text-xs">홀</dt><dd>{order.hallName}</dd></div>}
            </dl>
          </CardContent>
        </Card>
      )}

      <OrderDeliveryCard
        orderId={Number(id)}
        initialRecipientName={order.recipientActualName}
        initialReceivedAt={order.receivedAt}
        initialRecipientRelationship={order.recipientRelationship}
      />

      <div className="text-xs text-slate-400">
        생성: {order.createdAt ? new Date(order.createdAt).toLocaleString('ko-KR') : '-'}
        {order.updatedAt && ` · 수정: ${new Date(order.updatedAt).toLocaleString('ko-KR')}`}
      </div>
    </div>
  );
}
