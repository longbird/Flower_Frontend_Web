'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { removeFloristPhotoText } from '@/lib/api/admin';
import type { FloristPhoto } from '@/lib/types/florist';
import { cn } from '@/lib/utils';
import { CATEGORIES, photoUrl } from './florist-constants';

export function ImageViewer({
  photo,
  floristId,
  onClose,
  onToggleVisibility,
  onDelete,
  onRotateSave,
  isRotating,
  onTextRemoved,
}: {
  photo: FloristPhoto;
  floristId: string;
  onClose: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onRotateSave?: (angle: number) => Promise<void> | void;
  isRotating?: boolean;
  onTextRemoved?: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [copying, setCopying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [cacheBuster, setCacheBuster] = useState(0);
  // 문구 삭제 모드
  const [brushMode, setBrushMode] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [isPainting, setIsPainting] = useState(false);
  const [inpaintLoading, setInpaintLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedMaskBlob, setSavedMaskBlob] = useState<Blob | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const baseUrl = photoUrl(photo.fileUrl);
  const url = cacheBuster ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${cacheBuster}` : baseUrl;

  // 이미지 로드 시 canvas 크기 동기화
  useEffect(() => {
    if (brushMode && imgLoaded && canvasRef.current && imgRef.current) {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [brushMode, imgLoaded]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const paintAt = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    // 원본 이미지 기준 브러시 크기 계산
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const r = brushSize * scale;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, r / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePaintStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!brushMode) return;
    e.preventDefault();
    setIsPainting(true);
    const { x, y } = getCanvasPos(e);
    paintAt(x, y);
  };

  const handlePaintMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPainting || !brushMode) return;
    e.preventDefault();
    const { x, y } = getCanvasPos(e);
    paintAt(x, y);
  };

  const handlePaintEnd = () => {
    setIsPainting(false);
  };

  const handleClearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getMaskBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      // 마스크 생성: 칠한 영역을 흰색, 나머지는 검정
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      const imageData = ctx.getImageData(0, 0, w, h);
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const maskCtx = maskCanvas.getContext('2d')!;
      const maskData = maskCtx.createImageData(w, h);
      for (let i = 0; i < imageData.data.length; i += 4) {
        // 빨간색(alpha > 0)이면 흰색, 아니면 검정
        const painted = imageData.data[i + 3] > 0;
        maskData.data[i] = painted ? 255 : 0;
        maskData.data[i + 1] = painted ? 255 : 0;
        maskData.data[i + 2] = painted ? 255 : 0;
        maskData.data[i + 3] = 255;
      }
      maskCtx.putImageData(maskData, 0, 0);
      maskCanvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleInpaintPreview = async () => {
    const maskBlob = await getMaskBlob();
    if (!maskBlob) { toast.error('마스크를 먼저 칠해주세요'); return; }
    setSavedMaskBlob(maskBlob);
    setInpaintLoading(true);
    try {
      const res = await removeFloristPhotoText(floristId, photo.id, maskBlob, 'preview');
      if (res.ok && res.previewUrl) {
        const previewWithCache = `${photoUrl(res.previewUrl)}${res.previewUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        setPreviewUrl(previewWithCache);
      } else {
        toast.error(res.message || '미리보기 생성 실패');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '문구 제거 실패');
    } finally {
      setInpaintLoading(false);
    }
  };

  const handleInpaintApply = async () => {
    // 미리보기 모드에서는 canvas가 없으므로 저장된 마스크 사용
    const maskBlob = savedMaskBlob || await getMaskBlob();
    if (!maskBlob) {
      toast.error('마스크 데이터가 없습니다. 다시 칠해주세요.');
      return;
    }
    setInpaintLoading(true);
    try {
      const res = await removeFloristPhotoText(floristId, photo.id, maskBlob, 'apply');
      if (res.ok) {
        toast.success('문구가 제거되었습니다');
        setPreviewUrl(null);
        setSavedMaskBlob(null);
        setBrushMode(false);
        setCacheBuster(Date.now());
        onTextRemoved?.();
      } else {
        toast.error(res.message || '적용 실패');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '적용 실패');
    } finally {
      setInpaintLoading(false);
    }
  };

  const handleRotateLeft = () => setRotation((r) => r - 90);
  const handleRotateRight = () => setRotation((r) => r + 90);

  const handleRotateSave = async () => {
    if (!onRotateSave || rotation === 0) return;
    const normalized = ((rotation % 360) + 360) % 360;
    if (normalized === 0) return;
    try {
      await onRotateSave(normalized);
      setRotation(0);
      setCacheBuster(Date.now());
    } catch {
      // error handled by parent mutation
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      // PNG로 변환 (clipboard API는 image/png만 지원)
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('PNG 변환 실패'));
          }, 'image/png');
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = URL.createObjectURL(blob);
      });
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob }),
      ]);
      toast.success('이미지가 클립보드에 복사되었습니다');
    } catch {
      toast.error('복사에 실패했습니다');
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = photo.fileUrl.split('/').pop() || 'image.jpg';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('이미지 다운로드를 시작합니다');
    } catch {
      toast.error('다운로드에 실패했습니다');
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('이미지를 가져올 수 없습니다');
      const blob = await res.blob();
      const ext = blob.type === 'image/png' ? '.png' : blob.type === 'image/webp' ? '.webp' : '.jpg';
      const filename = (photo.memo || '상품사진') + ext;
      const file = new File([blob], filename, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: photo.memo || '상품 사진',
        });
        toast.success('공유 완료');
      } else {
        await navigator.clipboard.writeText(window.location.origin + url);
        toast.info('이 브라우저에서는 파일 공유가 지원되지 않아 URL을 복사했습니다');
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
      toast.error('공유에 실패했습니다');
    } finally {
      setSharing(false);
    }
  };

  const categoryName = CATEGORIES.find((c) => c.code === photo.category)?.name;

  // 미리보기 모드
  if (previewUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500/90 text-white text-sm font-medium px-4 py-2 rounded-xl">
          문구 제거 미리보기
        </div>
        <div className="absolute top-4 right-4 z-10">
          <ToolbarButton title="닫기" onClick={() => { setPreviewUrl(null); setSavedMaskBlob(null); }}>
            <CloseIcon />
          </ToolbarButton>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="미리보기" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          <button
            className="bg-white/10 backdrop-blur-md text-white px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white/20 transition text-sm font-medium"
            onClick={() => { setPreviewUrl(null); setSavedMaskBlob(null); }}
          >
            다시 칠하기
          </button>
          <button
            className="bg-[#5B7A3D] text-white px-5 py-2.5 rounded-xl hover:bg-[#4A6830] transition text-sm font-medium shadow-lg disabled:opacity-50"
            onClick={handleInpaintApply}
            disabled={inpaintLoading}
          >
            {inpaintLoading ? '적용 중...' : '원본에 적용'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={brushMode ? undefined : onClose}>
      {/* Top Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2" onClick={(e) => e.stopPropagation()}>
        {!brushMode && (
          <>
            <ToolbarButton title="왼쪽 회전" onClick={handleRotateLeft}>
              <RotateLeftIcon />
            </ToolbarButton>
            <ToolbarButton title="오른쪽 회전" onClick={handleRotateRight}>
              <RotateRightIcon />
            </ToolbarButton>
            <ToolbarButton title="클립보드에 복사" onClick={handleCopy} disabled={copying}>
              {copying ? <span className="animate-spin text-sm">...</span> : <CopyIcon />}
            </ToolbarButton>
            <ToolbarButton title="이미지 다운로드" onClick={handleDownload}>
              <DownloadIcon />
            </ToolbarButton>
            <ToolbarButton title="카카오톡 공유" onClick={handleShare} disabled={sharing}>
              {sharing ? <span className="animate-spin text-sm">...</span> : <ShareIcon />}
            </ToolbarButton>
          </>
        )}
        <ToolbarButton title="닫기" onClick={brushMode ? () => { setBrushMode(false); handleClearMask(); } : onClose}>
          <CloseIcon />
        </ToolbarButton>
      </div>

      {/* Brush mode toolbar (top-left) */}
      {brushMode && (
        <div className="absolute top-4 left-4 z-10 flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
          <span className="text-amber-400 text-sm font-medium bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-400/30">
            리본 문구 영역을 칠하세요
          </span>
          <div className="flex gap-1 bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10">
            {[{ size: 10, label: '소' }, { size: 20, label: '중' }, { size: 35, label: '대' }].map((b) => (
              <button
                key={b.size}
                onClick={() => setBrushSize(b.size)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  brushSize === b.size ? 'bg-amber-500 text-white' : 'text-white/60 hover:text-white'
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleClearMask}
            className="text-white/60 hover:text-white text-xs bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 transition"
          >
            초기화
          </button>
        </div>
      )}

      {/* Image + Canvas overlay */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative" style={{ transform: brushMode ? 'none' : `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt="전체 화면"
            className="max-w-[90vw] max-h-[85vh] object-contain select-none"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
          />
          {brushMode && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ cursor: 'crosshair', touchAction: 'none' }}
              onMouseDown={handlePaintStart}
              onMouseMove={handlePaintMove}
              onMouseUp={handlePaintEnd}
              onMouseLeave={handlePaintEnd}
              onTouchStart={handlePaintStart}
              onTouchMove={handlePaintMove}
              onTouchEnd={handlePaintEnd}
            />
          )}
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10" onClick={(e) => e.stopPropagation()}>
        {brushMode ? (
          <div className="bg-black/80 backdrop-blur-md rounded-xl px-5 py-3 flex items-center gap-3 border border-white/10">
            <button
              className="text-white/60 hover:text-white text-sm transition-colors"
              onClick={() => { setBrushMode(false); handleClearMask(); }}
            >
              취소
            </button>
            <button
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition disabled:opacity-50"
              onClick={handleInpaintPreview}
              disabled={inpaintLoading}
            >
              {inpaintLoading ? '처리 중...' : '문구 삭제 실행'}
            </button>
          </div>
        ) : (
          <div className="bg-black/80 backdrop-blur-md rounded-xl px-5 py-3 flex flex-col items-center gap-2 min-w-[200px] border border-white/10">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {categoryName && (
                <span className="bg-[#5B7A3D] text-white text-xs px-2.5 py-0.5 rounded-md font-medium">{categoryName}</span>
              )}
              {photo.memo && <span className="text-white text-sm">{photo.memo}</span>}
              {photo.isHidden && (
                <span className="bg-amber-500 text-white text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                  비공개
                </span>
              )}
            </div>
            {rotation !== 0 && <span className="text-white/60 text-[13px]">{rotation}°</span>}
            <div className="flex gap-4">
              {rotation !== 0 && onRotateSave && (
                <button
                  className="text-sky-400 hover:text-sky-300 text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                  onClick={handleRotateSave}
                  disabled={isRotating}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {isRotating ? '저장 중...' : '회전 저장'}
                </button>
              )}
              <button className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors" onClick={onToggleVisibility}>
                {photo.isHidden ? '공개' : '비공개'}
              </button>
              <button className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors" onClick={onDelete}>
                삭제
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Icon Components (used only by ImageViewer) --- */

function EraserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0l5 5c.8.8.8 2 0 2.8L11 20" />
      <path d="M6 11l4 4" />
    </svg>
  );
}

function ToolbarButton({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all disabled:opacity-50 border border-white/10"
      title={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function RotateLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38" />
    </svg>
  );
}

function RotateRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
