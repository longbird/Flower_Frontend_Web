'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listAircpmUsers,
  createAircpmUser,
  updateAircpmUser,
  deleteAircpmUser,
  type AircpmUser,
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
  if (status === 403) return toast.error('권한이 없습니다. SUPER_ADMIN/ADMIN만 사용 가능합니다.');
  if (code === 'USER_DUPLICATE') return toast.error('이미 존재하는 사용자 아이디입니다.');
  if (status === 404) return toast.error('사용자를 찾을 수 없습니다.');
  toast.error(message || fallback);
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

const POWER_LABELS: Record<number, string> = {
  1: '운영',
  5: '일반',
  9: '관리자',
};

function powerBadge(power: number) {
  const label = POWER_LABELS[power] || `power ${power}`;
  const tone =
    power >= 9
      ? 'bg-red-100 text-red-700 border-red-200'
      : power >= 5
        ? 'bg-slate-100 text-slate-700 border-slate-200'
        : 'bg-amber-100 text-amber-800 border-amber-200';
  return <Badge className={`${tone} hover:${tone}`}>{label}</Badge>;
}

// ─── Page ───────────────────────────────────────────────────────────

export default function AircpmUsersPage() {
  const [q, setQ] = useState('');
  const [qActive, setQActive] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const queryClient = useQueryClient();

  const queryKey = ['admin-aircpm-users', qActive, page];
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      listAircpmUsers({ q: qActive || undefined, page, limit }).catch((err) => {
        toastForError(err, '사용자 목록을 불러오지 못했습니다.');
        return { items: [], total: 0, page, limit };
      }),
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-aircpm-users'] });

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AircpmUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AircpmUser | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAircpmUser(userId),
    onSuccess: () => {
      toast.success('사용자가 비활성화되었습니다.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => toastForError(err, '삭제에 실패했습니다.'),
  });

  const handleSearch = () => {
    setQActive(q.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">사용자 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            AirCPM 데스크톱 클라이언트 계정 관리. 비활성화 시 모든 세션이 자동 폐기됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? '새로고침 중...' : '새로고침'}
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreateOpen(true)}>
            + 사용자 추가
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="아이디 또는 이름 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-sm"
            />
            <Button onClick={handleSearch} size="sm">
              검색
            </Button>
            {qActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQ('');
                  setQActive('');
                  setPage(1);
                }}
              >
                초기화
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading && <div className="text-center py-12 text-slate-500">로딩 중...</div>}
      {!isLoading && users.length === 0 && (
        <div className="text-center py-16 text-slate-400">등록된 사용자가 없습니다.</div>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className={u.isActive ? '' : 'opacity-60'}>
            <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900">{u.userId}</span>
                  {u.name && <span className="text-sm text-slate-500">({u.name})</span>}
                  {u.brchCd && (
                    <Badge variant="outline" className="text-[10px]">
                      {u.brchCd}
                    </Badge>
                  )}
                  {powerBadge(u.power)}
                  {!u.isActive && (
                    <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200 border-slate-300">
                      비활성
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  생성 {fmtDateTime(u.createdAt)} · 갱신 {fmtDateTime(u.updatedAt)}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/aircpm/users/${encodeURIComponent(u.userId)}/settings`}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  설정
                </Link>
                <Button size="sm" variant="outline" onClick={() => setEditTarget(u)}>
                  편집
                </Button>
                {u.isActive && (
                  <Button size="sm" variant="outline" onClick={() => setDeleteTarget(u)}>
                    비활성
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-slate-500">
            총 {total}명 · {page}/{totalPages}
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

      {/* Create dialog */}
      {createOpen && (
        <UserCreateDialog
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            invalidate();
          }}
        />
      )}

      {/* Edit dialog */}
      {editTarget && (
        <UserEditDialog
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            invalidate();
          }}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자를 비활성화하시겠습니까?</DialogTitle>
            <DialogDescription className="text-red-600">
              ⚠️ 비활성화 시 해당 사용자의 모든 활성 세션이 즉시 종료됩니다. 데이터는 보존됩니다 (soft
              delete).
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="text-sm space-y-1 bg-slate-50 rounded-lg p-3 font-mono">
              <div>
                <strong>{deleteTarget.userId}</strong>
                {deleteTarget.name && ` (${deleteTarget.name})`}
              </div>
              {deleteTarget.brchCd && <div className="text-xs text-slate-500">{deleteTarget.brchCd}</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.userId)}
            >
              {deleteMutation.isPending ? '처리 중...' : '비활성화'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Create dialog ────────────────────────────────────────────────

function UserCreateDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [brchCd, setBrchCd] = useState('');
  const [power, setPower] = useState('5');

  const mutation = useMutation({
    mutationFn: () =>
      createAircpmUser({
        userId: userId.trim(),
        password,
        name: name.trim() || undefined,
        brchCd: brchCd.trim() || undefined,
        power: Number(power),
      }),
    onSuccess: () => {
      toast.success('사용자가 생성되었습니다.');
      onSuccess();
    },
    onError: (err) => toastForError(err, '사용자 생성에 실패했습니다.'),
  });

  const canSubmit = userId.trim().length >= 2 && password.length >= 4;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사용자 추가</DialogTitle>
          <DialogDescription>AirCPM 데스크톱 클라이언트 계정을 새로 생성합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="아이디 *">
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user01"
              autoComplete="off"
            />
          </Field>
          <Field label="비밀번호 *">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="4자 이상"
              autoComplete="new-password"
            />
          </Field>
          <Field label="이름">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
          </Field>
          <Field label="지사 코드 (brchCd)">
            <Input
              value={brchCd}
              onChange={(e) => setBrchCd(e.target.value)}
              placeholder="예: S001"
              autoComplete="off"
            />
          </Field>
          <Field label="권한 (power)">
            <Select value={power} onValueChange={setPower}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 · 운영</SelectItem>
                <SelectItem value="5">5 · 일반 (기본)</SelectItem>
                <SelectItem value="9">9 · 관리자</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? '생성 중...' : '생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────

function UserEditDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: AircpmUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [name, setName] = useState(user.name ?? '');
  const [brchCd, setBrchCd] = useState(user.brchCd ?? '');
  const [power, setPower] = useState(String(user.power));
  const [isActive, setIsActive] = useState(user.isActive);

  const mutation = useMutation({
    mutationFn: () =>
      updateAircpmUser(user.userId, {
        password: password || undefined,
        name: name.trim() || null,
        brchCd: brchCd.trim() || null,
        power: Number(power),
        isActive,
      }),
    onSuccess: () => {
      toast.success('사용자 정보가 수정되었습니다.');
      onSuccess();
    },
    onError: (err) => toastForError(err, '수정에 실패했습니다.'),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사용자 편집 · {user.userId}</DialogTitle>
          <DialogDescription>
            비밀번호는 입력한 경우에만 변경됩니다. isActive를 false로 바꾸면 세션이 즉시 종료됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="새 비밀번호 (선택)">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="변경하지 않으면 비워두세요"
              autoComplete="new-password"
            />
          </Field>
          <Field label="이름">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="지사 코드 (brchCd)">
            <Input value={brchCd} onChange={(e) => setBrchCd(e.target.value)} />
          </Field>
          <Field label="권한 (power)">
            <Select value={power} onValueChange={setPower}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 · 운영</SelectItem>
                <SelectItem value="5">5 · 일반</SelectItem>
                <SelectItem value="9">9 · 관리자</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-emerald-600"
            />
            <span className="text-slate-700">활성 상태 (isActive)</span>
            {!isActive && (
              <span className="text-[10px] text-red-600 ml-auto">⚠️ 저장 시 세션이 즉시 종료됩니다</span>
            )}
          </label>
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
