'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type {
  AdminVbankPaymentsFilters,
  VbankPaymentStatus,
} from '@/lib/payments/innopay-types';

interface Props {
  value: AdminVbankPaymentsFilters;
  onChange: (next: AdminVbankPaymentsFilters) => void;
}

interface BranchOption { id: number; name: string }

const STATUS_OPTIONS: { value: VbankPaymentStatus; label: string }[] = [
  { value: 'PENDING',         label: '입금대기' },
  { value: 'PAID',            label: '입금완료' },
  { value: 'CANCELED',        label: '취소/만료' },
  { value: 'REVIEW_REQUIRED', label: '검토필요' },
  { value: 'FAILED',          label: '실패' },
];

type Mode = 'TEST' | 'REAL' | '';

export function VbankPaymentsFilters({ value, onChange }: Props) {
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // 결제 관리 페이지와 동일한 패턴 — 입력은 버퍼에 두고 '조회' 클릭 시에만 적용.
  // 상태 pill 토글 / 초기화는 즉시 반영 (관습대로).
  const [draftFrom, setDraftFrom] = useState<string>(value.from ?? '');
  const [draftTo, setDraftTo] = useState<string>(value.to ?? '');
  const [draftBranchId, setDraftBranchId] = useState<string>(
    value.branchId ? String(value.branchId) : '',
  );
  const [draftMode, setDraftMode] = useState<Mode>((value.mode as Mode) ?? '');

  // 외부에서 value 가 바뀌면 (초기화 / status pill 적용 후) 버퍼도 동기화
  useEffect(() => {
    setDraftFrom(value.from ?? '');
    setDraftTo(value.to ?? '');
    setDraftBranchId(value.branchId ? String(value.branchId) : '');
    setDraftMode((value.mode as Mode) ?? '');
  }, [value.from, value.to, value.branchId, value.mode]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api<BranchOption[] | { data: BranchOption[] }>('/admin/branches');
        const list = Array.isArray(res) ? res : (res.data ?? []);
        setBranches(list.map((b) => ({ id: Number(b.id), name: b.name })));
      } catch {
        // ignore — branch dropdown will be empty
      }
    })();
  }, []);

  const toggleStatus = (s: VbankPaymentStatus) => {
    const cur = new Set(value.status ?? []);
    if (cur.has(s)) cur.delete(s); else cur.add(s);
    onChange({ ...value, status: cur.size > 0 ? Array.from(cur) : undefined, page: 1 });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({
      ...value,
      from: draftFrom || undefined,
      to: draftTo || undefined,
      branchId: draftBranchId ? Number(draftBranchId) : undefined,
      mode: draftMode || undefined,
      page: 1,
    });
  };

  const hasFilters =
    !!value.status?.length || !!value.branchId || !!value.from || !!value.to || !!value.mode;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Row 1: Date + Branch + Mode + 조회 + Reset */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 px-4 py-2.5 flex-wrap border-b border-slate-100"
      >
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="h-9 w-36 border-slate-200"
            aria-label="시작일"
          />
          <span className="text-slate-400 text-sm">~</span>
          <Input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className="h-9 w-36 border-slate-200"
            aria-label="종료일"
          />
        </div>

        <select
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm bg-white h-9"
          value={draftBranchId}
          onChange={(e) => setDraftBranchId(e.target.value)}
          aria-label="지사"
        >
          <option value="">지사 전체</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm bg-white h-9"
          value={draftMode}
          onChange={(e) => setDraftMode(e.target.value as Mode)}
          aria-label="모드"
        >
          <option value="">모드 전체</option>
          <option value="TEST">TEST</option>
          <option value="REAL">REAL</option>
        </select>

        <Button
          type="submit"
          size="sm"
          className="bg-[#5B7A3D] hover:bg-[#4A6830] shrink-0"
        >
          조회
        </Button>

        {hasFilters && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange({ page: 1, pageSize: value.pageSize ?? 20 })}
            className="ml-auto h-9 text-slate-500 hover:text-slate-700"
          >
            초기화
          </Button>
        )}
      </form>

      {/* Row 2: Status pills */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        <span className="text-xs text-slate-500 mr-1">상태</span>
        {STATUS_OPTIONS.map((opt) => {
          const selected = value.status?.includes(opt.value) ?? false;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleStatus(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ring-1 ${
                selected
                  ? 'bg-[#5B7A3D] text-white ring-[#5B7A3D] hover:bg-[#4A6830]'
                  : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
