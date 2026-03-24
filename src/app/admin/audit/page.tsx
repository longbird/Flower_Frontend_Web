'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', page, query],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('limit', String(pageSize));
      if (query) sp.set('actor', query);
      return api<{ items: any[]; total: number }>(`/admin/audit/logs?${sp.toString()}`).catch(() => ({ items: [], total: 0 }));
    },
  });

  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">감사로그</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input placeholder="수행자 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 border-slate-200 max-w-sm" />
        <Button type="submit" size="sm" className="bg-[#5B7A3D] hover:bg-[#4A6830]">검색</Button>
      </form>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && logs.length === 0 && (
        <div className="text-center py-12 text-slate-400">감사로그가 없습니다.</div>
      )}

      <div className="space-y-2">
        {logs.map((log: any) => (
          <Card key={log.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{log.action || '-'}</Badge>
                  <span className="text-sm font-medium">{log.description || '-'}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {log.actorName || log.actorId || '-'}
                  {log.actorRole && ` (${log.actorRole})`}
                  {log.targetType && ` → ${log.targetType}`}
                  {log.targetId && `#${log.targetId}`}
                  {log.ipAddress && ` · ${log.ipAddress}`}
                </div>
              </div>
              <div className="text-xs text-slate-400 shrink-0">
                {log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : ''}
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
