'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth/store';
import { api } from '@/lib/api/client';
import {
  listBranchPaymentCredentials,
  upsertBranchPaymentCredential,
  deactivateBranchPaymentCredential,
  type BranchPaymentCredential,
  type PaymentEnv,
} from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface BranchSummary {
  id: number;
  name: string;
  code?: string | null;
  type?: string;
}

const ENV_LABELS: Record<PaymentEnv, string> = {
  TEST: '테스트',
  LIVE: '운영(실결제)',
};

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

function extractErrorInfo(err: unknown): { status?: number; message?: string } {
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number };
    return { status: anyErr.status, message: err.message };
  }
  return { message: String(err) };
}

export default function BranchPaymentCredentialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const branchId = Number(id);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // 권한 가드 — SUPER_ADMIN만 사용
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      toast.error('본사 관리자(SUPER_ADMIN)만 사용할 수 있습니다.');
      router.replace(`/admin/branches/${id}`);
    }
  }, [user, id, router]);

  const { data: branch } = useQuery({
    queryKey: ['admin-branch', id],
    queryFn: () => api<BranchSummary>(`/admin/organizations/${id}`).catch(() => null),
  });

  const { data: credentials, isLoading } = useQuery({
    queryKey: ['admin-branch-pay-cred', branchId],
    queryFn: () => listBranchPaymentCredentials(branchId).catch(() => [] as BranchPaymentCredential[]),
    enabled: !Number.isNaN(branchId),
  });

  const credByEnv = useMemo(() => {
    const map: Partial<Record<PaymentEnv, BranchPaymentCredential>> = {};
    (credentials ?? []).forEach((c) => {
      if (c.provider === 'toss' && (c.env === 'TEST' || c.env === 'LIVE')) {
        map[c.env] = c;
      }
    });
    return map;
  }, [credentials]);

  const [activeEnv, setActiveEnv] = useState<PaymentEnv>('TEST');
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{
    env: PaymentEnv;
    mid: string;
    clientKey: string;
    secretKey: string;
  } | null>(null);

  // 폼 상태 (env별 분리)
  const [forms, setForms] = useState<Record<PaymentEnv, { mid: string; clientKey: string; secretKey: string }>>({
    TEST: { mid: '', clientKey: '', secretKey: '' },
    LIVE: { mid: '', clientKey: '', secretKey: '' },
  });

  // 자격증명 로드 시 mid/clientKey 시드 (secretKey는 절대 안 옴)
  useEffect(() => {
    setForms((prev) => ({
      TEST: {
        mid: credByEnv.TEST?.mid ?? prev.TEST.mid,
        clientKey: credByEnv.TEST?.clientKey ?? prev.TEST.clientKey,
        secretKey: '', // 항상 빈 상태로 (서버는 마스킹된 값도 안 줌)
      },
      LIVE: {
        mid: credByEnv.LIVE?.mid ?? prev.LIVE.mid,
        clientKey: credByEnv.LIVE?.clientKey ?? prev.LIVE.clientKey,
        secretKey: '',
      },
    }));
  }, [credByEnv.TEST?.mid, credByEnv.TEST?.clientKey, credByEnv.LIVE?.mid, credByEnv.LIVE?.clientKey]);

  const upsertMutation = useMutation({
    mutationFn: (vars: { env: PaymentEnv; mid: string; clientKey: string; secretKey: string }) =>
      upsertBranchPaymentCredential(branchId, {
        provider: 'toss',
        env: vars.env,
        mid: vars.mid,
        clientKey: vars.clientKey,
        secretKey: vars.secretKey,
        isActive: true,
      }),
    onSuccess: (_res, vars) => {
      toast.success(`${ENV_LABELS[vars.env]} 자격증명이 저장되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['admin-branch-pay-cred', branchId] });
      setForms((prev) => ({ ...prev, [vars.env]: { ...prev[vars.env], secretKey: '' } }));
      setPendingPayload(null);
      setShowLiveConfirm(false);
    },
    onError: (err) => {
      const { status, message } = extractErrorInfo(err);
      if (status === 401 || status === 403) {
        toast.error('권한이 없습니다. SUPER_ADMIN 계정으로 다시 로그인하세요.');
      } else {
        toast.error(message || '저장에 실패했습니다.');
      }
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (env: PaymentEnv) =>
      deactivateBranchPaymentCredential(branchId, { provider: 'toss', env }),
    onSuccess: (_res, env) => {
      toast.success(`${ENV_LABELS[env]} 자격증명이 비활성화되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['admin-branch-pay-cred', branchId] });
      setShowDeactivate(false);
    },
    onError: (err) => {
      const { message } = extractErrorInfo(err);
      toast.error(message || '비활성화에 실패했습니다.');
    },
  });

  const handleSave = (env: PaymentEnv) => {
    const f = forms[env];
    const mid = f.mid.trim();
    const clientKey = f.clientKey.trim();
    const secretKey = f.secretKey.trim();
    if (!mid || !clientKey || !secretKey) {
      toast.error('상점아이디(MID), 클라이언트 키, 시크릿 키 모두 입력해야 합니다.');
      return;
    }
    if (env === 'LIVE') {
      setPendingPayload({ env, mid, clientKey, secretKey });
      setShowLiveConfirm(true);
      return;
    }
    upsertMutation.mutate({ env, mid, clientKey, secretKey });
  };

  const renderForm = (env: PaymentEnv) => {
    const cred = credByEnv[env];
    const f = forms[env];
    const isLive = env === 'LIVE';
    return (
      <Card className={isLive ? 'border-amber-200 bg-amber-50/30' : ''}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {ENV_LABELS[env]} 환경
            {cred?.isActive ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                등록됨
              </Badge>
            ) : cred && !cred.isActive ? (
              <Badge variant="secondary">비활성</Badge>
            ) : (
              <Badge variant="outline" className="text-slate-400">미등록</Badge>
            )}
            {isLive && (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                실결제
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cred && (
            <div className="text-xs text-slate-500 space-y-0.5 bg-slate-50 rounded-md p-2.5 border border-slate-100">
              <div>마지막 수정: {fmtDateTime(cred.updatedAt || cred.createdAt)}</div>
              <div>
                현재 클라이언트 키: <span className="font-mono">{cred.clientKeyMasked || cred.clientKey}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`mid-${env}`}>상점아이디 (MID)</Label>
            <Input
              id={`mid-${env}`}
              value={f.mid}
              onChange={(e) =>
                setForms((p) => ({ ...p, [env]: { ...p[env], mid: e.target.value } }))
              }
              placeholder={isLive ? 'live_M_xxxxxxxx' : 'tosstest_M_xxxxxxxx'}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`ck-${env}`}>클라이언트 키 (Client Key)</Label>
            <Input
              id={`ck-${env}`}
              value={f.clientKey}
              onChange={(e) =>
                setForms((p) => ({ ...p, [env]: { ...p[env], clientKey: e.target.value } }))
              }
              placeholder={isLive ? 'live_ck_xxxxxxxx' : 'test_ck_xxxxxxxx'}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`sk-${env}`}>시크릿 키 (Secret Key)</Label>
            <Input
              id={`sk-${env}`}
              type="password"
              value={f.secretKey}
              onChange={(e) =>
                setForms((p) => ({ ...p, [env]: { ...p[env], secretKey: e.target.value } }))
              }
              placeholder={
                cred
                  ? '변경 시 다시 입력 (저장된 값은 다시 조회 불가)'
                  : isLive
                    ? 'live_sk_xxxxxxxx'
                    : 'test_sk_xxxxxxxx'
              }
              autoComplete="new-password"
              spellCheck={false}
            />
            <p className="text-[11px] text-slate-500">
              시크릿 키는 저장 후 다시 조회할 수 없습니다. 변경 시 전체를 다시 입력하세요.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {cred?.isActive && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveEnv(env);
                  setShowDeactivate(true);
                }}
                disabled={deactivateMutation.isPending}
              >
                비활성화
              </Button>
            )}
            <Button
              type="button"
              onClick={() => handleSave(env)}
              disabled={upsertMutation.isPending}
              className={isLive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {upsertMutation.isPending && upsertMutation.variables?.env === env
                ? '저장 중...'
                : '저장'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (user && user.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href={`/admin/branches/${id}`}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지사 상세로
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">결제 자격증명 관리</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {branch?.name ? `${branch.name} · ` : ''}토스페이먼츠 가맹점 키
          </p>
        </div>
      </div>

      <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 space-y-1">
        <div>· TEST와 LIVE는 별도 행으로 저장됩니다. 둘 다 등록해야 환경 전환이 매끄럽습니다.</div>
        <div>· 키 값은 토스페이먼츠 개발자 센터(developers.tosspayments.com) 가맹점 관리에서 발급받습니다.</div>
        <div>· 시크릿 키는 서버에만 저장되며, 어떤 화면에서도 다시 표시되지 않습니다.</div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">로딩 중...</div>
      ) : (
        <Tabs value={activeEnv} onValueChange={(v) => setActiveEnv(v as PaymentEnv)}>
          <TabsList>
            <TabsTrigger value="TEST">
              테스트
              {credByEnv.TEST?.isActive && <span className="ml-1.5 text-emerald-600">●</span>}
            </TabsTrigger>
            <TabsTrigger value="LIVE">
              운영 (실결제)
              {credByEnv.LIVE?.isActive && <span className="ml-1.5 text-emerald-600">●</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="TEST" className="mt-4">
            {renderForm('TEST')}
          </TabsContent>
          <TabsContent value="LIVE" className="mt-4">
            {renderForm('LIVE')}
          </TabsContent>
        </Tabs>
      )}

      {/* LIVE 등록 confirm */}
      <Dialog open={showLiveConfirm} onOpenChange={(open) => !open && setShowLiveConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>실결제 키를 저장하시겠습니까?</DialogTitle>
            <DialogDescription className="text-red-600">
              ⚠️ LIVE 환경 키는 실제 고객 결제에 사용됩니다. 잘못된 키를 입력하면 결제가 차단되거나
              잘못된 가맹점으로 정산될 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLiveConfirm(false)}>
              취소
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={upsertMutation.isPending}
              onClick={() => pendingPayload && upsertMutation.mutate(pendingPayload)}
            >
              {upsertMutation.isPending ? '저장 중...' : '실결제 키로 저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비활성화 confirm */}
      <Dialog open={showDeactivate} onOpenChange={(open) => !open && setShowDeactivate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ENV_LABELS[activeEnv]} 자격증명을 비활성화하시겠습니까?</DialogTitle>
            <DialogDescription>
              해당 환경에서 이 지사의 결제가 차단됩니다. 같은 키로 재등록(저장)하면 다시 활성화됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivate(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate(activeEnv)}
            >
              {deactivateMutation.isPending ? '처리 중...' : '비활성화'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
