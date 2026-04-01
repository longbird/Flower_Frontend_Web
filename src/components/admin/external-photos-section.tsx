'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth/store';
import type { ExternalPhoto } from '@/lib/scrapers/types';

interface ExternalPhotosResponse {
  ok: boolean;
  data: ExternalPhoto[];
  total: number;
}

interface CollectResponse {
  ok: boolean;
  results: { source: string; inserted: number; skipped: number; errors: string[] }[];
}

const SOURCE_LABELS: Record<string, string> = {
  '468': '468꽃비',
  ebestflower: '이베스트',
};

const SOURCE_COLORS: Record<string, string> = {
  '468': 'bg-blue-500',
  ebestflower: 'bg-orange-500',
};

function ImageWithFallback({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
        이미지 로딩 실패
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      unoptimized
      onError={() => setError(true)}
    />
  );
}

function PhotoViewer({
  photo,
  photos,
  onClose,
  onNavigate,
}: {
  photo: ExternalPhoto;
  photos: ExternalPhoto[];
  onClose: () => void;
  onNavigate: (photo: ExternalPhoto) => void;
}) {
  const idx = photos.findIndex((p) => p.id === photo.id);
  const hasPrev = idx > 0;
  const hasNext = idx < photos.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
        onClick={onClose}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Prev button */}
      {hasPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 p-2"
          onClick={(e) => { e.stopPropagation(); onNavigate(photos[idx - 1]); }}
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 p-2"
          onClick={(e) => { e.stopPropagation(); onNavigate(photos[idx + 1]); }}
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.imageUrl}
          alt={photo.title || '외부 사진'}
          className="max-w-full max-h-[85vh] object-contain rounded"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white px-4 py-2 rounded-b">
          <div className="flex items-center gap-2 text-sm">
            <Badge className={`text-[10px] px-1.5 py-0 text-white border-0 ${SOURCE_COLORS[photo.source] || 'bg-gray-500'}`}>
              {SOURCE_LABELS[photo.source] || photo.source}
            </Badge>
            {photo.title && <span className="truncate">{photo.title}</span>}
            {photo.author && <span className="text-white/60">- {photo.author}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

const LIMIT_OPTIONS = [
  { value: 10, label: '10개' },
  { value: 20, label: '20개' },
  { value: 50, label: '50개' },
  { value: 100, label: '100개' },
];

export function ExternalPhotosSection() {
  const userRole = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  if (!isSuperAdmin) return null;

  return <ExternalPhotosSectionInner />;
}

function ExternalPhotosSectionInner() {
  const queryClient = useQueryClient();
  const [viewingPhoto, setViewingPhoto] = useState<ExternalPhoto | null>(null);
  const [collectLimit, setCollectLimit] = useState(20);

  const { data, isLoading } = useQuery<ExternalPhotosResponse | null>({
    queryKey: ['dashboard-external-photos'],
    queryFn: () =>
      fetch('/api/admin/external-photos?page=1&size=8')
        .then((r) => r.json())
        .catch(() => null),
    staleTime: 60_000,
  });

  const collectMutation = useMutation<CollectResponse>({
    mutationFn: () =>
      fetch('/api/admin/external-photos/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: collectLimit }),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error('사진 가져오기에 실패했습니다.');
        return;
      }
      const totalInserted = res.results?.reduce((s, r) => s + r.inserted, 0) ?? 0;
      const totalErrors = res.results?.reduce((s, r) => s + r.errors.length, 0) ?? 0;

      if (totalInserted > 0) {
        toast.success(`${totalInserted}개 새 사진을 가져왔습니다.`);
      } else if (totalErrors > 0) {
        const msgs = res.results.flatMap((r) => r.errors);
        toast.error(`수집 오류: ${msgs[0]}`);
      } else {
        toast.info('새로운 사진이 없습니다.');
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-external-photos'] });
    },
    onError: () => {
      toast.error('사진 가져오기에 실패했습니다.');
    },
  });

  const photos = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">외부 꽃집 사진</h2>
        <div className="flex items-center gap-2">
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          value={collectLimit}
          onChange={(e) => setCollectLimit(Number(e.target.value))}
          disabled={collectMutation.isPending}
        >
          {LIMIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          className="text-sm"
          onClick={() => collectMutation.mutate()}
          disabled={collectMutation.isPending}
        >
          {collectMutation.isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              수집 중...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              가져오기
            </>
          )}
        </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-6 text-slate-400 text-sm">로딩 중...</div>}

      {!isLoading && photos.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm">
          수집된 사진이 없습니다. &apos;가져오기&apos; 버튼을 눌러 시작하세요.
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <Card
              key={photo.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 overflow-hidden"
              onClick={() => setViewingPhoto(photo)}
            >
              <div className="relative w-full aspect-square bg-slate-100">
                <ImageWithFallback src={photo.imageUrl} alt={photo.title || '외부 사진'} />
                <div className="absolute top-1.5 left-1.5">
                  <Badge className={`text-[9px] px-1.5 py-0 text-white border-0 ${SOURCE_COLORS[photo.source] || 'bg-gray-500'}`}>
                    {SOURCE_LABELS[photo.source] || photo.source}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-3 space-y-1">
                {photo.title && (
                  <div className="font-medium text-sm text-slate-900 truncate">{photo.title}</div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  {photo.author && <span>{photo.author}</span>}
                  <span className="text-slate-400 ml-auto">
                    {photo.postedAt
                      ? new Date(photo.postedAt).toLocaleDateString('ko-KR')
                      : new Date(photo.scrapedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewingPhoto && (
        <PhotoViewer
          photo={viewingPhoto}
          photos={photos}
          onClose={() => setViewingPhoto(null)}
          onNavigate={setViewingPhoto}
        />
      )}
    </div>
  );
}
