'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth/store';
import {
  listAircpmTossCredentials,
  upsertAircpmTossCredentials,
  type AircpmTossCredential,
} from '@/lib/api/aircpm-payments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// ─── Types ──────────────────────────────────────────────────────────

type PaymentEnv = 'TEST' | 'LIVE';

type FormState = { mid: string; clientKey: string; secretKey: string };

// ─── Constants ──────────────────────────────────────────────────────

const ENV_LABELS: Record<PaymentEnv, string> = {
  TEST: '테스트',
  LIVE: '운영 (실결제)',
};

// 카드 헤더용 — 탭 라벨과 중복 매칭을 피하기 위해 접미사 추가
const ENV_CARD_LABELS: Record<PaymentEnv, string> = {
  TEST: 'TEST 키 설정',
  LIVE: 'LIVE 키 설정',
};

// ─── Utilities ──────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// ─── Page ───────────────────────────────────────────────────────────

export default function TossCredentialsPage() {
  const { brchCd } = useParams<{ brchCd: string }>();
  const isSuper = useAuthStore((s) => s.user?.isSuper ?? false);
  const queryClient = useQueryClient();

  const { data: credentials, isLoading } = useQuery({
    queryKey: ['aircpm-toss-cred', brchCd],
    queryFn: () =>
      listAircpmTossCredentials(brchCd).catch((err) => {
        toast.error(extractErrorMessage(err) || '자격증명을 불러오지 못했습니다.');
        return [] as AircpmTossCredential[];
      }),
    enabled: Boolean(brchCd) && isSuper,
  });

  const credByEnv = useMemo(() => {
    const map: Partial<Record<PaymentEnv, AircpmTossCredential>> = {};
    (credentials ?? []).forEach((c) => {
      if (c.env === 'TEST' || c.env === 'LIVE') {
        map[c.env] = c;
      }
    });
    return map;
  }, [credentials]);

  const [activeEnv, setActiveEnv] = useState<PaymentEnv>('TEST');
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{
    env: PaymentEnv;
    mid: string;
    clientKey: string;
    secretKey: string;
  } | null>(null);

  // 폼 상태 (env별 분리)
  const [forms, setForms] = useState<Record<PaymentEnv, FormState>>({
    TEST: { mid: '', clientKey: '', secretKey: '' },
    LIVE: { mid: '', clientKey: '', secretKey: '' },
  });

  // 자격증명 로드 시 mid/clientKey 시드 (secretKey는 절대 시드하지 않음)
  useEffect(() => {
    setForms((prev) => ({
      TEST: {
        mid: credByEnv.TEST?.mid ?? prev.TEST.mid,
        clientKey: credByEnv.TEST?.clientKey ?? prev.TEST.clientKey,
        secretKey: '',
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
      upsertAircpmTossCredentials(brchCd, {
        env: vars.env,
        mid: vars.mid,
        clientKey: vars.clientKey,
        secretKey: vars.secretKey,
        isActive: true,
      }),
    onSuccess: (_res, vars) => {
      toast.success(`${ENV_LABELS[vars.env]} 자격증명이 저장되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['aircpm-toss-cred', brchCd] });
      setForms((prev) => ({ ...prev, [vars.env]: { ...prev[vars.env], secretKey: '' } }));
      setPendingPayload(null);
      setShowLiveConfirm(false);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || '저장에 실패했습니다.');
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
            {ENV_CARD_LABELS[env]}
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
              <div>
                현재 클라이언트 키: <span className="font-mono">{cred.clientKey}</span>
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

          <div className="flex justify-end pt-2">
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

  // 권한 가드 — super 전용
  if (!isSuper) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">토스 자격증명 관리</h1>
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-slate-700 font-medium">슈퍼 관리자 전용 메뉴입니다.</p>
            <p className="text-sm text-slate-500">
              토스 자격증명 관리는 슈퍼 관리자만 사용할 수 있습니다.
              지사 관리자는 사용자 / 기기 인증 / 로그인 로그 메뉴를 사용해 주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href="/aircpm/branches">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지사 목록으로
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">토스 자격증명 관리</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {brchCd} · 토스페이먼츠 가맹점 키
          </p>
        </div>
      </div>

      <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 space-y-1">
        <div>· 테스트 환경과 운영 환경 키는 별도 행으로 저장됩니다. 둘 다 등록해야 환경 전환이 매끄럽습니다.</div>
        <div>· 키 값은 토스페이먼츠 개발자 센터(developers.tosspayments.com)에서 발급받습니다.</div>
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

      {/* LIVE 저장 경고 — AlertDialog */}
      <AlertDialog
        open={showLiveConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setShowLiveConfirm(false);
            setPendingPayload(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>실결제 키를 저장하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="text-red-600">
              ⚠️ LIVE 환경 키는 실제 고객 결제에 사용됩니다. 잘못된 키를 입력하면 결제가 차단되거나
              잘못된 가맹점으로 정산될 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowLiveConfirm(false);
                setPendingPayload(null);
              }}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => pendingPayload && upsertMutation.mutate(pendingPayload)}
            >
              실결제 키로 저장
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
