import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { resolvePhotoUrl, type CustomerOrderView, type DeliveryPhoto } from '@/lib/api/order-link';
import { formatDateTime } from '@/components/customer/_utils';

const DELIVERED_STATUSES = new Set(['DELIVERED', 'ORDER_DELIVERED']);

function PhotoGrid({ photos, label }: { photos: DeliveryPhoto[]; label: string }) {
  if (photos.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-slate-600 mb-2">{label}</h3>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"
          >
            <Image
              src={resolvePhotoUrl(p.url)}
              alt={label}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecipientInfoSection({ view }: { view: CustomerOrderView }) {
  if (!DELIVERED_STATUSES.has(view.order.status)) return null;

  const hasPhotos = view.deliveryPhotos.length > 0 || view.scenePhotos.length > 0;
  const hasFields =
    view.order.recipientActualName || view.order.receivedAt || view.order.recipientRelationship;
  if (!hasPhotos && !hasFields) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">인수자 정보</h2>

        <PhotoGrid photos={view.deliveryPhotos} label="배송 사진" />
        <PhotoGrid photos={view.scenePhotos} label="현장 사진" />

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
