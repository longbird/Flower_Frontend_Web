'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listAircpmMobileDevices,
  approveAircpmMobileDevice,
  rejectAircpmMobileDevice,
  unbindAircpmMobileDevice,
  type AircpmMobileDevice,
  type AircpmMobileDeviceStatus,
} from '@/lib/api/aircpm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Utilities ─────────────────────────────────────────────────────

function extractErrorInfo(err: unknown): { status?: number; code?: string; message?: string } {
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number; code?: string };
    return { status: anyErr.status, code: anyErr.code, message: err.message };
  }
  return { message: String(err) };
}

function toastForError(err: unknown, fallback = '요청에 실패했습니다.') {
  const { status, code, message } = extractErrorInfo(err);
  if (status === 404) return toast.error('기기를 찾을 수 없습니다.');
  if (status === 403) return toast.error('권한이 없습니다. 소속 지사의 모바일 사용자만 관리할 수 있습니다.');
  if (code === 'ALREADY_APPROVED') return toast.error('이미 승인된 기기입니다.');
  toast.error(message || fallback);
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusBadge(status: AircpmMobileDeviceStatus) {
  if (status === 'pending')
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">승인 대기</Badge>;
  if (status === 'bound')
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">사용 중</Badge>;
  if (status === 'rejected')
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">거부</Badge>;
  return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200">폐기</Badge>;
}

// ─── Main page ─────────────────────────────────────────────────────

export default function AircpmMobileDevicesPage() {
  const [status, setStatus] = useState<AircpmMobileDeviceStatus | 'all'>('pending');
  const [userIdQuery, setUserIdQuery] = useState('');
  const [userIdActive, setUserIdActive] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-aircpm-mobile-devices', status, userIdActive],
    queryFn: () =>
      listAircpmMobileDevices({ status, userId: userIdActive || undefined }).catch((err) => {
        toastForError(err, '목록을 불러오지 못했습니다.');
        return { items: [] };
      }),
    refetchInterval: 15000,
  });

  const items = data?.items ?? [];

  const [approveTarget, setApproveTarget] = useState<AircpmMobileDevice | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AircpmMobileDevice | null>(null);
  const [unbindTarget, setUnbindTarget] = useState<AircpmMobileDevice | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-aircpm-mobile-devices'] });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveAircpmMobileDevice(id),
    onSuccess: () => {
      toast.success('승인되었습니다. 이 사용자의 다른 기기는 폐기되었습니다.');
      setApproveTarget(null);
      invalidate();
    },
    onError: (err) => toastForError(err, '승인에 실패했습니다.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectAircpmMobileDevice(id, reason),
    onSuccess: () => {
      toast.success('거부되었습니다.');
      setRejectTarget(null);
      setRejectReason('');
      invalidate();
    },
    onError: (err) => toastForError(err, '거부에 실패했습니다.'),
  });

  const unbindMutation = useMutation({
    mutationFn: (userId: string) => unbindAircpmMobileDevice(userId),
    onSuccess: () => {
      toast.success('기기가 폐기되었습니다. 재로그인하면 승인 대기로 다시 접수됩니다.');
      setUnbindTarget(null);
      invalidate();
    },
    onError: (err) => toastForError(err, '폐기에 실패했습니다.'),
  });

  const handleSearch = () => setUserIdActive(userIdQuery.trim());
  const handleClearSearch = () => {
    setUserIdQuery('');
    setUserIdActive('');
  };

  const deviceSummary = (d: AircpmMobileDevice) => (
    <div className="text-sm space-y-1 bg-slate-50 rounded-lg p-3 font-mono">
      <div>
        <strong className="font-semibold">{d.userId}</strong>
        {d.name && ` (${d.name})`}
      </div>
      <div className="text-xs text-slate-500 break-all">
        {d.platform ? `${d.platform} · ` : ''}
        {d.deviceId}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">모바일 기기</h1>
          <p className="text-sm text-slate-500 mt-1">
            모바일 앱 기기 등록 요청을 승인/거부합니다. 승인된 기기만 로그인할 수 있고, 사용자당 1대만 유지됩니다.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          {isFetching ? '새로고침 중...' : '새로고침'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">상태</label>
            <Select value={status} onValueChange={(v) => setStatus(v as AircpmMobileDeviceStatus | 'all')}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">승인 대기 (pending)</SelectItem>
                <SelectItem value="bound">사용 중 (bound)</SelectItem>
                <SelectItem value="rejected">거부 (rejected)</SelectItem>
                <SelectItem value="revoked">폐기 (revoked)</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">사용자 ID 검색</label>
            <div className="flex gap-2">
              <Input
                placeholder="userId"
                value={userIdQuery}
                onChange={(e) => setUserIdQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="default" size="sm" onClick={handleSearch}>
                검색
              </Button>
              {userIdActive && (
                <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                  초기화
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading && <div className="text-center py-12 text-slate-500">로딩 중...</div>}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-16 text-slate-400">표시할 기기가 없습니다.</div>
      )}

      <div className="space-y-2">
        {items.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900">{d.userId}</span>
                    {d.name && <span className="text-sm text-slate-500">({d.name})</span>}
                    {d.brchCd && (
                      <Badge variant="outline" className="text-[10px]">
                        {d.brchCd}
                      </Badge>
                    )}
                    {statusBadge(d.status)}
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5 font-mono break-all">
                    <div>
                      {d.platform ? `${d.platform} · ` : ''}
                      {d.deviceId}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    요청: {fmtDateTime(d.requestedAt)}
                    {d.boundAt && ` · 승인: ${fmtDateTime(d.boundAt)}`}
                    {d.lastSeenAt && ` · 최근 접속: ${fmtDateTime(d.lastSeenAt)}`}
                  </div>
                  {d.rejectReason && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mt-1">
                      사유: {d.rejectReason}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {(d.status === 'pending' || d.status === 'revoked') && (
                    <Button
                      size="sm"
                      onClick={() => setApproveTarget(d)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      승인
                    </Button>
                  )}
                  {d.status !== 'rejected' && (
                    <Button size="sm" variant="outline" onClick={() => setRejectTarget(d)}>
                      거부
                    </Button>
                  )}
                  {d.status === 'bound' && (
                    <Button size="sm" variant="outline" onClick={() => setUnbindTarget(d)}>
                      기기 리셋
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이 기기를 승인하시겠습니까?</DialogTitle>
            <DialogDescription>
              승인하면 이 기기에서 즉시 로그인이 가능해집니다. 사용자당 1대만 유지되므로 같은 사용자의 다른
              기기는 폐기되고 그 기기의 세션은 즉시 종료됩니다.
            </DialogDescription>
          </DialogHeader>
          {approveTarget && deviceSummary(approveTarget)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              취소
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={approveMutation.isPending}
              onClick={() => approveTarget && approveMutation.mutate(approveTarget.id)}
            >
              {approveMutation.isPending ? '처리 중...' : '승인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기기 등록을 거부합니다</DialogTitle>
            <DialogDescription>
              거부 사유를 입력해 주세요 (필수, 최대 255자). 사용 중인 기기를 거부하면 그 사용자의 세션이 즉시
              종료됩니다.
            </DialogDescription>
          </DialogHeader>
          {rejectTarget && deviceSummary(rejectTarget)}
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value.slice(0, 255))}
            placeholder="예: 본인 확인 불가"
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
          <div className="text-[10px] text-slate-400 text-right">{rejectReason.length}/255</div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              onClick={() =>
                rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() })
              }
            >
              {rejectMutation.isPending ? '처리 중...' : '거부'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unbind dialog */}
      <Dialog open={!!unbindTarget} onOpenChange={(open) => !open && setUnbindTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기기를 리셋하시겠습니까?</DialogTitle>
            <DialogDescription className="text-red-600">
              ⚠️ 이 사용자의 활성 세션이 즉시 종료됩니다. 리셋된 기기가 다시 로그인하면 자동 복구되지 않고 승인
              대기로 재접수됩니다.
            </DialogDescription>
          </DialogHeader>
          {unbindTarget && deviceSummary(unbindTarget)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnbindTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={unbindMutation.isPending}
              onClick={() => unbindTarget && unbindMutation.mutate(unbindTarget.userId)}
            >
              {unbindMutation.isPending ? '처리 중...' : '기기 리셋'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
