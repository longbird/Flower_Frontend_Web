'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CommissionSummary {
  totalOrderAmount: number;
  totalCommissionAmount: number;
  pendingAmount: number;
  settledAmount: number;
  orderCount: number;
}

export default function CommissionPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [from] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [to] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: summary } = useQuery({
    queryKey: ['admin-commission-summary', from, to],
    queryFn: () => api<CommissionSummary>(`/admin/commission/summary?from=${from}&to=${to}`).catch(() => null),
  });

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['admin-commission-ledger', page],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('size', String(pageSize));
      return api<{ data: any[]; total: number }>(`/admin/commission/ledger?${sp.toString()}`).catch(() => ({ data: [], total: 0 }));
    },
  });

  const items = ledger?.data ?? [];
  const total = ledger?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">수수료 관리</h1>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">총 주문금액</p><p className="text-xl font-bold">{summary.totalOrderAmount.toLocaleString()}원</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">총 수수료</p><p className="text-xl font-bold">{summary.totalCommissionAmount.toLocaleString()}원</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">미정산</p><p className="text-xl font-bold text-amber-600">{summary.pendingAmount.toLocaleString()}원</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">정산 완료</p><p className="text-xl font-bold text-[#5B7A3D]">{summary.settledAmount.toLocaleString()}원</p></CardContent></Card>
        </div>
      )}

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-12 text-slate-400">수수료 내역이 없습니다.</div>
      )}

      {items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">수수료 원장</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-xs">
                    <th className="text-left py-2 pr-4">주문번호</th>
                    <th className="text-left py-2 px-4">지사</th>
                    <th className="text-right py-2 px-4">주문금액</th>
                    <th className="text-right py-2 px-4">수수료율</th>
                    <th className="text-right py-2 px-4">수수료</th>
                    <th className="text-center py-2 pl-4">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium">{item.orderNo}</td>
                      <td className="py-2 px-4">{item.branchName}</td>
                      <td className="text-right py-2 px-4">{Number(item.orderAmount).toLocaleString()}원</td>
                      <td className="text-right py-2 px-4">{item.commissionRate}%</td>
                      <td className="text-right py-2 px-4 font-medium">{Number(item.commissionAmount).toLocaleString()}원</td>
                      <td className="text-center py-2 pl-4">
                        <Badge variant={item.settlementStatus === 'SETTLED' ? 'default' : 'secondary'}>
                          {item.settlementStatus === 'SETTLED' ? '정산됨' : '미정산'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
