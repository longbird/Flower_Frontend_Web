'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Branch, BranchProduct } from './types';

export function BranchSettingsTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<number, string>>({});
  const [editedNames, setEditedNames] = useState<Record<number, string>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await api<Branch[] | { ok: boolean; data: Branch[] }>('/admin/branches');
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
          className="mt-2 w-full max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">지사를 선택하세요</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

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
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-16">코드</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">상품명 (지사용)</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-28">기본가</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-36">판매가</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-16">노출</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-16">저장</th>
                </tr>
              </thead>
              <tbody>
                {branchProducts.map((bp) => {
                  const isSaving = savingIds.has(bp.id);
                  const editedPrice = editedPrices[bp.id];
                  const editedName = editedNames[bp.id];
                  const displayPrice = bp.sellingPrice ?? bp.basePrice;
                  const priceValue = editedPrice !== undefined ? editedPrice : String(displayPrice);
                  const nameValue = editedName !== undefined ? editedName : (bp.customName || bp.name);
                   const hasChanges =
                    (editedPrice !== undefined && Number(editedPrice.replace(/[^0-9]/g, '')) !== displayPrice) ||
                    (editedName !== undefined && editedName !== (bp.customName || bp.name));

                  return (
                    <tr key={bp.id} className={`border-b border-slate-100 last:border-0 ${!bp.isVisible ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{bp.sku}</span>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                        {bp.basePrice.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-right">
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
                          className="w-32 ml-auto text-right"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
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
                      <td className="px-4 py-3 text-center">
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
    </div>
  );
}
