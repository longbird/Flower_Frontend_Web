'use client';

import { useQuery } from '@tanstack/react-query';
import { Fragment, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BackupFile {
  name: string;
  date: string;
  size: string;
}

interface BackupEntry {
  label: string;
  path: string;
  status: 'ok' | 'warning' | 'error';
  latestDate: string | null;
  fileCount: number;
  totalSize: string | null;
  recentFiles: BackupFile[];
}

interface BackupTier {
  label: string;
  status: 'ok' | 'warning' | 'error';
  entries: BackupEntry[];
}

interface BackupStatusResponse {
  ok: boolean;
  timestamp: string;
  tiers: {
    production_primary: BackupTier;
    production_storage: BackupTier;
    local: BackupTier;
  };
}

function StatusBadge({ status }: { status: 'ok' | 'warning' | 'error' }) {
  const config = {
    ok: { label: '정상', className: 'bg-[#E8F0E0] text-[#5B7A3D] border-[#D1E0C4]' },
    warning: { label: '경고', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    error: { label: '실패', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] md:text-xs font-semibold border ${c.className}`}>
      {c.label}
    </span>
  );
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffH = Math.floor((now - then) / 3600000);
  if (diffH < 1) return '방금 전';
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}일 전`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
}

function TierTable({ tier }: { tier: BackupTier }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  function toggleRow(idx: number) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 text-slate-500 font-medium text-[10px] md:text-xs">백업 항목</th>
            <th className="text-left py-2 px-3 text-slate-500 font-medium text-[10px] md:text-xs">최근 백업</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium text-[10px] md:text-xs">크기</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium text-[10px] md:text-xs">파일 수</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium text-[10px] md:text-xs">상태</th>
          </tr>
        </thead>
        <tbody>
          {tier.entries.map((entry, idx) => (
            <Fragment key={idx}>
              <tr
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => toggleRow(idx)}
              >
                <td className="py-2 px-3 text-[10px] md:text-xs text-slate-800 font-medium">
                  <span className="mr-1 text-slate-400">{expandedRows.has(idx) ? '▾' : '▸'}</span>
                  {entry.label}
                </td>
                <td className="py-2 px-3 text-[10px] md:text-xs text-slate-700">
                  {entry.latestDate ? (
                    <div>
                      <div>{formatDate(entry.latestDate)}</div>
                      <div className="text-slate-400">{relativeTime(entry.latestDate)}</div>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right text-[10px] md:text-xs text-slate-700">
                  {entry.totalSize ?? (entry.recentFiles[0]?.size ?? '-')}
                </td>
                <td className="py-2 px-3 text-right text-[10px] md:text-xs text-slate-700">
                  {entry.fileCount > 0 ? entry.fileCount : '-'}
                </td>
                <td className="py-2 px-3 text-right">
                  <StatusBadge status={entry.status} />
                </td>
              </tr>
              {expandedRows.has(idx) && entry.recentFiles.length > 0 && (
                <tr>
                  <td colSpan={5} className="bg-slate-50 px-3 pb-2 pt-0">
                    <div className="pl-4 border-l-2 border-slate-200 mt-1 space-y-0.5">
                      {entry.recentFiles.map((file, fi) => (
                        <div key={fi} className="flex items-center justify-between gap-2 py-0.5">
                          <span className="font-mono text-[10px] md:text-xs text-slate-600 truncate">{file.name}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] md:text-xs text-slate-400">{file.date}</span>
                            <span className="text-[10px] md:text-xs text-slate-500">{file.size}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BackupStatusPage() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin-backup-status'],
    queryFn: async () => {
      const res = await fetch('/api/backup-status');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<BackupStatusResponse>;
    },
    refetchInterval: 60_000,
  });

  const [lastRefresh, setLastRefresh] = useState<string>('');

  useEffect(() => {
    if (dataUpdatedAt) {
      const date = new Date(dataUpdatedAt);
      setLastRefresh(date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [dataUpdatedAt]);

  const TIER_LABELS: Record<string, string> = {
    production_primary: '프로덕션 1차',
    production_storage: '프로덕션 2차 (스토리지)',
    local: '로컬 (분산)',
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg md:text-2xl font-bold text-slate-900">백업 상태</h1>
        <div className="flex flex-col items-end gap-0.5">
          <Badge variant="outline" className="text-[10px] md:text-xs">60초 자동 갱신</Badge>
          {lastRefresh && (
            <span className="text-[10px] md:text-xs text-slate-400">{lastRefresh}</span>
          )}
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {data && (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-1.5 md:gap-4">
            {(Object.entries(data.tiers) as [keyof typeof data.tiers, BackupTier][]).map(([key, tier]) => (
              <Card key={key}>
                <CardContent className="pt-2.5 md:pt-4 px-2.5 md:px-6 pb-2.5 md:pb-6">
                  <p className="text-[10px] md:text-xs text-slate-500 mb-0.5 md:mb-1">{TIER_LABELS[key]}</p>
                  <StatusBadge status={tier.status} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 상세 테이블 */}
          {(Object.entries(data.tiers) as [keyof typeof data.tiers, BackupTier][]).map(([key, tier]) => (
            <Card key={key}>
              <CardHeader className="px-2.5 md:px-6 pt-2.5 md:pt-6 pb-1 md:pb-2">
                <CardTitle className="text-xs md:text-base flex items-center gap-2">
                  {TIER_LABELS[key]}
                  <StatusBadge status={tier.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2.5 md:px-6 pb-2.5 md:pb-6">
                <TierTable tier={tier} />
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
