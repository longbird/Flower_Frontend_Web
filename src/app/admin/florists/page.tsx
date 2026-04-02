'use client';

import { useState, useCallback, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { listFlorists, updateFloristStatus, getFloristPhotos } from '@/lib/api/admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { FloristSummary } from '@/lib/types/florist';
import FloristDetailDialog from './florist-dialog';
import FloristCreateDialog from './florist-create-dialog';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '중지' },
  { value: 'INACTIVE', label: '비활성' },
  { value: '', label: '전체' },
];

const GRADE_FILTER = [
  { value: '', label: '등급 전체' },
  { value: 'PREMIUM', label: '프리미엄' },
  { value: 'HIGH', label: '고급형' },
  { value: 'STANDARD', label: '실속형' },
];

// 코드→라벨 매핑 (old/new 코드 모두 지원)
const CODE_TO_LABEL: Record<string, string> = {
  CELEB_BASIC: '축하기본', CELEB_LARGE: '축하(대)',
  CONDO_BASIC: '근조기본', CONDO_LARGE: '근조(대)',
  CONDO_XLARGE: '근조(특대)', CONDO_4TIER: '근조4단이상',
  OBJET: '오브제', RICE: '쌀',
  ORIENTAL_ORCHID: '동양란', WESTERN_ORCHID: '서양란',
  FLOWER: '꽃', FOLIAGE: '관엽',
  HOLIDAY_UNAVAILABLE: '휴일불가',
};

// 역량 필터 (통합 코드)
const CAPABILITY_FILTER: { label: string; code: string }[] = [
  { label: '축하기본', code: 'CELEB_BASIC' },
  { label: '축하(대)', code: 'CELEB_LARGE' },
  { label: '근조기본', code: 'CONDO_BASIC' },
  { label: '근조(대)', code: 'CONDO_LARGE' },
  { label: '근조(특대)', code: 'CONDO_XLARGE' },
  { label: '근조4단이상', code: 'CONDO_4TIER' },
  { label: '오브제', code: 'OBJET' },
  { label: '쌀', code: 'RICE' },
  { label: '동양란', code: 'ORIENTAL_ORCHID' },
  { label: '서양란', code: 'WESTERN_ORCHID' },
  { label: '꽃', code: 'FLOWER' },
  { label: '관엽', code: 'FOLIAGE' },
  { label: '휴일불가', code: 'HOLIDAY_UNAVAILABLE' },
];

const GRADE_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '브론즈', color: 'bg-amber-800 text-white' },
  2: { label: '실버', color: 'bg-gray-400 text-white' },
  3: { label: '골드', color: 'bg-amber-500 text-white' },
  4: { label: '플래티넘', color: 'bg-cyan-500 text-white' },
  5: { label: '다이아', color: 'bg-purple-500 text-white' },
};

function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

function useFloristPhoto(floristId: string) {
  const { data } = useQuery({
    queryKey: ['floristThumb', floristId],
    queryFn: () => getFloristPhotos(floristId, { includeHidden: false }),
    staleTime: 5 * 60 * 1000,
  });
  return data?.data?.[0] ?? null;
}

function FloristThumb({ floristId }: { floristId: string }) {
  const firstPhoto = useFloristPhoto(floristId);

  if (!firstPhoto) {
    return (
      <div className="w-[52px] h-[52px] rounded-md bg-gray-100 flex items-center justify-center text-xl text-gray-400">
        🌸
      </div>
    );
  }

  return (
    <div className="relative w-[52px] h-[52px] rounded-md overflow-hidden border">
      <Image
        src={photoUrl(firstPhoto.fileUrl)}
        alt={firstPhoto.memo || '화원 사진'}
        fill
        className="object-cover"
        sizes="52px"
        unoptimized
      />
    </div>
  );
}

function FloristCardImage({ floristId }: { floristId: string }) {
  const firstPhoto = useFloristPhoto(floristId);

  if (!firstPhoto) {
    return <span className="text-4xl text-gray-300">🌸</span>;
  }

  return (
    <Image
      src={photoUrl(firstPhoto.fileUrl)}
      alt={firstPhoto.memo || '화원 사진'}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 33vw"
      unoptimized
    />
  );
}

function PriorityBadge({ priority }: { priority?: number }) {
  if (!priority) return <span className="text-gray-500">-</span>;
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-red-500 border-2 border-red-500 bg-transparent">
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return <span className="font-semibold text-[#5B7A3D]">활성</span>;
  if (status === 'SUSPENDED') return <span className="font-semibold text-amber-500">중지</span>;
  return <span className="font-semibold text-gray-500">비활성</span>;
}

