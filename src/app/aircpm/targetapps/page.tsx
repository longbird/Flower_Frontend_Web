'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getTargetAppsActive,
  getTargetAppsHistory,
  updateTargetApps,
  revertTargetApps,
  validateTargetAppsConfig,
  type TargetAppsHistoryItem,
} from '@/lib/api/aircpm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Error helpers ─────────────────────────────────────────────────

function extractErrorInfo(err: unknown): { status?: number; message?: string } {
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number };
    return { status: anyErr.status, message: err.message };
  }
  return { message: String(err) };
}

function toastForError(err: unknown, fallback: string) {
  const { status, message } = extractErrorInfo(err);
  if (status === 403) return toast.error('권한이 없습니다.');
  if (status === 404 && message) return toast.error(message);
  if (status === 400 && message) return toast.error(message);
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

// ─── Main page ─────────────────────────────────────────────────────

type AppKey = 'logiD5' | 'manerXE4' | 'iDriver';
const APP_LABELS: Record<AppKey, string> = {
  logiD5: 'LogiD5',
  manerXE4: 'ManerXE4',
  iDriver: 'iDriver',
};

export default function AircpmTargetAppsPage() {
  const queryClient = useQueryClient();
  const ACTIVE_KEY = ['admin-aircpm-targetapps', 'active'];
  const HISTORY_KEY = ['admin-aircpm-targetapps', 'history'];

  const activeQuery = useQuery({
    queryKey: ACTIVE_KEY,
    queryFn: getTargetAppsActive,
  });
  const historyQuery = useQuery({
    queryKey: HISTORY_KEY,
    queryFn: () => getTargetAppsHistory(50),
  });

  // Local editable JSON per app tab — initialized from active config
  const [logiD5Json, setLogiD5Json] = useState('');
  const [manerXE4Json, setManerXE4Json] = useState('');
  const [iDriverJson, setIDriverJson] = useState('');
  const [note, setNote] = useState('');
  const [dirty, setDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Seed editor state from server response on first/refreshed load
  useEffect(() => {
    if (!activeQuery.data) return;
    const cfg = activeQuery.data as Record<string, unknown>;
    setLogiD5Json(JSON.stringify(cfg.logiD5 ?? {}, null, 2));
    setManerXE4Json(JSON.stringify(cfg.manerXE4 ?? {}, null, 2));
    setIDriverJson(JSON.stringify(cfg.iDriver ?? {}, null, 2));
    setDirty(false);
    setValidationErrors([]);
  }, [activeQuery.data]);

  // Build the payload to send
  const buildConfig = (): { config: Record<string, unknown> } | { parseError: string } => {
    try {
      const config = {
        logiD5: JSON.parse(logiD5Json),
        manerXE4: JSON.parse(manerXE4Json),
        iDriver: JSON.parse(iDriverJson),
      };
      return { config };
    } catch (err) {
      return { parseError: err instanceof Error ? err.message : 'JSON 파싱 실패' };
    }
  };

  const updateMutation = useMutation({
    mutationFn: (body: { config: Record<string, unknown>; note?: string }) => updateTargetApps(body),
    onSuccess: (res) => {
      toast.success(`v${res.version} 저장 완료`);
      queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
      setDirty(false);
      setNote('');
    },
    onError: (err) => toastForError(err, '저장에 실패했습니다.'),
  });

  const handleSave = () => {
    const built = buildConfig();
    if ('parseError' in built) {
      setValidationErrors([`JSON 파싱 오류: ${built.parseError}`]);
      toast.error('JSON 문법 오류가 있습니다.');
      return;
    }
    const errors = validateTargetAppsConfig(built.config);
    setValidationErrors(errors);
    if (errors.length > 0) {
      toast.error('필수 키가 누락되었습니다.');
      return;
    }
    updateMutation.mutate({ config: built.config, note: note.trim() || undefined });
  };

  const handleReset = () => {
    if (!activeQuery.data) return;
    const cfg = activeQuery.data as Record<string, unknown>;
    setLogiD5Json(JSON.stringify(cfg.logiD5 ?? {}, null, 2));
    setManerXE4Json(JSON.stringify(cfg.manerXE4 ?? {}, null, 2));
    setIDriverJson(JSON.stringify(cfg.iDriver ?? {}, null, 2));
    setNote('');
    setDirty(false);
    setValidationErrors([]);
  };

  // Revert state
  const [revertTarget, setRevertTarget] = useState<TargetAppsHistoryItem | null>(null);
  const [viewTarget, setViewTarget] = useState<TargetAppsHistoryItem | null>(null);

  const revertMutation = useMutation({
    mutationFn: (toVersion: number) => revertTargetApps({ toVersion }),
    onSuccess: (res) => {
      toast.success(`v${res.revertedFrom} 내용으로 새 v${res.version} 생성됨`);
      queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
      setRevertTarget(null);
    },
    onError: (err) => toastForError(err, '롤백에 실패했습니다.'),
  });

  const currentVersion = activeQuery.data?.version;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">배차앱 설정</h1>
          <p className="text-sm text-slate-500 mt-1">
            LogiD5 · ManerXE4 · iDriver의 창 클래스·컨트롤 ID 매핑을 편집합니다. 저장 시 새 버전이
            생성되며 이력에서 롤백할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {currentVersion != null && (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 tabular-nums">
              현재 active · v{currentVersion}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => activeQuery.refetch()}>
            새로고침
          </Button>
        </div>
      </div>

      {activeQuery.isLoading && (
        <div className="text-center py-12 text-slate-500">로딩 중...</div>
      )}

      {activeQuery.isError && (
        <Card>
          <CardContent className="p-6 text-red-600 text-sm">
            설정을 불러오지 못했습니다. 권한 또는 백엔드 상태를 확인해 주세요.
          </CardContent>
        </Card>
      )}

      {activeQuery.data && (
        <Tabs defaultValue="logiD5">
          <TabsList>
            <TabsTrigger value="logiD5">LogiD5</TabsTrigger>
            <TabsTrigger value="manerXE4">ManerXE4</TabsTrigger>
            <TabsTrigger value="iDriver">iDriver</TabsTrigger>
            <TabsTrigger value="history">이력</TabsTrigger>
          </TabsList>

          {/* LogiD5 */}
          <TabsContent value="logiD5" className="mt-4">
            <JsonEditor
              label="LogiD5 설정"
              hint="window, fields, buttons, xtp 를 포함해야 합니다. 값은 16진수 문자열 (예: 0x1DA)."
              value={logiD5Json}
              onChange={(v) => {
                setLogiD5Json(v);
                setDirty(true);
              }}
            />
          </TabsContent>

          {/* ManerXE4 */}
          <TabsContent value="manerXE4" className="mt-4">
            <JsonEditor
              label="ManerXE4 설정"
              hint="window, jisaLabels, startLabels, payTypes, buttons. 레이블/버튼은 텍스트 매칭에 사용됩니다."
              value={manerXE4Json}
              onChange={(v) => {
                setManerXE4Json(v);
                setDirty(true);
              }}
            />
          </TabsContent>

          {/* iDriver */}
          <TabsContent value="iDriver" className="mt-4">
            <JsonEditor
              label="iDriver 설정"
              hint="window, fields 를 포함해야 합니다."
              value={iDriverJson}
              onChange={(v) => {
                setIDriverJson(v);
                setDirty(true);
              }}
            />
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="mt-4">
            <HistoryList
              items={historyQuery.data?.items ?? []}
              isLoading={historyQuery.isLoading}
              onView={setViewTarget}
              onRevert={setRevertTarget}
            />
          </TabsContent>
        </Tabs>
      )}

      {activeQuery.data && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  변경 내용 메모 (선택, 이력에 기록)
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="예: XE4 11.5 버전에서 클래스명 변경 반영"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset} disabled={!dirty}>
                  원상복구
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSave}
                  disabled={updateMutation.isPending || !dirty}
                >
                  {updateMutation.isPending ? '저장 중...' : '저장 (새 버전 생성)'}
                </Button>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm space-y-0.5">
                {validationErrors.map((e, i) => (
                  <div key={i}>⚠ {e}</div>
                ))}
              </div>
            )}

            {dirty && validationErrors.length === 0 && (
              <p className="text-xs text-amber-600">
                변경사항이 있습니다. 저장하지 않고 페이지를 벗어나면 내용이 사라집니다.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* View version dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>v{viewTarget?.version} 내용 보기</DialogTitle>
            <DialogDescription>
              {viewTarget && (
                <span className="tabular-nums">
                  {fmtDateTime(viewTarget.createdAt)} · by{' '}
                  {viewTarget.createdBy != null ? `admin#${viewTarget.createdBy}` : '시드'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {viewTarget && <VersionViewer version={viewTarget.version} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert confirmation */}
      <Dialog open={!!revertTarget} onOpenChange={(open) => !open && setRevertTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>v{revertTarget?.version} 로 롤백하시겠습니까?</DialogTitle>
            <DialogDescription className="text-red-600">
              v{revertTarget?.version} 내용으로 새 버전을 생성하며 현재 active는 비활성화됩니다. 이 동작은 되돌릴 수 있지만
              새로운 버전 번호가 부여됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={revertMutation.isPending}
              onClick={() => revertTarget && revertMutation.mutate(revertTarget.version)}
            >
              {revertMutation.isPending ? '처리 중...' : '롤백 실행'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── JSON editor sub-component ────────────────────────────────────

function JsonEditor({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Track parse error locally for instant feedback without blocking typing
  const parseErr = useMemo(() => {
    try {
      JSON.parse(value);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'JSON 파싱 실패';
    }
  }, [value]);

  const lineCount = value.split('\n').length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-900">{label}</h2>
          <span className="text-xs text-slate-400 tabular-nums">{lineCount} lines</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">{hint}</p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={22}
          className="w-full px-3 py-2.5 text-[13px] rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 font-mono leading-snug resize-y"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        />
        {parseErr ? (
          <div className="mt-2 text-xs text-red-600 font-mono">JSON 오류: {parseErr}</div>
        ) : (
          <div className="mt-2 text-xs text-emerald-600">✓ JSON 문법 유효</div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── History list ──────────────────────────────────────────────────

function HistoryList({
  items,
  isLoading,
  onView,
  onRevert,
}: {
  items: TargetAppsHistoryItem[];
  isLoading: boolean;
  onView: (item: TargetAppsHistoryItem) => void;
  onRevert: (item: TargetAppsHistoryItem) => void;
}) {
  if (isLoading) return <div className="text-center py-8 text-slate-500">로딩 중...</div>;
  if (items.length === 0)
    return <div className="text-center py-12 text-slate-400">이력이 없습니다.</div>;

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <Card key={it.version} className={it.isActive ? 'ring-1 ring-emerald-200' : ''}>
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  it.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              <span className="font-semibold text-sm text-slate-900 tabular-nums">v{it.version}</span>
              {it.isActive && (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                  active
                </Badge>
              )}
              <span className="text-xs text-slate-500 tabular-nums">
                {fmtDateTime(it.createdAt)}
              </span>
              <span className="text-xs text-slate-400">
                by {it.createdBy != null ? `admin#${it.createdBy}` : '시드'}
              </span>
              {it.note && <span className="text-xs text-slate-500 truncate">· {it.note}</span>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onView(it)}>
                보기
              </Button>
              {!it.isActive && (
                <Button size="sm" variant="outline" onClick={() => onRevert(it)}>
                  롤백
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Version content viewer ───────────────────────────────────────
//
// 백엔드는 특정 version 내용을 직접 반환하는 엔드포인트는 제공하지 않으므로,
// 현재 active만 실시간으로 보여줄 수 있다. active가 아닌 version의 상세
// 내용은 "롤백하여 확인" 하는 방식 또는 향후 스펙 확장을 통해 지원된다.

function VersionViewer({ version }: { version: number }) {
  const activeQuery = useQuery({
    queryKey: ['admin-aircpm-targetapps', 'active'],
    queryFn: getTargetAppsActive,
    staleTime: 30_000,
  });
  const activeVersion = activeQuery.data?.version;
  const isActive = activeVersion === version;

  if (!isActive) {
    return (
      <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        현재 active가 아닌 버전의 본문은 별도 API가 제공되지 않아 미리볼 수 없습니다. 필요 시 &lsquo;롤백&rsquo;을
        눌러 해당 버전의 내용을 새 버전으로 다시 활성화해 주세요.
      </div>
    );
  }

  return (
    <pre
      className="p-3 rounded-md bg-slate-900 text-slate-100 text-[12px] leading-snug overflow-auto max-h-[60vh]"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
    >
      {JSON.stringify(activeQuery.data ?? {}, null, 2)}
    </pre>
  );
}
