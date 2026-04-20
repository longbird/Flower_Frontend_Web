'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listAircpmCertRequests,
  approveAircpmCert,
  rejectAircpmCert,
  revokeAircpmCert,
  type AircpmCertRequest,
  type AircpmCertStatus,
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
  if (status === 404) return toast.error('인증 요청을 찾을 수 없습니다.');
  if (status === 403) return toast.error('권한이 없습니다. SUPER_ADMIN/ADMIN만 사용 가능합니다.');
  if (code === 'ALREADY_APPROVED') return toast.error('이미 승인된 요청입니다.');
  if (code === 'NOT_APPROVED') return toast.error('승인 상태의 요청만 철회할 수 있습니다.');
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

function statusBadge(status: AircpmCertStatus) {
  if (status === 'pending')
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">대기</Badge>
    );
  if (status === 'approved')
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">승인</Badge>
    );
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">거부</Badge>;
}

// ─── Main page ─────────────────────────────────────────────────────

export default function AircpmCertsPage() {
  const [status, setStatus] = useState<AircpmCertStatus | 'all'>('pending');
  const [userIdQuery, setUserIdQuery] = useState('');
  const [userIdActive, setUserIdActive] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const queryClient = useQueryClient();

  const queryKey = ['admin-aircpm-certs', status, userIdActive, page];
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      listAircpmCertRequests({
        status,
        userId: userIdActive || undefined,
        page,
        limit,
      }).catch((err) => {
        toastForError(err, '목록을 불러오지 못했습니다.');
        return { items: [], total: 0, page, limit };
      }),
    refetchInterval: 15000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Dialog state
  const [approveTarget, setApproveTarget] = useState<AircpmCertRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AircpmCertRequest | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AircpmCertRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-aircpm-certs'] });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveAircpmCert(id),
    onSuccess: () => {
      toast.success('승인되었습니다.');
      setApproveTarget(null);
      invalidate();
    },
    onError: (err) => toastForError(err, '승인에 실패했습니다.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectAircpmCert(id, reason),
    onSuccess: () => {
      toast.success('거부되었습니다.');
      setRejectTarget(null);
      setRejectReason('');
      invalidate();
    },
    onError: (err) => toastForError(err, '거부에 실패했습니다.'),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => revokeAircpmCert(id, reason),
    onSuccess: () => {
      toast.success('승인이 철회되었습니다.');
      setRevokeTarget(null);
      setRevokeReason('');
      invalidate();
    },
    onError: (err) => toastForError(err, '철회에 실패했습니다.'),
  });

  const handleSearch = () => {
    setUserIdActive(userIdQuery.trim());
    setPage(1);
  };
  const handleClearSearch = () => {
    setUserIdQuery('');
    setUserIdActive('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">기기 인증 요청</h1>
          <p className="text-sm text-slate-500 mt-1">
            데스크톱 클라이언트 인증 요청을 검토하고 승인/거부합니다.
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
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as AircpmCertStatus | 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">대기 (pending)</SelectItem>
                <SelectItem value="approved">승인 (approved)</SelectItem>
                <SelectItem value="rejected">거부 (rejected)</SelectItem>
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
        <div className="text-center py-16 text-slate-400">표시할 인증 요청이 없습니다.</div>
      )}

      <div className="space-y-2">
        {items.map((req) => (
          <Card key={req.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900">{req.userId}</span>
                    {req.name && <span className="text-sm text-slate-500">({req.name})</span>}
                    {req.brchCd && (
                      <Badge variant="outline" className="text-[10px]">
                        {req.brchCd}
                      </Badge>
                    )}
                    {statusBadge(req.status)}
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5 font-mono">
                    <div>serial: {req.serial}</div>
                    <div>
                      mac: {req.macAddress || '-'}
                      {req.computerName && ` · ${req.computerName}`}
                      {req.realIp && ` · ${req.realIp}`}
                    </div>
                    {req.phone && <div>📞 {req.phone}</div>}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    요청: {fmtDateTime(req.requestedAt)}
                    {req.decidedAt && ` · 처리: ${fmtDateTime(req.decidedAt)}`}
                    {req.decidedBy && ` by ${req.decidedBy}`}
                  </div>
                  {req.rejectReason && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mt-1">
                      사유: {req.rejectReason}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {req.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setApproveTarget(req)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        승인
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectTarget(req)}>
                        거부
                      </Button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <Button size="sm" variant="outline" onClick={() => setRevokeTarget(req)}>
                      승인 철회
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-slate-500">
            총 {total}건 · {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이 기기를 승인하시겠습니까?</DialogTitle>
            <DialogDescription>
              승인하면 해당 기기에서 즉시 AirCPM 로그인이 가능해집니다.
            </DialogDescription>
          </DialogHeader>
          {approveTarget && (
            <div className="text-sm space-y-1.5 bg-slate-50 rounded-lg p-3 font-mono">
              <div>
                <strong className="font-semibold">{approveTarget.userId}</strong>
                {approveTarget.name && ` (${approveTarget.name})`}
              </div>
              <div className="text-xs text-slate-500">serial: {approveTarget.serial}</div>
              <div className="text-xs text-slate-500">
                mac: {approveTarget.macAddress || '-'}
                {approveTarget.computerName && ` · ${approveTarget.computerName}`}
              </div>
            </div>
          )}
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
            <DialogTitle>인증 요청을 거부합니다</DialogTitle>
            <DialogDescription>거부 사유를 입력해 주세요 (필수, 최대 255자).</DialogDescription>
          </DialogHeader>
          {rejectTarget && (
            <div className="text-sm space-y-1 bg-slate-50 rounded-lg p-3 font-mono">
              <div>
                <strong className="font-semibold">{rejectTarget.userId}</strong>
                {rejectTarget.name && ` (${rejectTarget.name})`}
              </div>
              <div className="text-xs text-slate-500">serial: {rejectTarget.serial}</div>
            </div>
          )}
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
                rejectTarget &&
                rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() })
              }
            >
              {rejectMutation.isPending ? '처리 중...' : '거부'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
            setRevokeReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>승인을 철회하시겠습니까?</DialogTitle>
            <DialogDescription className="text-red-600">
              ⚠️ 승인 철회 시 해당 사용자의 모든 활성 세션이 즉시 종료됩니다.
            </DialogDescription>
          </DialogHeader>
          {revokeTarget && (
            <div className="text-sm space-y-1 bg-slate-50 rounded-lg p-3 font-mono">
              <div>
                <strong className="font-semibold">{revokeTarget.userId}</strong>
                {revokeTarget.name && ` (${revokeTarget.name})`}
              </div>
              <div className="text-xs text-slate-500">serial: {revokeTarget.serial}</div>
            </div>
          )}
          <textarea
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value.slice(0, 255))}
            placeholder="사유 (선택)"
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeTarget(null);
                setRevokeReason('');
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={revokeMutation.isPending}
              onClick={() =>
                revokeTarget &&
                revokeMutation.mutate({
                  id: revokeTarget.id,
                  reason: revokeReason.trim() || undefined,
                })
              }
            >
              {revokeMutation.isPending ? '처리 중...' : '승인 철회'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
