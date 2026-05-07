'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAircpmUserSettings,
  updateAircpmUserSettings,
  type AircpmUserSettings,
} from '@/lib/api/aircpm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const APP_LABELS: [string, string, string, string] = ['AUTO', 'D5', 'XE4', 'ICON'];

function extractErrorInfo(err: unknown): { status?: number; message?: string } {
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number };
    return { status: anyErr.status, message: err.message };
  }
  return { message: String(err) };
}

function toastForError(err: unknown, fallback: string) {
  const { status, message } = extractErrorInfo(err);
  if (status === 404) return toast.error('사용자를 찾을 수 없습니다.');
  if (status === 403) return toast.error('권한이 없습니다.');
  toast.error(message || fallback);
}

export default function AircpmUserSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = decodeURIComponent(params.userId as string);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-aircpm-user-settings', userId],
    queryFn: () => getAircpmUserSettings(userId),
  });

  // Local form state, initialized from fetched data
  const [appTitle, setAppTitle] = useState('AirCPM');
  const [copyApps, setCopyApps] = useState<[boolean, boolean, boolean, boolean]>([
    true,
    true,
    true,
    true,
  ]);
  const [pasteApps, setPasteApps] = useState<[boolean, boolean, boolean, boolean]>([
    true,
    true,
    true,
    true,
  ]);
  const [priceUp, setPriceUp] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAppTitle(data.appTitle ?? 'AirCPM');
    setCopyApps(data.copyApps);
    setPasteApps(data.pasteApps);
    setPriceUp(data.priceUp);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: AircpmUserSettings = {
        appTitle: appTitle.trim() || 'AirCPM',
        copyApps,
        pasteApps,
        priceUp,
      };
      return updateAircpmUserSettings(userId, body);
    },
    onSuccess: () => {
      toast.success('설정이 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-aircpm-user-settings', userId] });
    },
    onError: (err) => toastForError(err, '저장에 실패했습니다.'),
  });

  const toggleCopy = (i: number) => {
    const next = [...copyApps] as [boolean, boolean, boolean, boolean];
    next[i] = !next[i];
    setCopyApps(next);
  };
  const togglePaste = (i: number) => {
    const next = [...pasteApps] as [boolean, boolean, boolean, boolean];
    next[i] = !next[i];
    setPasteApps(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/aircpm/users" className="hover:text-slate-700 hover:underline">
              사용자
            </Link>
            <span>/</span>
            <span className="text-slate-400">{userId}</span>
            <span>/</span>
            <span>설정</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{userId} 설정</h1>
          <p className="text-sm text-slate-500 mt-1">
            앱 타이틀, 복사/붙여넣기 대상, 단가 인상 옵션을 편집합니다.
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/aircpm/users')}>
          ← 목록으로
        </Button>
      </div>

      {isLoading && <div className="text-center py-12 text-slate-500">로딩 중...</div>}
      {isError && (
        <Card>
          <CardContent className="py-12 text-center text-red-600">
            설정을 불러오지 못했습니다. 사용자가 존재하지 않거나 권한이 없을 수 있습니다.
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardContent className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] tracking-[0.22em] uppercase text-slate-500 font-semibold mb-2">
                  앱 타이틀 (appTitle)
                </label>
                <Input
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  placeholder="AirCPM"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  데스크톱 클라이언트 창 제목에 표시됩니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 mb-1">복사 대상 앱 (copyApps)</h2>
                <p className="text-[12px] text-slate-500">
                  체크된 앱에서 데이터 복사가 허용됩니다.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {APP_LABELS.map((label, i) => (
                  <label
                    key={label}
                    className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={copyApps[i]}
                      onChange={() => toggleCopy(i)}
                      className="w-4 h-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 mb-1">붙여넣기 대상 앱 (pasteApps)</h2>
                <p className="text-[12px] text-slate-500">체크된 앱에 데이터 붙여넣기가 허용됩니다.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {APP_LABELS.map((label, i) => (
                  <label
                    key={label}
                    className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={pasteApps[i]}
                      onChange={() => togglePaste(i)}
                      className="w-4 h-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={priceUp}
                  onChange={(e) => setPriceUp(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 accent-emerald-600"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">단가 인상 옵션 (priceUp)</p>
                  <p className="text-xs text-slate-500 mt-1">
                    활성화 시 해당 사용자가 처리한 주문의 단가가 서버 정책에 따라 자동 인상됩니다.
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => router.push('/aircpm/users')}>
              취소
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
