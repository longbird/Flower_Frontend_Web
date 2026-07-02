'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listAircpmCalls,
  type AircpmCallItem,
  type AircpmCallStatus,
} from '@/lib/api/aircpm';
import { listAircpmBranches } from '@/lib/api/aircpm-payments';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: Array<{ value: AircpmCallStatus | 'all'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'CALLPASSED', label: '콜패스' },
  { value: 'DISPATCHED', label: '배차' },
];

const ERROR_OPTIONS: Array<{ value: 'all' | 'error'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'error', label: '오류만' },
];

const STATUS_VARIANT: Record<AircpmCallStatus, { label: string; tone: string }> = {
  CALLPASSED: { label: '콜패스', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  DISPATCHED: { label: '배차', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function shorten(s: string | null, max = 20): string {
  if (!s) return '-';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function hasError(row: AircpmCallItem): boolean {
  return row.postProcessStatus === 'FAILED' || row.pasteOk === false;
}

export default function AircpmCallsPage() {
  const isSuper = useAuthStore((s) => s.user?.isSuper ?? false);

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [status, setStatus] = useState<AircpmCallStatus | 'all'>('all');
  const [errorFilter, setErrorFilter] = useState<'all' | 'error'>('all');
  const [selectedBrchCd, setSelectedBrchCd] = useState(''); // super 전용, '' = 전체
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // 비-super는 brchCd 미전송 — 서버가 자기 지사를 강제한다 (스펙 §3.2).
  const effectiveBrchCd = isSuper ? selectedBrchCd || undefined : undefined;

  const { data: branches = [] } = useQuery({
    queryKey: ['aircpm-branches'],
    queryFn: listAircpmBranches,
    enabled: isSuper,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      'admin-aircpm-calls',
      { page, limit, fromFilter, toFilter, status, errorFilter, effectiveBrchCd },
    ],
    queryFn: () =>
      listAircpmCalls({
        page,
        limit,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        status: status === 'all' ? undefined : status,
        errorOnly: errorFilter === 'error',
        brchCd: effectiveBrchCd,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const branchNotAssigned =
    error instanceof ApiError &&
    error.status === 403 &&
    (error.data as { code?: string } | undefined)?.code === 'BRANCH_NOT_ASSIGNED';

  const applyFilters = () => {
    setFromFilter(fromInput);
    setToFilter(toInput);
    setPage(1);
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">콜 조회</h1>
          <p className="text-sm text-slate-500 mt-1">
            콜패스된 콜 이력을 조회합니다. 기간 미지정 시 오늘(영업일) 기준입니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? '갱신 중...' : '새로고침'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1">
              시작일
            </label>
            <Input
              type="date"
              aria-label="시작일"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1">
              종료일
            </label>
            <Input
              type="date"
              aria-label="종료일"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1">
              상태
            </label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as AircpmCallStatus | 'all');
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1">
              오류 필터
            </label>
            <Select
              value={errorFilter}
              onValueChange={(v) => {
                setErrorFilter(v as 'all' | 'error');
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ERROR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isSuper && (
            <div>
              {/* 라벨은 '지사 필터' — 테이블 컬럼 헤더 '지사'와 텍스트 충돌 방지(RTL getByText 유일성) */}
              <label className="block text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1">
                지사 필터
              </label>
              <Select
                value={selectedBrchCd || 'all'}
                onValueChange={(v) => {
                  setSelectedBrchCd(v === 'all' ? '' : v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 지사</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.brchCd} value={b.brchCd}>
                      {b.name ? `${b.name} (${b.brchCd})` : b.brchCd}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-end">
            <Button onClick={applyFilters} className="w-full bg-emerald-600 hover:bg-emerald-700">
              검색
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="text-center py-12 text-slate-500">로딩 중...</div>}
          {isError && branchNotAssigned && (
            <div className="text-center py-12 text-amber-700">
              담당 지사가 배정되지 않았습니다. 관리자에게 지사 배정을 요청하세요.
            </div>
          )}
          {isError && !branchNotAssigned && (
            <div className="text-center py-12 text-rose-600">콜 목록을 불러오지 못했습니다.</div>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center py-12 text-slate-400">조건에 해당하는 콜이 없습니다.</div>
          )}
          {!isLoading && !isError && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-[12px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">접수 시각</th>
                    {isSuper && <th className="px-3 py-2 text-left font-semibold">지사</th>}
                    <th className="px-3 py-2 text-left font-semibold">상태</th>
                    <th className="px-3 py-2 text-left font-semibold">전화</th>
                    <th className="px-3 py-2 text-left font-semibold">출발지</th>
                    <th className="px-3 py-2 text-left font-semibold">도착지</th>
                    <th className="px-3 py-2 text-right font-semibold">금액</th>
                    <th className="px-3 py-2 text-left font-semibold">앱</th>
                    <th className="px-3 py-2 text-left font-semibold">오류</th>
                    <th className="px-3 py-2 text-right font-semibold">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const isOpen = expanded.has(row.callId);
                    const variant = STATUS_VARIANT[row.status];
                    return (
                      <Fragment key={row.callId}>
                        <tr className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 whitespace-nowrap text-slate-700 tabular-nums">
                            {formatDateTime(row.firstReceivedAt)}
                          </td>
                          {isSuper && (
                            <td className="px-3 py-2 font-mono text-[12.5px] text-slate-700">
                              {row.brchCd}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={cn('font-medium', variant.tone)}>
                              {variant.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-mono text-[12.5px] text-slate-700">
                            {row.customerPhoneMasked}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{shorten(row.originName)}</td>
                          <td className="px-3 py-2 text-slate-600">{shorten(row.destName)}</td>
                          <td className="px-3 py-2 text-right text-slate-700 tabular-nums">
                            {row.amount == null ? '-' : row.amount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{row.sourceApp}</td>
                          <td className="px-3 py-2">
                            {hasError(row) ? (
                              <span className="text-rose-700 text-[12.5px] font-medium">오류</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="ghost" size="sm" onClick={() => toggleExpand(row.callId)}>
                              {isOpen ? '접기' : '펼치기'}
                            </Button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-slate-50/60 border-t border-slate-100">
                            <td colSpan={isSuper ? 10 : 9} className="px-4 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
                                <DetailRow label="주문번호" value={row.orderNo} mono />
                                <DetailRow label="영업일" value={row.businessYmd} mono />
                                <DetailRow label="출발지 주소" value={row.originAddr} wrap />
                                <DetailRow label="도착지 주소" value={row.destAddr} wrap />
                                <DetailRow label="배차 시각" value={formatDateTime(row.dispatchedAt)} />
                                <DetailRow label="마지막 이벤트" value={formatDateTime(row.lastEventAt)} />
                                <DetailRow label="후처리 상태" value={row.postProcessStatus} />
                                <DetailRow
                                  label="후처리 오류"
                                  value={row.postProcessError}
                                  highlight={!!row.postProcessError}
                                />
                                <DetailRow
                                  label="붙여넣기"
                                  value={
                                    row.pasteOk == null
                                      ? null
                                      : `${row.pasteOk ? '성공' : '실패'}${
                                          row.pasteTotalMs != null ? ` · ${row.pasteTotalMs}ms` : ''
                                        }`
                                  }
                                  highlight={row.pasteOk === false}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && !isError && total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            전체 {total.toLocaleString()}건 / {page} / {totalPages} 페이지
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  wrap,
  highlight,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  wrap?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="text-slate-500 w-28 shrink-0">{label}</div>
      <div
        className={cn(
          'text-slate-700 flex-1 min-w-0',
          mono && 'font-mono text-[12px]',
          wrap ? 'break-all' : 'truncate',
          highlight && 'text-rose-700',
        )}
      >
        {value ?? <span className="text-slate-300">-</span>}
      </div>
    </div>
  );
}
