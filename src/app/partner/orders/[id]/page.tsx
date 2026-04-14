'use client';

import { use, useEffect, useRef, useState } from 'react';
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
  updatePartnerRecipientInfo,
  type PartnerRecipientInfoPayload,
} from '@/lib/api/partner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toProxyUrl as proofUrl } from '@/lib/proxy-url';

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: '배정됨',
  ACCEPTED: '수락',
  IN_PROGRESS: '진행중',
  DELIVERING: '배송중',
  DONE: '완료',
  CANCELLED: '취소',
};

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
  const [activeTab, setActiveTab] = useState<'DELIVERY_PHOTO' | 'SCENE_PHOTO'>('DELIVERY_PHOTO');
  const [recipientName, setRecipientName] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [relationship, setRelationship] = useState('');

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

  // Phase 1 BE 확장으로 order 응답에 recipient 3필드가 포함됨
  const orderWithRecipient = order as
    | (typeof order & {
        recipientActualName?: string | null;
        receivedAt?: string | null;
        recipientRelationship?: string | null;
      })
    | undefined;

  useEffect(() => {
    if (!orderWithRecipient) return;
    if (orderWithRecipient.recipientActualName != null) {
      setRecipientName(orderWithRecipient.recipientActualName);
    }
    if (orderWithRecipient.receivedAt != null) {
      const d = new Date(orderWithRecipient.receivedAt);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        setReceivedAt(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
        );
      }
    }
    if (orderWithRecipient.recipientRelationship != null) {
      setRelationship(orderWithRecipient.recipientRelationship);
    }
  }, [
    orderWithRecipient?.recipientActualName,
    orderWithRecipient?.receivedAt,
    orderWithRecipient?.recipientRelationship,
  ]);

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
      await completeProof(orderId, activeTab, presignRes.fileUrl, presignRes.fileKey);
      toast.success('증빙 사진이 업로드되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['partnerProofs', orderId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const saveRecipientMutation = useMutation({
    mutationFn: () => {
      const payload: PartnerRecipientInfoPayload = {
        name: recipientName,
        receivedAt: receivedAt ? new Date(receivedAt).toISOString() : '',
        relationship,
      };
      return updatePartnerRecipientInfo(orderId, payload);
    },
    onSuccess: () => {
      toast.success('인수자 정보가 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['partnerOrder', orderId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
  });

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
            onClick={() => {
              if (!recipientName || !receivedAt) {
                if (!window.confirm('인수자명 또는 인수시간이 비어 있습니다. 그래도 배송 완료 처리하시겠습니까?')) {
                  return;
                }
              }
              statusMutation.mutate('DONE');
            }}
            disabled={statusMutation.isPending}
          >
            배송 완료
          </Button>
        )}
      </div>

      {/* Evidence Photos */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base text-slate-700">증빙 사진 / 인수자 정보</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* 탭 + 사진 추가 */}
          <div className="flex gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('DELIVERY_PHOTO')}
              className={`px-4 py-2 text-sm border-b-2 ${
                activeTab === 'DELIVERY_PHOTO'
                  ? 'border-emerald-500 text-emerald-700 font-medium'
                  : 'border-transparent text-slate-500'
              }`}
            >
              배송사진 ({proofs.filter((p) => p.proofType === 'DELIVERY_PHOTO').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SCENE_PHOTO')}
              className={`px-4 py-2 text-sm border-b-2 ${
                activeTab === 'SCENE_PHOTO'
                  ? 'border-emerald-500 text-emerald-700 font-medium'
                  : 'border-transparent text-slate-500'
              }`}
            >
              현장사진 ({proofs.filter((p) => p.proofType === 'SCENE_PHOTO').length})
            </button>
            <div className="flex-1" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '업로드 중...' : '사진 추가'}
            </Button>
          </div>

          {/* 사진 그리드 */}
          {(() => {
            const active = proofs.filter((p) => p.proofType === activeTab);
            if (active.length === 0) {
              return (
                <div className="text-center py-8 text-slate-300 text-sm">
                  등록된 증빙 사진이 없습니다.
                </div>
              );
            }
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {active.map((proof, i) => (
                  <div
                    key={`${proof.fileUrl}-${i}`}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200"
                  >
                    <Image
                      src={proofUrl(proof.fileUrl)}
                      alt={`${activeTab === 'DELIVERY_PHOTO' ? '배송' : '현장'}사진 ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="33vw"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            );
          })()}

          {/* 인수자 정보 폼 */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">인수자 정보</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="partnerRecipientName" className="text-xs">인수자명</Label>
                <Input
                  id="partnerRecipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <Label htmlFor="partnerReceivedAt" className="text-xs">인수시간</Label>
                <Input
                  id="partnerReceivedAt"
                  type="datetime-local"
                  value={receivedAt}
                  onChange={(e) => setReceivedAt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="partnerRelationship" className="text-xs">관계</Label>
                <Input
                  id="partnerRelationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="본인/가족/친척 등"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => saveRecipientMutation.mutate()}
                disabled={saveRecipientMutation.isPending}
              >
                {saveRecipientMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
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
