'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type {
  AdminVbankPaymentsFilters,
  VbankPaymentStatus,
} from '@/lib/payments/innopay-types';

interface Props {
  value: AdminVbankPaymentsFilters;
  onChange: (next: AdminVbankPaymentsFilters) => void;
}

const STATUS_OPTIONS: VbankPaymentStatus[] = ['PENDING', 'PAID', 'CANCELED', 'REVIEW_REQUIRED', 'FAILED'];
const STATUS_LABELS: Record<VbankPaymentStatus, string> = {
  PENDING: '입금대기', PAID: '입금완료', CANCELED: '취소/만료',
  REVIEW_REQUIRED: '검토필요', FAILED: '실패',
};

export function VbankPaymentsFilters({ value, onChange }: Props) {
  const toggleStatus = (s: VbankPaymentStatus) => {
    const cur = new Set(value.status ?? []);
    if (cur.has(s)) cur.delete(s);
    else cur.add(s);
    onChange({ ...value, status: cur.size > 0 ? Array.from(cur) : undefined, page: 1 });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      {/* Status multi-select */}
      <div className="space-y-2">
        <Label className="text-sm text-slate-600">상태</Label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => {
            const selected = value.status?.includes(s) ?? false;
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={`px-3 py-1 rounded-md border text-xs transition-colors ${
                  selected
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="branchId" className="text-sm text-slate-600">지사 ID</Label>
          <Input
            id="branchId"
            type="number"
            inputMode="numeric"
            value={value.branchId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...value, branchId: v ? Number(v) : undefined, page: 1 });
            }}
            placeholder="전체"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="from" className="text-sm text-slate-600">시작일</Label>
          <Input
            id="from"
            type="date"
            value={value.from ?? ''}
            onChange={(e) => onChange({ ...value, from: e.target.value || undefined, page: 1 })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="to" className="text-sm text-slate-600">종료일</Label>
          <Input
            id="to"
            type="date"
            value={value.to ?? ''}
            onChange={(e) => onChange({ ...value, to: e.target.value || undefined, page: 1 })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-sm text-slate-600">모드</Label>
          <div className="flex gap-2">
            {(['TEST', 'REAL'] as const).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={value.mode === m ? 'default' : 'outline'}
                onClick={() => onChange({ ...value, mode: value.mode === m ? undefined : m, page: 1 })}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Reset button */}
      {(value.status?.length || value.branchId || value.from || value.to || value.mode) && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange({ page: 1, pageSize: value.pageSize ?? 20 })}
          >
            초기화
          </Button>
        </div>
      )}
    </div>
  );
}
