'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listAircpmCalls,
  getAircpmCallLog,
  type AircpmCallItem,
  type AircpmTargetStatus,
  type AircpmSourceStatus,
} from '@/lib/api/aircpm';
import { listAircpmBranches } from '@/lib/api/aircpm-payments';
import {
  CALL_ERROR_OPTIONS,
  errorFilterToParams,
  type CallErrorFilter,
} from './error-filter';
import { businessDayToday } from './business-day';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 서버 필터는 대상앱 상태(target_status) 기준이다 — 소스앱 상태로는 필터하지 않는다.
const STATUS_OPTIONS: Array<{ value: AircpmTargetStatus | 'all'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'CALLPASSED', label: '콜패스' },
  { value: 'DISPATCHED', label: '배차' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELLED', label: '취소' },
];

const NEUTRAL = 'bg-slate-100 text-slate-700 border-slate-200';
const GOOD = 'bg-emerald-100 text-emerald-700 border-emerald-200';
const BAD = 'bg-red-100 text-red-700 border-red-200';

const TARGET_VARIANT: Record<AircpmTargetStatus, { label: string; tone: string }> = {
  CALLPASSED: { label: '콜패스', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  DISPATCHED: { label: '배차', tone: GOOD },
  COMPLETED: { label: '완료', tone: GOOD },
  CANCELLED: { label: '취소', tone: BAD },
};

// 소스앱 통합 어휘(콜마너·로지 공통). Record 라 값이 하나라도 빠지면 tsc 가 잡는다 —
// 서버가 새 코드를 추가했는데 여기가 undefined 를 참조해 크래시하는 일을 컴파일 타임에 막는다.
const SOURCE_VARIANT: Record<AircpmSourceStatus, { label: string; tone: string }> = {
  DISPATCHED: { label: '배차', tone: GOOD },
  ENDED: { label: '종료', tone: GOOD },
  CANCELLED: { label: '취소', tone: BAD },
  WAITING: { label: '대기', tone: NEUTRAL },
  OTHER: { label: '기타', tone: NEUTRAL },
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
  // 초기 기간은 KST 업무일(오늘)로 채운다 — 서버의 '기간 미지정' 기본값과 동일한
  // 범위라 초기 목록이 비지 않는다. (businessDayToday = 백엔드 businessDayOf 미러)
  const [today] = useState(() => businessDayToday());
  const [fromInput, setFromInput] = useState(today);
  const [toInput, setToInput] = useState(today);
  const [fromFilter, setFromFilter] = useState(today);
  const [toFilter, setToFilter] = useState(today);
  const [status, setStatus] = useState<AircpmTargetStatus | 'all'>('all');
  const [errorFilter, setErrorFilter] = useState<CallErrorFilter>('all');
  const [selectedBrchCd, setSelectedBrchCd] = useState(''); // super 전용, '' = 전체
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [logCallId, setLogCallId] = useState<number | null>(null); // 실패 로그 뷰어(슈퍼 전용)
  const [copied, setCopied] = useState(false);

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
        ...errorFilterToParams(errorFilter),
        brchCd: effectiveBrchCd,
      }),
  });

  // 실패 로그는 행 선택 시에만 지연 조회(최대 ~18,000자라 목록에 인라인하지 않음). 슈퍼 전용.
  const logQuery = useQuery({
    queryKey: ['admin-aircpm-call-log', logCallId],
    queryFn: () => getAircpmCallLog(logCallId as number),
    enabled: logCallId != null,
  });
  const logNotFound = logQuery.error instanceof ApiError && logQuery.error.status === 404;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const apiErrorCode =
    error instanceof ApiError ? (error.data as { code?: string } | undefined)?.code : undefined;
  const branchNotAssigned =
    error instanceof ApiError && error.status === 403 && apiErrorCode === 'BRANCH_NOT_ASSIGNED';
  // 백엔드 400: INVALID_RANGE(역순/31일 초과), INVALID_DATE(형식·달력 오류) — 기간 안내로 구분 표시.
  const invalidRange =
    error instanceof ApiError &&
    error.status === 400 &&
    (apiErrorCode === 'INVALID_RANGE' || apiErrorCode === 'INVALID_DATE');

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

  const copyLog = async () => {
    const text = logQuery.data?.log;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('복사에 실패했습니다. 브라우저 권한을 확인하세요.');
    }
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
                setStatus(v as AircpmTargetStatus | 'all');
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
                setErrorFilter(v as CallErrorFilter);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALL_ERROR_OPTIONS.map((opt) => (
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
          {isError && invalidRange && (
            <div className="text-center py-12 text-amber-700">
              조회 기간이 올바르지 않습니다. 기간은 최대 31일, 시작일은 종료일보다 빠르게 설정하세요.
            </div>
          )}
          {isError && !branchNotAssigned && !invalidRange && (
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
                    <th className="px-3 py-2 text-left font-semibold" title="대상앱(배차앱)에서의 상태">
                      대상앱
                    </th>
                    <th
                      className="px-3 py-2 text-left font-semibold"
                      title="원본콜이 소스앱에서 어떤 상태로 끝났는지. '-' = 아직 접수목록에 살아있음"
                    >
                      원본콜
                    </th>
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
                    // Record 조회는 컴파일 타임만 보장한다 — 서버가 모르는 코드를 보내면 undefined 가
                    // 나와 .label 에서 페이지가 통째로 죽는다. 모르는 값은 그 값 그대로 보여준다.
                    const target = TARGET_VARIANT[row.targetStatus] ?? {
                      label: row.targetStatus,
                      tone: NEUTRAL,
                    };
                    // 두 축은 독립이다 — 원본이 취소돼도 우리 콜은 배차돼 있을 수 있다. 각각 보여준다.
                    const source = row.sourceStatus
                      ? (SOURCE_VARIANT[row.sourceStatus] ?? { label: row.sourceStatus, tone: NEUTRAL })
                      : null;
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
                            <Badge variant="outline" className={cn('font-medium', target.tone)}>
                              {target.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            {source ? (
                              <Badge variant="outline" className={cn('font-medium', source.tone)}>
                                {source.label}
                              </Badge>
                            ) : (
                              <span className="text-slate-300" title="아직 접수목록에 살아있음(미판정)">
                                -
                              </span>
                            )}
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
                              {isSuper && row.hasLog && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-rose-700 border-rose-200 hover:bg-rose-50"
                                    onClick={() => setLogCallId(row.callId)}
                                  >
                                    실패 로그 보기
                                  </Button>
                                </div>
                              )}
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

      <Dialog
        open={logCallId != null}
        onOpenChange={(open) => {
          if (!open) {
            setLogCallId(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>후처리 실패 로그</DialogTitle>
            <DialogDescription>
              콜 #{logCallId} — CPM 클라이언트 세션 로그. 전화번호 등 민감정보가 포함될 수 있어
              화면 공유 시 유의하세요.
            </DialogDescription>
          </DialogHeader>
          {logQuery.isLoading && (
            <div className="py-8 text-center text-slate-500">불러오는 중...</div>
          )}
          {logNotFound && (
            <div className="py-8 text-center text-amber-700">이 콜에는 저장된 로그가 없습니다.</div>
          )}
          {logQuery.isError && !logNotFound && (
            <div className="py-8 text-center text-rose-600">로그를 불러오지 못했습니다.</div>
          )}
          {!logQuery.isLoading && !logQuery.isError && logQuery.data && (
            <>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={copyLog}>
                  {copied ? '복사됨 ✓' : '복사'}
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed bg-slate-950 text-slate-100 rounded-md p-3 max-h-[70vh] overflow-auto">
                {logQuery.data.log}
              </pre>
            </>
          )}
        </DialogContent>
      </Dialog>
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