function GradeBadge({ grade }: { grade?: number }) {
  if (!grade) return <span className="text-gray-500">-</span>;
  const info = GRADE_MAP[grade];
  if (!info) return <span>{grade}</span>;

  const lightColors: Record<number, string> = {
    1: 'bg-amber-50 text-amber-800',
    2: 'bg-gray-100 text-gray-500',
    3: 'bg-amber-50 text-amber-700',
    4: 'bg-cyan-50 text-cyan-700',
    5: 'bg-purple-50 text-purple-800',
  };
  const colorClass = lightColors[grade] || 'bg-gray-100 text-gray-700';

  return (
    <span className={cn('inline-block px-2.5 py-1 rounded-md text-xs font-medium', colorClass)}>
      {info.label}
    </span>
  );
}

export default function FloristsPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-gray-500">로딩 중...</div>}>
      <FloristsPage />
    </Suspense>
  );
}

function FloristsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // URL search params에서 필터 상태 복원
  const initialQuery = searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || 'ACTIVE';
  const initialCaps = searchParams.get('caps')?.split(',').filter(Boolean) || [];
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialGrade = searchParams.get('grade') || '';
  const initialRecommended = searchParams.get('recommended') === 'true';

  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedCaps, setSelectedCaps] = useState<string[]>(initialCaps);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFloristId, setSelectedFloristId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gradeFilter, setGradeFilter] = useState(initialGrade);
  const [recommendedFilter, setRecommendedFilter] = useState(initialRecommended);
  const pageSize = 30;

  const syncParams = useCallback((params: { q?: string; status?: string; caps?: string[]; page?: number; grade?: string; recommended?: boolean }) => {
    const sp = new URLSearchParams();
    const q = params.q ?? query;
    const s = params.status ?? statusFilter;
    const c = params.caps ?? selectedCaps;
    const p = params.page ?? page;
    const g = params.grade ?? gradeFilter;
    const r = params.recommended ?? recommendedFilter;
    if (q) sp.set('q', q);
    if (s && s !== 'ACTIVE') sp.set('status', s);
    if (c.length > 0) sp.set('caps', c.join(','));
    if (p > 1) sp.set('page', String(p));
    if (g) sp.set('grade', g);
    if (r) sp.set('recommended', 'true');
    const qs = sp.toString();
    router.replace(`/admin/florists${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [query, statusFilter, selectedCaps, page, gradeFilter, recommendedFilter, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['florists', page, query, statusFilter, selectedCaps.join(','), gradeFilter, recommendedFilter],
    queryFn: () => listFlorists({
      page,
      size: pageSize,
      q: query || undefined,
      status: statusFilter || undefined,
      capabilities: selectedCaps.length > 0 ? selectedCaps : undefined,
      photoGrade: gradeFilter || undefined,
      isRecommended: recommendedFilter || undefined,
    }),
  });

  const filteredData = data?.data ?? [];

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
    syncParams({ q: search, page: 1 });
  };

  const handleReset = () => {
    setSearch('');
    setQuery('');
    setStatusFilter('ACTIVE');
    setSelectedCaps([]);
    setGradeFilter('');
    setRecommendedFilter(false);
    setPage(1);
    router.replace('/admin/florists', { scroll: false });
  };

  const toggleCap = (code: string) => {
    const next = selectedCaps.includes(code) ? selectedCaps.filter((c) => c !== code) : [...selectedCaps, code];
    setSelectedCaps(next);
    syncParams({ caps: next });
  };

  const handleToggleStatus = async (f: FloristSummary) => {
    const newStatus = f.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await updateFloristStatus(f.id, newStatus);
      toast.success(`${f.name} 상태가 변경되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['florists'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '상태 변경 실패');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-transparent">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">화원 목록</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full px-3 md:px-4 border-gray-200 text-gray-500 hover:bg-gray-50 text-xs md:text-sm" onClick={() => router.push('/admin/florists/photo-logs')}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            사진 변경 로그
          </Button>
          <Button className="bg-[#5B7A3D] hover:bg-[#4A6830] text-white rounded-full px-4 md:px-5 shadow-sm text-xs md:text-sm" onClick={() => setCreateDialogOpen(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            화원 등록
          </Button>
        </div>
      </div>

      <div className="rounded-xl shadow-sm overflow-hidden bg-gray-50 p-3 md:p-6">
        <div className="space-y-6">

      {/* 필터 토글 버튼 (모바일만) */}
      <button
        type="button"
        onClick={() => setFilterOpen(!filterOpen)}
        className="md:hidden flex items-center gap-1.5 text-sm text-[#5B7A3D] hover:text-gray-800 font-medium transition-colors"
      >
        <svg className={cn('w-4 h-4 transition-transform', filterOpen && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        필터 {filterOpen ? '접기' : '펼치기'}
        {(query || statusFilter !== 'ACTIVE' || selectedCaps.length > 0 || gradeFilter || recommendedFilter) && (
          <span className="ml-1 w-2 h-2 rounded-full bg-[#5B7A3D] inline-block" />
        )}
      </button>

      {/* 필터 영역: 데스크톱 항상 표시, 모바일 토글 */}
      <div className={cn(
        'bg-gray-50 rounded-lg border border-gray-200 p-3 md:p-4 flex flex-col gap-3 md:gap-4',
        filterOpen ? 'block' : 'hidden md:flex'
      )}>
        <form onSubmit={handleSearch} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <Input
                placeholder="화원명, 지역, 전화번호"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 border-gray-200 focus:border-[#5B7A3D] focus-visible:ring-[#5B7A3D] focus-visible:ring-1"
              />
            </div>
            <Button type="submit" className="h-10 px-4 md:px-6 bg-[#5B7A3D] hover:bg-[#4A6830] text-white shadow-none shrink-0">검색</Button>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D] outline-none text-gray-900"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); syncParams({ status: e.target.value, page: 1 }); }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" className="h-9 px-3 border-gray-200 text-gray-500 hover:bg-gray-50" onClick={handleReset}>초기화</Button>

            {/* 등급 필터 */}
            <select
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D] outline-none text-gray-900"
              value={gradeFilter}
              onChange={(e) => { setGradeFilter(e.target.value); setPage(1); syncParams({ grade: e.target.value, page: 1 }); }}
            >
              {GRADE_FILTER.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* 추천 필터 */}
            <button
              type="button"
              onClick={() => {
                const next = !recommendedFilter;
                setRecommendedFilter(next);
                setPage(1);
                syncParams({ recommended: next, page: 1 });
              }}
              className={cn(
                'h-9 px-3 rounded-lg border text-sm font-medium transition-colors',
                recommendedFilter
                  ? 'bg-[#5B7A3D] text-white border-[#5B7A3D]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#5B7A3D] hover:text-[#5B7A3D]'
              )}
            >
              추천
            </button>

            {/* 뷰 모드 토글 (데스크톱만) */}
            <div className="hidden md:flex gap-1 border border-gray-200 rounded-lg p-0.5 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded', viewMode === 'grid' ? 'bg-[#5B7A3D] text-white' : 'text-gray-400 hover:text-gray-600')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded', viewMode === 'list' ? 'bg-[#5B7A3D] text-white' : 'text-gray-400 hover:text-gray-600')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </form>

        {/* 역량 필터 */}
        <div className="flex flex-wrap gap-2">
          {CAPABILITY_FILTER.map((item) => {
            const isActive = selectedCaps.includes(item.code);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  const next = isActive
                    ? selectedCaps.filter((c) => c !== item.code)
                    : [...selectedCaps, item.code];
                  setSelectedCaps(next);
                  syncParams({ caps: next });
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  isActive
                    ? 'bg-[#5B7A3D] text-white border-[#5B7A3D]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#5B7A3D] hover:text-[#5B7A3D]'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-gray-500">로딩 중...</div>}
      {error && (
        <div className="text-center py-8 text-red-500">
          오류: {error instanceof Error ? error.message : '알 수 없는 오류'}
        </div>
      )}

      {data && (
        <>
          {/* 데스크톱: 그리드 뷰 */}
          {viewMode === 'grid' && (
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredData.map((f) => (
                <Card key={f.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow py-0 gap-0" onClick={() => setSelectedFloristId(f.id)}>
                  <div className="relative h-40 bg-gray-100 flex items-center justify-center">
                    <FloristCardImage floristId={f.id} />
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={f.status} />
                    </div>
                    {f.grade && (
                      <div className="absolute top-2 left-2">
                        <GradeBadge grade={f.grade} />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 truncate">{f.name}</span>
                      <PriorityBadge priority={f.priority} />
                    </div>
                    <div className="text-xs text-gray-500">{f.sido} {f.gugun}</div>
                    {f.address && <div className="text-xs text-gray-400 truncate">{f.address}</div>}
                    {f.phone && <div className="text-xs text-gray-500">{f.phone}</div>}
                    {f.capabilities && f.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {f.capabilities.slice(0, 3).map((c) => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{CODE_TO_LABEL[c] || c}</span>
                        ))}
                        {f.capabilities.length > 3 && <span className="text-[10px] text-gray-400">+{f.capabilities.length - 3}</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {filteredData.length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-500">검색 결과가 없습니다.</div>
              )}
            </div>
          )}

          {/* 데스크톱: 리스트(테이블) 뷰 */}
          {viewMode === 'list' && (
            <div className="hidden md:block rounded-xl border border-gray-200 bg-gray-50 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                   <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                     <TableHead className="w-12 text-center text-gray-500 font-semibold">순위</TableHead>
                     <TableHead className="w-16 text-center text-gray-500 font-semibold">상태</TableHead>
                     <TableHead className="w-16 text-gray-500 font-semibold">사진</TableHead>
                     <TableHead className="min-w-[200px] text-gray-500 font-semibold">화원 정보</TableHead>
                     <TableHead className="min-w-[150px] text-gray-500 font-semibold">역량 / 특이사항</TableHead>
                     <TableHead className="w-20 text-center text-gray-500 font-semibold">등급</TableHead>
                     <TableHead className="w-20 text-center text-gray-500 font-semibold">관리</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((f) => (
                     <TableRow
                      key={f.id}
                      className="bg-gray-50 cursor-pointer border-b border-gray-200 hover:bg-gray-100 transition-colors duration-150 even:bg-white"
                      onClick={() => setSelectedFloristId(f.id)}
                    >
                      <TableCell className="text-center">
                        <PriorityBadge priority={f.priority} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={f.status} />
                      </TableCell>
                      <TableCell>
                        <FloristThumb floristId={f.id} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{f.name}</span>
                            {f.source && (
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded',
                                f.source === 'flower_shop'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              )}>
                                {f.source === 'flower_shop' ? '외부' : '파트너'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            {f.sido} {f.gugun}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {f.address || ''} {f.phone ? `/ ${f.phone}` : ''}
                          </div>
                          {f.serviceAreas && f.serviceAreas.length > 0 && (
                            <div className="text-xs text-blue-500 truncate">
                              {f.serviceAreas.join(', ')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {f.capabilities && f.capabilities.length > 0 ? (
                            <div className="text-xs text-gray-500 leading-relaxed">
                              {[...new Set(f.capabilities.map((c) => CODE_TO_LABEL[c] || c))].join(', ')}
                            </div>
                          ) : null}
                          {f.remarks ? (
                            <div className="text-[13px] font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1 line-clamp-2 leading-snug">
                              {f.remarks}
                            </div>
                          ) : null}
                          {!f.capabilities?.length && !f.remarks && (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <GradeBadge grade={f.grade} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            title="수정"
                            onClick={() => setSelectedFloristId(f.id)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                            title={f.status === 'ACTIVE' ? '중지' : '활성화'}
                            onClick={() => handleToggleStatus(f)}
                          >
                            {f.status === 'ACTIVE' ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                              <svg className="w-4 h-4 text-[#5B7A3D]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        검색 결과가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 모바일 카드 그리드 */}
          <div className="md:hidden grid grid-cols-2 gap-3">
            {filteredData.map((f) => (
              <Card key={f.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow py-0 gap-0" onClick={() => setSelectedFloristId(f.id)}>
                <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                  <FloristCardImage floristId={f.id} />
                  <div className="absolute top-1.5 right-1.5">
                    <StatusBadge status={f.status} />
                  </div>
                  {f.grade && (
                    <div className="absolute top-1.5 left-1.5">
                      <GradeBadge grade={f.grade} />
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-900 truncate">{f.name}</span>
                    <PriorityBadge priority={f.priority} />
                  </div>
                  <div className="text-[11px] text-gray-500">{f.sido} {f.gugun}</div>
                  {f.phone && <div className="text-[11px] text-gray-500">{f.phone}</div>}
                </CardContent>
              </Card>
            ))}
            {filteredData.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-500">검색 결과가 없습니다.</div>
            )}
          </div>

          {/* 페이지네이션 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <span className="text-sm text-gray-500">
              총 <span className="font-semibold text-gray-900">{data.total}</span>개 · 페이지 {data.page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-500 hover:bg-gray-50"
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); syncParams({ page: p }); }}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#5B7A3D] text-[#5B7A3D] hover:bg-gray-100"
                disabled={page >= totalPages}
                onClick={() => { const p = page + 1; setPage(p); syncParams({ page: p }); }}
              >
                다음
              </Button>
            </div>
          </div>
        </>
      )}
      </div>
      </div>

      {selectedFloristId && (
         <FloristDetailDialog
          floristId={selectedFloristId}
          open={!!selectedFloristId}
          onClose={() => setSelectedFloristId(null)}
        />
      )}

      <FloristCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(id) => {
          setCreateDialogOpen(false);
          setSelectedFloristId(id);
        }}
      />
    </div>
  );
}
