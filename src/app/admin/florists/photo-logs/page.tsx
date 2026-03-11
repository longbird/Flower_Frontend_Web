'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  searchPhotoLogs,
  clearOldLogs,
  clearAllLogs,
  exportPhotoLogs,
  getRestorationData,
  type PhotoLogEntry,
  type PhotoLogAction,
} from '@/lib/photo-log';
import type { FloristPhoto } from '@/lib/types/florist';

const ACTION_LABELS: Record<PhotoLogAction, string> = {
  UPLOAD: '등록',
  UPDATE: '수정',
  DELETE: '삭제',
  TOGGLE_VISIBILITY: '표시전환',
};

const ACTION_COLORS: Record<PhotoLogAction, string> = {
  UPLOAD: 'bg-slate-100 text-slate-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  TOGGLE_VISIBILITY: 'bg-amber-100 text-amber-700',
};

const CATEGORY_LABELS: Record<string, string> = {
  CELEBRATION: '축하',
  CONDOLENCE: '근조',
  FLOWER: '꽃',
  FOLIAGE: '관엽',
  FRUIT: '과일',
  OBJET: '오브제',
  ORIENTAL: '동양란',
  OTHER: '기타',
  RICE: '쌀',
  WESTERN: '서양란',
};

function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

export default function PhotoLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<PhotoLogEntry[]>([]);
  const [filterAction, setFilterAction] = useState<PhotoLogAction | ''>('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [selectedLog, setSelectedLog] = useState<PhotoLogEntry | null>(null);

  const loadLogs = useCallback(() => {
    const results = searchPhotoLogs({
      action: filterAction || undefined,
      keyword: filterKeyword || undefined,
    });
    setLogs(results);
  }, [filterAction, filterKeyword]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = () => {
    const json = exportPhotoLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photo-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('로그가 다운로드되었습니다.');
  };

  const handleClearOld = () => {
    if (confirm('90일 이전 로그를 삭제하시겠습니까?')) {
      const removed = clearOldLogs(90);
      toast.success(`${removed}건의 오래된 로그가 삭제되었습니다.`);
      loadLogs();
    }
  };

  const handleClearAll = () => {
    if (confirm('모든 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      clearAllLogs();
      toast.success('모든 로그가 삭제되었습니다.');
      loadLogs();
    }
  };

  const handleCopyRestoreData = (logId: string) => {
    const data = getRestorationData(logId);
    if (!data) {
      toast.error('복원 데이터를 찾을 수 없습니다.');
      return;
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('복원 데이터가 클립보드에 복사되었습니다.');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-slate-500"
            onClick={() => router.push('/admin/florists')}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            화원 목록
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">사진 변경 로그</h1>
          <Badge variant="outline" className="text-xs">{logs.length}건</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            JSON 내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearOld}>
            90일 이전 삭제
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={handleClearAll}>
            전체 삭제
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <select
            className="border rounded-lg px-3 py-1.5 text-sm"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as PhotoLogAction | '')}
          >
            <option value="">전체 작업</option>
            <option value="UPLOAD">등록</option>
            <option value="UPDATE">수정</option>
            <option value="DELETE">삭제</option>
            <option value="TOGGLE_VISIBILITY">표시전환</option>
          </select>
          <input
            type="text"
            className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px]"
            placeholder="화원명, 사용자, 사진ID 검색..."
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* 로그 목록 */}
      {logs.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          기록된 사진 변경 로그가 없습니다.
          <br />
          <span className="text-xs">사진을 등록/수정/삭제하면 자동으로 기록됩니다.</span>
        </div>
      )}

      <div className="space-y-2">
        {logs.map((log) => (
          <Card
            key={log.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedLog(log)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[11px] ${ACTION_COLORS[log.action]}`}>
                      {ACTION_LABELS[log.action]}
                    </Badge>
                    <span className="font-medium text-sm text-slate-800">{log.floristName}</span>
                    {log.photoId && (
                      <span className="text-xs text-slate-400">사진#{log.photoId}</span>
                    )}
                  </div>
                  {log.note && (
                    <p className="text-xs text-slate-500 truncate">{log.note}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{new Date(log.timestamp).toLocaleString('ko-KR')}</span>
                    <span>{log.userName}</span>
                  </div>
                </div>

                {/* 삭제 로그: 썸네일 미리보기 */}
                {log.action === 'DELETE' && log.before?.fileUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={photoUrl(log.before.fileUrl)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                {log.action === 'UPLOAD' && log.after?.fileUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={photoUrl(log.after.fileUrl)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 상세 다이얼로그 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge className={`text-[11px] ${selectedLog ? ACTION_COLORS[selectedLog.action] : ''}`}>
                {selectedLog ? ACTION_LABELS[selectedLog.action] : ''}
              </Badge>
              사진 변경 상세
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">시간:</span>{' '}
                  <span className="font-medium">{new Date(selectedLog.timestamp).toLocaleString('ko-KR')}</span>
                </div>
                <div>
                  <span className="text-slate-500">사용자:</span>{' '}
                  <span className="font-medium">{selectedLog.userName}</span>
                </div>
                <div>
                  <span className="text-slate-500">화원:</span>{' '}
                  <button
                    className="font-medium text-[#546E7A] hover:underline"
                    onClick={() => { setSelectedLog(null); router.push(`/admin/florists/${selectedLog.floristId}`); }}
                  >
                    {selectedLog.floristName} ({selectedLog.floristId})
                  </button>
                </div>
                <div>
                  <span className="text-slate-500">사진 ID:</span>{' '}
                  <span className="font-medium">{selectedLog.photoId ?? '-'}</span>
                </div>
              </div>

              {selectedLog.note && (
                <div className="text-sm bg-slate-50 rounded-lg px-3 py-2 text-slate-600">{selectedLog.note}</div>
              )}

              {/* Before / After 비교 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedLog.before && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-red-600">변경 전 (Before)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <PhotoSnapshot photo={selectedLog.before} />
                    </CardContent>
                  </Card>
                )}
                {selectedLog.after && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-[#546E7A]">변경 후 (After)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <PhotoSnapshot photo={selectedLog.after} />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* 복원 버튼 */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => handleCopyRestoreData(selectedLog.id)}>
                  복원 데이터 복사
                </Button>
                {selectedLog.before?.fileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        selectedLog.before?.fileUrl?.startsWith('http')
                          ? selectedLog.before.fileUrl
                          : `${window.location.origin}${photoUrl(selectedLog.before!.fileUrl!)}`
                      );
                      toast.success('이미지 URL이 복사되었습니다.');
                    }}
                  >
                    이미지 URL 복사
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>닫기</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotoSnapshot({ photo }: { photo: Partial<FloristPhoto> }) {
  return (
    <div className="space-y-2 text-sm">
      {photo.fileUrl && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-slate-100">
          <img
            src={photoUrl(photo.fileUrl)}
            alt=""
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400 text-xs">이미지 로드 실패</div>';
            }}
          />
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {photo.id != null && <Row label="ID" value={String(photo.id)} />}
        {photo.category && <Row label="카테고리" value={CATEGORY_LABELS[photo.category] || photo.category} />}
        {photo.grade && <Row label="등급" value={photo.grade} />}
        {photo.isHidden != null && <Row label="숨김" value={photo.isHidden ? '예' : '아니오'} />}
        {photo.isRecommended != null && <Row label="추천" value={photo.isRecommended ? '예' : '아니오'} />}
        {photo.costPrice != null && <Row label="원가" value={`${photo.costPrice.toLocaleString()}원`} />}
        {photo.sellingPrice != null && <Row label="판매가" value={`${photo.sellingPrice.toLocaleString()}원`} />}
        {photo.memo && <Row label="메모" value={photo.memo} />}
        {photo.fileUrl && <Row label="URL" value={photo.fileUrl} mono />}
      </dl>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium text-slate-800 truncate ${mono ? 'font-mono text-[11px]' : ''}`} title={value}>
        {value}
      </dd>
    </>
  );
}
