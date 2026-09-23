'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { JisamapHistory } from '@/components/aircpm/jisamap-history';
import { JisamapPasteDialog } from '@/components/aircpm/jisamap-paste-dialog';
import { JisamapRuleCard } from '@/components/aircpm/jisamap-rule-card';
import { useAuthStore } from '@/lib/auth/store';
import {
  summarizeRules,
  conflictingSourceDigits,
  toClientRules,
  validateJisamapRules,
} from '@/lib/aircpm/jisamap';
import {
  fromWireRules,
  newRule,
  newSource,
  toWireRules,
  type EditorRule,
} from '@/lib/aircpm/jisamap-editor';
import {
  getJisamap,
  getJisamapHistory,
  revertJisamap,
  updateJisamap,
  type JisamapHistoryItem,
} from '@/lib/api/aircpm-jisamap';
import { listAircpmBranches } from '@/lib/api/aircpm-payments';

/**
 * 지사 콜패스 매핑 설정.
 *
 * 여러 제휴 지사에서 온 콜을 대표 지사 하나로 몰아서 접수하기 위한 규칙을 편집한다.
 * CPM 이 GET /aircpm/config/jisamap 으로 받아 배차 앱 지사 검색칸의 번호를 치환한다.
 *
 * ★지사는 정산 주체다. 오타 하나가 콜을 엉뚱한 지사로 보내고 정산을 틀어지게 한다.
 *   그래서 저장 전 요약·중복 즉시 경고·이력·되돌리기가 전부 필수 기능이다.
 */

function extractErrorInfo(err: unknown): { status?: number; message?: string } {
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number };
    return { status: anyErr.status, message: err.message };
  }
  return { message: String(err) };
}

function toastForError(err: unknown, fallback: string) {
  const { status, message } = extractErrorInfo(err);
  if (status === 403) return toast.error(message || '권한이 없습니다.');
  if ((status === 400 || status === 404) && message) return toast.error(message);
  toast.error(message || fallback);
}

