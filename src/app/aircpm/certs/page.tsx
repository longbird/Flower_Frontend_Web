'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  approveAircpmCert,
  approveAircpmMobileDevice,
  listAircpmCertRequests,
  listAircpmMobileDevices,
  rejectAircpmCert,
  rejectAircpmMobileDevice,
  revokeAircpmCert,
  unbindAircpmMobileDevice,
} from '@/lib/api/aircpm';
import {
  certStatusParam,
  mergeDevices,
  mobileStatusParam,
  type DeviceKindFilter,
  type DeviceStatus,
  type DeviceStatusFilter,
  type UnifiedDevice,
} from '@/lib/aircpm/devices';
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
import { AccountDeviceSummary } from '@/components/aircpm/account-device-summary';

// 데스크톱 인증 목록은 서버 페이징이고 모바일은 아니라, 두 목록을 한 페이지에서 정렬하려면
// 데스크톱을 한 번에 넉넉히 받아야 한다. 서버 상한이 200이다.
const CERT_FETCH_LIMIT = 200;
const PAGE_SIZE = 50;

function extractErrorInfo(err: unknown): { status?: number; code?: string; message?: string } {
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number; code?: string; data?: unknown };
    const dataCode =
      anyErr.data && typeof anyErr.data === 'object' && 'code' in anyErr.data
        ? String((anyErr.data as Record<string, unknown>).code)
        : undefined;
    return { status: anyErr.status, code: anyErr.code ?? dataCode, message: err.message };
  }
  return { message: String(err) };
}

