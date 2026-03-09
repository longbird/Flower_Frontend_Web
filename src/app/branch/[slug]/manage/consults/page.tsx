'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchConsultRequests, updateConsultRequestStatus } from '@/lib/branch/branch-api';
import type { ConsultRequest } from '@/lib/branch/types';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: '신규', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  IN_PROGRESS: { label: '처리중', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  COMPLETED: { label: '완료', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  CANCELLED: { label: '취소', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function ConsultCard({
  consult,
  onStatusChange,
}: {
  consult: ConsultRequest;
  onStatusChange: (id: number, status: string) => void;
}) {
  const statusInfo = STATUS_LABELS[consult.status] || STATUS_LABELS.NEW;
  const transitions = STATUS_TRANSITIONS[consult.status] || [];

  return (
    <div className="bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)]/50 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-medium text-[var(--branch-text)]">
            {consult.customerName}
          </h3>
          <a
            href={`tel:${consult.customerPhone}`}
            className="text-sm text-[var(--branch-accent)] hover:underline"
          >
            {formatPhone(consult.customerPhone)}
          </a>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.bg} ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm">
        {consult.productName && (
          <div className="flex gap-2">
            <span className="text-[var(--branch-text-light)] shrink-0">상품:</span>
            <span className="text-[var(--branch-text)]">{consult.productName}</span>
          </div>
        )}
        {consult.desiredDate && (
          <div className="flex gap-2">
            <span className="text-[var(--branch-text-light)] shrink-0">희망일:</span>
            <span className="text-[var(--branch-text)]">{consult.desiredDate}</span>
          </div>
        )}
        {consult.message && (
          <div className="mt-2 p-3 rounded-xl bg-[var(--branch-cream)] text-sm text-[var(--branch-text)] leading-relaxed">
            {consult.message}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--branch-rose-light)]/30">
        <span className="text-xs text-[var(--branch-text-light)]">
          {formatDate(consult.createdAt)}
        </span>
        <div className="flex gap-2">
          {transitions.map((nextStatus) => {
            const info = STATUS_LABELS[nextStatus];
            return (
              <button
                key={nextStatus}
                onClick={() => onStatusChange(consult.id, nextStatus)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:shadow-sm ${
                  nextStatus === 'CANCELLED'
                    ? 'border-slate-300 text-slate-500 hover:bg-slate-100'
                    : 'border-[var(--branch-accent)] text-[var(--branch-accent)] hover:bg-[var(--branch-accent)] hover:text-white'
                }`}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ConsultsPage() {
  const [consults, setConsults] = useState<ConsultRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadConsults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchConsultRequests({
        status: statusFilter || undefined,
        page,
        size: pageSize,
      });
      setConsults(res.data);
      setTotal(res.total);
    } catch {
      // auth error handled by store
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadConsults();
  }, [loadConsults]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateConsultRequestStatus(id, newStatus);
      // Refresh list
      loadConsults();
    } catch (err) {
      alert(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const filterOptions = [
    { value: '', label: '전체' },
    { value: 'NEW', label: '신규' },
    { value: 'IN_PROGRESS', label: '처리중' },
    { value: 'COMPLETED', label: '완료' },
    { value: 'CANCELLED', label: '취소' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--branch-text)]">상담 요청 관리</h1>
        <p className="text-sm text-[var(--branch-text-light)] mt-1 font-light">
          고객의 상담 요청을 확인하고 처리하세요. (총 {total}건)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? 'bg-[var(--branch-accent)] text-white shadow-sm'
                : 'bg-[var(--branch-white)] text-[var(--branch-text-light)] border border-[var(--branch-rose-light)] hover:border-[var(--branch-accent)] hover:text-[var(--branch-accent)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 animate-pulse">🌸</div>
          <p className="text-sm text-[var(--branch-text-light)] font-light">로딩 중...</p>
        </div>
      ) : consults.length === 0 ? (
        <div className="text-center py-16 bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)]/50">
          <div className="text-5xl mb-4 opacity-40">📋</div>
          <p className="text-[var(--branch-text-light)] font-light">
            {statusFilter ? '해당 상태의 상담 요청이 없습니다.' : '아직 상담 요청이 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {consults.map((c) => (
              <ConsultCard
                key={c.id}
                consult={c}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-full text-sm border border-[var(--branch-rose-light)] text-[var(--branch-text-light)] hover:border-[var(--branch-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm text-[var(--branch-text)]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-full text-sm border border-[var(--branch-rose-light)] text-[var(--branch-text-light)] hover:border-[var(--branch-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
