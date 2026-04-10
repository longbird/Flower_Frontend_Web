'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CustomerLinkCard } from '@/components/admin/customer-link-card';
import { resendOrderPublicLink } from '@/lib/api/admin';

// ─── Orders Tab ─────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'UNCONFIRMED', label: '미확인' },
  { value: 'RECEIVED', label: '접수' },
  { value: 'PENDING', label: '대기' },
  { value: 'CONFIRMED', label: '확인' },
  { value: 'ASSIGNED', label: '배정' },
  { value: 'ACCEPTED', label: '수락' },
  { value: 'PREPARING', label: '준비중' },
  { value: 'DELIVERING', label: '배송중' },
  { value: 'DELIVERED', label: '배송완료' },
  { value: 'CANCELED', label: '취소' },
];

const STATUS_LABELS: Record<string, string> = {
  UNCONFIRMED: '미확인', RECEIVED: '접수', PENDING: '대기', CONFIRMED: '확인',
  ASSIGNED: '배정', ACCEPTED: '수락', PREPARING: '준비중', DELIVERING: '배송중',
  DELIVERED: '배송완료', CANCELED: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  UNCONFIRMED: 'bg-gray-100 text-gray-800',
  RECEIVED: 'bg-sky-100 text-sky-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  ACCEPTED: 'bg-violet-100 text-violet-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  DELIVERING: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-[#E8F0E0] text-[#3D5229]',
  CANCELED: 'bg-red-100 text-red-800',
};

// ─── Branch Consult Tab ─────────────────────────────────────────

const CONSULT_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'NEW', label: '신규' },
  { value: 'IN_PROGRESS', label: '처리중' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELLED', label: '취소' },
];

const CONSULT_STATUS_LABELS: Record<string, string> = {
  NEW: '신규', IN_PROGRESS: '처리중', COMPLETED: '완료', CANCELLED: '취소',
};

