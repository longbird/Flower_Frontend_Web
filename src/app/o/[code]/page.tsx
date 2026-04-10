'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  fetchCustomerOrderView,
  resolvePhotoUrl,
  type CustomerOrderView,
} from '@/lib/api/order-link';

// ─── 상태 매핑 ──────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  UNCONFIRMED: '접수 확인 중',
  ORDER_RECEIVED: '주문 접수',
  RECEIVED: '주문 접수',
  PENDING: '대기',
  CONFIRMED: '확인',
  ASSIGNED: '화원 배정',
  PARTNER_ACCEPTED: '화원 수락',
  ACCEPTED: '화원 수락',
  PREPARING: '상품 제작 중',
  DELIVERING: '배송 중',
  DELIVERED: '배송 완료',
  ORDER_DELIVERED: '배송 완료',
  CANCELED: '주문 취소',
  CANCELLED: '주문 취소',
  ORDER_CANCELED: '주문 취소',
};

const STATUS_COLORS: Record<string, string> = {
  UNCONFIRMED: 'bg-gray-100 text-gray-800',
  ORDER_RECEIVED: 'bg-sky-100 text-sky-800',
  RECEIVED: 'bg-sky-100 text-sky-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  PARTNER_ACCEPTED: 'bg-violet-100 text-violet-800',
  ACCEPTED: 'bg-violet-100 text-violet-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  DELIVERING: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  ORDER_DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-red-100 text-red-800',
  ORDER_CANCELED: 'bg-red-100 text-red-800',
};

// 진행 단계 (타임라인)
const TIMELINE_STEPS = [
  { key: 'received', label: '주문 접수', matches: ['UNCONFIRMED', 'ORDER_RECEIVED', 'RECEIVED', 'PENDING', 'CONFIRMED'] },
  { key: 'assigned', label: '화원 배정', matches: ['ASSIGNED', 'PARTNER_ACCEPTED', 'ACCEPTED'] },
  { key: 'preparing', label: '상품 제작', matches: ['PREPARING'] },
  { key: 'delivering', label: '배송 중', matches: ['DELIVERING'] },
  { key: 'delivered', label: '배송 완료', matches: ['DELIVERED', 'ORDER_DELIVERED'] },
];

function currentStepIndex(status: string): number {
  const idx = TIMELINE_STEPS.findIndex((s) => s.matches.includes(status));
  return idx < 0 ? 0 : idx;
}

function isCancelled(status: string): boolean {
  return status === 'CANCELED' || status === 'CANCELLED' || status === 'ORDER_CANCELED';
}

// ─── 포맷 헬퍼 ──────────────────────────────────────────────
function formatDateTime(s?: string | null) {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return s;
  }
}

function formatAmount(n?: number | null) {
  if (n == null) return '';
  return `${n.toLocaleString('ko-KR')}원`;
}

function maskAddress(addr?: string | null): string {
  if (!addr) return '';
  // "서울시 강남구 역삼동 123-45" → "서울시 강남구 역삼동 ***"
  const parts = addr.trim().split(/\s+/);
  if (parts.length <= 3) return addr;
  return `${parts.slice(0, 3).join(' ')} ***`;
}

// ─── 메인 페이지 ──────────────────────────────────────────────
export default function CustomerOrderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-order-view', code],
    queryFn: () => fetchCustomerOrderView(code),
    retry: false,
    refetchInterval: 30_000, // 30초마다 자동 새로고침
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          주문 정보를 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  if (isError || !data || data.status === 'error') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600 font-medium">오류가 발생했습니다</p>
          <p className="text-xs text-slate-500 mt-2">잠시 후 다시 시도해 주세요</p>
        </CardContent>
      </Card>
    );
  }

  if (data.status === 'not_found') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-700 font-medium">주문 정보를 찾을 수 없습니다</p>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            확인 URL이 만료되었거나 존재하지 않는 주문입니다.
            <br />
            재조회가 필요하시면 고객센터로 문의해 주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <OrderView view={data.data} />;
}

// ─── 뷰 컴포넌트 ──────────────────────────────────────────────
function OrderView({ view }: { view: CustomerOrderView }) {
  const { order, deliveryPhotos } = view;
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const statusColor = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800';
  const cancelled = isCancelled(order.status);
  const stepIdx = currentStepIndex(order.status);

  return (
    <div className="space-y-4">
      {/* 상단 헤더 */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">주문번호</span>
            <span className="text-xs text-slate-700 font-mono">
              {order.orderNo || '-'}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className={cn('text-xs font-medium', statusColor)}>
              {statusLabel}
            </Badge>
          </div>
          <p className="text-base font-semibold text-slate-800 mt-2">
            {order.receiverName ? `${order.receiverName}님께` : ''}
          </p>
          {order.desiredDatetime && (
            <p className="text-sm text-slate-600 mt-1">
              배송 희망: {formatDateTime(order.desiredDatetime)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 진행 상황 타임라인 */}
      {!cancelled && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              진행 상황
            </h2>
            <ol className="relative border-l-2 border-slate-200 ml-2">
              {TIMELINE_STEPS.map((step, i) => {
                const active = i <= stepIdx;
                return (
                  <li key={step.key} className="mb-4 ml-4 last:mb-0">
                    <div
                      className={cn(
                        'absolute w-3 h-3 rounded-full -left-[7px]',
                        active ? 'bg-emerald-500' : 'bg-slate-300',
                      )}
                    />
                    <p
                      className={cn(
                        'text-sm',
                        active ? 'text-slate-800 font-medium' : 'text-slate-400',
                      )}
                    >
                      {step.label}
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* 배달 완료 사진 */}
      {deliveryPhotos && deliveryPhotos.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              배달 완료 사진
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {deliveryPhotos.map((p) => (
                <div
                  key={p.id}
                  className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"
                >
                  <Image
                    src={resolvePhotoUrl(p.url)}
                    alt="배달 사진"
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 주문 정보 */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            주문 정보
          </h2>
          <InfoRow label="받는 분" value={order.receiverName || '-'} />
          <InfoRow
            label="배송 주소"
            value={maskAddress(order.deliveryAddress1) || '-'}
          />
          {order.amountTotal != null && (
            <InfoRow label="주문 금액" value={formatAmount(order.amountTotal)} />
          )}
        </CardContent>
      </Card>

      {/* 카드 메시지 / 리본 */}
      {(order.cardMessage || order.ribbonRight || order.memo) && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">
              메시지
            </h2>
            {order.cardMessage && (
              <InfoRow label="리본(좌)" value={order.cardMessage} />
            )}
            {order.ribbonRight && (
              <InfoRow label="리본(우)" value={order.ribbonRight} />
            )}
            {order.memo && <InfoRow label="메모" value={order.memo} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0 w-20">{label}</span>
      <span className="text-sm text-slate-800 text-right flex-1 break-keep">
        {value}
      </span>
    </div>
  );
}
