'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listAircpmBranches,
  upsertAircpmBranch,
  type AircpmBranch,
} from '@/lib/api/aircpm-payments';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Utilities ─────────────────────────────────────────────────────

function toastForError(err: unknown, fallback = '요청에 실패했습니다.') {
  const message = err instanceof Error ? err.message : String(err);
  toast.error(message || fallback);
}

// ─── 지원 프로그램 (copy/paste apps) ───────────────────────────────
// 슬롯 순서(백엔드 계약): 0=AUTO,1=D5,2=XE4,3=ICON,4=D2
const PROGRAM_LABELS = ['AUTO', 'Logi D5', 'XE4', 'Icon', 'D2'] as const;
const ALL_ON: boolean[] = [true, true, true, true, true];

function toggleAt(arr: boolean[], i: number): boolean[] {
  return arr.map((v, idx) => (idx === i ? !v : v));
}

function summarizeApps(apps: boolean[] | undefined): string {
  const a = apps ?? ALL_ON;
  if (a.every(Boolean)) return '전체';
  const on = PROGRAM_LABELS.filter((_, i) => a[i]);
  return on.length ? on.join('·') : '없음';
}

function SupportedProgramsField({
  copyApps,
  pasteApps,
  onToggleCopy,
  onTogglePaste,
}: {
  copyApps: boolean[];
  pasteApps: boolean[];
  onToggleCopy: (i: number) => void;
  onTogglePaste: (i: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">지원 프로그램 (복사 / 붙여넣기)</label>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500">
          <span>프로그램</span>
          <span className="text-center">복사</span>
          <span className="text-center">붙여넣기</span>
        </div>
        {PROGRAM_LABELS.map((label, i) => (
          <div
            key={label}
            className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-1.5 items-center border-t border-slate-100"
          >
            <span className="text-sm text-slate-700">{label}</span>
            <input
              type="checkbox"
              data-testid={`copy-app-${i}`}
              checked={copyApps[i]}
              onChange={() => onToggleCopy(i)}
              className="w-4 h-4 justify-self-center rounded border-slate-300 accent-emerald-600"
            />
            <input
              type="checkbox"
              data-testid={`paste-app-${i}`}
              checked={pasteApps[i]}
              onChange={() => onTogglePaste(i)}
              className="w-4 h-4 justify-self-center rounded border-slate-300 accent-emerald-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function BranchesPage() {
  const isSuper = useAuthStore((s) => s.user?.isSuper ?? false);
  const queryClient = useQueryClient();

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['aircpm-branches'],
    queryFn: () =>
      listAircpmBranches().catch((err) => {
        toastForError(err, '지사 목록을 불러오지 못했습니다.');
        return [] as AircpmBranch[];
      }),
    enabled: isSuper,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['aircpm-branches'] });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AircpmBranch | null>(null);

  if (!isSuper) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">지사 관리</h1>
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-slate-700 font-medium">슈퍼 관리자 전용 메뉴입니다.</p>
            <p className="text-sm text-slate-500">
              지사 관리는 슈퍼 관리자만 사용할 수 있습니다.
              지사 관리자는 사용자 / 기기 인증 / 로그인 로그 메뉴를 사용해 주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">지사 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            AirCPM 지사 목록 및 카드결제 활성화 설정.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setCreateOpen(true)}
        >
          + 지사 추가
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-slate-500">로딩 중...</div>
      )}
      {!isLoading && branches.length === 0 && (
        <div className="text-center py-16 text-slate-400">등록된 지사가 없습니다.</div>
      )}

      <div className="space-y-2">
        {branches.map((b) => (
          <Card key={b.brchCd}>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900">{b.brchCd}</span>
                  {b.name && (
                    <span className="text-sm text-slate-700">{b.name}</span>
                  )}
                  {b.cardPaymentEnabled ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                      카드결제 ON
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100">
                      카드결제 OFF
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  복사 {summarizeApps(b.copyApps)} · 붙여넣기 {summarizeApps(b.pasteApps)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/aircpm/branches/${encodeURIComponent(b.brchCd)}/toss-credentials`}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  자격증명
                </Link>
                <Button size="sm" variant="outline" onClick={() => setEditTarget(b)}>
                  편집
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {createOpen && (
        <BranchCreateDialog
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            invalidate();
          }}
        />
      )}

      {editTarget && (
        <BranchEditDialog
          branch={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

// ─── Create dialog ────────────────────────────────────────────────

function BranchCreateDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [brchCd, setBrchCd] = useState('');
  const [name, setName] = useState('');
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(false);
  const [copyApps, setCopyApps] = useState<boolean[]>(ALL_ON);
  const [pasteApps, setPasteApps] = useState<boolean[]>(ALL_ON);

  const mutation = useMutation({
    mutationFn: () =>
      upsertAircpmBranch({
        brchCd: brchCd.trim(),
        name: name.trim() || undefined,
        cardPaymentEnabled,
        copyApps,
        pasteApps,
      }),
    onSuccess: () => {
      toast.success('지사가 등록되었습니다.');
      onSuccess();
    },
    onError: (err) => toastForError(err, '지사 등록에 실패했습니다.'),
  });

  const canSubmit = brchCd.trim().length >= 1;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>지사 추가</DialogTitle>
          <DialogDescription>
            새 지사를 등록합니다. 지사 코드는 변경할 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="지사 코드 (brchCd) *">
            <Input
              value={brchCd}
              onChange={(e) => setBrchCd(e.target.value)}
              placeholder="예: S001"
              autoComplete="off"
            />
          </Field>
          <Field label="지사 이름">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 강남"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={cardPaymentEnabled}
              onChange={(e) => setCardPaymentEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-emerald-600"
            />
            <span className="text-slate-700">카드결제 사용</span>
          </label>
          <SupportedProgramsField
            copyApps={copyApps}
            pasteApps={pasteApps}
            onToggleCopy={(i) => setCopyApps((p) => toggleAt(p, i))}
            onTogglePaste={(i) => setPasteApps((p) => toggleAt(p, i))}
          />
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
            {mutation.isPending ? '등록 중...' : '등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────

function BranchEditDialog({
  branch,
  onClose,
  onSuccess,
}: {
  branch: AircpmBranch;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(branch.name ?? '');
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(branch.cardPaymentEnabled);
  const [copyApps, setCopyApps] = useState<boolean[]>(branch.copyApps ?? ALL_ON);
  const [pasteApps, setPasteApps] = useState<boolean[]>(branch.pasteApps ?? ALL_ON);

  const mutation = useMutation({
    mutationFn: () =>
      upsertAircpmBranch({
        brchCd: branch.brchCd,
        name: name.trim() || undefined,
        cardPaymentEnabled,
        copyApps,
        pasteApps,
      }),
    onSuccess: () => {
      toast.success('지사 정보가 수정되었습니다.');
      onSuccess();
    },
    onError: (err) => toastForError(err, '지사 수정에 실패했습니다.'),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>지사 편집 · {branch.brchCd}</DialogTitle>
          <DialogDescription>
            지사 정보를 수정합니다. 지사 코드는 변경할 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="지사 코드 (brchCd)">
            <Input value={branch.brchCd} disabled />
          </Field>
          <Field label="지사 이름">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 강남"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={cardPaymentEnabled}
              onChange={(e) => setCardPaymentEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-emerald-600"
            />
            <span className="text-slate-700">카드결제 사용</span>
          </label>
          <SupportedProgramsField
            copyApps={copyApps}
            pasteApps={pasteApps}
            onToggleCopy={(i) => setCopyApps((p) => toggleAt(p, i))}
            onTogglePaste={(i) => setPasteApps((p) => toggleAt(p, i))}
          />
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