function toastForError(err: unknown, fallback = '요청에 실패했습니다.') {
  const { status, code, message } = extractErrorInfo(err);
  if (status === 404) return toast.error('기기를 찾을 수 없습니다.');
  if (status === 403) return toast.error('권한이 없습니다. 소속 지사의 기기만 관리할 수 있습니다.');
  if (code === 'DEVICE_LIMIT_EXCEEDED')
    return toast.error('기기 수 제한(최대 2대)을 초과했습니다. 기존 기기를 먼저 해제해주세요.');
  if (code === 'ALREADY_APPROVED') return toast.error('이미 승인된 기기입니다.');
  if (code === 'NOT_APPROVED') return toast.error('승인 상태의 기기만 해제할 수 있습니다.');
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

const STATUS_BADGE: Record<DeviceStatus, { label: string; className: string }> = {
  pending: { label: '승인 대기', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200' },
  active: { label: '사용 중', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200' },
  rejected: { label: '거부', className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200' },
  revoked: { label: '폐기', className: 'bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200' },
  unknown: { label: '알 수 없음', className: 'bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200' },
};

function statusBadge(status: DeviceStatus) {
  const v = STATUS_BADGE[status];
  return <Badge className={v.className}>{v.label}</Badge>;
}

function kindBadge(kind: UnifiedDevice['kind']) {
  return kind === 'mobile' ? (
    <Badge variant="outline" className="text-[10px] border-sky-200 text-sky-700">
      📱 모바일
    </Badge>
  ) : (
    <Badge variant="outline" className="text-[10px] border-violet-200 text-violet-700">
      💻 데스크톱
    </Badge>
  );
}

function deviceSummary(d: UnifiedDevice) {
  return (
    <div className="text-sm space-y-1 bg-slate-50 rounded-lg p-3 font-mono">
      <div>
        <strong className="font-semibold">{d.userId}</strong>
        {d.name && ` (${d.name})`}
      </div>
      <div className="text-xs text-slate-500 break-all">{d.detail}</div>
    </div>
  );
}

export default function AircpmDevicesPage() {
  const [kind, setKind] = useState<DeviceKindFilter>('all');
  const [status, setStatus] = useState<DeviceStatusFilter>('pending');
  const [userIdQuery, setUserIdQuery] = useState('');
  const [userIdActive, setUserIdActive] = useState('');
  const [page, setPage] = useState(1);

  const [view, setView] = useState<'devices' | 'accounts'>('devices');

  // 계정별 탭에서 "기기 보기" — 기기별 탭으로 전환하며 그 계정의 모든 기기를 보여준다.
  const showDevicesOf = (userId: string) => {
    setView('devices');
    setKind('all');
    setStatus('all');
    setUserIdQuery(userId);
    setUserIdActive(userId);
    setPage(1);
  };

  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-aircpm-devices', kind, status, userIdActive],
    queryFn: async () => {
      const certParam = certStatusParam(status);
      // 데스크톱에는 '폐기'가 없다 — 그 필터에서는 아예 조회하지 않는다.
      const wantDesktop = kind !== 'mobile' && certParam !== null;
      const wantMobile = kind !== 'desktop';
      const userId = userIdActive || undefined;

      const [certs, mobiles] = await Promise.all([
        wantDesktop
          ? listAircpmCertRequests({ status: certParam, userId, page: 1, limit: CERT_FETCH_LIMIT }).catch(
              (err) => {
                toastForError(err, '데스크톱 목록을 불러오지 못했습니다.');
                return { items: [], total: 0, page: 1, limit: CERT_FETCH_LIMIT };
              },
            )
          : Promise.resolve({ items: [], total: 0, page: 1, limit: CERT_FETCH_LIMIT }),
        wantMobile
          ? listAircpmMobileDevices({ status: mobileStatusParam(status), userId }).catch((err) => {
              toastForError(err, '모바일 목록을 불러오지 못했습니다.');
              return { items: [] };
            })
          : Promise.resolve({ items: [] }),
      ]);

      return {
        devices: mergeDevices(certs.items, mobiles.items),
        certHidden: Math.max(0, certs.total - certs.items.length),
      };
    },
    refetchInterval: 15000,
    enabled: view === 'devices',
  });

  const devices = data?.devices ?? [];
  const certHidden = data?.certHidden ?? 0;
  const totalPages = Math.max(1, Math.ceil(devices.length / PAGE_SIZE));
  const visible = devices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [approveTarget, setApproveTarget] = useState<UnifiedDevice | null>(null);
  const [rejectTarget, setRejectTarget] = useState<UnifiedDevice | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<UnifiedDevice | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [releaseReason, setReleaseReason] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-aircpm-devices'] });

  const approveMutation = useMutation({
    mutationFn: (d: UnifiedDevice) =>
      d.kind === 'mobile' ? approveAircpmMobileDevice(d.id) : approveAircpmCert(d.id),
    onSuccess: (_res, d) => {
      toast.success(
        d.kind === 'mobile'
          ? '승인되었습니다. 이 사용자의 다른 모바일 기기는 폐기되었습니다.'
          : '승인되었습니다.',
      );
      setApproveTarget(null);
      invalidate();
    },
    onError: (err) => toastForError(err, '승인에 실패했습니다.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ device, reason }: { device: UnifiedDevice; reason: string }) =>
      device.kind === 'mobile'
        ? rejectAircpmMobileDevice(device.id, reason)
        : rejectAircpmCert(device.id, reason),
    onSuccess: () => {
      toast.success('거부되었습니다.');
      setRejectTarget(null);
      setRejectReason('');
      invalidate();
    },
    onError: (err) => toastForError(err, '거부에 실패했습니다.'),
  });

  // 승인 해제 — 두 종류 모두 활성 세션을 즉시 끊는다. 다만 뒤에 남는 상태가 다르다:
  // 데스크톱은 '거부'(재요청해야 함), 모바일은 '폐기'(재로그인하면 승인 대기로 재접수).
  const releaseMutation = useMutation({
    mutationFn: ({ device, reason }: { device: UnifiedDevice; reason?: string }) =>
      device.kind === 'mobile'
        ? unbindAircpmMobileDevice(device.userId)
        : revokeAircpmCert(device.id, reason),
    onSuccess: () => {
      toast.success('승인이 해제되었습니다. 해당 세션은 즉시 종료됩니다.');
      setReleaseTarget(null);
      setReleaseReason('');
      invalidate();
    },
    onError: (err) => toastForError(err, '해제에 실패했습니다.'),
  });

  // 필터가 바뀌면 목록이 통째로 달라진다 — 빈 페이지에 남지 않도록 첫 장으로 되돌린다.
  const changeKind = (v: DeviceKindFilter) => {
    setKind(v);
    setPage(1);
  };
  const changeStatus = (v: DeviceStatusFilter) => {
    setStatus(v);
    setPage(1);
  };
  const handleSearch = () => {
    setUserIdActive(userIdQuery.trim());
    setPage(1);
  };
  const handleClearSearch = () => {
    setUserIdQuery('');
    setUserIdActive('');
    setPage(1);
  };

  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const refreshing = view === 'devices' ? isFetching : summaryRefreshing;
  const handleRefresh = async () => {
    if (view === 'devices') {
      refetch();
      return;
    }
    setSummaryRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['admin-aircpm-device-summary'] });
    } finally {
      setSummaryRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">기기 인증</h1>
          <p className="text-sm text-slate-500 mt-1">
            데스크톱·모바일 기기 등록 요청을 한곳에서 승인/거부합니다. 승인된 기기만 로그인할 수 있습니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="shrink-0">
          {refreshing ? '새로고침 중...' : '새로고침'}
        </Button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setView('devices')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === 'devices'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          기기별
        </button>
        <button
          onClick={() => setView('accounts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === 'accounts'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          계정별
        </button>
      </div>

      {view === 'accounts' && <AccountDeviceSummary onShowDevices={showDevicesOf} />}

      {view === 'devices' && (
        <>
      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">종류</label>
            <Select value={kind} onValueChange={(v) => changeKind(v as DeviceKindFilter)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="desktop">💻 데스크톱</SelectItem>
                <SelectItem value="mobile">📱 모바일</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">상태</label>
            <Select value={status} onValueChange={(v) => changeStatus(v as DeviceStatusFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">승인 대기</SelectItem>
                <SelectItem value="active">사용 중</SelectItem>
                <SelectItem value="rejected">거부</SelectItem>
                <SelectItem value="revoked">폐기 (모바일)</SelectItem>
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

      {certHidden > 0 && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          데스크톱 기기가 많아 최근 {CERT_FETCH_LIMIT}건만 표시했습니다 (숨겨진 {certHidden}건). 상태 또는
          사용자 ID로 좁혀 주세요.
        </div>
      )}

      {/* List */}
      {isLoading && <div className="text-center py-12 text-slate-500">로딩 중...</div>}
      {!isLoading && devices.length === 0 && (
        <div className="text-center py-16 text-slate-400">표시할 기기가 없습니다.</div>
      )}

      <div className="space-y-2">
        {visible.map((d) => (
          <Card key={d.key}>
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
                    {kindBadge(d.kind)}
                    {statusBadge(d.status)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono break-all">{d.detail}</div>
                  {d.phone && <div className="text-xs text-slate-500 font-mono">📞 {d.phone}</div>}
                  <div className="text-[11px] text-slate-400">
                    요청: {fmtDateTime(d.requestedAt)}
                    {d.decidedAt && ` · 처리: ${fmtDateTime(d.decidedAt)}`}
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
                  {d.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => setRejectTarget(d)}>
                      거부
                    </Button>
                  )}
                  {/* 데스크톱은 승인 해제가 곧 거부라 버튼이 겹친다 — 모바일에만 별도 거부를 둔다. */}
                  {d.status === 'active' && d.kind === 'mobile' && (
                    <Button size="sm" variant="outline" onClick={() => setRejectTarget(d)}>
                      거부
                    </Button>
                  )}
                  {d.status === 'active' && (
                    <Button size="sm" variant="outline" onClick={() => setReleaseTarget(d)}>
                      승인 해제
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {devices.length > 0 && (
        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-slate-500">
            총 {devices.length}건 · {page}/{totalPages}
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
        </>
      )}

      {/* Approve */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이 기기를 승인하시겠습니까?</DialogTitle>
            <DialogDescription>
              승인하면 이 기기에서 즉시 로그인이 가능해집니다.
              {approveTarget?.kind === 'mobile' &&
                ' 모바일은 사용자당 1대만 유지되므로, 같은 사용자의 다른 기기는 폐기되고 그 세션은 즉시 종료됩니다.'}
              {approveTarget?.kind === 'desktop' &&
                ' 데스크톱은 계정당 최대 2대까지 승인됩니다.'}
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
              onClick={() => approveTarget && approveMutation.mutate(approveTarget)}
            >
              {approveMutation.isPending ? '처리 중...' : '승인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
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
              거부 사유를 입력해 주세요 (필수, 최대 255자).
              {rejectTarget?.status === 'active' && ' 사용 중인 기기를 거부하면 세션이 즉시 종료됩니다.'}
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
                rejectTarget && rejectMutation.mutate({ device: rejectTarget, reason: rejectReason.trim() })
              }
            >
              {rejectMutation.isPending ? '처리 중...' : '거부'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release (승인 해제) */}
      <Dialog
        open={!!releaseTarget}
        onOpenChange={(open) => {
          if (!open) {
            setReleaseTarget(null);
            setReleaseReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>승인을 해제하시겠습니까?</DialogTitle>
            <DialogDescription className="text-red-600">
              ⚠️ 이 사용자의 활성 세션이 즉시 종료됩니다.
              {releaseTarget?.kind === 'mobile'
                ? ' 해제된 기기가 다시 로그인하면 자동 복구되지 않고 승인 대기로 재접수됩니다.'
                : ' 해제하면 거부 상태가 되며, 다시 쓰려면 인증을 새로 요청해야 합니다.'}
            </DialogDescription>
          </DialogHeader>
          {releaseTarget && deviceSummary(releaseTarget)}
          {releaseTarget?.kind === 'desktop' && (
            <textarea
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value.slice(0, 255))}
              placeholder="사유 (선택)"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReleaseTarget(null);
                setReleaseReason('');
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={releaseMutation.isPending}
              onClick={() =>
                releaseTarget &&
                releaseMutation.mutate({
                  device: releaseTarget,
                  reason: releaseReason.trim() || undefined,
                })
              }
            >
              {releaseMutation.isPending ? '처리 중...' : '승인 해제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
