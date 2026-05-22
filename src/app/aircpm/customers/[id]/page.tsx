'use client';

import { useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAircpmCustomer,
  updateAircpmCustomer,
  deactivateAircpmCard,
  cancelAircpmPayment,
  type AircpmCustomer,
  type AircpmCard,
  type AircpmPayment,
} from '@/lib/api/aircpm-payments';
import { getCardAgeLevel, cardAgeColorClass } from '@/lib/aircpm/card-age';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Utilities ─────────────────────────────────────────────────────

function extractErrorInfo(err: unknown): { status?: number; message?: string } {
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number };
    return { status: anyErr.status, message: err.message };
  }
  return { message: String(err) };
}

function toastForError(err: unknown, fallback = '요청에 실패했습니다.') {
  const { status, message } = extractErrorInfo(err);
  if (status === 403) return toast.error('권한이 없습니다.');
  if (status === 404) return toast.error('대상을 찾을 수 없습니다.');
  toast.error(message || fallback);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string) {
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

const PAYMENT_STATUS_LABELS: Record<AircpmPayment['status'], string> = {
  DONE: '완료',
  CANCELED: '취소됨',
  FAILED: '실패',
};

function paymentStatusBadge(status: AircpmPayment['status']) {
  const tone =
    status === 'DONE'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : status === 'CANCELED'
        ? 'bg-slate-200 text-slate-600 border-slate-300'
        : 'bg-red-100 text-red-700 border-red-200';
  return <Badge className={`${tone} hover:${tone}`}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

// ─── Page ───────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = Number(params.id);
  const isSuper = useAuthStore((s) => s.user?.isSuper ?? false);
  const searchParams = useSearchParams();
  const brchCd = isSuper ? (searchParams.get('brchCd') ?? undefined) : undefined;

  const queryClient = useQueryClient();
  const queryKey = ['aircpm-customer', customerId, brchCd];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getAircpmCustomer(customerId, { brchCd }).catch((err) => {
        toastForError(err, '고객 정보를 불러오지 못했습니다.');
        throw err;
      }),
    enabled: !Number.isNaN(customerId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  // Dialog / confirmation state
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<AircpmCard | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AircpmPayment | null>(null);

  const deactivateMutation = useMutation({
    mutationFn: (cardId: number) => deactivateAircpmCard(cardId, { brchCd }),
    onSuccess: () => {
      toast.success('카드가 비활성화되었습니다.');
      setDeactivateTarget(null);
      invalidate();
    },
    onError: (err) => toastForError(err, '카드 비활성화에 실패했습니다.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (paymentId: number) => cancelAircpmPayment(paymentId, { brchCd }),
    onSuccess: () => {
      toast.success('결제가 취소되었습니다.');
      setCancelTarget(null);
      invalidate();
    },
    onError: (err) => toastForError(err, '결제 취소에 실패했습니다.'),
  });

  if (Number.isNaN(customerId)) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          ← 목록으로
        </Button>
        <div className="text-center py-16 text-slate-400">잘못된 고객 번호입니다.</div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">로딩 중...</div>;
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          ← 목록으로
        </Button>
        <div className="text-center py-16 text-slate-400">고객 정보를 불러올 수 없습니다.</div>
      </div>
    );
  }

  const { customer, cards, payments } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">고객 상세</h1>
          <p className="text-sm text-slate-500 mt-1">
            고객 정보, 등록 카드, 결제 내역을 관리합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          ← 목록으로
        </Button>
      </div>

      {/* 고객 정보 섹션 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">고객 정보</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            편집
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <dt className="text-xs font-medium text-slate-500">전화번호</dt>
              <dd className="text-slate-900 font-medium">{customer.customerPhone}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-slate-500">고객명</dt>
              <dd className="text-slate-900">
                {customer.name ? customer.name : <span className="text-slate-400">미등록</span>}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-slate-500">메모</dt>
              <dd className="text-slate-700">
                {customer.memo ? customer.memo : <span className="text-slate-400">없음</span>}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* 카드 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">등록 카드</CardTitle>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">등록된 카드가 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>카드사</TableHead>
                  <TableHead>카드번호</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <span className="text-slate-900">{card.cardCompany ?? '-'}</span>
                      {card.cardType && (
                        <span className="ml-1.5 text-[11px] text-slate-400">{card.cardType}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">
                      {card.cardNumberMasked ?? '-'}
                    </TableCell>
                    <TableCell className={cardAgeColorClass(getCardAgeLevel(card.registeredAt))}>
                      {fmtDate(card.registeredAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeactivateTarget(card)}
                      >
                        비활성화
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 결제 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">결제 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">결제 내역이 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>결제일</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-slate-700">
                      {fmtDateTime(payment.createdAt)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900">
                      {payment.amount.toLocaleString('ko-KR')}원
                    </TableCell>
                    <TableCell>{paymentStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right">
                      {payment.status === 'DONE' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelTarget(payment)}
                        >
                          취소
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          취소
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 편집 다이얼로그 */}
      {editOpen && (
        <CustomerEditDialog
          customer={customer}
          customerId={customerId}
          brchCd={brchCd}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            invalidate();
          }}
        />
      )}

      {/* 카드 비활성화 확인 */}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카드를 비활성화하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget && (
                <>
                  {deactivateTarget.cardCompany ?? '카드'} ·{' '}
                  {deactivateTarget.cardNumberMasked ?? ''} 카드가 비활성화됩니다. 이후 이 카드로는
                  결제할 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deactivateMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deactivateTarget) deactivateMutation.mutate(deactivateTarget.id);
              }}
            >
              {deactivateMutation.isPending ? '처리 중...' : '비활성화'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 결제 취소 확인 */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>결제를 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  {cancelTarget.amount.toLocaleString('ko-KR')}원 결제가 취소됩니다. 이 작업은
                  되돌릴 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>닫기</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
              }}
            >
              {cancelMutation.isPending ? '처리 중...' : '결제 취소'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Customer edit dialog ─────────────────────────────────────────

function CustomerEditDialog({
  customer,
  customerId,
  brchCd,
  onClose,
  onSuccess,
}: {
  customer: AircpmCustomer;
  customerId: number;
  brchCd: string | undefined;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(customer.name ?? '');
  const [memo, setMemo] = useState(customer.memo ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      updateAircpmCustomer(
        customerId,
        { brchCd },
        { name: name.trim(), memo: memo.trim() }
      ),
    onSuccess: () => {
      toast.success('고객 정보가 수정되었습니다.');
      onSuccess();
    },
    onError: (err) => toastForError(err, '고객 정보 수정에 실패했습니다.'),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>고객 정보 편집</DialogTitle>
          <DialogDescription>고객명과 메모를 수정합니다. 전화번호는 변경할 수 없습니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="고객명">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
            />
          </Field>
          <Field label="메모">
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="고객 관련 메모"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Small field wrapper ──────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}
