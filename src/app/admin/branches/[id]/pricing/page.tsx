'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BranchPricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-branch-pricing', id],
    queryFn: () => api<any[]>(`/admin/branches/${id}/pricing`).catch(() => []),
  });

  const pricing = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          돌아가기
        </Button>
        <h1 className="text-xl font-bold">지사 가격 관리</h1>
      </div>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && pricing.length === 0 && (
        <div className="text-center py-12 text-slate-400">등록된 가격 설정이 없습니다.</div>
      )}

      {pricing.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">가격 목록</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-xs">
                    <th className="text-left py-2 pr-4">상품</th>
                    <th className="text-right py-2 px-4">가격</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4">{item.productName || item.standardProductName || '-'}</td>
                      <td className="text-right py-2 px-4">{item.price != null ? `${Number(item.price).toLocaleString()}원` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
