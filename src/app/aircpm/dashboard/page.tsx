'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listAircpmDailyStats,
  type AircpmDailyStatItem,
} from '@/lib/api/aircpm';
import { listAircpmBranches } from '@/lib/api/aircpm-payments';
import { useAuthStore } from '@/lib/auth/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const DAY_OPTIONS = [7, 14, 30] as const;
type DaySpan = (typeof DAY_OPTIONS)[number];

const ALL_BRANCHES = '__all__';

/** 실패율이 이 값을 넘으면 눈에 띄게 표시한다. 평상시 실지사는 1% 안팎이다. */
const FAIL_RATE_WARN = 5;

function pct(part: number, whole: number): number | null {
  if (!whole) return null;
  return (part / whole) * 100;
}

function fmtPct(v: number | null): string {
  return v === null ? '-' : `${v.toFixed(1)}%`;
}

function fmtInt(v: number): string {
  return v.toLocaleString('ko-KR');
}

/** 붙여넣기 소요는 ms 로 오지만 초 단위가 사람이 읽기 쉽다. */
function fmtMs(ms: number | null): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${fmtInt(Math.round(ms))}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** 'YYYY-MM-DD' -> 'MM-DD (수)'. 업무일 라벨이라 요일이 있으면 야간 흐름을 읽기 쉽다. */
function fmtYmd(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
  return `${ymd.slice(5)} (${dow})`;
}

type DayAgg = {
  businessYmd: string;
  total: number;
  success: number;
  failedAny: number;
  dropped: number;
  droppedUnlinked: number;
  /** 가중평균. 지사별 단순평균을 내면 콜 1건짜리 지사가 400건짜리와 같은 무게가 된다. */
  avgPasteMs: number | null;
  byKind: Record<string, number>;
};

/**
 * 같은 업무일의 여러 지사 행을 하나로 합친다(super 가 전 지사를 볼 때).
 * 지사를 고른 상태면 하루에 한 행뿐이라 그대로 통과한다.
 */
export function aggregateByDay(items: AircpmDailyStatItem[]): DayAgg[] {
  const map = new Map<string, DayAgg & { _msNum: number; _msDen: number }>();
  for (const it of items) {
    let a = map.get(it.businessYmd);
    if (!a) {
      a = {
        businessYmd: it.businessYmd,
        total: 0,
        success: 0,
        failedAny: 0,
        dropped: 0,
        droppedUnlinked: 0,
        avgPasteMs: null,
        byKind: {},
        _msNum: 0,
        _msDen: 0,
      };
      map.set(it.businessYmd, a);
    }
    a.total += it.total;
    a.success += it.success;
    a.failedAny += it.failedAny;
    a.dropped += it.dropped;
    a.droppedUnlinked += it.droppedUnlinked;
    // 평균 붙여넣기는 성공 건에 대한 평균이라 success 를 가중치로 쓴다.
    if (it.avgPasteMs !== null && it.success > 0) {
      a._msNum += it.avgPasteMs * it.success;
      a._msDen += it.success;
    }
    for (const [k, v] of Object.entries(it.byKind || {})) {
      a.byKind[k] = (a.byKind[k] || 0) + v;
    }
  }
  return [...map.values()]
    .map((a) => ({
      businessYmd: a.businessYmd,
      total: a.total,
      success: a.success,
      failedAny: a.failedAny,
      dropped: a.dropped,
      droppedUnlinked: a.droppedUnlinked,
      avgPasteMs: a._msDen > 0 ? Math.round(a._msNum / a._msDen) : null,
      byKind: a.byKind,
    }))
    .sort((x, y) => (x.businessYmd < y.businessYmd ? 1 : -1));
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'bad';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div
          className={cn(
            'mt-1 text-2xl font-semibold tabular-nums',
            tone === 'bad' && 'text-red-600',
            tone === 'good' && 'text-emerald-600',
          )}
        >
          {value}
        </div>
        {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
      </CardContent>
    </Card>
  );
}