export default function AircpmJisamapPage() {
  const queryClient = useQueryClient();
  const isSuper = useAuthStore((s) => s.user?.isSuper ?? false);

  // 비-super 는 brchCd 를 아예 보내지 않는다 — 서버가 자기 지사를 강제한다.
  const [selectedBrchCd, setSelectedBrchCd] = useState<string>('');
  const effectiveBrchCd = isSuper ? selectedBrchCd || undefined : undefined;

  const ACTIVE_KEY = ['admin-aircpm-jisamap', 'active', effectiveBrchCd ?? 'me'];
  const HISTORY_KEY = ['admin-aircpm-jisamap', 'history', effectiveBrchCd ?? 'me'];

  const branchesQuery = useQuery({
    queryKey: ['admin-aircpm-branches'],
    queryFn: listAircpmBranches,
    enabled: isSuper,
  });

  // super 가 지사를 아직 고르지 않았으면 서버에 물을 것이 없다 (403 만 돌아온다).
  const canQuery = !isSuper || !!selectedBrchCd;

  const activeQuery = useQuery({
    queryKey: ACTIVE_KEY,
    queryFn: () => getJisamap(effectiveBrchCd),
    enabled: canQuery,
  });
  const historyQuery = useQuery({
    queryKey: HISTORY_KEY,
    queryFn: () => getJisamapHistory(effectiveBrchCd, 50),
    enabled: canQuery,
  });

  const [rules, setRules] = useState<EditorRule[]>([]);
  const [note, setNote] = useState('');
  const [dirty, setDirty] = useState(false);
  const [pasteTargetRuleId, setPasteTargetRuleId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revertTarget, setRevertTarget] = useState<JisamapHistoryItem | null>(null);

  // 서버 응답이 오면 편집 상태를 다시 심는다.
  useEffect(() => {
    if (!activeQuery.data) return;
    setRules(fromWireRules(activeQuery.data.rules));
    setNote('');
    setDirty(false);
  }, [activeQuery.data]);

  const wireRules = useMemo(() => toWireRules(rules), [rules]);
  const validation = useMemo(() => validateJisamapRules(wireRules), [wireRules]);

  // CPM 이 실제로 받게 될 것 — 비활성 규칙은 빠진다. 요약도 중복 판정도 이 기준으로 맞춘다.
  const clientRules = useMemo(() => toClientRules(wireRules), [wireRules]);
  const summary = useMemo(() => summarizeRules(clientRules), [clientRules]);
  const disabledCount = wireRules.length - clientRules.length;

  /** 방향이 겹치는 두 활성 규칙에 걸쳐 중복된 소스 번호 — 해당 입력칸을 빨갛게 물들이는 데 쓴다. */
  const duplicateDigits = useMemo(() => conflictingSourceDigits(clientRules), [clientRules]);

  const patchRule = (id: string, next: EditorRule) => {
    setRules((prev) => prev.map((r) => (r.id === id ? next : r)));
    setDirty(true);
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      updateJisamap({
        brchCd: effectiveBrchCd,
        rules: wireRules,
        note: note.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(`v${res.version} 저장 완료`);
      if (res.warnings?.length) {
        res.warnings.forEach((w) => toast.warning(w));
      }
      queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
      setConfirmOpen(false);
      setDirty(false);
      setNote('');
    },
    onError: (err) => toastForError(err, '저장에 실패했습니다.'),
  });

  const revertMutation = useMutation({
    mutationFn: (toVersion: number) => revertJisamap({ brchCd: effectiveBrchCd, toVersion }),
    onSuccess: (res) => {
      toast.success(`v${res.revertedFrom} 내용으로 새 v${res.version} 생성됨`);
      queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
      setRevertTarget(null);
    },
    onError: (err) => toastForError(err, '되돌리기에 실패했습니다.'),
  });

  const canSave = dirty && validation.errors.length === 0 && !updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">지사 매핑</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            여러 지사에서 들어온 콜을 대표 지사 하나로 몰아서 접수합니다. 매칭 키는 대표번호이며,
            지사명은 화면 표시용입니다. 규칙에 없는 지사는 원본 그대로 접수됩니다.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {activeQuery.data && (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 tabular-nums">
              {activeQuery.data.version > 0 ? `적용 중 · v${activeQuery.data.version}` : '설정 없음'}
            </Badge>
          )}
          {isSuper ? (
            <Select value={selectedBrchCd} onValueChange={setSelectedBrchCd}>
              <SelectTrigger className="w-56" aria-label="지사 선택">
                <SelectValue placeholder="지사 선택" />
              </SelectTrigger>
              <SelectContent>
                {(branchesQuery.data ?? []).map((b) => (
                  <SelectItem key={b.brchCd} value={b.brchCd}>
                    {b.name ? `${b.name} (${b.brchCd})` : b.brchCd}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            // 지사 관리자는 고를 것이 없다. 서버가 준 값을 그대로 보여준다.
            <div className="text-sm text-slate-600 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200">
              {activeQuery.data?.brchCd ?? '내 지사'}
            </div>
          )}
        </div>
      </div>

      {isSuper && !selectedBrchCd && (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            지사를 선택하면 그 지사의 매핑 규칙을 편집할 수 있습니다.
          </CardContent>
        </Card>
      )}

      {canQuery && activeQuery.isLoading && (
        <div className="text-center py-12 text-slate-500">로딩 중...</div>
      )}

      {canQuery && activeQuery.isError && (
        <Card>
          <CardContent className="p-6 text-red-600 text-sm">
            설정을 불러오지 못했습니다. 권한 또는 백엔드 상태를 확인해 주세요.
          </CardContent>
        </Card>
      )}

      {canQuery && activeQuery.data && (
        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">규칙 편집</TabsTrigger>
            <TabsTrigger value="history">이력</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4 space-y-3">
            {rules.map((r, i) => (
              <JisamapRuleCard
                key={r.id}
                rule={r}
                index={i}
                duplicateDigits={duplicateDigits}
                onChange={(next) => patchRule(r.id, next)}
                onRemove={() => {
                  setRules((prev) => prev.filter((x) => x.id !== r.id));
                  setDirty(true);
                }}
                onPaste={() => setPasteTargetRuleId(r.id)}
                disabled={updateMutation.isPending}
              />
            ))}

            {rules.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-slate-400 text-sm">
                  규칙이 없습니다. CPM 은 모든 콜을 원본 지사 그대로 접수합니다.
                </CardContent>
              </Card>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setRules((prev) => [...prev, newRule()]);
                setDirty(true);
              }}
              disabled={updateMutation.isPending}
            >
              + 규칙 추가
            </Button>

            <Card>
              <CardContent className="p-4 space-y-3">
                {validation.errors.length > 0 && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm space-y-0.5">
                    {validation.errors.map((e, i) => (
                      <div key={i}>⚠ {e}</div>
                    ))}
                  </div>
                )}
                {validation.warnings.length > 0 && (
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm space-y-0.5">
                    {validation.warnings.map((w, i) => (
                      <div key={i}>· {w}</div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      변경 내용 메모 (선택, 이력에 기록)
                    </label>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="예: 안심대리 신규 편입"
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setConfirmOpen(true)}
                    disabled={!canSave}
                  >
                    저장 (새 버전 생성)
                  </Button>
                </div>

                {dirty && (
                  <p className="text-xs text-amber-600">
                    변경사항이 있습니다. 저장하지 않고 페이지를 벗어나면 내용이 사라집니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <JisamapHistory
              items={historyQuery.data?.items ?? []}
              isLoading={historyQuery.isLoading}
              onRevert={setRevertTarget}
              disabled={revertMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      )}

      <JisamapPasteDialog
        open={!!pasteTargetRuleId}
        onOpenChange={(o) => !o && setPasteTargetRuleId(null)}
        onConfirm={(sources) => {
          setRules((prev) =>
            prev.map((r) =>
              r.id === pasteTargetRuleId
                ? { ...r, sources: [...r.sources, ...sources.map((s) => newSource(s))] }
                : r,
            ),
          );
          setDirty(true);
        }}
      />

      {/* 저장 전 요약 확인 — 몇 개 지사가 어디로 가는지 눈으로 보고 누른다. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이대로 저장하시겠습니까?</DialogTitle>
            <DialogDescription>
              저장하면 CPM 이 다음 조회부터 이 규칙으로 콜패스합니다. 지사는 정산 주체이니
              번호를 한 번 더 확인해 주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            {summary.map((s, i) => (
              <div
                key={i}
                className="text-sm text-slate-800 px-3 py-2 rounded-md bg-slate-50 border border-slate-200"
              >
                {s}
              </div>
            ))}
            {summary.length === 0 && (
              <p className="text-sm text-amber-700">
                적용되는 규칙이 하나도 없습니다. 저장하면 이 지사의 매핑이 모두 해제되고, 콜은
                원본 지사 그대로 접수됩니다.
              </p>
            )}
            {disabledCount > 0 && (
              <p className="text-xs text-slate-500 pt-1">
                비활성 규칙 {disabledCount}건은 설정에 남지만 CPM 에 내려가지 않습니다.
              </p>
            )}
          </div>

          {validation.warnings.length > 0 && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm space-y-0.5">
              {validation.warnings.map((w, i) => (
                <div key={i}>· {w}</div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 되돌리기 확인 */}
      <Dialog open={!!revertTarget} onOpenChange={(o) => !o && setRevertTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>v{revertTarget?.version} 로 되돌리시겠습니까?</DialogTitle>
            <DialogDescription>
              그 버전의 내용으로 새 버전을 만들어 적용합니다. 이 동작도 이력에 남아 다시 되돌릴 수
              있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            {summarizeRules(revertTarget?.rules ?? []).map((s, i) => (
              <div
                key={i}
                className="text-sm text-slate-800 px-3 py-2 rounded-md bg-slate-50 border border-slate-200"
              >
                {s}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={revertMutation.isPending}
              onClick={() => revertTarget && revertMutation.mutate(revertTarget.version)}
            >
              {revertMutation.isPending ? '처리 중...' : '되돌리기 실행'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
