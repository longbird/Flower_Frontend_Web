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
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FloristSummary } from '@/lib/types/florist';
import ProductSearch from './product-search';
import FloristDetailDialog from './florist-dialog';
import FloristCreateDialog from './florist-create-dialog';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '중지' },
  { value: 'INACTIVE', label: '비활성' },
  { value: '', label: '전체' },
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

function FloristThumb({ floristId }: { floristId: string }) {
  const { data } = useQuery({
    queryKey: ['floristThumb', floristId],
    queryFn: () => getFloristPhotos(floristId, { includeHidden: false }),
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });

  const firstPhoto = data?.data?.[0];

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

function PriorityBadge({ priority }: { priority?: number }) {
  if (!priority) return <span className="text-[#666666]">-</span>;
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-red-500 border-2 border-red-500 bg-transparent">
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return <span className="font-semibold text-[#4CAF50]">활성</span>;
  if (status === 'SUSPENDED') return <span className="font-semibold text-[#FF9800]">중지</span>;
  return <span className="font-semibold text-[#666666]">비활성</span>;
}

function GradeBadge({ grade }: { grade?: number }) {
  if (!grade) return <span className="text-[#666666]">-</span>;
  const info = GRADE_MAP[grade];
  if (!info) return <span>{grade}</span>;
  
  const lightColors: Record<number, string> = {
    1: 'bg-[#F0E6D2] text-[#8C6D46]',
    2: 'bg-[#F0F0F0] text-[#666666]',
    3: 'bg-[#FFF5D1] text-[#B8860B]',
    4: 'bg-[#E0F7FA] text-[#00838F]',
    5: 'bg-[#F3E5F5] text-[#4A148C]',
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
    <Suspense fallback={<div className="text-center py-8 text-[#666666]">로딩 중...</div>}>
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

  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedCaps, setSelectedCaps] = useState<string[]>(initialCaps);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFloristId, setSelectedFloristId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const pageSize = 30;

  const syncParams = useCallback((params: { q?: string; status?: string; caps?: string[]; page?: number }) => {
    const sp = new URLSearchParams();
    const q = params.q ?? query;
    const s = params.status ?? statusFilter;
    const c = params.caps ?? selectedCaps;
    const p = params.page ?? page;
    if (q) sp.set('q', q);
    if (s && s !== 'ACTIVE') sp.set('status', s);
    if (c.length > 0) sp.set('caps', c.join(','));
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    router.replace(`/admin/florists${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [query, statusFilter, selectedCaps, page, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['florists', page, query, statusFilter, selectedCaps.join(',')],
    queryFn: () => listFlorists({
      page,
      size: pageSize,
      q: query || undefined,
      status: statusFilter || undefined,
      capabilities: selectedCaps.length > 0 ? selectedCaps : undefined,
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
    <div className="min-h-screen bg-[#F7F8FA] space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-transparent">
        <h1 className="text-xl md:text-2xl font-bold text-[#333333]">화원 관리</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full px-3 md:px-4 border-[#E0E0E0] text-[#666666] hover:bg-gray-50 text-xs md:text-sm" onClick={() => router.push('/admin/florists/photo-logs')}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            사진 변경 로그
          </Button>
          <Button className="bg-[#546E7A] hover:bg-[#455A64] text-white rounded-full px-4 md:px-5 shadow-sm text-xs md:text-sm" onClick={() => setCreateDialogOpen(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            화원 등록
          </Button>
        </div>
      </div>

      <div className="rounded-xl shadow-sm overflow-hidden">
        <Tabs defaultValue="list" className="w-full">
          <div className="bg-white border-b border-[#E0E0E0] rounded-t-xl">
            <TabsList className="bg-transparent h-12 p-0 space-x-0 justify-start px-0 rounded-none w-full">
              <TabsTrigger 
                value="list" 
                className="relative h-12 px-6 rounded-none font-medium transition-none text-[#999999] data-[state=active]:text-[#37474F] data-[state=active]:font-semibold data-[state=active]:bg-[#F5F6F8] data-[state=active]:shadow-none data-[state=active]:border-t-2 data-[state=active]:border-t-[#546E7A] data-[state=active]:border-x data-[state=active]:border-x-[#E0E0E0] data-[state=active]:border-b-0 data-[state=inactive]:border-b data-[state=inactive]:border-b-transparent"
              >
                화원 목록
              </TabsTrigger>
              <TabsTrigger 
                value="search" 
                className="relative h-12 px-6 rounded-none font-medium transition-none text-[#999999] data-[state=active]:text-[#37474F] data-[state=active]:font-semibold data-[state=active]:bg-[#F5F6F8] data-[state=active]:shadow-none data-[state=active]:border-t-2 data-[state=active]:border-t-[#546E7A] data-[state=active]:border-x data-[state=active]:border-x-[#E0E0E0] data-[state=active]:border-b-0 data-[state=inactive]:border-b data-[state=inactive]:border-b-transparent"
              >
                상품 검색
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="bg-[#F5F6F8] p-3 md:p-6 m-0 outline-none rounded-b-xl">
            <ProductSearch />
          </TabsContent>

          <TabsContent value="list" className="bg-[#F5F6F8] p-3 md:p-6 m-0 outline-none rounded-b-xl">
            <div className="space-y-6">

      {/* 필터 토글 버튼 (모바일만) */}
      <button
        type="button"
        onClick={() => setFilterOpen(!filterOpen)}
        className="md:hidden flex items-center gap-1.5 text-sm text-[#546E7A] hover:text-[#37474F] font-medium transition-colors"
      >
        <svg className={cn('w-4 h-4 transition-transform', filterOpen && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        필터 {filterOpen ? '접기' : '펼치기'}
        {(query || statusFilter !== 'ACTIVE' || selectedCaps.length > 0) && (
          <span className="ml-1 w-2 h-2 rounded-full bg-[#546E7A] inline-block" />
        )}
      </button>

      {/* 필터 영역: 데스크톱 항상 표시, 모바일 토글 */}
      <div className={cn(
        'bg-[#F5F6F8] rounded-lg border border-[#E0E0E0] p-3 md:p-4 flex flex-col gap-3 md:gap-4',
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
                className="h-10 pl-9 border-[#E0E0E0] focus:border-[#546E7A] focus-visible:ring-[#546E7A] focus-visible:ring-1"
              />
            </div>
            <Button type="submit" className="h-10 px-4 md:px-6 bg-[#546E7A] hover:bg-[#455A64] text-white shadow-none shrink-0">검색</Button>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-lg border border-[#E0E0E0] bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#546E7A]/20 focus:border-[#546E7A] outline-none text-[#333333]"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); syncParams({ status: e.target.value, page: 1 }); }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" className="h-9 px-3 border-[#E0E0E0] text-[#666666] hover:bg-gray-50" onClick={handleReset}>초기화</Button>
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
                    ? 'bg-[#546E7A] text-white border-[#546E7A]'
                    : 'bg-white text-[#666666] border-[#E0E0E0] hover:border-[#546E7A] hover:text-[#546E7A]'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-[#666666]">로딩 중...</div>}
      {error && (
        <div className="text-center py-8 text-red-500">
          오류: {error instanceof Error ? error.message : '알 수 없는 오류'}
        </div>
      )}

      {data && (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block rounded-xl border border-[#E0E0E0] bg-[#F7F8FA] shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                 <TableRow className="bg-[#F5F6F8] border-b border-[#E0E0E0] hover:bg-[#F5F6F8]">
                   <TableHead className="w-12 text-center text-[#666666] font-semibold">순위</TableHead>
                   <TableHead className="w-16 text-center text-[#666666] font-semibold">상태</TableHead>
                   <TableHead className="w-16 text-[#666666] font-semibold">사진</TableHead>
                   <TableHead className="min-w-[200px] text-[#666666] font-semibold">화원 정보</TableHead>
                   <TableHead className="min-w-[150px] text-[#666666] font-semibold">역량 / 특이사항</TableHead>
                   <TableHead className="w-20 text-center text-[#666666] font-semibold">등급</TableHead>
                   <TableHead className="w-20 text-center text-[#666666] font-semibold">관리</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((f) => (
                   <TableRow
                    key={f.id}
                    className="bg-[#F7F8FA] cursor-pointer border-b border-[#E0E0E0] hover:bg-[#ECEFF1] transition-colors duration-150 even:bg-white"
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
                          <span className="font-medium text-[#333333] truncate">{f.name}</span>
                          {f.source && (
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded',
                              f.source === 'flower_shop'
                                ? 'bg-[#E3F2FD] text-[#1565C0]'
                                : 'bg-[#ECEFF1] text-[#546E7A]'
                            )}>
                              {f.source === 'flower_shop' ? '외부' : '파트너'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#546E7A]">
                          {f.sido} {f.gugun}
                        </div>
                        <div className="text-xs text-[#666666] truncate">
                          {f.address || ''} {f.phone ? `/ ${f.phone}` : ''}
                        </div>
                        {f.serviceAreas && f.serviceAreas.length > 0 && (
                          <div className="text-xs text-[#2196F3] truncate">
                            {f.serviceAreas.join(', ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {f.capabilities && f.capabilities.length > 0 ? (
                          <div className="text-xs text-[#666666] leading-relaxed">
                            {[...new Set(f.capabilities.map((c) => CODE_TO_LABEL[c] || c))].join(', ')}
                          </div>
                        ) : null}
                        {f.remarks ? (
                          <div className="text-[13px] font-medium bg-[#FFF8E1] text-[#8D6E00] border border-[#FFE082] rounded px-2 py-1 line-clamp-2 leading-snug">
                            {f.remarks}
                          </div>
                        ) : null}
                        {!f.capabilities?.length && !f.remarks && (
                          <span className="text-[#666666] text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <GradeBadge grade={f.grade} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-1.5 rounded-lg text-[#666666] hover:bg-gray-100 transition-colors"
                          title="수정"
                          onClick={() => setSelectedFloristId(f.id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-[#FF9800] hover:bg-[#FFF3E0] transition-colors"
                          title={f.status === 'ACTIVE' ? '중지' : '활성화'}
                          onClick={() => handleToggleStatus(f)}
                        >
                          {f.status === 'ACTIVE' ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                          ) : (
                            <svg className="w-4 h-4 text-[#4CAF50]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#666666]">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 모바일 카드 목록 */}
          <div className="md:hidden space-y-3">
            {filteredData.map((f) => (
              <div
                key={f.id}
                className="bg-white border border-[#E0E0E0] rounded-xl p-4 flex gap-3 active:bg-[#ECEFF1] shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedFloristId(f.id)}
              >
                <div className="flex-shrink-0">
                  <FloristThumb floristId={f.id} />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={f.priority} />
                    <span className="font-medium text-[#333333] truncate">{f.name}</span>
                    <StatusBadge status={f.status} />
                    <GradeBadge grade={f.grade} />
                  </div>
                   <div className="text-xs text-[#546E7A]">
                    {f.sido} {f.gugun}
                  </div>
                  <div className="text-xs text-[#666666] break-words">
                    {f.address || ''} {f.phone ? `/ ${f.phone}` : ''}
                  </div>
                  {f.serviceAreas && f.serviceAreas.length > 0 && (
                    <div className="text-xs text-[#2196F3] break-words">{f.serviceAreas.join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
            {filteredData.length === 0 && (
              <div className="text-center py-8 text-[#666666]">검색 결과가 없습니다.</div>
            )}
          </div>

          {/* 페이지네이션 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <span className="text-sm text-[#666666]">
              총 <span className="font-semibold text-[#333333]">{data.total}</span>개 · 페이지 {data.page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#E0E0E0] text-[#666666] hover:bg-gray-50"
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); syncParams({ page: p }); }}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#546E7A] text-[#546E7A] hover:bg-[#ECEFF1]"
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
      </TabsContent>
      </Tabs>
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
