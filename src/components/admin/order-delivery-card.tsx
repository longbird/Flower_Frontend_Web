'use client';

import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  uploadAdminProof,
  listAdminProofs,
  updateAdminRecipientInfo,
  type ProofType,
} from '@/lib/api/admin-orders';
import type { ProofItem } from '@/lib/types/partner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function proofUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

/**
 * ISO 문자열(`2025-12-22T16:07:00Z` 등)을 datetime-local input 형식(`YYYY-MM-DDTHH:mm`)으로 변환.
 * 단순 slice는 Z 접미사 있을 때 UTC→로컬 변환을 건너뛰어 시간이 틀린다.
 */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface OrderDeliveryCardProps {
  orderId: number;
  initialRecipientName?: string | null;
  initialReceivedAt?: string | null;
  initialRecipientRelationship?: string | null;
}

export function OrderDeliveryCard({
  orderId,
  initialRecipientName,
  initialReceivedAt,
  initialRecipientRelationship,
}: OrderDeliveryCardProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProofType>('DELIVERY_PHOTO');

  const [recipientName, setRecipientName] = useState(initialRecipientName ?? '');
  const [receivedAt, setReceivedAt] = useState(isoToLocalInput(initialReceivedAt));
  const [relationship, setRelationship] = useState(initialRecipientRelationship ?? '');

  useEffect(() => {
    if (initialRecipientName != null) setRecipientName(initialRecipientName);
    if (initialReceivedAt != null) setReceivedAt(isoToLocalInput(initialReceivedAt));
    if (initialRecipientRelationship != null) setRelationship(initialRecipientRelationship);
  }, [initialRecipientName, initialReceivedAt, initialRecipientRelationship]);

  const { data: proofsRes } = useQuery({
    queryKey: ['admin-order-proofs', orderId],
    queryFn: () => listAdminProofs(orderId),
  });

  const proofs: ProofItem[] = proofsRes?.items ?? [];
  const deliveryPhotos = proofs.filter((p) => p.proofType === 'DELIVERY_PHOTO');
  const scenePhotos = proofs.filter((p) => p.proofType === 'SCENE_PHOTO');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAdminProof(orderId, file, activeTab);
      toast.success('사진이 업로드되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-order-proofs', orderId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const saveRecipient = useMutation({
    mutationFn: () =>
      updateAdminRecipientInfo(orderId, {
        name: recipientName,
        receivedAt: receivedAt ? new Date(receivedAt).toISOString() : '',
        relationship,
      }),
    onSuccess: () => {
      toast.success('인수자 정보가 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-order', String(orderId)] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : '저장 실패');
    },
  });

  const activePhotos = activeTab === 'DELIVERY_PHOTO' ? deliveryPhotos : scenePhotos;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">배송 사진 / 인수자 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 탭 */}
        <div className="flex gap-2 border-b border-slate-200">
          <TabButton
            active={activeTab === 'DELIVERY_PHOTO'}
            onClick={() => setActiveTab('DELIVERY_PHOTO')}
          >
            배송사진 ({deliveryPhotos.length})
          </TabButton>
          <TabButton
            active={activeTab === 'SCENE_PHOTO'}
            onClick={() => setActiveTab('SCENE_PHOTO')}
          >
            현장사진 ({scenePhotos.length})
          </TabButton>
          <div className="flex-1" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '업로드 중...' : '사진 추가'}
          </Button>
        </div>

        {/* 사진 그리드 */}
        {activePhotos.length === 0 ? (
          <div className="text-center py-8 text-slate-300 text-sm">
            등록된 사진이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activePhotos.map((p, i) => (
              <div
                key={`${p.fileUrl}-${i}`}
                className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"
              >
                <Image
                  src={proofUrl(p.fileUrl)}
                  alt={`${activeTab === 'DELIVERY_PHOTO' ? '배송' : '현장'}사진 ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="33vw"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        {/* 인수자 폼 */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">인수자 정보</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="recipientName" className="text-xs">인수자명</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="홍길동"
              />
            </div>
            <div>
              <Label htmlFor="receivedAt" className="text-xs">인수시간</Label>
              <Input
                id="receivedAt"
                type="datetime-local"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="relationship" className="text-xs">관계</Label>
              <Input
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="본인/가족/친척 등"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => saveRecipient.mutate()}
              disabled={saveRecipient.isPending}
            >
              {saveRecipient.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 transition-colors ${
        active
          ? 'border-emerald-500 text-emerald-700 font-medium'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
