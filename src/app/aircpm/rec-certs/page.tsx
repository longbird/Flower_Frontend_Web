'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth/store';
import {
  approveAirrecCert,
  listAirrecCerts,
  rejectAirrecCert,
  revokeAirrecCert,
  type AirrecCert,
  type AirrecCertStatus,
} from '@/lib/api/airrec';
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

const PAGE_SIZE = 50;

type StatusFilter = AirrecCertStatus | 'all';
type ActionKind = 'approve' | 'reject' | 'revoke';

const STATUS_BADGE: Record<AirrecCertStatus, { label: string; className: string }> = {
  pending: { label: '승인 대기', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200' },
  approved: { label: '사용 중', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200' },
  rejected: { label: '거부·해제', className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200' },
};

const ACTIONS: Record<
  ActionKind,
  { title: string; description: string; button: string; done: string; withReason: boolean }
> = {
  approve: {
    title: '이 PC 를 승인하시겠습니까?',
    description: '승인하면 이 PC 에서 화자 분리 녹취가 보이고 동작합니다. PC 는 몇 분 안에 승인을 확인합니다.',
    button: '승인',
    done: '승인되었습니다.',
    withReason: false,
  },
  reject: {
    title: '이 요청을 거부하시겠습니까?',
    description: '이 PC 에서는 화자 분리 녹취를 쓸 수 없습니다. PC 에서 다시 요청할 수 있습니다.',
    button: '거부',
    done: '거부되었습니다.',
    withReason: true,
  },
  revoke: {
    title: '승인을 해제하시겠습니까?',
    description:
      '이 PC 의 화자 분리 녹취가 멈춥니다(최대 6시간 안에 반영). 원본 녹취와 이미 저장된 파일은 그대로 남습니다.',
    button: '승인 해제',
    done: '승인이 해제되었습니다.',
    withReason: true,
  },
};

function toastForError(err: unknown, fallback: string) {
  const status = (err as { status?: number } | null)?.status;
  if (status === 403) return toast.error('슈퍼 관리자만 사용할 수 있습니다.');
  if (status === 404) return toast.error('인증 요청을 찾을 수 없습니다. 새로고침해 주세요.');
  if (status === 409) return toast.error('이미 처리된 요청입니다. 새로고침해 주세요.');
  toast.error(err instanceof Error && err.message ? err.message : fallback);
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function macText(mac: string) {
  return mac.split('|').filter(Boolean).join(', ');
}

function certSummary(c: AirrecCert) {
  return (
    <div className="text-sm space-y-1 bg-slate-50 rounded-lg p-3">
      <div>
        <strong className="font-semibold">{c.siteName}</strong>
        {c.computerName && ` (${c.computerName})`}
        {c.phone && <span className="text-slate-500"> · {c.phone}</span>}
      </div>
      <div className="text-xs text-slate-500 break-all font-mono">{macText(c.macAddress)}</div>
    </div>
  );
}

export default function RecCertsPage() {
  const isSuper = useAuthStore((s) => s.user?.isSuper ?? false);
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<StatusFilter>('pending');
  const [queryText, setQueryText] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ kind: ActionKind; cert: AirrecCert } | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['admin-airrec-certs', status, activeQuery, page],
    queryFn: () => listAirrecCerts({ status, q: activeQuery || undefined, page, limit: PAGE_SIZE }),
    refetchInterval: 15000,
    enabled: isSuper,
  });

  const closeDialog = () => {
    setTarget(null);
    setReason('');
  };

  const mutation = useMutation({
    mutationFn: ({ kind, cert }: { kind: ActionKind; cert: AirrecCert }) => {
      const text = reason.trim() || undefined;
      if (kind === 'approve') return approveAirrecCert(cert.id);
      if (kind === 'reject') return rejectAirrecCert(cert.id, text);
      return revokeAirrecCert(cert.id, text);
    },
    onSuccess: (_res, { kind }) => {
      toast.success(ACTIONS[kind].done);
      closeDialog();
    },
    onError: (err, { kind }) => toastForError(err, `${ACTIONS[kind].button}에 실패했습니다.`),
    // 실패해도 다시 읽는다: 다른 관리자가 먼저 처리했으면(409) 목록이 낡은 것이다.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-airrec-certs'] }),
  });

  if (!isSuper) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">녹취 인증</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-700 font-medium">슈퍼 관리자 전용 메뉴입니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const action = target ? ACTIONS[target.kind] : null;

  const search = (text: string) => {
    setQueryText(text);
    setActiveQuery(text.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">녹취 인증</h1>
          <p className="text-sm text-slate-500 mt-1">
            화자 분리 녹취를 쓸 수 있는 PC 를 승인합니다. 승인된 PC 에서만 기능이 보이고 동작합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="shrink-0">
          {isFetching ? '새로고침 중...' : '새로고침'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">상태</label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">승인 대기</SelectItem>
                <SelectItem value="approved">사용 중</SelectItem>
                <SelectItem value="rejected">거부·해제</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">업체명·PC 이름 검색</label>
            <div className="flex gap-2">
              <Input
                placeholder="업체명 또는 PC 이름"
                value={queryText}
                maxLength={100}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search(queryText)}
              />
              <Button size="sm" onClick={() => search(queryText)}>
                검색
              </Button>
              {activeQuery && (
                <Button variant="ghost" size="sm" onClick={() => search('')}>
                  초기화
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center py-12 text-slate-500">로딩 중...</div>}
      {isError && !isLoading && (
        <div className="text-center py-12 text-red-600">목록을 불러오지 못했습니다. 새로고침해 주세요.</div>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <div className="text-center py-16 text-slate-400">표시할 PC 가 없습니다.</div>
      )}

      <div className="space-y-3">
        {items.map((c) => {
          const badge = STATUS_BADGE[c.status];
          return (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{c.siteName}</span>
                      {c.computerName && <span className="text-sm text-slate-500">{c.computerName}</span>}
                      <Badge className={badge.className}>{badge.label}</Badge>
                      {!c.serial && (
                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                          MAC 만으로 등록
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      연락처: {c.phone || '-'} · IP: {c.publicIp || '-'} · 버전: {c.appVersion || '-'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono break-all">
                      MAC: {macText(c.macAddress)}
                      {c.serial && <> · {c.serial}</>}
                    </div>
                    <div className="text-xs text-slate-400">
                      요청: {fmtDateTime(c.requestedAt)}
                      {c.decidedAt && ` · 처리: ${fmtDateTime(c.decidedAt)}${c.decidedBy ? ` (${c.decidedBy})` : ''}`}
                      {` · 마지막 확인: ${fmtDateTime(c.lastCheckedAt)}`}
                    </div>
                    {c.rejectReason && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mt-1">
                        사유: {c.rejectReason}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {c.status !== 'approved' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setTarget({ kind: 'approve', cert: c })}
                      >
                        승인
                      </Button>
                    )}
                    {c.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => setTarget({ kind: 'reject', cert: c })}>
                        거부
                      </Button>
                    )}
                    {c.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => setTarget({ kind: 'revoke', cert: c })}>
                        승인 해제
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              다음
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          {target && action && (
            <>
              <DialogHeader>
                <DialogTitle>{action.title}</DialogTitle>
                <DialogDescription>{action.description}</DialogDescription>
              </DialogHeader>
              {certSummary(target.cert)}
              {action.withReason && (
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 255))}
                  placeholder="사유 (선택, PC 화면에 표시됩니다)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              )}
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  취소
                </Button>
                <Button
                  variant={target.kind === 'approve' ? 'default' : 'destructive'}
                  className={target.kind === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : undefined}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(target)}
                >
                  {mutation.isPending ? '처리 중...' : action.button}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
