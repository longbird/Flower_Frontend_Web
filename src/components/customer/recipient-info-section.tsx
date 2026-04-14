'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { resolvePhotoUrl, type CustomerOrderView, type DeliveryPhoto } from '@/lib/api/order-link';
import { formatDateTime } from '@/components/customer/_utils';

const DELIVERED_STATUSES = new Set(['DELIVERED', 'ORDER_DELIVERED']);

function PhotoGrid({
  photos,
  label,
  onOpen,
}: {
  photos: DeliveryPhoto[];
  label: string;
  onOpen: (url: string, alt: string) => void;
}) {
  if (photos.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-slate-600 mb-2">{label}</h3>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((p, i) => {
          const url = resolvePhotoUrl(p.url);
          const alt = `${label} ${i + 1}`;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(url, alt)}
              className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={`${alt} 확대 보기`}
            >
              <Image
                src={url}
                alt={alt}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhotoLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 확대"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white text-2xl flex items-center justify-center backdrop-blur-sm"
      >
        ×
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain select-none"
      />
    </div>
  );
}

export function RecipientInfoSection({ view }: { view: CustomerOrderView }) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  if (!DELIVERED_STATUSES.has(view.order.status)) return null;

  const hasPhotos = view.deliveryPhotos.length > 0 || view.scenePhotos.length > 0;
  const hasFields =
    view.order.recipientActualName || view.order.receivedAt || view.order.recipientRelationship;
  if (!hasPhotos && !hasFields) return null;

  const open = (src: string, alt: string) => setLightbox({ src, alt });
  const close = () => setLightbox(null);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">인수자 정보</h2>

        <PhotoGrid photos={view.deliveryPhotos} label="배송 사진" onOpen={open} />
        <PhotoGrid photos={view.scenePhotos} label="현장 사진" onOpen={open} />

        {lightbox && <PhotoLightbox src={lightbox.src} alt={lightbox.alt} onClose={close} />}

        {hasFields && (
          <dl className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between">
              <dt className="text-xs text-slate-500 w-20">인수자</dt>
              <dd className="text-sm text-slate-800 text-right flex-1">
                {view.order.recipientActualName || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-xs text-slate-500 w-20">인수시간</dt>
              <dd className="text-sm text-slate-800 text-right flex-1">
                {formatDateTime(view.order.receivedAt) || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-xs text-slate-500 w-20">관계</dt>
              <dd className="text-sm text-slate-800 text-right flex-1">
                {view.order.recipientRelationship || '-'}
              </dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
