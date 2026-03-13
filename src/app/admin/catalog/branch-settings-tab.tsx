'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Branch, BranchProduct } from './types';
import { photoUrl } from './types';

interface BranchWithSurcharge extends Branch {
  defaultSurcharge?: number;
}

export function BranchSettingsTab() {
  const [branches, setBranches] = useState<BranchWithSurcharge[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<number, string>>({});
  const [editedNames, setEditedNames] = useState<Record<number, string>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [showBulkSurcharge, setShowBulkSurcharge] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await api<BranchWithSurcharge[] | { ok: boolean; data: BranchWithSurcharge[] }>('/admin/branches');
      setBranches(Array.isArray(res) ? res : (res.data ?? []));
    } catch {
      // handled by auth
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const loadBranchProducts = useCallback(async (branchId: number) => {
    setLoadingProducts(true);
    setEditedPrices({});
    setEditedNames({});
    try {
      const res = await api<{ ok: boolean; data: BranchProduct[] }>(
        `/admin/catalog/branches/${branchId}/products`
      );
      setBranchProducts(res.data ?? []);
    } catch {
      setBranchProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBranchId !== null) {
      loadBranchProducts(selectedBranchId);
    }
  }, [selectedBranchId, loadBranchProducts]);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const handleToggleVisibility = async (product: BranchProduct) => {
    if (selectedBranchId === null) return;
    setSavingIds((prev) => new Set(prev).add(product.id));
    try {
      const priceStr = editedPrices[product.id];
      const sellingPrice = priceStr !== undefined ? Number(priceStr.replace(/[^0-9]/g, '')) : product.sellingPrice;
      await api(`/admin/catalog/branches/${selectedBranchId}/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isVisible: !product.isVisible,
          sellingPrice,
        }),
      });
      loadBranchProducts(selectedBranchId);
    } catch {
      // ignore
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  const handleSave = async (product: BranchProduct) => {
    if (selectedBranchId === null) return;
    const priceStr = editedPrices[product.id];
    const nameStr = editedNames[product.id];
    if (priceStr === undefined && nameStr === undefined) return;

    const priceNum = priceStr !== undefined ? Number(priceStr.replace(/[^0-9]/g, '')) : null;
    const sellingPrice = priceNum !== null ? priceNum : product.sellingPrice;
    if (priceStr !== undefined && (isNaN(priceNum!) || priceNum! < 0)) return;

    const customName = nameStr !== undefined ? (nameStr.trim() || null) : product.customName;

    setSavingIds((prev) => new Set(prev).add(product.id));
    try {
      await api(`/admin/catalog/branches/${selectedBranchId}/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isVisible: product.isVisible,
          sellingPrice,
          customName,
        }),
      });
      loadBranchProducts(selectedBranchId);
      setEditedPrices((prev) => { const n = { ...prev }; delete n[product.id]; return n; });
      setEditedNames((prev) => { const n = { ...prev }; delete n[product.id]; return n; });
    } catch {
      // ignore
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  const handleBulkSurchargeSaved = () => {
    setShowBulkSurcharge(false);
    loadBranches();
    if (selectedBranchId !== null) {
      loadBranchProducts(selectedBranchId);
    }
  };

  if (loadingBranches) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
        <p className="text-sm text-slate-400 mt-3">지사 목록 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Branch Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-sm">
            <Label htmlFor="branch-select" className="text-sm font-medium text-slate-700">
              지사 선택
            </Label>
            <select
              id="branch-select"
              value={selectedBranchId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedBranchId(val ? Number(val) : null);
              }}
              className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">지사를 선택하세요</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          {selectedBranchId !== null && (
            <Button
              size="sm"
              variant="outline"
              className="mt-6 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => setShowBulkSurcharge(true)}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              추가금 일괄 설정
            </Button>
          )}
        </div>
      </div>

      {/* Default surcharge info */}
      {selectedBranchId !== null && selectedBranch && (selectedBranch.defaultSurcharge ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          기본 추가금: <span className="font-semibold">+{(selectedBranch.defaultSurcharge ?? 0).toLocaleString()}원</span>
          <span className="text-xs text-amber-600 ml-2">(상품별 추가금 미설정 시 적용)</span>
        </div>
      )}

      {/* Branch Products */}
      {selectedBranchId === null ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-slate-400">지사를 선택하면 해당 지사의 상품 설정을 관리할 수 있습니다.</p>
        </div>
      ) : loadingProducts ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
          <p className="text-sm text-slate-400 mt-3">상품 목록 로딩 중...</p>
        </div>
      ) : branchProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400">이 지사에 대한 상품 설정이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-center px-2 py-3 font-medium text-slate-600 w-14">이미지</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-16">코드</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600">상품명 (지사용)</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-24">기본가</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">판매가</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-14">노출</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-14">저장</th>
                </tr>
              </thead>
              <tbody>
                {branchProducts.map((bp) => {
                  const isSaving = savingIds.has(bp.id);
                  const editedPrice = editedPrices[bp.id];
                  const editedName = editedNames[bp.id];
                  const displayPrice = bp.sellingPrice ?? bp.basePrice;
                  const nameValue = editedName !== undefined ? editedName : (bp.customName || bp.name);
                  const hasChanges =
                    (editedPrice !== undefined && Number(editedPrice.replace(/[^0-9]/g, '')) !== displayPrice) ||
                    (editedName !== undefined && editedName !== (bp.customName || bp.name));

                  return (
                    <tr key={bp.id} className={`border-b border-slate-100 last:border-0 ${!bp.isVisible ? 'opacity-50' : ''}`}>
                      <td className="px-2 py-2 text-center">
                        {bp.imageUrl ? (
                          <div className="relative w-10 h-10 rounded-md overflow-hidden border border-slate-200 mx-auto">
                            <Image
                              src={photoUrl(bp.imageUrl)}
                              alt={bp.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center mx-auto">
                            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{bp.sku}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          value={nameValue}
                          onChange={(e) =>
                            setEditedNames((prev) => ({ ...prev, [bp.id]: e.target.value }))
                          }
                          className="w-full text-sm"
                          disabled={isSaving}
                          placeholder={bp.name}
                        />
                      </td>
                      <td className="px-3 py-3 text-right text-slate-500 whitespace-nowrap">
                        {bp.basePrice.toLocaleString()}원
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={
                            editedPrice !== undefined
                              ? editedPrice
                              : displayPrice.toLocaleString('ko-KR')
                          }
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            setEditedPrices((prev) => ({ ...prev, [bp.id]: raw }));
                          }}
                          onBlur={() => {
                            const raw = editedPrices[bp.id];
                            if (raw !== undefined) {
                              const num = Number(raw);
                              if (num === displayPrice) {
                                setEditedPrices((prev) => {
                                  const next = { ...prev };
                                  delete next[bp.id];
                                  return next;
                                });
                              } else {
                                setEditedPrices((prev) => ({
                                  ...prev,
                                  [bp.id]: num.toLocaleString('ko-KR'),
                                }));
                              }
                            }
                          }}
                          onFocus={() => {
                            const raw = editedPrices[bp.id];
                            if (raw !== undefined) {
                              setEditedPrices((prev) => ({
                                ...prev,
                                [bp.id]: raw.replace(/[^0-9]/g, ''),
                              }));
                            } else {
                              setEditedPrices((prev) => ({
                                ...prev,
                                [bp.id]: String(displayPrice),
                              }));
                            }
                          }}
                          className="w-28 ml-auto text-right"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleToggleVisibility(bp)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center"
                        >
                          <span
                            role="switch"
                            aria-checked={bp.isVisible}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              bp.isVisible ? 'bg-emerald-600' : 'bg-slate-300'
                            } ${isSaving ? 'opacity-50' : ''}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                bp.isVisible ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {hasChanges && (
                          <Button
                            size="sm"
                            onClick={() => handleSave(bp)}
                            disabled={isSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3"
                          >
                            {isSaving ? '...' : '저장'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Surcharge Modal */}
      {showBulkSurcharge && selectedBranchId !== null && (
        <BulkSurchargeModal
          branchId={selectedBranchId}
          currentDefault={selectedBranch?.defaultSurcharge ?? 0}
          onClose={() => setShowBulkSurcharge(false)}
          onSaved={handleBulkSurchargeSaved}
        />
      )}
    </div>
  );
}

function BulkSurchargeModal({
  branchId,
  currentDefault,
  onClose,
  onSaved,
}: {
  branchId: number;
  currentDefault: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'default' | 'product'>('default');
  const [defaultSurcharge, setDefaultSurcharge] = useState(currentDefault);
  const [productSurcharge, setProductSurcharge] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'default') {
        await api(`/admin/branches/${branchId}`, {
          method: 'PATCH',
          body: JSON.stringify({ defaultSurcharge }),
        });
        toast.success('기본 추가금이 설정되었습니다');
      } else {
        await api(`/admin/catalog/branches/${branchId}/products/bulk-surcharge`, {
          method: 'PATCH',
          body: JSON.stringify({ surcharge: productSurcharge }),
        });
        toast.success('상품 추가금이 일괄 변경되었습니다');
      }
      onSaved();
    } catch {
      toast.error('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>추가금 일괄 설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('default')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                mode === 'default'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300'
              }`}
            >
              기본 추가금
            </button>
            <button
              onClick={() => setMode('product')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                mode === 'product'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300'
              }`}
            >
              상품별 추가금 일괄
            </button>
          </div>

          {mode === 'default' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                상품별 추가금이 설정되지 않은 상품에 기본 적용되는 추가금입니다.
              </p>
              <div>
                <Label htmlFor="defaultSurcharge" className="text-sm font-medium text-slate-700">
                  기본 추가금 (원)
                </Label>
                <Input
                  id="defaultSurcharge"
                  type="number"
                  value={defaultSurcharge}
                  onChange={(e) => setDefaultSurcharge(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                모든 상품의 개별 추가금을 입력한 금액으로 일괄 변경합니다.
              </p>
              <div>
                <Label htmlFor="productSurcharge" className="text-sm font-medium text-slate-700">
                  추가금 (원)
                </Label>
                <Input
                  id="productSurcharge"
                  type="number"
                  value={productSurcharge}
                  onChange={(e) => setProductSurcharge(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              취소
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
