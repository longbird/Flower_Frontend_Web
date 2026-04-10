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
// 주문(orders) + 상담요청(branch_consult_requests) 상태값을 모두 매핑
const STATUS_LABELS: Record<string, string> = {
  // 주문 상태
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
  ORDER_CANCELED: '주문 취소',
  // 상담요청 상태
  NEW: '요청 접수',
  IN_PROGRESS: '처리 중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  // 주문 상태
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
  ORDER_CANCELED: 'bg-red-100 text-red-800',
  // 상담요청 상태
  NEW: 'bg-sky-100 text-sky-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

// 진행 단계 (타임라인) — 주문(ORDER) 타입
const TIMELINE_STEPS_ORDER = [
  { key: 'received', label: '주문 접수', matches: ['UNCONFIRMED', 'ORDER_RECEIVED', 'RECEIVED', 'PENDING', 'CONFIRMED', 'NEW'] },
  { key: 'assigned', label: '화원 배정', matches: ['ASSIGNED', 'PARTNER_ACCEPTED', 'ACCEPTED'] },
  { key: 'preparing', label: '상품 제작', matches: ['PREPARING', 'IN_PROGRESS'] },
  { key: 'delivering', label: '배송 중', matches: ['DELIVERING'] },
  { key: 'delivered', label: '배송 완료', matches: ['DELIVERED', 'ORDER_DELIVERED', 'COMPLETED'] },
];

// 진행 단계 (타임라인) — 상담요청(CONSULT_REQUEST) 타입
const TIMELINE_STEPS_CONSULT = [
  { key: 'new', label: '요청 접수', matches: ['NEW'] },
  { key: 'in_progress', label: '처리 중', matches: ['IN_PROGRESS'] },
  { key: 'completed', label: '완료', matches: ['COMPLETED'] },
];

function getTimelineSteps(orderType?: string | null) {
  return orderType === 'CONSULT_REQUEST' ? TIMELINE_STEPS_CONSULT : TIMELINE_STEPS_ORDER;
}

function currentStepIndex(status: string, steps: typeof TIMELINE_STEPS_ORDER): number {
  const idx = steps.findIndex((s) => s.matches.includes(status));
  return idx < 0 ? 0 : idx;
}

function isCancelled(status: string): boolean {
  return status === 'CANCELED' || status === 'CANCELLED' || status === 'ORDER_CANCELED';
}

function formatBranchPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  return phone;
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
  const { order, deliveryPhotos, branchName, branchPhone } = view;
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const statusColor = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800';
  const cancelled = isCancelled(order.status);
  const timelineSteps = getTimelineSteps(order.orderType);
  const stepIdx = currentStepIndex(order.status, timelineSteps);
  const formattedBranchPhone = formatBranchPhone(branchPhone);

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
              {timelineSteps.map((step, i) => {
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
            value={
              [order.deliveryAddress1, order.deliveryAddress2]
                .filter(Boolean)
                .join(' ') || '-'
            }
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

      {/* 문의 지사 연락처 */}
      <div className="pt-4 pb-2 text-center text-xs text-slate-500">
        {branchName && <div className="font-medium">{branchName}</div>}
        {formattedBranchPhone ? (
          <div className="mt-1">
            문의: <a href={`tel:${branchPhone}`} className="text-slate-700 hover:underline">{formattedBranchPhone}</a>
          </div>
        ) : (
          <div className="mt-1">문의는 주문 접수 지사로 연락 주세요.</div>
        )}
      </div>
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
