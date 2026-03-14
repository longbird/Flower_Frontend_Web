'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchAllPhotos, updateFloristPhoto, deleteFloristPhoto } from '@/lib/api/admin';
import type { FloristPhotoSearchItem, FloristPhoto } from '@/lib/types/florist';
import { CATEGORIES } from '@/app/admin/florists/florist-constants';
import { PhotoEditForm } from '@/app/admin/florists/florist-photo-forms';
import { ImageViewer } from '@/app/admin/florists/florist-image-viewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { addPhotoLog } from '@/lib/photo-log';
import { useAuthStore } from '@/lib/auth/store';
import {
  CATEGORY_COLORS,
  GRADE_LABEL_MAP,
  categoryLabel,
  photoUrl,
  formatPrice,
} from './types';

// ─── Products Tab ────────────────────────────────────────────────────────────

const pageSize = 40;

export function ProductsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPhoto, setSelectedPhoto] = useState<FloristPhotoSearchItem | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<FloristPhotoSearchItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<'selected' | 'viewer' | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['recommendedPhotos', page, selectedCategory],
    queryFn: () =>
      searchAllPhotos({
        isRecommended: true,
        size: pageSize,
        page,
        category: selectedCategory || undefined,
        includeHidden: false,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

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

  const handleSave = async (formData: Record<string, unknown>) => {
    if (!selectedPhoto) return;
    setSaving(true);
    try {
      await updateFloristPhoto(selectedPhoto.floristId, selectedPhoto.id, formData);
      addPhotoLog({
        action: 'UPDATE',
        floristId: selectedPhoto.floristId,
        floristName: selectedPhoto.floristName || selectedPhoto.floristId,
        photoId: selectedPhoto.id,
        before: toFloristPhoto(selectedPhoto),
        after: { ...toFloristPhoto(selectedPhoto), ...formData } as Partial<FloristPhoto>,
        userName: useAuthStore.getState().user?.name || '-',
      });
      toast.success('사진 정보가 수정되었습니다.');
      setSelectedPhoto(null);
      queryClient.invalidateQueries({ queryKey: ['recommendedPhotos'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '수정 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (photo: FloristPhotoSearchItem) => {
    try {
      await deleteFloristPhoto(photo.floristId, photo.id);
      addPhotoLog({
        action: 'DELETE',
        floristId: photo.floristId,
        floristName: photo.floristName || photo.floristId,
        photoId: photo.id,
        before: toFloristPhoto(photo),
        after: null,
        userName: useAuthStore.getState().user?.name || '-',
      });
      toast.success('사진이 삭제되었습니다.');
      setSelectedPhoto(null);
      setViewerPhoto(null);
      queryClient.invalidateQueries({ queryKey: ['recommendedPhotos'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const photos = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
        <p className="text-sm text-slate-400 mt-3">로딩 중...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <p className="text-sm text-slate-500 mb-1">
          총 {data?.total ?? 0}개 — 화원에서 추천 체크한 상품이 자동으로 표시됩니다.
        </p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => { setSelectedCategory(''); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === ''
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.code}
              onClick={() => { setSelectedCategory(cat.code); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat.code
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400">표시할 추천 상품이 없습니다.</p>
          <p className="text-sm text-slate-400 mt-1">화원 상품 관리에서 추천 체크를 추가하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:ring-2 hover:ring-emerald-400/40 transition-all cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              {/* Image */}
              <div className="relative aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                {photo.fileUrl ? (
                  <img
                    src={photoUrl(photo.fileUrl)}
                    alt={photo.floristName ?? ''}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-4xl opacity-30 mb-1">🌸</div>
                    <p className="text-xs text-slate-400">이미지 없음</p>
                  </div>
                )}

                {/* Category badge */}
                {photo.category && (
                  <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold shadow-sm ${
                    CATEGORY_COLORS[photo.category] || 'bg-slate-500 text-white'
                  }`}>
                    {categoryLabel(photo.category)}
                  </span>
                )}

                {/* Grade badge */}
                {photo.grade && (
                  <span className="absolute bottom-2 right-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">
                    {GRADE_LABEL_MAP[photo.grade] ?? photo.grade}
                  </span>
                )}

                {/* Edit icon */}
                <span className="absolute top-2 right-2 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {photo.floristName ?? '—'}
                </p>
                {photo.sellingPrice != null && (
                  <p className="text-base font-bold text-emerald-700 mt-1">
                    {formatPrice(photo.sellingPrice)}
                  </p>
                )}
                {photo.memo && (
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                    {photo.memo}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between flex-col sm:flex-row gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm mt-4">
          <span className="text-sm text-slate-500">
            페이지 <span className="font-medium text-slate-700">{data.page}</span>/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              이전
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* Photo Edit Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-stone-800">사진 정보 수정</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <PhotoEditForm
              photo={toFloristPhoto(selectedPhoto)}
              floristInfo={{ name: selectedPhoto.floristName, phone: selectedPhoto.floristPhone, address: selectedPhoto.floristAddress }}
              onSave={handleSave}
              onDelete={() => setDeleteConfirm('selected')}
              onViewFull={() => {
                const p = selectedPhoto;
                setSelectedPhoto(null);
                setTimeout(() => setViewerPhoto(p), 100);
              }}
              onCancel={() => setSelectedPhoto(null)}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Full Image Viewer */}
      {viewerPhoto && (
        <ImageViewer
          photo={toFloristPhoto(viewerPhoto)}
          floristId={viewerPhoto.floristId}
          onClose={() => setViewerPhoto(null)}
          onToggleVisibility={() => {}}
          onDelete={() => setDeleteConfirm('viewer')}
          onRotateSave={async () => {}}
          isRotating={false}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
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
                const photo = deleteConfirm === 'selected' ? selectedPhoto : viewerPhoto;
                setDeleteConfirm(null);
                if (photo) handleDelete(photo);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
