'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SessionsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const { data: statsData } = useQuery({
    queryKey: ['admin-session-stats'],
    queryFn: () => api<any>('/admin/sessions/stats').catch(() => null),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sessions', page],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('limit', String(pageSize));
      return api<{ data: any[]; total: number }>(`/admin/sessions?${sp.toString()}`).catch(() => ({ data: [], total: 0 }));
    },
  });

  const sessions = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">세션 관리</h1>

      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">활성 세션</p><p className="text-xl font-bold">{statsData.totalActiveSessions ?? '-'}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">접속 사용자</p><p className="text-xl font-bold">{statsData.uniqueUsers ?? '-'}</p></CardContent></Card>
        </div>
      )}

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && sessions.length === 0 && (
        <div className="text-center py-12 text-slate-400">활성 세션이 없습니다.</div>
      )}

      <div className="space-y-2">
        {sessions.map((session: any) => (
          <Card key={session.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{session.userName || session.username || '-'}</span>
                  <Badge variant="outline" className="text-[10px]">{session.userRole || '-'}</Badge>
                </div>
                <div className="text-xs text-slate-500">
                  {session.ipAddress || '-'}
                  {session.deviceName && ` · ${session.deviceName}`}
                  {session.isTrustedDevice && ' · 신뢰기기'}
                </div>
              </div>
              <div className="text-right">
                <Badge variant={session.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {session.status === 'ACTIVE' ? '활성' : session.status || '-'}
                </Badge>
                <div className="text-[10px] text-slate-400 mt-1">
                  {session.lastActivityAt ? new Date(session.lastActivityAt).toLocaleString('ko-KR') : session.createdAt ? new Date(session.createdAt).toLocaleString('ko-KR') : ''}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">총 {total}건 / {page}/{totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
          </div>
        </div>
      )}
    </div>
  );
}
