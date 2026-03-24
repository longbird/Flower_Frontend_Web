'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  fetchPhotoLogs,
  type PhotoLogEntry,
  type PhotoLogAction,
} from '@/lib/photo-log';
import type { FloristPhoto } from '@/lib/types/florist';
import { getFlorist } from '@/lib/api/admin';
import FloristDetailDialog from '../florist-dialog';

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState<PhotoLogAction | ''>('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [selectedLog, setSelectedLog] = useState<PhotoLogEntry | null>(null);
  const [editTarget, setEditTarget] = useState<{ floristId: string; photoId: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const pageSize = 50;

  const floristNameCache = useRef<Record<string, string>>({});

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPhotoLogs({
        action: filterAction || undefined,
        keyword: filterKeyword || undefined,
        page,
        size: pageSize,
      });

      // floristName이 코드값(fs_ 또는 숫자)인 로그의 화원명 보정
      const needResolve = new Set<string>();
      for (const log of result.data) {
        const name = log.floristName || '';
        if (!name || /^(fs_)?\d+$/.test(name)) {
          needResolve.add(log.floristId);
        }
      }
      for (const id of needResolve) {
        if (!floristNameCache.current[id]) {
          try {
            const res = await getFlorist(id);
            if (res?.data?.name) floristNameCache.current[id] = res.data.name;
          } catch { /* ignore */ }
        }
      }
      const enriched = result.data.map((log) => {
        const cached = floristNameCache.current[log.floristId];
        if (cached && (!log.floristName || /^(fs_)?\d+$/.test(log.floristName))) {
          return { ...log, floristName: cached };
        }
        return log;
      });

      setLogs(enriched);
      setTotal(result.total);
    } catch {
      toast.error('로그 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterKeyword, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(total / pageSize);

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
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">사진 변경 로그</h1>
          <Badge variant="outline" className="text-xs">{total}건</Badge>
        </div>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <select
            className="border rounded-lg px-3 py-1.5 text-sm"
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value as PhotoLogAction | ''); setPage(1); }}
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
            placeholder="사용자, 사진ID, 메모, 상품설명 검색..."
            value={filterKeyword}
            onChange={(e) => { setFilterKeyword(e.target.value); setPage(1); }}
          />
          <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading}>
            {loading ? '조회 중...' : '새로고침'}
          </Button>
        </CardContent>
      </Card>

      {/* 로그 목록 */}
      {!loading && logs.length === 0 && (
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
            <CardContent className="p-3 flex items-start gap-3">
              {/* Thumbnail */}
              {(() => {
                const snap = log.after || log.before;
                const imgUrl = snap?.fileUrl ? photoUrl(snap.fileUrl) : '';
                return imgUrl ? (
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                ) : (
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                );
              })()}

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-[11px] ${ACTION_COLORS[log.action]}`}>
                    {ACTION_LABELS[log.action]}
                  </Badge>
                  {(() => {
                    const snap = log.after || log.before;
                    return snap?.category ? (
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_LABELS[snap.category] || snap.category}
                      </Badge>
                    ) : null;
                  })()}
                  {(() => {
                    const snap = log.after || log.before;
                    return snap?.grade ? (
                      <span className="text-[10px] text-slate-500">{snap.grade}</span>
                    ) : null;
                  })()}
                  {log.floristName && (
                    <span className="font-medium text-sm text-slate-800">{log.floristName}</span>
                  )}
                  {log.floristId && !log.floristName && (
                    <span className="font-medium text-sm text-slate-800">{log.floristId}</span>
                  )}
                  {log.photoId && (
                    <span className="text-xs text-slate-400">#{log.photoId}</span>
                  )}
                </div>
                {(() => {
                  const snap = log.after || log.before;
                  return snap?.memo ? (
                    <p className="text-xs text-slate-600 truncate">{snap.memo}</p>
                  ) : log.note ? (
                    <p className="text-xs text-slate-500 truncate">{log.note}</p>
                  ) : null;
                })()}
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{new Date(log.timestamp).toLocaleString('ko-KR')}</span>
                  <span>{log.userName}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
        </div>
      )}

      {editTarget && (
        <FloristDetailDialog
          floristId={editTarget.floristId}
          open={true}
          onClose={() => setEditTarget(null)}
          initialEditPhotoId={editTarget.photoId}
        />
      )}

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
                    className="font-medium text-gray-600 hover:underline"
                    onClick={() => { setSelectedLog(null); router.push(`/admin/florists/${selectedLog.floristId}`); }}
                  >
                    {selectedLog.floristName || selectedLog.floristId}
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
                      <CardTitle className="text-sm text-gray-600">변경 후 (After)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <PhotoSnapshot photo={selectedLog.after} />
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                {selectedLog && selectedLog.after?.id && selectedLog.floristId && selectedLog.action !== 'DELETE' ? (
                  <Button
                    size="sm"
                    className="bg-[#5B7A3D] hover:bg-[#4A6830] text-white"
                    onClick={() => {
                      setEditTarget({ floristId: selectedLog.floristId, photoId: selectedLog.after!.id as number });
                      setSelectedLog(null);
                    }}
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    사진 수정
                  </Button>
                ) : <div />}
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
