'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchMyBranchInfo, updateMyBranchInfo, type MyBranchInfo } from '@/lib/branch/branch-api';

export default function BranchSettingsPage() {
  const [info, setInfo] = useState<MyBranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [serviceAreas, setServiceAreas] = useState('');
  const [virtualAccountBank, setVirtualAccountBank] = useState('');
  const [virtualAccountNumber, setVirtualAccountNumber] = useState('');

  const loadInfo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchMyBranchInfo();
      if (res.ok && res.data) {
        setInfo(res.data);
        setPhone(res.data.phone || '');
        setAddress(res.data.address || '');
        setDescription(res.data.description || '');
        setServiceAreas(res.data.serviceAreas || '');
        setVirtualAccountBank(res.data.virtualAccountBank || '');
        setVirtualAccountNumber(res.data.virtualAccountNumber || '');
      }
    } catch {
      setMessage({ type: 'error', text: '정보를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await updateMyBranchInfo({
        phone,
        address,
        description,
        serviceAreas,
        virtualAccountBank,
        virtualAccountNumber,
      });
      if (res.ok && res.data) {
        setInfo(res.data);
        setMessage({ type: 'success', text: '저장되었습니다.' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '저장에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--branch-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="text-center py-20 text-[var(--branch-text-light)]">
        정보를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-[var(--branch-text)] mb-6">기본 정보 설정</h1>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)] p-5 space-y-5">
        {/* 지사명 (읽기전용) */}
        <div>
          <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
            지사명
          </label>
          <div className="px-4 py-2.5 rounded-xl bg-[var(--branch-cream)] text-[var(--branch-text)] text-sm">
            {info.name}
          </div>
        </div>

        {/* 코드 (읽기전용) */}
        {info.code && (
          <div>
            <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
              지사 코드
            </label>
            <div className="px-4 py-2.5 rounded-xl bg-[var(--branch-cream)] text-[var(--branch-text)] text-sm">
              {info.code}
            </div>
          </div>
        )}

        {/* 전화번호 */}
        <div>
          <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
            전화번호
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="예: 031-123-4567"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--branch-rose-light)] bg-white text-[var(--branch-text)] text-sm focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20"
          />
        </div>

        {/* 주소 */}
        <div>
          <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
            주소
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="사무실 주소"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--branch-rose-light)] bg-white text-[var(--branch-text)] text-sm focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20"
          />
        </div>

        {/* 소개글 */}
        <div>
          <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
            소개글
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="홈페이지에 표시되는 지사 소개글"
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--branch-rose-light)] bg-white text-[var(--branch-text)] text-sm focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 resize-none"
          />
        </div>

        {/* 서비스 지역 */}
        <div>
          <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
            서비스 지역
          </label>
          <input
            type="text"
            value={serviceAreas}
            onChange={(e) => setServiceAreas(e.target.value)}
            placeholder="콤마로 구분 (예: 서울, 경기 북부)"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--branch-rose-light)] bg-white text-[var(--branch-text)] text-sm focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20"
          />
          <p className="mt-1 text-xs text-[var(--branch-text-light)]">
            홈페이지 상단에 표시됩니다.
          </p>
        </div>

        {/* 가상계좌 */}
        <div className="border-t border-[var(--branch-rose-light)] pt-5">
          <h3 className="text-sm font-medium text-[var(--branch-text)] mb-3">입금 계좌 정보</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">은행명</label>
              <input
                type="text"
                value={virtualAccountBank}
                onChange={(e) => setVirtualAccountBank(e.target.value)}
                placeholder="예: 국민은행"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--branch-rose-light)] bg-white text-[var(--branch-text)] text-sm focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">계좌번호</label>
              <input
                type="text"
                value={virtualAccountNumber}
                onChange={(e) => setVirtualAccountNumber(e.target.value)}
                placeholder="예: 123-456-789012"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--branch-rose-light)] bg-white text-[var(--branch-text)] text-sm focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20"
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-[var(--branch-text-light)]">
            홈페이지 하단에 표시됩니다.
          </p>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-[var(--branch-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
