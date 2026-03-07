'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import type { FloristListResponse } from '@/lib/types/florist';

interface DashboardStats {
  totalOrdersToday: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrdersToday: number;
  cancelledOrdersToday: number;
  totalRevenueToday: number;
  totalRevenueMonth: number;
  averageOrderAmount: number;
  activePartners: number;
  totalPartners: number;
  activeBranches: number;
  totalBranches: number;
}

interface PhotoItem {
  id: number;
  floristId: string;
  floristName: string;
  floristPhone?: string;
  floristAddress?: string;
  category: string;
  grade?: string | null;
  isRecommended: boolean;
  fileUrl: string;
  costPrice?: number | null;
  sellingPrice?: number | null;
  memo?: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  CELEBRATION: '축하',
  CONDOLENCE: '조의',
  FLOWER: '꽃다발',
  FOLIAGE: '관엽',
  FRUIT: '과일',
  OBJET: '오브제',
  ORIENTAL: '동양란',
  OTHER: '기타',
  RICE: '쌀',
  WESTERN: '서양란',
};

const CAPABILITY_LABELS: Record<string, string> = {
  FLOWER: '꽃배달',
  CELEBRATION: '축하화환',
  CONDOLENCE: '조의화환',
  ORIENTAL_ORCHID: '동양란',
  WESTERN: '서양란',
  BASKET: '바구니',
  LARGE: '대형',
  HOLIDAY: '명절',
  NIGHT: '야간',
};

function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api<DashboardStats>('/admin/statistics/dashboard').catch(() => null),
    staleTime: 60_000,
  });

  const { data: floristData } = useQuery({
    queryKey: ['dashboard-recent-florists'],
    queryFn: () => api<FloristListResponse>('/admin/partners/florists?page=1&size=4').catch(() => null),
    staleTime: 60_000,
  });

  const { data: photoData } = useQuery({
    queryKey: ['dashboard-recent-photos'],
    queryFn: () =>
      api<{ ok: boolean; data: PhotoItem[]; total: number }>('/admin/florists/all-photos?page=1&size=4').catch(() => null),
    staleTime: 60_000,
  });

  const recentFlorists = floristData?.data ?? [];
  const recentPhotos = photoData?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="오늘 주문" value={stats?.totalOrdersToday ?? '-'} color="purple" />
        <StatCard title="대기 중" value={stats?.pendingOrders ?? '-'} color="amber" />
        <StatCard title="오늘 완료" value={stats?.completedOrdersToday ?? '-'} color="emerald" />
        <StatCard title="활성 화원" value={stats?.activePartners ?? '-'} color="blue" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="진행 중" value={stats?.inProgressOrders ?? '-'} color="purple" />
        <StatCard title="오늘 취소" value={stats?.cancelledOrdersToday ?? '-'} color="amber" />
        <StatCard title="오늘 매출" value={stats?.totalRevenueToday != null ? `${stats.totalRevenueToday.toLocaleString()}원` : '-'} color="emerald" />
        <StatCard title="월 매출" value={stats?.totalRevenueMonth != null ? `${stats.totalRevenueMonth.toLocaleString()}원` : '-'} color="blue" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">요약</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div><dt className="text-slate-400 text-xs">평균 주문금액</dt><dd className="font-medium">{stats?.averageOrderAmount != null ? `${stats.averageOrderAmount.toLocaleString()}원` : '-'}</dd></div>
            <div><dt className="text-slate-400 text-xs">총 파트너</dt><dd className="font-medium">{stats?.totalPartners ?? '-'}</dd></div>
            <div><dt className="text-slate-400 text-xs">활성 지사</dt><dd className="font-medium">{stats?.activeBranches ?? '-'} / {stats?.totalBranches ?? '-'}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* 최근 화원 정보 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">최근 화원 현황</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => router.push('/admin/florists')}>
            전체보기
          </Button>
        </CardHeader>
        <CardContent>
          {recentFlorists.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">화원 정보가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentFlorists.map((f: any) => (
                <Card
                  key={f.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-slate-200"
                  onClick={() => router.push(`/admin/florists/${f.id}`)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sm text-slate-900 truncate">{f.name}</span>
                      <Badge variant={f.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {f.status === 'ACTIVE' ? '활성' : '비활성'}
                      </Badge>
                    </div>
                    {f.phone && <div className="text-xs text-slate-500 truncate">{f.phone}</div>}
                    {f.address && <div className="text-xs text-slate-400 truncate">{f.address}</div>}
                    {f.capabilities && f.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {f.capabilities.slice(0, 3).map((cap: string) => (
                          <Badge key={cap} variant="outline" className="text-[9px] px-1 py-0">
                            {CAPABILITY_LABELS[cap] || cap}
                          </Badge>
                        ))}
                        {f.capabilities.length > 3 && (
                          <span className="text-[9px] text-slate-400">+{f.capabilities.length - 3}</span>
                        )}
                      </div>
                    )}
                    {f.branchName && <div className="text-[10px] text-slate-400">지사: {f.branchName}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 새로 등록된 사진 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">새로 등록된 사진</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => router.push('/admin/florists')}>
            전체보기
          </Button>
        </CardHeader>
        <CardContent>
          {recentPhotos.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">등록된 사진이 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentPhotos.map((photo) => (
                <Card
                  key={photo.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 overflow-hidden"
                  onClick={() => router.push(`/admin/florists/${photo.floristId}`)}
                >
                  <div className="relative w-full aspect-square bg-slate-100">
                    <Image
                      src={photoUrl(photo.fileUrl)}
                      alt={photo.memo || '화원 사진'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized
                    />
                    <div className="absolute top-1.5 left-1.5 flex gap-1">
                      <Badge className="text-[9px] px-1.5 py-0 bg-black/60 text-white border-0">
                        {CATEGORY_LABELS[photo.category] || photo.category}
                      </Badge>
                      {photo.isRecommended && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-amber-500 text-white border-0">추천</Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <div className="font-semibold text-sm text-slate-900 truncate">{photo.floristName}</div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      {photo.sellingPrice != null ? (
                        <span className="font-medium text-emerald-600">{photo.sellingPrice.toLocaleString()}원</span>
                      ) : (
                        <span>-</span>
                      )}
                      <span className="text-slate-400">{new Date(photo.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {photo.memo && <div className="text-[10px] text-slate-400 truncate">{photo.memo}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
  };
  return (
    <Card className="overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${colors[color] || colors.blue}`} />
      <CardContent className="pt-4">
        <p className="text-xs text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
