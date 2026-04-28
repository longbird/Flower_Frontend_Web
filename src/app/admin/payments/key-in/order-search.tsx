'use client';

import { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Input } from '@/components/ui/input';

export interface OrderSearchResult {
  id: number;
  orderNo: string;
  customerPhone: string | null;
  receiverName: string | null;
  status: string;
  totalPrice: number;
  createdAt: string;
}

interface AdminOrdersListResponse {
  items: OrderSearchResult[];
  total: number;
  page: number;
  size: number;
}

interface Props {
  onSelect: (order: OrderSearchResult) => void;
  selectedOrderId: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기',
  CONFIRMED: '확정',
  ASSIGNED: '배정',
  IN_DELIVERY: '배송중',
  DELIVERED: '배송완료',
  CANCELED: '취소',
};

function fmtPhone(phone: string | null): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

export function OrderSearch({ onSelect, selectedOrderId }: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<OrderSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('q', debounced);
        params.set('size', '10');
        const res = await api<AdminOrdersListResponse>(`/admin/orders?${params.toString()}`, {
          method: 'GET',
        });
        if (!cancelled) setResults(res.items ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">기존 주문 검색</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="고객명·받는분·전화번호 끝자리·주문번호 (2자 이상)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-gray-200 pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          검색 실패: {error}
        </div>
      )}

      {debounced.length >= 2 && !loading && results.length === 0 && !error && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs text-gray-500">
          일치하는 주문이 없습니다.
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {results.map((order) => {
            const selected = selectedOrderId === order.id;
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => onSelect(order)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {order.receiverName ?? '받는분 미정'}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {order.orderNo} · {fmtPhone(order.customerPhone)} · {fmtDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 shrink-0">
                    {order.totalPrice.toLocaleString('ko-KR')}원
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
