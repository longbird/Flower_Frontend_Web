'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { listFlorists, updateFloristStatus, getFloristPhotos } from '@/lib/api/admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '중지' },
  { value: 'INACTIVE', label: '비활성' },
  { value: '', label: '전체' },
];

const CAPABILITY_CHIPS = [
  { code: 'CELEBRATION', label: '축하' },
  { code: 'CONDOLENCE', label: '근조' },
  { code: 'BASKET', label: '바구니' },
  { code: 'LARGE', label: '대형' },
  { code: 'MULTI_TIER', label: '다단' },
  { code: 'ROUND', label: '원형' },
  { code: 'BLACK_RIBBON', label: '검정리본' },
  { code: 'OBJET', label: '오브제' },
  { code: 'ORIENTAL_ORCHID', label: '동양란' },
  { code: 'WESTERN_ORCHID', label: '서양란' },
  { code: 'FLOWER', label: '꽃' },
  { code: 'FOLIAGE', label: '관엽' },
  { code: 'BONSAI', label: '분재' },
  { code: 'FRUITS', label: '과일' },
  { code: 'HOLIDAY', label: '휴일가능' },
  { code: 'NIGHT', label: '야간가능' },
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
  if (!priority) return <span className="text-gray-400">-</span>;
  const color =
    priority <= 3 ? 'bg-red-500 text-white' :
    priority <= 6 ? 'bg-orange-500 text-white' :
    'bg-gray-400 text-white';
  return (
    <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold', color)}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    ACTIVE: { label: '활성', variant: 'default' },
    SUSPENDED: { label: '중지', variant: 'destructive' },
    INACTIVE: { label: '비활성', variant: 'secondary' },
  };
  const info = map[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

function GradeBadge({ grade }: { grade?: number }) {
  if (!grade) return <span className="text-gray-400">-</span>;
  const info = GRADE_MAP[grade];
  if (!info) return <span>{grade}</span>;
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', info.color)}>
      {info.label}
    </span>
  );
}

export default function FloristsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFloristId, setSelectedFloristId] = useState<string | null>(null);
  const pageSize = 30;

  const { data, isLoading, error } = useQuery({
    queryKey: ['florists', page, query, statusFilter],
    queryFn: () => listFlorists({
      page,
      size: pageSize,
      q: query || undefined,
      status: statusFilter || undefined,
    }),
  });

  // 클라이언트 사이드 역량 필터링
  const filteredData = data?.data?.filter((f) => {
    if (selectedCaps.length === 0) return true;
    return selectedCaps.every((cap) => f.capabilities?.includes(cap));
  }) ?? [];

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  };

  const handleReset = () => {
    setSearch('');
    setQuery('');
    setStatusFilter('ACTIVE');
    setSelectedCaps([]);
    setPage(1);
  };

  const toggleCap = (code: string) => {
    setSelectedCaps((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">화원 관리</h1>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/florists/photo-logs')}>
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          사진 변경 로그
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">화원 목록</TabsTrigger>
          <TabsTrigger value="search">상품 검색</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <ProductSearch />
        </TabsContent>

        <TabsContent value="list">
        <div className="space-y-4">

      {/* 필터 영역 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* 필터 헤더 (항상 보임) */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
            <select
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm hover:border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Input
              placeholder="검색 (화원명, 지역, 전화번호)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-sm shrink-0">검색</Button>
          </form>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={cn(
              'shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filterOpen || selectedCaps.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'text-slate-500 border-slate-200 hover:bg-slate-50'
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            필터
            {selectedCaps.length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{selectedCaps.length}</span>
            )}
            <svg className={cn('w-3 h-3 transition-transform', filterOpen && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 px-2 shrink-0" onClick={handleReset} title="초기화">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </Button>
        </div>
        {/* 역량 필터 (접힘 가능) */}
        {filterOpen && (
          <div className="px-4 pb-3 pt-1 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITY_CHIPS.map((cap) => (
                <button
                  key={cap.code}
                  onClick={() => toggleCap(cap.code)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                    selectedCaps.includes(cap.code)
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                  )}
                >
                  {selectedCaps.includes(cap.code) && (
                    <svg className="inline w-3 h-3 mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  )}
                  {cap.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading && <div className="text-center py-8 text-gray-500">로딩 중...</div>}
      {error && (
        <div className="text-center py-8 text-red-500">
          오류: {error instanceof Error ? error.message : '알 수 없는 오류'}
        </div>
      )}

      {data && (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">순위</TableHead>
                  <TableHead className="w-16 text-center">상태</TableHead>
                  <TableHead className="w-16">사진</TableHead>
                  <TableHead className="min-w-[200px]">화원 정보</TableHead>
                  <TableHead className="min-w-[150px]">역량 / 특이사항</TableHead>
                  <TableHead className="w-20 text-center">등급</TableHead>
                  <TableHead className="w-20 text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((f) => (
                  <TableRow
                    key={f.id}
                    className="cursor-pointer hover:bg-emerald-50/40 transition-colors duration-150"
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
                          <span className="font-medium truncate">{f.name}</span>
                          {f.source && (
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded',
                              f.source === 'flower_shop'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            )}>
                              {f.source === 'flower_shop' ? '외부' : '파트너'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-teal-600">
                          {f.sido} {f.gugun}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {f.address || ''} {f.phone ? `/ ${f.phone}` : ''}
                        </div>
                        {f.serviceAreas && f.serviceAreas.length > 0 && (
                          <div className="text-xs text-blue-600 truncate">
                            {f.serviceAreas.join(', ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {f.capabilities && f.capabilities.length > 0 ? (
                          <div className="text-xs text-gray-600 leading-relaxed">
                            {f.capabilities.map((c) =>
                              CAPABILITY_CHIPS.find((ch) => ch.code === c)?.label || c
                            ).join(', ')}
                          </div>
                        ) : null}
                        {f.remarks ? (
                          <div className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5 line-clamp-2">
                            {f.remarks}
                          </div>
                        ) : null}
                        {!f.capabilities?.length && !f.remarks && (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <GradeBadge grade={f.grade} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                          title="수정"
                          onClick={() => setSelectedFloristId(f.id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            f.status === 'ACTIVE' ? 'hover:bg-orange-50 text-slate-400 hover:text-orange-600' : 'hover:bg-green-50 text-slate-400 hover:text-green-600'
                          )}
                          title={f.status === 'ACTIVE' ? '중지' : '활성화'}
                          onClick={() => handleToggleStatus(f)}
                        >
                          {f.status === 'ACTIVE' ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
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

          {/* 모바일 카드 목록 */}
          <div className="md:hidden space-y-2">
            {filteredData.map((f) => (
              <div
                key={f.id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 flex gap-3 active:bg-slate-50 shadow-sm hover:shadow-md transition-shadow"
                onClick={() => setSelectedFloristId(f.id)}
              >
                <div className="flex-shrink-0">
                  <FloristThumb floristId={f.id} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={f.priority} />
                  <span className="font-medium truncate">{f.name}</span>
                  <StatusBadge status={f.status} />
                  <GradeBadge grade={f.grade} />
                </div>
                <div className="text-xs text-teal-600">
                  {f.sido} {f.gugun}
                </div>
                <div className="text-xs text-gray-500 break-words">
                  {f.address || ''} {f.phone ? `/ ${f.phone}` : ''}
                </div>
                {f.serviceAreas && f.serviceAreas.length > 0 && (
                  <div className="text-xs text-blue-600 break-words">{f.serviceAreas.join(', ')}</div>
                )}
                </div>
              </div>
            ))}
            {filteredData.length === 0 && (
              <div className="text-center py-8 text-gray-500">검색 결과가 없습니다.</div>
            )}
          </div>

          {/* 페이지네이션 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-sm text-gray-500">
              총 {data.total}개 · 페이지 {data.page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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

      {selectedFloristId && (
         <FloristDetailDialog
          floristId={selectedFloristId}
          open={!!selectedFloristId}
          onClose={() => setSelectedFloristId(null)}
        />
      )}
    </div>
  );
}
