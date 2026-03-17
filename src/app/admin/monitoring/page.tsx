'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SystemInfo {
  cpuUsage: number;
  memory: { total: number; used: number; free: number };
  disk: { total: number; used: number; free: number };
  uptime: number;
  nodeVersion: string;
  processUptime: number;
  processMemory: { rss: number; heapTotal: number; heapUsed: number };
}

interface ApiEndpoint {
  path: string;
  method: string;
  count: number;
  avgResponseTime: number;
  errorRate: number;
}

interface ApiMetrics {
  totalRequests: number;
  totalErrors: number;
  avgResponseTime: number;
  statusCodes: Record<string, number>;
  endpoints: ApiEndpoint[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}일`);
  if (h > 0) parts.push(`${h}시간`);
  parts.push(`${m}분`);
  return parts.join(' ');
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-emerald-100 text-emerald-700',
  PUT: 'bg-amber-100 text-amber-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function MonitoringPage() {
  const { data: sysInfo, isLoading: sysLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin-monitoring-system'],
    queryFn: () => api<SystemInfo>('/admin/monitoring/system-info').catch(() => null),
    refetchInterval: 30_000,
  });

  const { data: metrics } = useQuery({
    queryKey: ['admin-monitoring-metrics'],
    queryFn: () => api<ApiMetrics>('/admin/monitoring/api-metrics').catch(() => null),
    refetchInterval: 30_000,
  });

  const [lastRefresh, setLastRefresh] = useState<string>('');

  useEffect(() => {
    if (dataUpdatedAt) {
      const date = new Date(dataUpdatedAt);
      setLastRefresh(date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [dataUpdatedAt]);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg md:text-2xl font-bold text-slate-900">모니터링</h1>
        <div className="flex flex-col items-end gap-0.5">
          <Badge variant="outline" className="text-[10px] md:text-xs">30초 자동 갱신</Badge>
          {lastRefresh && (
            <span className="text-[10px] md:text-xs text-slate-400">{lastRefresh}</span>
          )}
        </div>
      </div>

      {sysLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {sysInfo && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-4">
            <Card>
              <CardHeader className="pb-0 md:pb-2 px-2.5 md:px-6 pt-2.5 md:pt-6"><CardTitle className="text-[11px] md:text-sm">CPU</CardTitle></CardHeader>
              <CardContent className="px-2.5 md:px-6 pb-2.5 md:pb-6">
                <p className="text-base md:text-2xl font-bold">{sysInfo.cpuUsage.toFixed(1)}%</p>
                <div className="mt-1 md:mt-2 h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(sysInfo.cpuUsage, 100)}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-0 md:pb-2 px-2.5 md:px-6 pt-2.5 md:pt-6"><CardTitle className="text-[11px] md:text-sm">메모리</CardTitle></CardHeader>
              <CardContent className="px-2.5 md:px-6 pb-2.5 md:pb-6">
                <p className="text-base md:text-2xl font-bold">{((sysInfo.memory.used / sysInfo.memory.total) * 100).toFixed(1)}%</p>
                <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">{formatBytes(sysInfo.memory.used)} / {formatBytes(sysInfo.memory.total)}</p>
                <div className="mt-1 md:mt-2 h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(sysInfo.memory.used / sysInfo.memory.total) * 100}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-0 md:pb-2 px-2.5 md:px-6 pt-2.5 md:pt-6"><CardTitle className="text-[11px] md:text-sm">디스크</CardTitle></CardHeader>
              <CardContent className="px-2.5 md:px-6 pb-2.5 md:pb-6">
                <p className="text-base md:text-2xl font-bold">{((sysInfo.disk.used / sysInfo.disk.total) * 100).toFixed(1)}%</p>
                <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">{formatBytes(sysInfo.disk.used)} / {formatBytes(sysInfo.disk.total)}</p>
                <div className="mt-1 md:mt-2 h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(sysInfo.disk.used / sysInfo.disk.total) * 100}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-0 md:pb-2 px-2.5 md:px-6 pt-2.5 md:pt-6"><CardTitle className="text-[11px] md:text-sm">업타임</CardTitle></CardHeader>
              <CardContent className="px-2.5 md:px-6 pb-2.5 md:pb-6">
                <p className="text-base md:text-2xl font-bold">{formatUptime(sysInfo.uptime)}</p>
                <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Node {sysInfo.nodeVersion}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="px-2.5 md:px-6 pt-2.5 md:pt-6 pb-1 md:pb-2"><CardTitle className="text-xs md:text-base">프로세스 메모리</CardTitle></CardHeader>
            <CardContent className="px-2.5 md:px-6 pb-2.5 md:pb-6">
              <dl className="grid grid-cols-3 gap-1.5 md:gap-4 text-xs md:text-sm">
                <div><dt className="text-slate-400 text-[10px] md:text-xs">RSS</dt><dd className="font-medium">{formatBytes(sysInfo.processMemory.rss)}</dd></div>
                <div><dt className="text-slate-400 text-[10px] md:text-xs">Heap Total</dt><dd className="font-medium">{formatBytes(sysInfo.processMemory.heapTotal)}</dd></div>
                <div><dt className="text-slate-400 text-[10px] md:text-xs">Heap Used</dt><dd className="font-medium">{formatBytes(sysInfo.processMemory.heapUsed)}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </>
      )}

      {/* API 메트릭 */}
      {metrics && (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-4">
            <Card>
              <CardContent className="pt-2.5 md:pt-4 px-2.5 md:px-6 pb-2.5 md:pb-6">
                <p className="text-[10px] md:text-xs text-slate-500 mb-0.5 md:mb-1">총 요청</p>
                <p className="text-base md:text-2xl font-bold text-slate-900">{metrics.totalRequests.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-2.5 md:pt-4 px-2.5 md:px-6 pb-2.5 md:pb-6">
                <p className="text-[10px] md:text-xs text-slate-500 mb-0.5 md:mb-1">총 에러</p>
                <p className="text-base md:text-2xl font-bold text-red-600">{metrics.totalErrors.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-2.5 md:pt-4 px-2.5 md:px-6 pb-2.5 md:pb-6">
                <p className="text-[10px] md:text-xs text-slate-500 mb-0.5 md:mb-1">평균 응답시간</p>
                <p className="text-base md:text-2xl font-bold text-slate-900">{metrics.avgResponseTime}ms</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-2.5 md:pt-4 px-2.5 md:px-6 pb-2.5 md:pb-6">
                <p className="text-[10px] md:text-xs text-slate-500 mb-0.5 md:mb-1">에러율</p>
                <p className="text-base md:text-2xl font-bold text-slate-900">
                  {metrics.totalRequests > 0 ? ((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 상태 코드 분포 */}
          {Object.keys(metrics.statusCodes).length > 0 && (
            <Card>
              <CardHeader className="px-2.5 md:px-6 pt-2.5 md:pt-6 pb-1 md:pb-2"><CardTitle className="text-xs md:text-base">HTTP 상태 코드</CardTitle></CardHeader>
              <CardContent className="px-2.5 md:px-6 pb-2.5 md:pb-6">
                <div className="flex flex-wrap gap-1.5 md:gap-3">
                  {Object.entries(metrics.statusCodes)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([code, count]) => {
                      const codeNum = Number(code);
                      const color = codeNum < 300 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : codeNum < 400 ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : codeNum < 500 ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200';
                      return (
                        <div key={code} className={`flex items-center gap-2 border rounded-lg px-3 py-2 ${color}`}>
                          <span className="font-mono font-bold text-sm">{code}</span>
                          <span className="text-sm">{(count as number).toLocaleString()}건</span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 엔드포인트 테이블 */}
          {metrics.endpoints.length > 0 && (
            <Card>
              <CardHeader className="px-2.5 md:px-6 pt-2.5 md:pt-6 pb-1 md:pb-2"><CardTitle className="text-xs md:text-base">엔드포인트별 메트릭</CardTitle></CardHeader>
              <CardContent className="px-2.5 md:px-6 pb-2.5 md:pb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-slate-500 font-medium">메서드</th>
                        <th className="text-left py-2 px-3 text-slate-500 font-medium">경로</th>
                        <th className="text-right py-2 px-3 text-slate-500 font-medium">호출수</th>
                        <th className="text-right py-2 px-3 text-slate-500 font-medium">평균 응답(ms)</th>
                        <th className="text-right py-2 px-3 text-slate-500 font-medium">에러율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.endpoints.map((ep, i) => (
                        <tr key={`${ep.method}-${ep.path}-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${METHOD_COLORS[ep.method] || 'bg-slate-100 text-slate-700'}`}>
                              {ep.method}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-xs text-slate-700">{ep.path}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-800">{ep.count.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{ep.avgResponseTime}</td>
                          <td className="py-2 px-3 text-right">
                            <span className={ep.errorRate > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
                              {ep.errorRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
