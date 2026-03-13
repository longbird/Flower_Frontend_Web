'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { searchAllPhotos, updateFloristPhoto, deleteFloristPhoto } from '@/lib/api/admin';
import type { FloristPhotoSearchItem, FloristPhoto, PhotoCategory } from '@/lib/types/florist';
import { addPhotoLog } from '@/lib/photo-log';
import { useAuthStore } from '@/lib/auth/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PhotoEditForm } from './florist-photo-forms';

const CATEGORIES: { code: PhotoCategory | ''; label: string }[] = [
  { code: '', label: '전체' },
  { code: 'CELEBRATION', label: '축하' },
  { code: 'CONDOLENCE', label: '근조' },
  { code: 'OBJET', label: '오브제' },
  { code: 'ORIENTAL', label: '동양란' },
  { code: 'WESTERN', label: '서양란' },
  { code: 'FLOWER', label: '꽃' },
  { code: 'FOLIAGE', label: '관엽' },
  { code: 'RICE', label: '쌀' },
  { code: 'FRUIT', label: '과일' },
  { code: 'OTHER', label: '기타' },
];

const GRADES = [
  { code: '', label: '전체' },
  { code: 'PREMIUM', label: '프리미엄' },
  { code: 'HIGH', label: '고급형' },
  { code: 'STANDARD', label: '실속형' },
];

const CATEGORY_COLORS: Record<string, string> = {
  CELEBRATION: 'bg-pink-500/90 text-white',
  CONDOLENCE: 'bg-slate-700 text-white',
  OBJET: 'bg-purple-500/90 text-white',
  ORIENTAL: 'bg-teal-500/90 text-white',
  WESTERN: 'bg-indigo-500/90 text-white',
  FLOWER: 'bg-rose-500/90 text-white',
  FOLIAGE: 'bg-emerald-500/90 text-white',
  RICE: 'bg-amber-600/90 text-white',
  FRUIT: 'bg-orange-500/90 text-white',
  OTHER: 'bg-slate-500/90 text-white',
};

const GRADE_COLORS: Record<string, string> = {
  PREMIUM: 'bg-amber-700/90 text-white',
  HIGH: 'bg-blue-600/90 text-white',
  STANDARD: 'bg-teal-600/90 text-white',
};


function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

function categoryLabel(code: string) {
  return CATEGORIES.find((c) => c.code === code)?.label || code;
}

