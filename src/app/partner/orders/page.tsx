'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAssignedOrders,
  acceptOrder,
  updateOrderStatus,
} from '@/lib/api/partner';
import type { PartnerOrder } from '@/lib/types/partner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const STATUS_TABS: { value: string; label: string; statuses: string }[] = [
  { value: 'new', label: '신규', statuses: 'ASSIGNED' },
  { value: 'progress', label: '진행중', statuses: 'IN_PROGRESS' },
  { value: 'done', label: '완료', statuses: 'DONE' },
];

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: '배정됨',
  ACCEPTED: '수락',
  IN_PROGRESS: '진행중',
  DELIVERING: '배송중',
  DONE: '완료',
  CANCELLED: '취소',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ASSIGNED: 'default',
  ACCEPTED: 'default',
  IN_PROGRESS: 'default',
  DELIVERING: 'default',
  DONE: 'secondary',
  CANCELLED: 'destructive',
};

const CARD_BORDER_COLORS: Record<string, string> = {
  ASSIGNED: 'border-l-blue-500',
  ACCEPTED: 'border-l-purple-500',
  IN_PROGRESS: 'border-l-amber-500',
  DELIVERING: 'border-l-orange-500',
  DONE: 'border-l-emerald-500',
  CANCELLED: 'border-l-red-400',
};

export default function PartnerOrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('new');

  const currentStatuses = STATUS_TABS.find((t) => t.value === activeTab)?.statuses || 'ASSIGNED';

  const { data, isLoading } = useQuery({
    queryKey: ['partnerOrders', currentStatuses],
    queryFn: () => getAssignedOrders(currentStatuses),
  });

  const orders = data?.orders ?? [];

  const acceptMutation = useMutation({
    mutationFn: acceptOrder,
    onSuccess: () => {
      toast.success('주문을 수락했습니다.');
      queryClient.invalidateQueries({ queryKey: ['partnerOrders'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수락 실패'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, toStatus }: { orderId: number; toStatus: string }) =>
      updateOrderStatus(orderId, toStatus),
    onSuccess: () => {
      toast.success('상태가 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['partnerOrders'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '상태 변경 실패'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">주문 목록</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 bg-slate-100 rounded-xl p-1 h-auto">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg text-sm font-medium py-2.5 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-3 animate-fade-in">
            {isLoading && (
              <div className="text-center py-8 text-slate-400">로딩 중...</div>
            )}
            {!isLoading && orders.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <div className="text-3xl mb-2">📭</div>
                <p>주문이 없습니다.</p>
              </div>
            )}
            {orders.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                onAccept={() => acceptMutation.mutate(order.orderId)}
                onStatusChange={(toStatus) =>
                  statusMutation.mutate({ orderId: order.orderId, toStatus })
                }
                accepting={acceptMutation.isPending}
              />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function OrderCard({
  order,
  onAccept,
  onStatusChange,
  accepting,
}: {
  order: PartnerOrder;
  onAccept: () => void;
  onStatusChange: (status: string) => void;
  accepting: boolean;
}) {
  return (
    <Card className={cn(
      'border-l-4 shadow-sm hover:shadow-md transition-all duration-200',
      CARD_BORDER_COLORS[order.status] || 'border-l-slate-300'
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_COLORS[order.status] || 'default'}>
              {STATUS_LABELS[order.status] || order.status}
            </Badge>
            {order.desiredDate && (
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{order.desiredDate}</span>
            )}
          </div>
          <span className="text-sm font-mono text-slate-400">
            #{order.orderId}
          </span>
        </div>

        <div className="space-y-1.5 break-words">
          <div className="font-semibold text-slate-900">{order.receiverName}</div>
          <div className="text-sm text-slate-500 flex gap-1.5 items-start">
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span>{order.address1}{order.address2 ? ` ${order.address2}` : ''}</span>
          </div>
          {order.receiverPhone && (
            <div className="text-sm text-slate-400">{order.receiverPhone}</div>
          )}
          {order.memo && (
            <div className="text-sm text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 italic border border-amber-100">{order.memo}</div>
          )}
        </div>

        {order.amountTotal && (
          <div className="text-sm font-semibold text-emerald-700">
            {order.amountTotal.toLocaleString()}원
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link href={`/partner/orders/${order.orderId}`}>
            <Button variant="outline" className="w-full min-h-[44px] text-sm border-slate-200 hover:bg-slate-50">
              상세보기
            </Button>
          </Link>

          {order.status === 'ASSIGNED' && (
            <Button
              className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 font-medium shadow-sm"
              onClick={onAccept}
              disabled={accepting}
            >
              수락
            </Button>
          )}

          {order.status === 'ACCEPTED' && (
            <Button
              className="min-h-[44px] bg-blue-600 hover:bg-blue-700 font-medium shadow-sm"
              onClick={() => onStatusChange('IN_PROGRESS')}
            >
              제작 시작
            </Button>
          )}

          {order.status === 'IN_PROGRESS' && (
            <Button
              className="min-h-[44px] bg-amber-600 hover:bg-amber-700 font-medium shadow-sm"
              onClick={() => onStatusChange('DELIVERING')}
            >
              배송 시작
            </Button>
          )}

          {order.status === 'DELIVERING' && (
            <Button
              className="min-h-[44px] bg-purple-600 hover:bg-purple-700 font-medium shadow-sm"
              onClick={() => onStatusChange('DONE')}
            >
              배송 완료
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
