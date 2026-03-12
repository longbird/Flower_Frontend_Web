'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { type Branch, type Surcharge, SURCHARGE_TYPE_OPTIONS, formatPrice } from './types';

// ─── Surcharge Edit Modal ────────────────────────────────────────────────────

function SurchargeEditModal({
  surcharge,
  branches,
  onClose,
  onSaved,
}: {
  surcharge: Surcharge | null;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = surcharge === null;
  const [surchargeType, setSurchargeType] = useState(surcharge?.surchargeType || 'REGION');
  const [name, setName] = useState(surcharge?.name || '');
  const [amount, setAmount] = useState(surcharge?.amount ?? 0);
  const [branchId, setBranchId] = useState<number | null>(surcharge?.branchId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('이름을 입력하세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isCreate) {
        await api('/admin/catalog/surcharges', {
          method: 'POST',
          body: JSON.stringify({
            surchargeType,
            name: name.trim(),
            amount,
            branchId: branchId || undefined,
          }),
        });
      } else {
        await api(`/admin/catalog/surcharges/${surcharge.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            surchargeType,
            name: name.trim(),
            amount,
            branchId: branchId || null,
          }),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              {isCreate ? '추가 요금 등록' : '추가 요금 수정'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Surcharge Type */}
            <div>
              <Label htmlFor="surchargeType" className="text-sm font-medium text-slate-700">
                유형
              </Label>
              <select
                id="surchargeType"
                value={surchargeType}
                onChange={(e) => setSurchargeType(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {SURCHARGE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="surchargeName" className="text-sm font-medium text-slate-700">
                이름
              </Label>
              <Input
                id="surchargeName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 서울 강남구"
                className="mt-1"
              />
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="surchargeAmount" className="text-sm font-medium text-slate-700">
                금액 (원)
              </Label>
              <Input
                id="surchargeAmount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            {/* Branch */}
            <div>
              <Label htmlFor="surchargeBranch" className="text-sm font-medium text-slate-700">
                적용 지사
              </Label>
              <select
                id="surchargeBranch"
                value={branchId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setBranchId(val ? Number(val) : null);
                }}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">전체 지사</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                &quot;전체 지사&quot;를 선택하면 모든 지사에 적용됩니다.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? '저장 중...' : isCreate ? '등록' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Surcharges Tab ──────────────────────────────────────────────────────────

export function SurchargesTab() {
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSurcharge, setEditSurcharge] = useState<Surcharge | null | 'create'>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [surchargesRes, branchesRes] = await Promise.all([
        api<{ ok: boolean; data: Surcharge[] }>('/admin/catalog/surcharges'),
        api<Branch[] | { ok: boolean; data: Branch[] }>('/admin/branches'),
      ]);
      setSurcharges(surchargesRes.data ?? []);
      setBranches(Array.isArray(branchesRes) ? branchesRes : (branchesRes.data ?? []));
    } catch {
      // handled by auth
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId === null) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    setDeletingId(id);
    try {
      await api(`/admin/catalog/surcharges/${id}`, { method: 'DELETE' });
      loadData();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    setEditSurcharge(null);
    loadData();
  };

  const getSurchargeTypeLabel = (type: string) =>
    SURCHARGE_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
        <p className="text-sm text-slate-400 mt-3">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          지역, 장례식장, 결혼식장 등에 대한 추가 요금을 관리합니다.
        </p>
        <Button
          onClick={() => setEditSurcharge('create')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          추가 요금 등록
        </Button>
      </div>

      {surcharges.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400">등록된 추가 요금이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">유형</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">이름</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">금액</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">적용 지사</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">관리</th>
                </tr>
              </thead>
              <tbody>
                {surcharges.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.surchargeType === 'REGION'
                            ? 'bg-blue-50 text-blue-700'
                            : s.surchargeType === 'FUNERAL_HALL'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-pink-50 text-pink-700'
                        }`}
                      >
                        {getSurchargeTypeLabel(s.surchargeType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatPrice(s.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.branchId ? s.branchName || `지사 #${s.branchId}` : '전체'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditSurcharge(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="수정"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editSurcharge !== null && (
        <SurchargeEditModal
          surcharge={editSurcharge === 'create' ? null : editSurcharge}
          branches={branches}
          onClose={() => setEditSurcharge(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>추가 요금 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 추가 요금을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
