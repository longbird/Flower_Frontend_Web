'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CommissionConfigPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-commission-rates', branchId],
    queryFn: () => api<any[]>(`/admin/organizations/${branchId}/commission-rates`).catch(() => []),
  });

  const rates = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          돌아가기
        </Button>
        <h1 className="text-xl font-bold">수수료 설정</h1>
      </div>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && rates.length === 0 && (
        <div className="text-center py-12 text-slate-400">수수료율 설정이 없습니다.</div>
      )}

      {rates.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">조직 #{branchId} 수수료율</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-xs">
                    <th className="text-left py-2 pr-4">항목</th>
                    <th className="text-right py-2 px-4">수수료율</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate: any) => (
                    <tr key={rate.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4">{rate.name || rate.productCategory || '-'}</td>
                      <td className="text-right py-2 px-4 font-medium">{rate.rate ?? rate.commissionRate ?? '-'}%</td>
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