/** 실패율 추세 막대. 라이브러리 없이 그린다 — 값 하나짜리 그래프에 의존성을 늘리지 않는다. */
function FailRateBars({ days }: { days: DayAgg[] }) {
  const asc = [...days].reverse();
  const rates = asc.map((d) => pct(d.failedAny, d.total));
  const max = Math.max(FAIL_RATE_WARN, ...rates.map((r) => r ?? 0));
  return (
    <div className="flex items-end gap-1 h-24">
      {asc.map((d, i) => {
        const r = rates[i];
        const h = r === null ? 0 : Math.max(2, (r / max) * 96);
        return (
          <div key={d.businessYmd} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className={cn(
                'w-full rounded-t',
                r === null ? 'bg-slate-200' : r >= FAIL_RATE_WARN ? 'bg-red-400' : 'bg-emerald-400',
              )}
              style={{ height: `${h}px` }}
              title={`${d.businessYmd} · ${fmtPct(r)} (${fmtInt(d.failedAny)}/${fmtInt(d.total)})`}
            />
            <div className="text-[10px] text-slate-400 truncate w-full text-center">
              {d.businessYmd.slice(8)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AircpmDashboardPage() {
  const isSuper = useAuthStore((s) => s.user?.isSuper ?? false);
  const [days, setDays] = useState<DaySpan>(14);
  const [selectedBrchCd, setSelectedBrchCd] = useState<string>(ALL_BRANCHES);

  // 비-super 는 brchCd 를 아예 보내지 않는다 — 서버가 자기 지사를 강제한다.
  // (콜 조회 페이지와 같은 규칙. 보내봐야 무시되지만, 보내지 않는 편이 의도가 분명하다.)
  const effectiveBrchCd =
    isSuper && selectedBrchCd !== ALL_BRANCHES ? selectedBrchCd : undefined;

  const branchesQuery = useQuery({
    queryKey: ['aircpm-branches'],
    queryFn: listAircpmBranches,
    enabled: isSuper,
  });

  const statsQuery = useQuery({
    queryKey: ['aircpm-daily-stats', days, effectiveBrchCd ?? null],
    queryFn: () => listAircpmDailyStats({ days, brchCd: effectiveBrchCd }),
  });

  const data = statsQuery.data;
  const byDay = useMemo(() => aggregateByDay(data?.items ?? []), [data]);

  const totals = useMemo(() => {
    const t = byDay.reduce(
      (acc, d) => {
        acc.total += d.total;
        acc.success += d.success;
        acc.failedAny += d.failedAny;
        acc.dropped += d.dropped;
        return acc;
      },
      { total: 0, success: 0, failedAny: 0, dropped: 0 },
    );
    // 기간 평균 붙여넣기도 성공 건 가중.
    let num = 0;
    let den = 0;
    for (const it of data?.items ?? []) {
      if (it.avgPasteMs !== null && it.success > 0) {
        num += it.avgPasteMs * it.success;
        den += it.success;
      }
    }
    return { ...t, avgPasteMs: den > 0 ? Math.round(num / den) : null };
  }, [byDay, data]);

  // 유형별 합계 — 실패 봉투가 있는 건만 집계된다는 점을 화면에서 밝힌다.
  const kindTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of byDay) for (const [k, v] of Object.entries(d.byKind)) m[k] = (m[k] || 0) + v;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [byDay]);

  const failRate = pct(totals.failedAny, totals.total);
  const showBranchColumn = isSuper && !effectiveBrchCd;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">일별 통계</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            업무일 경계는 <strong>08:00 KST</strong> 입니다. 자정 기준이 아니라 새벽 콜은 전일에
            속합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-200 overflow-hidden">
            {DAY_OPTIONS.map((d) => (
              <Button
                key={d}
                variant="ghost"
                size="sm"
                onClick={() => setDays(d)}
                className={cn(
                  'rounded-none border-0',
                  days === d && 'bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
                )}
              >
                {d}일
              </Button>
            ))}
          </div>

          {isSuper ? (
            <Select value={selectedBrchCd} onValueChange={setSelectedBrchCd}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="지사 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANCHES}>전 지사</SelectItem>
                {(branchesQuery.data ?? []).map((b) => (
                  <SelectItem key={b.brchCd} value={b.brchCd}>
                    {b.name ? `${b.name} (${b.brchCd})` : b.brchCd}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            // 지사 관리자는 고를 것이 없다. 서버가 준 값을 그대로 보여준다(권한의 사실을 화면에 반영).
            <div className="text-sm text-slate-600 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200">
              {data?.brchCd ?? '내 지사'}
            </div>
          )}
        </div>
      </div>

      {statsQuery.isError && (
        <Card>
          <CardContent className="p-4 text-sm text-red-600">
            통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주십시오.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="총 콜" value={fmtInt(totals.total)} sub={data ? `${data.from} ~ ${data.to}` : undefined} />
        <SummaryCard label="성공" value={fmtInt(totals.success)} />
        <SummaryCard
          label="실패율"
          value={fmtPct(failRate)}
          sub={`${fmtInt(totals.failedAny)}건`}
          tone={failRate !== null && failRate >= FAIL_RATE_WARN ? 'bad' : 'good'}
        />
        <SummaryCard label="이탈(콜)" value={fmtInt(totals.dropped)} />
        <SummaryCard label="평균 붙여넣기" value={fmtMs(totals.avgPasteMs)} sub="성공 건 가중평균" />
      </div>

      {byDay.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-2">실패율 추세</div>
            <FailRateBars days={byDay} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">업무일</th>
                {showBranchColumn && <th className="px-3 py-2 text-left font-semibold">지사</th>}
                <th className="px-3 py-2 text-right font-semibold">총건</th>
                <th className="px-3 py-2 text-right font-semibold">성공</th>
                <th className="px-3 py-2 text-right font-semibold">실패</th>
                <th className="px-3 py-2 text-right font-semibold">실패율</th>
                <th className="px-3 py-2 text-right font-semibold">이탈(콜)</th>
                <th className="px-3 py-2 text-right font-semibold">평균 붙여넣기</th>
              </tr>
            </thead>
            <tbody>
              {statsQuery.isLoading && (
                <tr>
                  <td colSpan={showBranchColumn ? 8 : 7} className="px-4 py-6 text-center text-slate-400">
                    불러오는 중...
                  </td>
                </tr>
              )}

              {!statsQuery.isLoading && (data?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={showBranchColumn ? 8 : 7} className="px-4 py-6 text-center text-slate-400">
                    해당 기간에 집계된 통계가 없습니다.
                  </td>
                </tr>
              )}

              {/* 지사를 고르지 않은 super 는 지사별 원본 행을, 그 외에는 일자 합계를 보여준다. */}
              {!statsQuery.isLoading &&
                showBranchColumn &&
                (data?.items ?? []).map((it) => {
                  const r = pct(it.failedAny, it.total);
                  return (
                    <tr key={`${it.businessYmd}-${it.brchCd}`} className="border-b border-slate-100">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtYmd(it.businessYmd)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{it.brchCd}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(it.total)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(it.success)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(it.failedAny)}</td>
                      <td
                        className={cn(
                          'px-3 py-2 text-right tabular-nums',
                          r !== null && r >= FAIL_RATE_WARN && 'text-red-600 font-medium',
                        )}
                      >
                        {fmtPct(r)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(it.dropped)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMs(it.avgPasteMs)}</td>
                    </tr>
                  );
                })}

              {!statsQuery.isLoading &&
                !showBranchColumn &&
                byDay.map((d) => {
                  const r = pct(d.failedAny, d.total);
                  return (
                    <tr key={d.businessYmd} className="border-b border-slate-100">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtYmd(d.businessYmd)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(d.total)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(d.success)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(d.failedAny)}</td>
                      <td
                        className={cn(
                          'px-3 py-2 text-right tabular-nums',
                          r !== null && r >= FAIL_RATE_WARN && 'text-red-600 font-medium',
                        )}
                      >
                        {fmtPct(r)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(d.dropped)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMs(d.avgPasteMs)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <div className="text-sm font-medium">실패 유형</div>
            <div className="text-xs text-slate-400">
              실패 봉투가 있는 건만 집계됩니다 — 봉투 도입(2026-07-28) 이전 구간은 비어 있으며, 이는
              &lsquo;실패 유형이 없었다&rsquo;가 아니라 &lsquo;분류 근거가 없었다&rsquo;는 뜻입니다.
            </div>
          </div>
          {kindTotals.length === 0 ? (
            <div className="text-sm text-slate-400 py-2">이 기간에 분류된 실패가 없습니다.</div>
          ) : (
            <div className="space-y-1.5">
              {kindTotals.map(([kind, n]) => {
                const max = kindTotals[0][1] || 1;
                return (
                  <div key={kind} className="flex items-center gap-2">
                    <div className="w-40 shrink-0 text-xs text-slate-600 truncate" title={kind}>
                      {kind}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded h-4 overflow-hidden">
                      <div className="bg-slate-500 h-full" style={{ width: `${(n / max) * 100}%` }} />
                    </div>
                    <div className="w-10 text-right text-xs tabular-nums text-slate-600">{n}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 leading-relaxed">
        근거 테이블은 일별 롤업(영구 보존)입니다. 상세 콜 기록은 일반 2일 / 오류 30일만 보관하므로,
        그보다 과거 구간은 이 화면의 수치만이 답할 수 있습니다. demo 지사는 집계에서 제외됩니다.
        <br />
        &lsquo;이탈(콜)&rsquo; 은 이탈 이벤트를 가진 <strong>콜 수</strong> 입니다. 콜에 연결되지 않은
        이탈 <strong>이벤트 수</strong> 는 단위가 달라 더하지 않습니다.
      </p>
    </div>
  );
}
