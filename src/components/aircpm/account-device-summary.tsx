'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAircpmDeviceSummary, type AircpmDeviceSummaryItem } from '@/lib/api/aircpm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 50;
// 표시용 한도 — 실제 강제는 백엔드가 한다.
// 백엔드 대응 상수: AIRCPM_DESKTOP_DEVICE_LIMIT (aircpm_auth.service.ts) / 모바일 1대는 approveMobileDevice 가 강제.
// 이 값을 바꾸려면 백엔드 상수·마이그레이션 문구도 함께 바꿔야 한다(스펙상 한도는 고정 2/1).
const DESKTOP_LIMIT = 2;
const MOBILE_LIMIT = 1;

function countBadge(count: number, limit: number, label: string) {
  const over = count > limit;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span
        className={
          over
            ? 'font-mono text-sm font-bold text-red-600'
            : 'font-mono text-sm text-slate-700'
        }
      >
        {count}/{limit}
      </span>
    </span>
  );
}

interface AccountDeviceSummaryProps {
  /** 기기별 탭으로 전환하며 해당 userId 로 검색을 적용한다. */
  onShowDevices: (userId: string) => void;
}

export function AccountDeviceSummary({ onShowDevices }: AccountDeviceSummaryProps) {
  const [q, setQ] = useState('');
  const [qActive, setQActive] = useState('');
  const [overLimitOnly, setOverLimitOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-aircpm-device-summary', qActive, overLimitOnly, page],
    queryFn: () =>
      listAircpmDeviceSummary({
        q: qActive || undefined,
        overLimitOnly: overLimitOnly || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    refetchInterval: 15000,
    placeholderData: (prev) => prev, // 필터/페이지 변경 시 빈 화면 안 뜨게 이전 결과 유지
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setQActive(q.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">계정 검색 (ID/이름/지사)</label>
            <div className="flex gap-2">
              <Input
                placeholder="userId / 이름 / 지사코드"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="default" size="sm" onClick={handleSearch}>
                검색
              </Button>
            </div>
          </div>
          <Button
            variant={overLimitOnly ? 'default' : 'outline'}
            size="sm"
            aria-pressed={overLimitOnly}
            onClick={() => {
              setOverLimitOnly((v) => !v);
              setPage(1);
            }}
          >
            초과만 보기
          </Button>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center py-12 text-slate-500">로딩 중...</div>}
      {isError && (
        <div className="text-center py-12 text-rose-600">계정 현황을 불러오지 못했습니다.</div>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <div className="text-center py-16 text-slate-400">표시할 계정이 없습니다.</div>
      )}

      {!isError && items.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-medium">계정</th>
                  <th className="px-4 py-2.5 font-medium">지사</th>
                  <th className="px-4 py-2.5 font-medium">승인 기기</th>
                  <th className="px-4 py-2.5 font-medium">대기</th>
                  <th className="px-4 py-2.5 font-medium">상태</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {items.map((it: AircpmDeviceSummaryItem) => (
                  <tr key={it.userId} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{it.userId}</span>
                        {it.name && <span className="text-slate-500">({it.name})</span>}
                        {it.isMobile ? (
                          <Badge variant="outline" className="text-[10px] border-sky-200 text-sky-700">
                            📱 모바일
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-violet-200 text-violet-700">
                            💻 데스크톱
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{it.brchCd ?? '-'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {(it.desktopApproved > 0 || !it.isMobile) &&
                          countBadge(it.desktopApproved, DESKTOP_LIMIT, '💻')}
                        {it.isMobile && countBadge(it.mobileBound, MOBILE_LIMIT, '📱')}
                        {it.overLimit && (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                            한도 초과
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {it.desktopPending + it.mobilePending > 0
                        ? `${it.desktopPending + it.mobilePending}건`
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      {it.isActive ? (
                        <span className="text-emerald-600 text-xs">활성</span>
                      ) : (
                        <span className="text-slate-400 text-xs">비활성</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => onShowDevices(it.userId)}>
                        기기 보기
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!isError && total > 0 && (
        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-slate-500">
            총 {total}건 · {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
