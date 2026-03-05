'use client';

import { use, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  getPartnerOrderDetail,
  acceptOrder,
  updateOrderStatus,
  presignProof,
  uploadToPresignedUrl,
  completeProof,
  listProofs,
} from '@/lib/api/partner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: '배정됨',
  ACCEPTED: '수락',
  IN_PROGRESS: '진행중',
  DELIVERING: '배송중',
  DONE: '완료',
  CANCELLED: '취소',
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function proofUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function PartnerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const orderId = Number(idStr);
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: orderRes, isLoading } = useQuery({
    queryKey: ['partnerOrder', orderId],
    queryFn: () => getPartnerOrderDetail(orderId),
    enabled: !isNaN(orderId),
  });

  const { data: proofsRes } = useQuery({
    queryKey: ['partnerProofs', orderId],
    queryFn: () => listProofs(orderId),
    enabled: !isNaN(orderId),
  });

  const order = orderRes?.item;
  const proofs = proofsRes?.items ?? [];

  const acceptMutation = useMutation({
    mutationFn: () => acceptOrder(orderId),
    onSuccess: () => {
      toast.success('주문을 수락했습니다.');
      queryClient.invalidateQueries({ queryKey: ['partnerOrder', orderId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수락 실패'),
  });

  const statusMutation = useMutation({
    mutationFn: (toStatus: string) => updateOrderStatus(orderId, toStatus),
    onSuccess: () => {
      toast.success('상태가 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['partnerOrder', orderId] });
      queryClient.invalidateQueries({ queryKey: ['partnerOrders'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '변경 실패'),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const presignRes = await presignProof(orderId, file.name, file.type, file.size);
      await uploadToPresignedUrl(presignRes.uploadUrl, file, presignRes.headers);
      await completeProof(orderId, 'DELIVERY_PHOTO', presignRes.fileUrl, presignRes.fileKey);
      toast.success('증빙 사진이 업로드되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['partnerProofs', orderId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-slate-400">로딩 중...</div>;
  }

  if (!order) {
    return <div className="text-center py-8 text-red-500">주문을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="ghost"
            className="h-10 px-3 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            onClick={() => router.back()}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            목록
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">주문 #{order.orderId}</h1>
          </div>
          <Badge className="text-sm px-3 py-1">{STATUS_LABELS[order.status] || order.status}</Badge>
        </div>
      </div>

      {/* Order Info */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-700">배송 정보</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2.5 break-words">
          <div className="flex gap-2">
            <span className="text-slate-400 w-14 flex-shrink-0">수취인</span>
            <span className="font-medium text-slate-900">{order.receiverName}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400 w-14 flex-shrink-0">연락처</span>
            <span>{order.receiverPhone || '-'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400 w-14 flex-shrink-0">주소</span>
            <span>{order.address1} {order.address2}</span>
          </div>
          {order.desiredDate && (
            <div className="flex gap-2">
              <span className="text-slate-400 w-14 flex-shrink-0">배송일</span>
              <span className="text-emerald-700 font-medium">{order.desiredDate} {order.desiredTimeSlot}</span>
            </div>
          )}
          {order.deliveryMemo && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-amber-700 italic text-sm mt-2">
              {order.deliveryMemo}
            </div>
          )}
          {order.amountTotal && (
            <div className="flex gap-2 pt-1">
              <span className="text-slate-400 w-14 flex-shrink-0">금액</span>
              <span className="text-lg font-bold text-emerald-700">{order.amountTotal.toLocaleString()}원</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {order.status === 'ASSIGNED' && (
          <Button
            className="flex-1 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 font-medium shadow-lg shadow-emerald-600/20 text-base"
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
          >
            주문 수락
          </Button>
        )}
        {order.status === 'ACCEPTED' && (
          <Button
            className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20 text-base"
            onClick={() => statusMutation.mutate('IN_PROGRESS')}
            disabled={statusMutation.isPending}
          >
            제작 시작
          </Button>
        )}
        {order.status === 'IN_PROGRESS' && (
          <Button
            className="flex-1 min-h-[48px] bg-amber-600 hover:bg-amber-700 font-medium shadow-lg shadow-amber-600/20 text-base"
            onClick={() => statusMutation.mutate('DELIVERING')}
            disabled={statusMutation.isPending}
          >
            배송 시작
          </Button>
        )}
        {order.status === 'DELIVERING' && (
          <Button
            className="flex-1 min-h-[48px] bg-purple-600 hover:bg-purple-700 font-medium shadow-lg shadow-purple-600/20 text-base"
            onClick={() => statusMutation.mutate('DONE')}
            disabled={statusMutation.isPending}
          >
            배송 완료
          </Button>
        )}
      </div>

      {/* Evidence Photos */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base text-slate-700">증빙 사진</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">배송 완료 후 증빙 사진을 첨부해주세요</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button
              size="sm"
              className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '업로드 중...' : '사진 추가'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {proofs.length === 0 ? (
            <div className="text-center py-8 text-slate-300">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-sm">등록된 증빙 사진이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {proofs.map((proof, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <Image
                    src={proofUrl(proof.fileUrl)}
                    alt={`증빙 ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="33vw"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Log */}
      {orderRes?.events && orderRes.events.length > 0 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-700">이벤트 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {orderRes.events.map((ev, i) => (
                <div key={i} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50 mt-1.5" />
                    {i < (orderRes.events?.length || 0) - 1 && (
                      <div className="w-px flex-1 bg-slate-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{ev.eventType}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(ev.eventAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