const CONSULT_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-[#E8F0E0] text-[#3D5229]',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

function formatPhone(phone: string) {
  if (!phone) return '-';
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function proxyImageUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

function parseOrderMessage(msg: string | null) {
  if (!msg) return null;
  const tags: Record<string, string> = {};
  for (const line of msg.split('\n')) {
    const m = line.match(/^\[(.+?)\]\s*(.*)$/);
    if (m) tags[m[1]] = m[2].trim();
  }
  if (Object.keys(tags).length === 0) return null;
  return tags;
}

const CATEGORY_LABELS: Record<string, string> = {
  CELEBRATION: '축하', CONDOLENCE: '근조', OBJET: '오브제',
  ORIENTAL: '동양란', WESTERN: '서양란', FLOWER: '꽃',
  FOLIAGE: '관엽', RICE: '쌀', FRUIT: '과일', OTHER: '기타',
};

const CONSULT_CARD_BORDER: Record<string, string> = {
  NEW: 'border-l-blue-500',
  IN_PROGRESS: 'border-l-amber-500',
  COMPLETED: 'border-l-green-500',
  CANCELLED: 'border-l-slate-300',
};

// ─── Branch Consults Panel ──────────────────────────────────────

function BranchConsultsPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['branch-consults', page, query, status],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('size', String(pageSize));
      if (query) sp.set('q', query);
      if (status) sp.set('status', status);
      const res = await fetch(`/api/admin/branch-consults?${sp.toString()}`);
      if (!res.ok) return { items: [], total: 0, page: 1, size: pageSize };
      return res.json();
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      await fetch('/api/admin/branch-consults', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      queryClient.invalidateQueries({ queryKey: ['branch-consults'] });
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <select
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm bg-white"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {CONSULT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
            <Input placeholder="검색 (주문자, 전화번호, 상품명, 지사명)" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 border-slate-200" />
            <Button type="submit" size="sm" className="bg-[#5B7A3D] hover:bg-[#4A6830] shrink-0">검색</Button>
          </form>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-12 text-slate-400">지사 주문 요청이 없습니다.</div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item: any) => {
            const isExpanded = expandedId === item.id;
            const statusInfo = CONSULT_STATUS_LABELS[item.status] || item.status;
            const borderColor = CONSULT_CARD_BORDER[item.status] || 'border-l-slate-300';
            const parsed = parseOrderMessage(item.message);
            const imgSrc = item.productImageUrl ? proxyImageUrl(item.productImageUrl) : '';

            return (
              <div key={item.id} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${borderColor} shadow-sm overflow-hidden`}>
                {/* Header */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {/* Product thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                    {imgSrc ? (
                      <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-slate-100 text-slate-600 text-[10px]">{item.branchName}</Badge>
                      <span className="font-semibold text-sm text-slate-900">{item.customerName}</span>
                      <Badge className={cn('text-[10px]', CONSULT_STATUS_COLORS[item.status] || 'bg-slate-100')}>
                        {statusInfo}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{formatPhone(item.customerPhone)}</span>
                      {item.productName && <span className="truncate">{item.productName}</span>}
                      {item.productCategory && <span className="text-slate-400">{CATEGORY_LABELS[item.productCategory] || item.productCategory}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{item.desiredDate ? new Date(item.desiredDate).toLocaleDateString('ko-KR') : '날짜 미정'}</span>
                      {item.productSellingPrice && <span className="font-medium text-slate-600">{Number(item.productSellingPrice).toLocaleString()}원</span>}
                    </div>
                  </div>

                  {/* Date + Chevron */}
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400">{formatDate(item.createdAt)}</div>
                    <svg className={cn('w-4 h-4 text-slate-400 mt-1 ml-auto transition-transform', isExpanded && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50 space-y-3">
                    {/* Parsed structured info */}
                    {parsed && (
                      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {parsed['주문자'] && (
                          <div className="flex gap-3 px-3 py-2">
                            <span className="text-xs text-slate-400 w-16 shrink-0">주문자</span>
                            <span className="text-sm text-slate-700">{parsed['주문자']}</span>
                          </div>
                        )}
                        {parsed['받는분'] && (
                          <div className="flex gap-3 px-3 py-2">
                            <span className="text-xs text-slate-400 w-16 shrink-0">받는분</span>
                            <span className="text-sm text-slate-700">{parsed['받는분']}</span>
                          </div>
                        )}
                        {parsed['배송일시'] && (
                          <div className="flex gap-3 px-3 py-2">
                            <span className="text-xs text-slate-400 w-16 shrink-0">배송일시</span>
                            <span className="text-sm text-slate-700">{parsed['배송일시']}</span>
                          </div>
                        )}
                        {parsed['배송장소'] && (
                          <div className="flex gap-3 px-3 py-2">
                            <span className="text-xs text-slate-400 w-16 shrink-0">배송장소</span>
                            <span className="text-sm text-slate-700">{parsed['배송장소']}</span>
                          </div>
                        )}
                        {parsed['행사시간'] && (
                          <div className="flex gap-3 px-3 py-2">
                            <span className="text-xs text-slate-400 w-16 shrink-0">행사시간</span>
                            <span className="text-sm text-slate-700">{parsed['행사시간']}</span>
                          </div>
                        )}
                        {parsed['리본문구'] && (
                          <div className="flex gap-3 px-3 py-2">
                            <span className="text-xs text-slate-400 w-16 shrink-0">리본문구</span>
                            <span className="text-sm text-slate-700">{parsed['리본문구']}</span>
                          </div>
                        )}
                        {parsed['요청사항'] && (
                          <div className="flex gap-3 px-3 py-2">
                            <span className="text-xs text-slate-400 w-16 shrink-0">요청사항</span>
                            <span className="text-sm text-slate-700">{parsed['요청사항']}</span>
                          </div>
                        )}
                        {parsed['증빙'] && (
                          <div className="flex gap-3 px-3 py-2">
                            <span className="text-xs text-slate-400 w-16 shrink-0">증빙</span>
                            <span className="text-sm text-slate-700">{parsed['증빙']}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raw message fallback */}
                    {!parsed && item.message && (
                      <div className="text-sm text-slate-700 whitespace-pre-line bg-white rounded-lg p-3 border border-slate-200">
                        {item.message}
                      </div>
                    )}

                    {/* Product detail */}
                    {item.productFloristName && (
                      <div className="text-xs text-slate-500">
                        화원: <span className="font-medium text-slate-700">{item.productFloristName}</span>
                      </div>
                    )}

                    {/* 고객 확인 URL */}
                    <CustomerLinkCard
                      orderId={item.id}
                      targetType="CONSULT_REQUEST"
                      compact
                    />

                    {/* Status change buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-slate-500">상태 변경:</span>
                      {['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                        <button
                          key={s}
                          disabled={item.status === s || updatingId === item.id}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(item.id, s); }}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                            item.status === s
                              ? 'bg-[#5B7A3D] text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100',
                            updatingId === item.id && 'opacity-50',
                          )}
                        >
                          {CONSULT_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">총 {total}건 / {page}/{totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Order List Row (with quick resend SMS button) ─────────────

function OrderListRow({ order, onClick }: { order: any; onClick: () => void }) {
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  const handleResend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sending) return;
    setSending(true);
    setSentMsg(null);
    try {
      const res = await resendOrderPublicLink(order.id);
      setSentMsg(res.ok ? '발송됨' : (res.message || '실패'));
    } catch (err: any) {
      setSentMsg('실패');
    } finally {
      setSending(false);
      setTimeout(() => setSentMsg(null), 3000);
    }
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{order.orderNo || `#${order.id}`}</span>
              <Badge className={cn('text-[10px]', STATUS_COLORS[order.status] || 'bg-slate-100')}>
                {STATUS_LABELS[order.status] || order.status}
              </Badge>
            </div>
            <div className="text-xs text-slate-500 truncate">
              {order.receiverName || '-'} · {order.totalPrice != null ? `${Number(order.totalPrice).toLocaleString()}원` : '-'}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={sending}
              onClick={handleResend}
              className={cn(
                'px-2 py-1 text-[11px] rounded border transition-colors',
                sentMsg
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                sending && 'opacity-50',
              )}
              title="고객에게 확인 URL SMS 발송"
            >
              {sending ? '발송...' : (sentMsg || 'SMS 발송')}
            </button>
            <div className="text-xs text-slate-400">
              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ko-KR') : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'orders' | 'branch-consults'>('orders');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, query, status],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('size', String(pageSize));
      if (query) sp.set('q', query);
      if (status) sp.set('status', status);
      return api<{ items: any[]; total: number; page: number; size: number }>(`/admin/orders?${sp.toString()}`).catch(() => ({ items: [], total: 0, page: 1, size: pageSize }));
    },
    enabled: activeTab === 'orders',
  });

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">주문 관리</h1>
        {activeTab === 'orders' && (
          <Button className="bg-[#5B7A3D] hover:bg-[#4A6830]" onClick={() => router.push('/admin/order-register')}>
            주문 등록
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={cn(
            'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
            activeTab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          주문 관리
        </button>
        <button
          onClick={() => setActiveTab('branch-consults')}
          className={cn(
            'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
            activeTab === 'branch-consults' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          지사 주문 요청
        </button>
      </div>

      {/* Branch Consults Tab */}
      {activeTab === 'branch-consults' && <BranchConsultsPanel />}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <select
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm bg-white"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
                <Input placeholder="검색 (주문번호, 수령인, 전화번호)" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 border-slate-200" />
                <Button type="submit" size="sm" className="bg-[#5B7A3D] hover:bg-[#4A6830] shrink-0">검색</Button>
              </form>
            </div>
          </div>

          {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

          {!isLoading && orders.length === 0 && (
            <div className="text-center py-12 text-slate-400">주문이 없습니다.</div>
          )}

          {orders.length > 0 && (
            <div className="space-y-2">
              {orders.map((order: any) => (
                <OrderListRow key={order.id} order={order} onClick={() => router.push(`/admin/orders/${order.id}`)} />
              ))}
            </div>
          )}

          {total > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">총 {total}건 / {page}/{totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
