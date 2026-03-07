'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalOrdersToday: number;
  pendingOrders: number;
  completedOrdersToday: number;
  cancelledOrdersToday: number;
  totalRevenueToday: number;
  totalRevenueMonth: number;
  activePartners: number;
  totalPartners: number;
  activeBranches: number;
  totalBranches: number;
}

interface OrderStatsSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderAmount: number;
  completedOrders: number;
  cancelledOrders: number;
  completionRate: number;
}

interface OrderStats {
  summary: OrderStatsSummary;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  timeSeries: { date: string; count: number; revenue: number }[];
  peakHours: { hour: number; count: number }[];
}

interface BranchPerformance {
  branchId: number;
  branchName: string;
  delegationMode: string;
  orderCount: number;
  revenue: number;
  commissionAmount: number;
  commissionRate: number;
  partnerCount: number;
  completionRate: number;
  averageDeliveryTime: number;
}

interface BranchStats {
  summary: {
    totalBranches: number;
    activeBranches: number;
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
  };
  branches: BranchPerformance[];
  comparison?: {
    previousPeriod: { totalOrders: number; totalRevenue: number };
    growth: { orderGrowth: number; revenueGrowth: number };
  };
}

const STATUS_LABELS: Record<string, string> = {
  UNCONFIRMED: '미확인',
  RECEIVED: '접수',
  PENDING: '대기',
  CONFIRMED: '확인',
  ASSIGNED: '배정',
  ACCEPTED: '수락',
  PREPARING: '준비중',
  DELIVERING: '배달중',
  DELIVERED: '배달완료',
  CANCELED: '취소',
};

const DELEGATION_LABELS: Record<string, string> = {
  FULL: '전체 위임',
  PARTIAL: '부분 위임',
  NONE: '위임 없음',
};

