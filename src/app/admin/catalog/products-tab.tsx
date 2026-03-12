'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { searchAllPhotos } from '@/lib/api/admin';
import type { FloristPhotoSearchItem } from '@/lib/types/florist';
import { Button } from '@/components/ui/button';
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
import {
  type CatalogProduct,
  CATEGORY_COLORS,
  CATEGORY_LABEL_MAP,
  GRADE_LABEL_MAP,
  categoryLabel,
  photoUrl,
  formatPrice,
} from './types';
import { ProductEditModal, ProductCreateModal } from './product-modals';

// ─── Products Tab ────────────────────────────────────────────────────────────

const BATCH_SIZE = 10;

export function ProductsTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importConfirm, setImportConfirm] = useState<{ toImport: FloristPhotoSearchItem[]; skipped: number } | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ product: CatalogProduct; e: React.MouseEvent } | null>(null);
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState<{ product: CatalogProduct; e: React.MouseEvent } | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; data: CatalogProduct[] }>('/admin/catalog/products');
      setProducts(res.data ?? []);
    } catch {
      // handled by auth
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = async (product: CatalogProduct, field: 'isActive' | 'isBranchDefault', e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(product.id);
    try {
      const newValue = field === 'isActive' ? !Boolean(product.isActive) : !product.isBranchDefault;
      await api(`/admin/catalog/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: newValue }),
      });
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, [field]: newValue } : p
      ));
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSaved = () => {
    setEditProduct(null);
    setShowCreate(false);
    loadProducts();
  };

  const handleImportRecommended = async () => {
    setImporting(true);
    try {
      const photosRes = await searchAllPhotos({ isRecommended: true, size: 500, includeHidden: false });
      const photos: FloristPhotoSearchItem[] = photosRes.data ?? [];

      if (photos.length === 0) {
        toast.info('추천 체크된 상품이 없습니다.');
        return;
      }

      const existingSkus = new Set(products.map(p => p.sku));
      const toImport = photos.filter(p => !existingSkus.has(`FP-${p.id}`));

      if (toImport.length === 0) {
        toast.info(`추천 상품 ${photos.length}개가 모두 이미 등록되어 있습니다.`);
        return;
      }

      setImportConfirm({ toImport, skipped: photos.length - toImport.length });
    } catch {
      toast.error('추천 상품 가져오기에 실패했습니다.');
    } finally {
      setImporting(false);
    }
  };

  const executeImport = async (toImport: FloristPhotoSearchItem[]) => {
    setImporting(true);
    setImportConfirm(null);
    try {
      let success = 0;
      let fail = 0;

      // batch 처리 (BATCH_SIZE개씩 병렬)
      for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
        const batch = toImport.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((photo) => {
            const name = [
              CATEGORY_LABEL_MAP[photo.category] || photo.category,
              photo.grade ? GRADE_LABEL_MAP[photo.grade] || photo.grade : null,
              photo.floristName,
            ].filter(Boolean).join(' - ');

            return api('/admin/catalog/products', {
              method: 'POST',
              body: JSON.stringify({
                sku: `FP-${photo.id}`,
                name,
                description: photo.memo || undefined,
                imageUrl: photo.fileUrl || null,
                category: photo.category || null,
                basePrice: photo.sellingPrice ?? 0,
                sortOrder: 1000,
                isBranchDefault: true,
              }),
            });
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            success++;
          } else {
            fail++;
          }
        }
      }

      toast.success(`추천 상품 등록 완료: ${success}개 성공${fail > 0 ? `, ${fail}개 실패` : ''}`);
      loadProducts();
    } catch {
      toast.error('추천 상품 가져오기에 실패했습니다.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeactivate = (product: CatalogProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeactivateConfirm({ product, e });
  };

  const confirmDeactivate = async () => {
    if (!deactivateConfirm) return;
    const { product } = deactivateConfirm;
    setDeactivateConfirm(null);
    setDeletingId(product.id);
    try {
      await api(`/admin/catalog/products/${product.id}`, { method: 'DELETE' });
      loadProducts();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePermanent = (product: CatalogProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setPermanentDeleteConfirm({ product, e });
  };

  const confirmDeletePermanent = async () => {
    if (!permanentDeleteConfirm) return;
    const { product } = permanentDeleteConfirm;
    setPermanentDeleteConfirm(null);
    setDeletingId(product.id);
    try {
      await api(`/admin/catalog/products/${product.id}?permanent=true`, { method: 'DELETE' });
      loadProducts();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
        <p className="text-sm text-slate-400 mt-3">로딩 중...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-slate-500">
          전체 {products.length}개 (활성 {products.filter(p => Boolean(p.isActive)).length}개)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleImportRecommended}
            disabled={importing}
            className="text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-1.5" />
                가져오는 중...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                추천 상품 가져오기
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            상품 등록
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400">등록된 상품이 없습니다.</p>
          <p className="text-sm text-slate-400 mt-1">위 &quot;상품 등록&quot; 버튼을 눌러 상품을 추가하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const branchDefault = product.isBranchDefault ?? true;
            const active = Boolean(product.isActive);
            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer relative ${
                  active ? 'border-slate-200' : 'border-red-200 opacity-60'
                }`}
                onClick={() => setEditProduct(product)}
              >
                {/* Inactive badge */}
                {!active && (
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-red-500 text-white text-xs font-medium">
                    비활성
                  </div>
                )}

                {/* Action buttons */}
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  {active && (
                    <button
                      onClick={(e) => handleDeactivate(product, e)}
                      disabled={deletingId === product.id}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-white/80 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors shadow-sm disabled:opacity-50"
                      title="비활성화"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878l4.242 4.242M21 21l-4.879-4.879" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDeletePermanent(product, e)}
                    disabled={deletingId === product.id}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/80 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
                    title="영구 삭제"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Image */}
                <div className="relative aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={photoUrl(product.imageUrl)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl opacity-30 mb-1">🌸</div>
                      <p className="text-xs text-slate-400">이미지 없음</p>
                    </div>
                  )}
                  {/* Category badge */}
                  {product.category && (
                    <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold shadow-sm ${
                      CATEGORY_COLORS[product.category] || 'bg-slate-500 text-white'
                    }`}>
                      {categoryLabel(product.category)}
                    </span>
                  )}
                  {/* Branch default badge */}
                  {branchDefault && (
                    <span className="absolute bottom-2 right-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">
                      추천
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{product.sku}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-bold text-emerald-700">
                      {formatPrice(product.basePrice)}
                    </span>
                    <span className="text-xs text-slate-400">
                      순서: {product.sortOrder}
                    </span>
                  </div>

                  {/* Inline Toggles */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <label
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {}}
                        onClick={(e) => handleToggle(product, 'isActive', e)}
                        disabled={togglingId === product.id}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30 cursor-pointer disabled:opacity-50"
                      />
                      <span className={`text-xs font-medium ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                        표시
                      </span>
                    </label>
                    <label
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={branchDefault}
                        onChange={() => {}}
                        onClick={(e) => handleToggle(product, 'isBranchDefault', e)}
                        disabled={togglingId === product.id}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30 cursor-pointer disabled:opacity-50"
                      />
                      <span className={`text-xs font-medium ${branchDefault ? 'text-emerald-700' : 'text-slate-400'}`}>
                        전 지사 기본 노출
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <ProductEditModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <ProductCreateModal
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Import Confirm Dialog */}
      <AlertDialog open={!!importConfirm} onOpenChange={() => setImportConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>추천 상품 가져오기</AlertDialogTitle>
            <AlertDialogDescription>
              추천 상품 {importConfirm?.toImport.length}개를 카탈로그에 등록하시겠습니까?
              {importConfirm && importConfirm.skipped > 0 && (
                <span className="block mt-1 text-slate-500">
                  (이미 등록된 {importConfirm.skipped}개는 건너뜁니다)
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importConfirm && executeImport(importConfirm.toImport)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              등록
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirm Dialog */}
      <AlertDialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상품 비활성화</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deactivateConfirm?.product.name}&quot; 상품을 비활성화하시겠습니까?
              <span className="block mt-1 text-slate-500">
                목록에서 숨겨지지만 데이터는 유지됩니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-orange-600 hover:bg-orange-700"
            >
              비활성화
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirm Dialog */}
      <AlertDialog open={!!permanentDeleteConfirm} onOpenChange={() => setPermanentDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상품 영구 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{permanentDeleteConfirm?.product.name}&quot; 상품을 영구 삭제하시겠습니까?
              <span className="block mt-2 font-semibold text-red-600">
                ⚠ 이 작업은 되돌릴 수 없습니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePermanent}
              className="bg-red-600 hover:bg-red-700"
            >
              영구 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
