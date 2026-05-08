'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listAircpmLoginLogs,
  type AircpmLoginLogEndpoint,
  type AircpmLoginLogResult,
  type AircpmLoginLogItem,
} from '@/lib/api/aircpm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ENDPOINT_OPTIONS: Array<{ value: AircpmLoginLogEndpoint | 'all'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'login', label: '로그인' },
  { value: 'cert_request', label: '기기 인증 요청' },
];

const RESULT_OPTIONS: Array<{ value: AircpmLoginLogResult | 'all'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'success', label: '성공' },
  { value: 'invalid_credentials', label: '계정/비번 오류' },
  { value: 'account_disabled', label: '비활성 계정' },
  { value: 'cert_not_approved', label: '기기 미승인' },
  { value: 'cert_rejected', label: '기기 거부' },
  { value: 'already_approved', label: '이미 승인됨' },
  { value: 'pending', label: '대기' },
];

const RESULT_VARIANT: Record<AircpmLoginLogResult, { label: string; tone: string }> = {
  success: { label: '성공', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  invalid_credentials: { label: '계정/비번 오류', tone: 'bg-rose-100 text-rose-700 border-rose-200' },
  account_disabled: { label: '비활성', tone: 'bg-rose-100 text-rose-700 border-rose-200' },
  cert_not_approved: { label: '기기 미승인', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  cert_rejected: { label: '기기 거부', tone: 'bg-rose-100 text-rose-700 border-rose-200' },
  already_approved: { label: '이미 승인됨', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  pending: { label: '대기', tone: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const ENDPOINT_LABEL: Record<AircpmLoginLogEndpoint, string> = {
  login: '로그인',
  cert_request: '기기 인증',
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

function shorten(s: string | null, max = 24): string {
  if (!s) return '-';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export default function AircpmLoginLogsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [userIdInput, setUserIdInput] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [endpoint, setEndpoint] = useState<AircpmLoginLogEndpoint | 'all'>('all');
  const [result, setResult] = useState<AircpmLoginLogResult | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-aircpm-login-logs', { page, limit, userIdFilter, endpoint, result }],
    queryFn: () =>
      listAircpmLoginLogs({
        page,
        limit,
        userId: userIdFilter.trim() || undefined,
        endpoint,
        result,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const applyFilters = () => {
    setUserIdFilter(userIdInput);
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
          <h1 className="text-2xl font-bold text-slate-900">로그인 로그</h1>
          <p className="text-sm text-slate-500 mt-1">
            AirCPM 클라이언트의 로그인 및 기기 인증 요청 시도를 모두 기록합니다 (성공/실패).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? '갱신 중...' : '새로고침'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1">
              사용자 ID
            </label>
            <Input
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters();
              }}
              placeholder="user01"
            />
          </div>
          <div>
            <label className="block text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1">
              엔드포인트
            </label>
            <Select value={endpoint} onValueChange={(v) => { setEndpoint(v as any); setPage(1); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENDPOINT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1">
              결과
            </label>
            <Select value={result} onValueChange={(v) => { setResult(v as any); setPage(1); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={applyFilters} className="w-full bg-emerald-600 hover:bg-emerald-700">
              검색
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="text-center py-12 text-slate-500">로딩 중...</div>
          )}
          {isError && (
            <div className="text-center py-12 text-rose-600">로그를 불러오지 못했습니다.</div>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center py-12 text-slate-400">조건에 해당하는 로그가 없습니다.</div>
          )}
          {!isLoading && !isError && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-[12px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">시각</th>
                    <th className="px-3 py-2 text-left font-semibold">엔드포인트</th>
                    <th className="px-3 py-2 text-left font-semibold">결과</th>
                    <th className="px-3 py-2 text-left font-semibold">사용자</th>
                    <th className="px-3 py-2 text-left font-semibold">컴퓨터</th>
                    <th className="px-3 py-2 text-left font-semibold">IP</th>
                    <th className="px-3 py-2 text-left font-semibold">사유</th>
                    <th className="px-3 py-2 text-right font-semibold">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row: AircpmLoginLogItem) => {
                    const isOpen = expanded.has(row.id);
                    const variant = RESULT_VARIANT[row.result] ?? {
                      label: row.result,
                      tone: 'bg-slate-100 text-slate-700 border-slate-200',
                    };
                    return (
                      <Fragment key={row.id}>
                        <tr className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 whitespace-nowrap text-slate-700 tabular-nums">
                            {formatDateTime(row.attemptedAt)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{ENDPOINT_LABEL[row.endpoint]}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={cn('font-medium', variant.tone)}>
                              {variant.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-mono text-[12.5px] text-slate-700">
                            {row.userId ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{shorten(row.computerName)}</td>
                          <td className="px-3 py-2 font-mono text-[12.5px] text-slate-600">
                            {row.realIp ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.rejectReason ? (
                              <span className="text-rose-700">{shorten(row.rejectReason, 32)}</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(row.id)}
                            >
                              {isOpen ? '접기' : '펼치기'}
                            </Button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-slate-50/60 border-t border-slate-100">
                            <td colSpan={8} className="px-4 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
                                <DetailRow label="Serial" value={row.serial} mono />
                                <DetailRow label="MAC" value={row.macAddress} mono />
                                <DetailRow label="컴퓨터 이름" value={row.computerName} />
                                <DetailRow label="실제 IP" value={row.realIp} mono />
                                <DetailRow label="aircpm_user.id" value={row.aircpmUserId?.toString() ?? null} />
                                <DetailRow label="거부 사유" value={row.rejectReason} highlight={!!row.rejectReason} />
                                <div className="md:col-span-2">
                                  <DetailRow label="User-Agent" value={row.userAgent} mono wrap />
                                </div>
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