export default function ProductSearch() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [grade, setGrade] = useState('');
  const [isRecommended, setIsRecommended] = useState(false);
  const [memo, setMemo] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [includeHidden, setIncludeHidden] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FloristPhotoSearchItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const pageSize = 40;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['allPhotos', page, category, grade, isRecommended, includeHidden, memo, serviceArea],
    queryFn: () =>
      searchAllPhotos({
        page,
        size: pageSize,
        category: category || undefined,
        grade: grade || undefined,
        isRecommended: isRecommended || undefined,
        includeHidden: includeHidden || undefined,
        memo: memo || undefined,
        serviceArea: serviceArea || undefined,
      }),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: (item: FloristPhotoSearchItem) =>
      updateFloristPhoto(item.floristId, item.id, { isHidden: !item.isHidden }),
    onSuccess: (_data, item) => {
      const newHidden = !item.isHidden;
      addPhotoLog({
        action: 'TOGGLE_VISIBILITY',
        floristId: item.floristId,
        floristName: item.floristName || item.floristId,
        photoId: item.id,
        before: { isHidden: item.isHidden } as never,
        after: { isHidden: newHidden } as never,
        userName: useAuthStore.getState().user?.name || '-',
        note: `표시상태: ${newHidden ? '숨김' : '표시'}`,
      });
      toast.success(newHidden ? '숨김 처리되었습니다' : '공개 처리되었습니다');
      setSelectedItem((prev) =>
        prev && prev.id === item.id ? { ...prev, isHidden: newHidden } : prev
      );
      queryClient.invalidateQueries({ queryKey: ['allPhotos'] });
    },
    onError: () => {
      toast.error('상태 변경에 실패했습니다');
    },
  });

  const updatePhotoDetailMutation = useMutation({
    mutationFn: ({ item, data }: { item: FloristPhotoSearchItem; data: Record<string, unknown> }) =>
      updateFloristPhoto(item.floristId, item.id, data).then(() => ({ item, data })),
    onSuccess: ({ item, data }) => {
      addPhotoLog({
        action: 'UPDATE',
        floristId: item.floristId,
        floristName: item.floristName || item.floristId,
        photoId: item.id,
        before: item as never,
        after: { ...item, ...data } as never,
        userName: useAuthStore.getState().user?.name || '-',
      });
      toast.success('사진 정보가 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['allPhotos'] });
      setSelectedItem(null);
      setEditMode(false);
    },
    onError: () => {
      toast.error('수정에 실패했습니다');
    },
  });

  const toggleRecommendedMutation = useMutation({
    mutationFn: (item: FloristPhotoSearchItem) =>
      updateFloristPhoto(item.floristId, item.id, { isRecommended: !item.isRecommended }),
    onSuccess: (_data, item) => {
      const newRecommended = !item.isRecommended;
      addPhotoLog({
        action: 'UPDATE',
        floristId: item.floristId,
        floristName: item.floristName || item.floristId,
        photoId: item.id,
        before: { isRecommended: item.isRecommended } as never,
        after: { isRecommended: newRecommended } as never,
        userName: useAuthStore.getState().user?.name || '-',
        note: `추천: ${newRecommended ? '설정' : '해제'}`,
      });
      toast.success(newRecommended ? '전 지사 기본 노출로 설정되었습니다' : '전 지사 기본 노출이 해제되었습니다');
      setSelectedItem((prev) =>
        prev && prev.id === item.id ? { ...prev, isRecommended: newRecommended } : prev
      );
      queryClient.invalidateQueries({ queryKey: ['allPhotos'] });
    },
    onError: () => {
      toast.error('상태 변경에 실패했습니다');
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (item: FloristPhotoSearchItem) =>
      deleteFloristPhoto(item.floristId, item.id),
    onSuccess: (_data, item) => {
      addPhotoLog({
        action: 'DELETE',
        floristId: item.floristId,
        floristName: item.floristName || item.floristId,
        photoId: item.id,
        before: toFloristPhoto(item),
        after: null,
        userName: useAuthStore.getState().user?.name || '-',
      });
      toast.success('사진이 삭제되었습니다');
      setSelectedItem(null);
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['allPhotos'] });
    },
    onError: () => {
      toast.error('삭제에 실패했습니다');
    },
  });

  const toFloristPhoto = (item: FloristPhotoSearchItem): FloristPhoto => ({
    id: item.id,
    floristId: item.floristId,
    fileUrl: item.fileUrl,
    category: item.category,
    grade: item.grade,
    isHidden: item.isHidden ?? false,
    isRecommended: item.isRecommended,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    memo: item.memo,
    description: item.description,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;
  const items = data?.data ?? [];

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setCategory('');
    setGrade('');
    setIsRecommended(false);
    setIncludeHidden(false);
    setMemo('');
    setServiceArea('');
    setPage(1);
  };

  const handleToggleVisibility = useCallback((item: FloristPhotoSearchItem) => {
    toggleVisibilityMutation.mutate(item);
  }, [toggleVisibilityMutation]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter toggle (모바일) + Filter */}
      <div className="md:hidden flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-sm relative"
          onClick={() => setFilterOpen(!filterOpen)}
          aria-expanded={filterOpen}
          aria-controls="product-search-filter"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          필터
          {(category || grade || isRecommended || includeHidden || memo || serviceArea) && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#546E7A] rounded-full" />
          )}
        </Button>
        <Button size="sm" className="bg-[#546E7A] hover:bg-[#455A64] shadow-sm h-8" onClick={handleSearch}>검색</Button>
        {data && (
          <span className="text-sm text-slate-500 font-medium ml-auto">총 <span className="text-[#37474F] font-semibold">{data.total}</span>개</span>
        )}
      </div>
      <div
        id="product-search-filter"
        className={cn(
          'bg-[#F5F6F8] border border-[#E0E0E0] rounded-xl shadow-sm p-3 space-y-2',
          filterOpen ? 'block' : 'hidden md:block'
        )}
      >
        {/* 1줄: 카테고리, 등급 */}
        <div className="flex items-center gap-2">
          <select
            className="flex-1 min-w-0 rounded-lg border border-[#E0E0E0] px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-[#546E7A]/20 focus:border-[#546E7A] outline-none transition text-[#333333]"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <select
            className="flex-1 min-w-0 rounded-lg border border-[#E0E0E0] px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-[#546E7A]/20 focus:border-[#546E7A] outline-none transition text-[#333333]"
            value={grade}
            onChange={(e) => { setGrade(e.target.value); setPage(1); }}
          >
            {GRADES.map((g) => (
              <option key={g.code} value={g.code}>{g.label}</option>
            ))}
          </select>
        </div>
        {/* 2줄: 추천, 숨김포함, 메모검색 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsRecommended(!isRecommended); setPage(1); }}
            aria-pressed={isRecommended}
            className={cn(
              'px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0',
              isRecommended
                ? 'bg-[#546E7A] text-white border-[#546E7A]'
                : 'bg-white text-[#666666] border-[#E0E0E0] hover:border-[#546E7A]'
            )}
          >
            추천
          </button>
          <button
            onClick={() => { setIncludeHidden(!includeHidden); setPage(1); }}
            aria-pressed={includeHidden}
            className={cn(
              'px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0',
              includeHidden
                ? 'bg-orange-100 text-orange-800 border-orange-300'
                : 'bg-white text-[#666666] border-[#E0E0E0] hover:border-orange-300'
            )}
          >
            숨김포함
          </button>
          <Input
            placeholder="메모 검색"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 min-w-0 h-8 text-sm border-[#E0E0E0] focus:ring-2 focus:ring-[#546E7A]/20 focus:border-[#546E7A]"
          />
        </div>
        {/* 3줄: 서비스 지역, 초기화, 검색 */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="서비스 지역"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 min-w-0 h-8 text-sm border-[#E0E0E0] focus:ring-2 focus:ring-[#546E7A]/20 focus:border-[#546E7A]"
          />
          <Button variant="ghost" size="sm" className="text-[#666666] hover:text-[#333333] px-2 shrink-0 h-8" onClick={handleReset} title="초기화">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </Button>
          <Button size="sm" className="bg-[#546E7A] hover:bg-[#455A64] shadow-sm shrink-0 h-8 md:inline-flex hidden" onClick={handleSearch}>검색</Button>
        </div>
      </div>

      {/* Result count (데스크톱) */}
      {data && (
        <div className="hidden md:block text-sm text-slate-500 font-medium">총 <span className="text-[#37474F] font-semibold">{data.total}</span>개</div>
      )}

      {isLoading && (
        <div className="text-center py-12 text-slate-400">
          <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin mb-2" />
          <p className="text-sm">로딩 중...</p>
        </div>
      )}

      {/* Product grid */}
      <div className="bg-[#F5F6F8] border border-[#E0E0E0] rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
              onFloristClick={() => router.push(`/admin/florists/${item.floristId}`)}
            />
          ))}
        </div>

        {items.length === 0 && !isLoading && (
          <div className="text-center py-16 text-slate-300">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <p className="text-sm text-slate-400">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between flex-col sm:flex-row gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-sm text-slate-500">
            페이지 <span className="font-medium text-slate-700">{data.page}</span>/{totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-slate-200" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              이전
            </Button>
            <Button variant="outline" size="sm" className="border-slate-200" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              다음
            </Button>
          </div>
        </div>
      )}

      {/* Product detail dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); setEditMode(false); }}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-2xl h-[100dvh] md:h-auto md:max-h-[92vh] rounded-none md:rounded-lg overflow-y-auto overflow-x-hidden">
          <div className="flex items-center justify-between sticky top-0 z-10 bg-white pt-1 pb-2">
            <DialogTitle className="text-slate-800">{editMode ? '사진 정보 수정' : '상품 상세'}</DialogTitle>
            <button
              onClick={() => { setSelectedItem(null); setEditMode(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {selectedItem && !editMode && (
            <ProductDetail
              item={selectedItem}
              onViewFull={() => {
                setViewerUrl(photoUrl(selectedItem.fileUrl));
              }}
              onFloristClick={() => {
                setSelectedItem(null);
                router.push(`/admin/florists/${selectedItem.floristId}`);
              }}
              onToggleVisibility={() => handleToggleVisibility(selectedItem)}
              onToggleRecommended={() => toggleRecommendedMutation.mutate(selectedItem)}
              isToggling={toggleVisibilityMutation.isPending || toggleRecommendedMutation.isPending}
              onEdit={() => setEditMode(true)}
            />
          )}
          {selectedItem && editMode && (
            <PhotoEditForm
              photo={toFloristPhoto(selectedItem)}
              floristInfo={{ name: selectedItem.floristName, phone: selectedItem.floristPhone, address: selectedItem.floristAddress }}
              onSave={(data) => updatePhotoDetailMutation.mutate({ item: selectedItem, data })}
              onDelete={() => setDeleteConfirm(true)}
              onViewFull={() => setViewerUrl(photoUrl(selectedItem.fileUrl))}
              onCancel={() => setEditMode(false)}
              saving={updatePhotoDetailMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사진 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 사진을 정말 삭제하시겠습니까? 삭제된 사진은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (selectedItem) deletePhotoMutation.mutate(selectedItem);
                setDeleteConfirm(false);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full-screen image viewer */}
      <Dialog open={!!viewerUrl} onOpenChange={() => setViewerUrl(null)}>
        <DialogContent showCloseButton={false} className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none">
          {viewerUrl && (
            <div className="relative w-full h-[90vh]">
              <Image
                src={viewerUrl}
                alt="전체 화면"
                fill
                className="object-contain"
                unoptimized
              />
              <button
                onClick={() => setViewerUrl(null)}
                className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductCard({
  item,
  onClick,
  onFloristClick,
}: {
  item: FloristPhotoSearchItem;
  onClick: () => void;
  onFloristClick: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Image */}
      <div className="relative aspect-[3/4] cursor-pointer overflow-hidden" onClick={onClick}>
        <Image
          src={photoUrl(item.fileUrl)}
          alt={item.memo || '상품 사진'}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          unoptimized
        />
        {/* Category badge */}
        <span className={cn(
          'absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold shadow-sm',
          CATEGORY_COLORS[item.category] || 'bg-slate-500/90 text-white'
        )}>
          {categoryLabel(item.category)}
        </span>
        {/* Recommended badge */}
        {item.isRecommended && (
          <span className="absolute top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">
            추천
          </span>
        )}
        {/* Hidden badge */}
        {item.isHidden && (
          <span className="absolute bottom-1 right-1 bg-orange-500/80 text-white text-[9px] px-1.5 py-0.5 rounded-md font-medium">
            숨김
          </span>
        )}
        {/* Grade badge */}
        {item.grade && (
          <span className={cn(
            'absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-semibold shadow-sm',
            GRADE_COLORS[item.grade] || 'bg-slate-500/90 text-white'
          )}>
            {GRADES.find((g) => g.code === item.grade)?.label || item.grade}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="p-2.5 space-y-1">
        {item.memo && (
          <div className="text-xs truncate text-slate-700 font-medium">{item.memo}</div>
        )}
        {item.sellingPrice != null && (
          <div className="text-sm font-bold text-[#37474F]">
            {item.sellingPrice.toLocaleString()}원
          </div>
        )}
        {item.costPrice != null && (
          <div className="text-[10px] text-slate-400">
            입금가 {item.costPrice.toLocaleString()}원
          </div>
        )}
        <div
          className="text-xs text-[#546E7A] hover:text-[#37474F] cursor-pointer truncate transition-colors font-medium"
          onClick={(e) => { e.stopPropagation(); onFloristClick(); }}
        >
          {item.floristName}
        </div>
      </div>
    </div>
  );
}

function ProductDetail({
  item,
  onViewFull,
  onFloristClick,
  onToggleVisibility,
  onToggleRecommended,
  isToggling,
  onEdit,
}: {
  item: FloristPhotoSearchItem;
  onViewFull: () => void;
  onFloristClick: () => void;
  onToggleVisibility: () => void;
  onToggleRecommended: () => void;
  isToggling?: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-5">
      {/* Image */}
      <div
        className={cn(
          'relative w-full md:w-[35%] aspect-square rounded-xl overflow-hidden border cursor-pointer flex-shrink-0 group',
          item.isHidden ? 'border-orange-300 opacity-60' : 'border-slate-200'
        )}
        onClick={onViewFull}
      >
        <Image
          src={photoUrl(item.fileUrl)}
          alt={item.memo || '상품 사진'}
          fill
          className="object-contain group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
        {item.isHidden && (
          <span className="absolute top-2 left-2 bg-orange-500/90 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
            숨김
          </span>
        )}
        <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          크게 보기
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">상품 정보</h3>
          <dl className="text-sm space-y-2.5">
            <div className="flex gap-2">
              <dt className="text-slate-400 w-16 sm:w-20 flex-shrink-0">상품구분</dt>
              <dd>
                <span className={cn(
                  'px-2 py-0.5 rounded-md text-[11px] font-semibold',
                  CATEGORY_COLORS[item.category] || 'bg-slate-500/90 text-white'
                )}>
                  {categoryLabel(item.category)}
                </span>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400 w-16 sm:w-20 flex-shrink-0">등급</dt>
              <dd>
                {item.isRecommended && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900">
                    추천
                  </span>
                )}
                {item.grade ? (
                  <span className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-semibold',
                    item.isRecommended && 'ml-1.5',
                    GRADE_COLORS[item.grade] || 'bg-slate-500/90 text-white'
                  )}>
                    {GRADES.find((g) => g.code === item.grade)?.label || item.grade}
                  </span>
                ) : (
                  <span className={cn('text-slate-300 text-xs', item.isRecommended && 'ml-1.5')}>미설정</span>
                )}
              </dd>
            </div>
            {item.memo && (
              <div className="flex gap-2">
                <dt className="text-slate-400 w-16 sm:w-20 flex-shrink-0">메모</dt>
                <dd className="text-slate-700">{item.memo}</dd>
              </div>
            )}
            {item.sellingPrice != null && (
              <div className="flex gap-2">
                <dt className="text-slate-400 w-16 sm:w-20 flex-shrink-0">판매가</dt>
                <dd className="text-[#37474F] font-bold">{item.sellingPrice.toLocaleString()}원</dd>
              </div>
            )}
            {item.costPrice != null && (
              <div className="flex gap-2">
                <dt className="text-slate-400 w-16 sm:w-20 flex-shrink-0">입금가</dt>
                <dd className="text-slate-600">{item.costPrice.toLocaleString()}원</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">화원 정보</h3>
          <dl className="text-sm space-y-2.5">
            <div className="flex gap-2">
              <dt className="text-slate-400 w-16 sm:w-20 flex-shrink-0">화원명</dt>
              <dd>
                <span
                  className="text-[#546E7A] hover:text-[#37474F] cursor-pointer font-medium transition-colors"
                  onClick={onFloristClick}
                >
                  {item.floristName}
                </span>
              </dd>
            </div>
            {item.floristPhone && (
              <div className="flex gap-2">
                <dt className="text-slate-400 w-16 sm:w-20 flex-shrink-0">전화번호</dt>
                <dd className="text-slate-700">{item.floristPhone}</dd>
              </div>
            )}
            {item.floristAddress && (
              <div className="flex gap-2">
                <dt className="text-slate-400 w-16 sm:w-20 flex-shrink-0">주소</dt>
                <dd className="text-slate-700 break-all min-w-0">{item.floristAddress}</dd>
              </div>
            )}
            {item.floristServiceAreas.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-slate-400 w-16 sm:w-20 flex-shrink-0">서비스지역</dt>
                <dd className="text-[#546E7A] font-medium break-all min-w-0">{item.floristServiceAreas.join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Edit button */}
        <div className="pt-2 border-t border-slate-100">
          <Button
            size="sm"
            className="bg-[#546E7A] hover:bg-[#455A64] shadow-sm"
            onClick={onEdit}
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            사진 정보 수정
          </Button>
        </div>
      </div>
    </div>
  );
}

