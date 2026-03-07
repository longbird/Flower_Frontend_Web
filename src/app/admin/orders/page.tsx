'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'UNCONFIRMED', label: '미확인' },
  { value: 'RECEIVED', label: '접수' },
  { value: 'PENDING', label: '대기' },
  { value: 'CONFIRMED', label: '확인' },
  { value: 'ASSIGNED', label: '배정' },
  { value: 'ACCEPTED', label: '수락' },
  { value: 'PREPARING', label: '준비중' },
  { value: 'DELIVERING', label: '배송중' },
  { value: 'DELIVERED', label: '배송완료' },
  { value: 'CANCELED', label: '취소' },
];

const STATUS_LABELS: Record<string, string> = {
  UNCONFIRMED: '미확인', RECEIVED: '접수', PENDING: '대기', CONFIRMED: '확인',
  ASSIGNED: '배정', ACCEPTED: '수락', PREPARING: '준비중', DELIVERING: '배송중',
  DELIVERED: '배송완료', CANCELED: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  UNCONFIRMED: 'bg-gray-100 text-gray-800',
  RECEIVED: 'bg-sky-100 text-sky-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  ACCEPTED: 'bg-violet-100 text-violet-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  DELIVERING: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELED: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, query, status],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('size', String(pageSize));
      if (query) sp.set('q', query);
      if (status) sp.set('status', status);
      return api<{ items: any[]; total: number; page: number; size: number }>(`/admin/orders?${sp.toString()}`).catch(() => ({ items: [], total: 0, page: 1, size: pageSize }));
    },
  });

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">주문 관리</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push('/admin/order-register')}>
          주문 등록
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <select
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm bg-white"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
            <Input placeholder="검색 (주문번호, 수령인, 전화번호)" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 border-slate-200" />
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 shrink-0">검색</Button>
          </form>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && orders.length === 0 && (
        <div className="text-center py-12 text-slate-400">주문이 없습니다.</div>
      )}

      {orders.length > 0 && (
        <div className="space-y-2">
          {orders.map((order: any) => (
            <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/admin/orders/${order.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{order.orderNo || `#${order.id}`}</span>
                      <Badge className={cn('text-[10px]', STATUS_COLORS[order.status] || 'bg-slate-100')}>
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {order.receiverName || '-'} · {order.totalPrice != null ? `${Number(order.totalPrice).toLocaleString()}원` : '-'}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('ko-KR') : ''}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
