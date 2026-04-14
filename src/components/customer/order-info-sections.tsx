import { Card, CardContent } from '@/components/ui/card';
import type { CustomerOrderView } from '@/lib/api/order-link';
import { formatAmount, formatDateTime } from '@/components/customer/_utils';

type Order = CustomerOrderView['order'];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0 w-20">{label}</span>
      <span className="text-sm text-slate-800 text-right flex-1 break-keep">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

export function ProductInfoSection({ order }: { order: Order }) {
  return (
    <SectionCard title="상품 정보">
      <InfoRow label="상품명" value={order.productName || '-'} />
      {order.amountTotal != null && <InfoRow label="금액" value={formatAmount(order.amountTotal)} />}
    </SectionCard>
  );
}

export function DeliveryInfoSection({ order }: { order: Order }) {
  const venue = [order.funeralHall, order.hallName, order.roomNumber].filter(Boolean).join(' ');
  const address = [order.deliveryAddress1, order.deliveryAddress2].filter(Boolean).join(' ');
  return (
    <SectionCard title="배송 정보">
      <InfoRow label="배송일시" value={formatDateTime(order.desiredDatetime) || '-'} />
      <InfoRow label="배송장소" value={venue || '-'} />
      <InfoRow label="배송주소" value={address || '-'} />
    </SectionCard>
  );
}

export function ReceiverInfoSection({ order }: { order: Order }) {
  return (
    <SectionCard title="받는 분">
      <InfoRow label="받는 고객명" value={order.receiverName || '-'} />
      <InfoRow label="연락처" value={order.receiverPhone || '-'} />
    </SectionCard>
  );
}

export function RibbonMessageSection({ order }: { order: Order }) {
  const hasAny = order.cardMessage || order.ribbonRight || order.senderName || order.memo;
  if (!hasAny) return null;
  return (
    <SectionCard title="리본 / 메시지">
      {order.cardMessage && <InfoRow label="경조사어" value={order.cardMessage} />}
      {order.ribbonRight && <InfoRow label="리본(우)" value={order.ribbonRight} />}
      {order.senderName && <InfoRow label="보내는 분" value={order.senderName} />}
      {order.memo && <InfoRow label="메모" value={order.memo} />}
    </SectionCard>
  );
}

export function InvoiceInfoSection({ order }: { order: Order }) {
  if (!order.invoiceMethod) return null;
  return (
    <SectionCard title="증빙 서류">
      <InfoRow label="발행 방식" value={order.invoiceMethod} />
    </SectionCard>
  );
}
