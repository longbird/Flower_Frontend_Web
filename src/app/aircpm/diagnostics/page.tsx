'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listAircpmDiagnostics,
  getAircpmDiagnosticLog,
  type PasteDiagnosticItem,
} from '@/lib/api/aircpm';
import { listAircpmBranches } from '@/lib/api/aircpm-payments';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const PP_VARIANT: Record<
  PasteDiagnosticItem['postProcessStatus'],
  { label: string; tone: string }
> = {
  NONE: { label: '없음', tone: 'bg-slate-100 text-slate-500 border-slate-200' },
  PENDING: { label: '대기', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  DONE: { label: '완료', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  FAILED: { label: '실패', tone: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export default function AircpmDiagnosticsPage() {
  const isSuper = useAuthStore((s) => s.user?.isSuper ?? false);

  const [selectedBrchCd, setSelectedBrchCd] = useState(''); // '' = 전체
  const [logCallId, setLogCallId] = useState<number | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['aircpm-branches'],
    queryFn: listAircpmBranches,
    enabled: isSuper,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-aircpm-diagnostics', { selectedBrchCd }],
    queryFn: () => listAircpmDiagnostics({ brchCd: selectedBrchCd || undefined }),
    enabled: isSuper,
  });

  // 로그는 행 선택 시에만 지연 조회. 최대 ~18,000자라 목록에 인라인하지 않는다.
  const logQuery = useQuery({
    queryKey: ['admin-aircpm-diagnostic-log', logCallId],
    queryFn: () => getAircpmDiagnosticLog(logCallId as number),
    enabled: logCallId != null,
  });

  const items = data ?? [];
  const forbidden = error instanceof ApiError && error.status === 403;
  const logNotFound = logQuery.error instanceof ApiError && logQuery.error.status === 404;

  // 나머지 훅 선언 이후 가드 — 비-슈퍼는 백엔드도 403이라 조회를 아예 걸지 않는다.
  if (!isSuper) {
    return (
      <div className="text-center py-12 text-amber-700">슈퍼 관리자 전용 화면입니다.</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">붙여넣기 진단</h1>
          <p className="text-sm text-slate-500 mt-1">
            콜패스 붙여넣기/후처리 진단과 실패 상세 로그를 조회합니다. (슈퍼 관리자 전용)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? '갱신 중...' : '새로고침'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] tracking-[0.18em] uppercase text-slate-500 font-semibold mb-1">
              지사 필터
            </label>
            <Select
              value={selectedBrchCd || 'all'}
              onValueChange={(v) => setSelectedBrchCd(v === 'all' ? '' : v)}
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="text-center py-12 text-slate-500">로딩 중...</div>}
          {isError && forbidden && (
            <div className="text-center py-12 text-amber-700">
              슈퍼 관리자만 접근할 수 있습니다.
            </div>
          )}
          {isError && !forbidden && (
            <div className="text-center py-12 text-rose-600">진단 목록을 불러오지 못했습니다.</div>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center py-12 text-slate-400">진단 대상 콜이 없습니다.</div>
          )}
          {!isLoading && !isError && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-[12px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">시각</th>
                    <th className="px-3 py-2 text-left font-semibold">콜ID</th>
                    <th className="px-3 py-2 text-left font-semibold">지사</th>
                    <th className="px-3 py-2 text-left font-semibold">주문번호</th>
                    <th className="px-3 py-2 text-left font-semibold">앱</th>
                    <th className="px-3 py-2 text-left font-semibold">붙여넣기</th>
                    <th className="px-3 py-2 text-left font-semibold">병목</th>
                    <th className="px-3 py-2 text-left font-semibold">후처리</th>
                    <th className="px-3 py-2 text-right font-semibold">로그</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const pp = PP_VARIANT[row.postProcessStatus];
                    return (
                      <tr key={row.callId} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-700 tabular-nums">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="px-3 py-2 font-mono text-[12.5px] text-slate-700">
                          {row.callId}
                        </td>
                        <td className="px-3 py-2 font-mono text-[12.5px] text-slate-700">
                          {row.brchCd}
                        </td>
                        <td className="px-3 py-2 font-mono text-[12.5px] text-slate-600">
                          {row.orderNo ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.appType}</td>
                        <td
                          className={cn(
                            'px-3 py-2 tabular-nums',
                            row.pasteOk ? 'text-slate-600' : 'text-rose-700 font-medium',
                          )}
                        >
                          {row.pasteOk ? '성공' : '실패'}
                          {row.totalMs != null ? ` · ${row.totalMs}ms` : ''}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.bottleneck ?? '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="outline" className={cn('font-medium w-fit', pp.tone)}>
                              {pp.label}
                            </Badge>
                            {row.postProcessError && (
                              <span className="text-[11.5px] text-rose-600">
                                {row.postProcessError}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.hasLog ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLogCallId(row.callId)}
                            >
                              로그 보기
                            </Button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={logCallId != null}
        onOpenChange={(open) => {
          if (!open) setLogCallId(null);
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
          {logQuery.isLoading && <div className="py-8 text-center text-slate-500">불러오는 중...</div>}
          {logNotFound && (
            <div className="py-8 text-center text-amber-700">이 콜에는 저장된 로그가 없습니다.</div>
          )}
          {logQuery.isError && !logNotFound && (
            <div className="py-8 text-center text-rose-600">로그를 불러오지 못했습니다.</div>
          )}
          {!logQuery.isLoading && !logQuery.isError && logQuery.data && (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed bg-slate-950 text-slate-100 rounded-md p-3 max-h-[70vh] overflow-auto">
              {logQuery.data.log}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