export default function StatisticsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['admin-stats-dashboard'],
    queryFn: () => api<DashboardStats>('/admin/statistics/dashboard').catch(() => null),
    staleTime: 60_000,
  });

  const { data: orderStats, isLoading: orderLoading } = useQuery({
    queryKey: ['admin-stats-orders', from, to],
    queryFn: () => api<OrderStats>(`/admin/statistics/orders?from=${from}&to=${to}`).catch(() => null),
  });

  const { data: branchStats } = useQuery({
    queryKey: ['admin-stats-branches', from, to],
    queryFn: () => api<BranchStats>(`/admin/statistics/branches?from=${from}&to=${to}`).catch(() => null),
  });

  const isLoading = dashLoading || orderLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900">통계</h1>
        <div className="flex items-center gap-2 text-sm">
          <input type="date" className="border rounded-lg px-2 py-1.5 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-slate-400">~</span>
          <input type="date" className="border rounded-lg px-2 py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {/* 대시보드 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="오늘 주문" value={dashboard?.totalOrdersToday ?? '-'} />
        <StatCard label="오늘 매출" value={dashboard?.totalRevenueToday != null ? `${dashboard.totalRevenueToday.toLocaleString()}원` : '-'} />
        <StatCard label="월 매출" value={dashboard?.totalRevenueMonth != null ? `${dashboard.totalRevenueMonth.toLocaleString()}원` : '-'} />
        <StatCard label="활성 파트너" value={dashboard ? `${dashboard.activePartners}/${dashboard.totalPartners}` : '-'} />
      </div>

      {/* 주문 통계 */}
      {orderStats && (
        <Card>
          <CardHeader><CardTitle className="text-base">주문 통계</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniStat label="총 주문" value={orderStats.summary.totalOrders.toLocaleString()} />
              <MiniStat label="총 매출" value={`${orderStats.summary.totalRevenue.toLocaleString()}원`} />
              <MiniStat label="평균 주문금액" value={`${orderStats.summary.averageOrderAmount.toLocaleString()}원`} />
              <MiniStat label="완료" value={orderStats.summary.completedOrders.toLocaleString()} />
              <MiniStat label="취소" value={orderStats.summary.cancelledOrders.toLocaleString()} />
              <MiniStat label="완료율" value={`${orderStats.summary.completionRate}%`} />
            </div>

            {/* 상태별 현황 */}
            {Object.keys(orderStats.byStatus).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">상태별 현황</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(orderStats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-slate-500">{STATUS_LABELS[status] || status}</span>
                      <span className="text-sm font-semibold text-slate-800">{(count as number).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 유형별 현황 */}
            {Object.keys(orderStats.byType).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">유형별 현황</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(orderStats.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-slate-500">{type}</span>
                      <span className="text-sm font-semibold text-slate-800">{(count as number).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 일별 추이 */}
            {orderStats.timeSeries.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">일별 추이</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-slate-500 font-medium">날짜</th>
                        <th className="text-right py-2 px-3 text-slate-500 font-medium">건수</th>
                        <th className="text-right py-2 px-3 text-slate-500 font-medium">매출</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderStats.timeSeries.map((row) => (
                        <tr key={row.date} className="border-b border-slate-100">
                          <td className="py-2 px-3 text-slate-700">{row.date}</td>
                          <td className="py-2 px-3 text-right text-slate-800 font-medium">{row.count.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-slate-800">{row.revenue.toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 피크 시간대 */}
            {orderStats.peakHours.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">시간대별 주문</h3>
                <div className="flex flex-wrap gap-2">
                  {orderStats.peakHours.map((ph) => (
                    <div key={ph.hour} className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-blue-600">{ph.hour}시</span>
                      <span className="text-sm font-semibold text-blue-800">{ph.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 지사별 실적 */}
      {branchStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">지사별 실적</CardTitle>
              {branchStats.comparison?.growth && (
                <div className="flex items-center gap-3 text-xs">
                  <GrowthBadge label="주문" value={branchStats.comparison.growth.orderGrowth} />
                  <GrowthBadge label="매출" value={branchStats.comparison.growth.revenueGrowth} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 요약 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <MiniStat label="전체 지사" value={`${branchStats.summary.activeBranches}/${branchStats.summary.totalBranches}`} />
              <MiniStat label="총 주문" value={branchStats.summary.totalOrders.toLocaleString()} />
              <MiniStat label="총 매출" value={`${branchStats.summary.totalRevenue.toLocaleString()}원`} />
              <MiniStat label="총 수수료" value={`${branchStats.summary.totalCommission.toLocaleString()}원`} />
              {branchStats.comparison?.previousPeriod && (
                <MiniStat label="전기 매출" value={`${branchStats.comparison.previousPeriod.totalRevenue.toLocaleString()}원`} />
              )}
            </div>

            {/* 지사 테이블 */}
            {branchStats.branches.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">지사명</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">위임</th>
                      <th className="text-right py-2 px-3 text-slate-500 font-medium">주문</th>
                      <th className="text-right py-2 px-3 text-slate-500 font-medium">매출</th>
                      <th className="text-right py-2 px-3 text-slate-500 font-medium">수수료</th>
                      <th className="text-right py-2 px-3 text-slate-500 font-medium">수수료율</th>
                      <th className="text-right py-2 px-3 text-slate-500 font-medium">파트너</th>
                      <th className="text-right py-2 px-3 text-slate-500 font-medium">완료율</th>
                      <th className="text-right py-2 px-3 text-slate-500 font-medium">평균배달(분)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchStats.branches.map((b) => (
                      <tr key={b.branchId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium text-slate-800">{b.branchName}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-[10px]">{DELEGATION_LABELS[b.delegationMode] || b.delegationMode}</Badge>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-800">{b.orderCount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-800">{b.revenue.toLocaleString()}원</td>
                        <td className="py-2 px-3 text-right text-slate-800">{b.commissionAmount.toLocaleString()}원</td>
                        <td className="py-2 px-3 text-right text-slate-600">{b.commissionRate}%</td>
                        <td className="py-2 px-3 text-right text-slate-800">{b.partnerCount}</td>
                        <td className="py-2 px-3 text-right text-slate-800">{b.completionRate}%</td>
                        <td className="py-2 px-3 text-right text-slate-600">{b.averageDeliveryTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {branchStats.branches.length === 0 && (
              <div className="text-center py-6 text-slate-400">데이터가 없습니다.</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function GrowthBadge({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isZero ? 'bg-slate-100 text-slate-500' : isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {label} {isPositive ? '+' : ''}{value}%
    </span>
  );
}
