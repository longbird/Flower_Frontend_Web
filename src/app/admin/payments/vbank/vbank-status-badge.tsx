import type { VbankPaymentStatus } from '@/lib/payments/innopay-types';

const STYLES: Record<VbankPaymentStatus, { label: string; className: string }> = {
  PENDING:         { label: '입금대기',  className: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200' },
  PAID:            { label: '입금완료',  className: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' },
  CANCELED:        { label: '취소/만료', className: 'bg-slate-200 text-slate-700 ring-1 ring-slate-300' },
  REVIEW_REQUIRED: { label: '검토필요',  className: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200' },
  FAILED:          { label: '실패',      className: 'bg-red-100 text-red-800 ring-1 ring-red-200' },
};

interface Props {
  status: VbankPaymentStatus;
  /** 'TEST' 모드일 때만 표시 (REAL 운영 모드는 기본이라 라벨 생략). */
  mode?: 'TEST' | 'REAL' | null;
}

export function VbankStatusBadge({ status, mode }: Props) {
  const style = STYLES[status] ?? STYLES.FAILED;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${style.className}`}>
        {style.label}
      </span>
      {mode === 'TEST' && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          TEST
        </span>
      )}
    </span>
  );
}
