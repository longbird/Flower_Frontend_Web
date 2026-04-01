'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { FloristListResponse } from '@/lib/types/florist';
import { CAPABILITY_OPTIONS } from '@/app/admin/florists/florist-constants';
import { ExternalPhotosSection } from '@/components/admin/external-photos-section';

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

const CAPABILITY_LABELS: Record<string, string> = Object.fromEntries(
  CAPABILITY_OPTIONS.map((opt) => [opt.code, opt.label])
);

function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

function StatCard({ title, value, variant = 'default' }: { title: string; value: string | number; variant?: 'brand' | 'default' }) {
  return (
    <Card className={variant === 'brand' ? 'bg-[#E8F0E0] border-[#D1E0C4]' : ''}>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-gray-500 mb-1">{title}</p>
        <p className={cn('text-2xl font-bold', variant === 'brand' ? 'text-[#5B7A3D]' : 'text-gray-900')}>{value}</p>
      </CardContent>
    </Card>
  );
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
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>

      {isLoading && <div className="text-center py-8 text-gray-500">로딩 중...</div>}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="활성 화원" value={stats?.activePartners ?? '-'} variant="brand" />
        <StatCard title="오늘 주문" value={stats?.totalOrdersToday ?? '-'} />
        <StatCard title="오늘 매출" value={stats?.totalRevenueToday != null ? `${stats.totalRevenueToday.toLocaleString()}원` : '-'} />
      </div>

      {/* 화원 현황 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">화원 현황</h2>
          <Button variant="ghost" size="sm" className="text-sm text-[#5B7A3D] hover:text-[#4A6830]" onClick={() => router.push('/admin/florists')}>
            전체보기
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <Badge key={cap} variant="outline" className="text-[11px] px-1.5 py-0.5">
                        {CAPABILITY_LABELS[cap] || cap}
                      </Badge>
                    ))}
                    {f.capabilities.length > 3 && (
                      <span className="text-[11px] text-slate-400">+{f.capabilities.length - 3}</span>
                    )}
                  </div>
                )}
                {f.branchName && <div className="text-[10px] text-slate-400">지사: {f.branchName}</div>}
              </CardContent>
            </Card>
          ))}
          <Card
            className="border-dashed border-2 border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#5B7A3D] hover:bg-[#E8F0E0]/30 transition-colors min-h-[140px]"
            onClick={() => router.push('/admin/florists')}
          >
            <CardContent className="flex flex-col items-center gap-2 py-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-gray-500">새로운 제휴 꽃집 추가</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 새로 등록된 사진 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">새로 등록된 사진</h2>
          <Button variant="ghost" size="sm" className="text-sm text-[#5B7A3D] hover:text-[#4A6830]" onClick={() => router.push('/admin/florists')}>
            전체보기
          </Button>
        </div>
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
                      <span className="font-medium text-[#5B7A3D]">{photo.sellingPrice.toLocaleString()}원</span>
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
      </div>

      {/* 외부 꽃집 사진 */}
      <ExternalPhotosSection />
    </div>
  );
}
