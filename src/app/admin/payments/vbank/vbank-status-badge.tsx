import { Badge } from '@/components/ui/badge';
import type { VbankPaymentStatus } from '@/lib/payments/innopay-types';

const STYLES: Record<VbankPaymentStatus, { label: string; className: string }> = {
  PENDING: { label: '입금대기', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  PAID: { label: '입금완료', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CANCELED: { label: '취소/만료', className: 'bg-slate-200 text-slate-700 border-slate-300' },
  REVIEW_REQUIRED: { label: '검토필요', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  FAILED: { label: '실패', className: 'bg-red-100 text-red-700 border-red-200' },
};

export function VbankStatusBadge({ status }: { status: VbankPaymentStatus }) {
  const style = STYLES[status] ?? STYLES.FAILED;
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}
