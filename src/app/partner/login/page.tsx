'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePartnerAuthStore } from '@/lib/auth/partner-store';
import { partnerLoginStep1, partnerLoginStep2, partnerSimpleLogin } from '@/lib/api/partner';
import type { PartnerUser } from '@/lib/types/partner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PartnerLoginPage() {
  const router = useRouter();
  const login = usePartnerAuthStore((s) => s.login);

  const [accountId, setAccountId] = useState('demo');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  const [twoFaRequired, setTwoFaRequired] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !password) {
      toast.error('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const step1Res = await partnerLoginStep1(accountId, password);

      if (step1Res.twoFactorStatus === 'REQUIRED') {
        setTwoFaRequired(true);
        setSessionToken(step1Res.sessionToken || '');
        setMaskedPhone(step1Res.maskedPhone || '');
        toast.info(`인증번호가 ${step1Res.maskedPhone}로 전송되었습니다.`);
        return;
      }

      const simpleRes = await partnerSimpleLogin(accountId, password);
      if (simpleRes.ok) {
        const user: PartnerUser = {
          id: simpleRes.partnerId,
          accountId,
          type: 'FLORIST',
          partnerId: simpleRes.partnerId,
        };
        login(simpleRes.token, '', user);
        toast.success('환영합니다.');
        router.replace('/partner/orders');
      } else {
        toast.error('로그인에 실패했습니다.');
      }
    } catch {
      try {
        const simpleRes = await partnerSimpleLogin(accountId, password);
        if (simpleRes.ok) {
          const user: PartnerUser = {
            id: simpleRes.partnerId,
            accountId,
            type: 'FLORIST',
            partnerId: simpleRes.partnerId,
          };
          login(simpleRes.token, '', user);
          toast.success('환영합니다.');
          router.replace('/partner/orders');
        } else {
          toast.error('아이디 또는 비밀번호가 일치하지 않습니다.');
        }
      } catch (err2) {
        toast.error(err2 instanceof Error ? err2.message : '로그인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      toast.error('인증번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await partnerLoginStep2(sessionToken, verificationCode);
      const user: PartnerUser = {
        id: res.user.id,
        accountId: res.user.accountId,
        role: res.user.role,
        type: 'FLORIST',
      };
      login(res.accessToken, '', user);
      toast.success('환영합니다.');
      router.replace('/partner/orders');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4">
      <Card className="w-full max-w-xs sm:max-w-md bg-white/90 backdrop-blur-md border border-white/20 shadow-2xl animate-fade-in">
        <CardHeader className="text-center pb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1-.59-1.85-1.43-2.25.84-.4 1.43-1.25 1.43-2.25 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C14.5 2.12 13.38 1 12 1S9.5 2.12 9.5 3.5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 1 .59 1.85 1.43 2.25-.84.4-1.43 1.25-1.43 2.25zM12 5.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S9.5 9.38 9.5 8s1.12-2.5 2.5-2.5zM3 13c0 4.97 4.03 9 9 9-4.97 0-9-4.03-9-9z"/>
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">파트너 로그인</CardTitle>
          <p className="text-sm text-slate-500 mt-1">주문 관리 시스템</p>
        </CardHeader>
        <CardContent>
          {twoFaRequired && (
            <div className="mb-5 space-y-2">
              <div className="flex gap-1.5">
                <div className="flex-1 h-1 bg-emerald-600 rounded-full" />
                <div className="flex-1 h-1 bg-emerald-200 rounded-full" />
              </div>
              <p className="text-xs text-slate-500 text-center">2단계 인증</p>
            </div>
          )}
          {!twoFaRequired ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountId" className="text-sm font-medium text-slate-700">아이디</Label>
                <Input
                  id="accountId"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  autoFocus
                  className="h-11 bg-white/70 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="h-11 bg-white/70 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all duration-200"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-slate-600 text-center bg-slate-50 rounded-lg p-3">
                {maskedPhone}로 전송된 인증번호를 입력해주세요.
              </p>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium text-slate-700">인증번호</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="h-12 text-center text-xl font-mono tracking-[0.5em] bg-white/70 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all duration-200"
                disabled={loading}
              >
                {loading ? '확인 중...' : '인증 확인'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-slate-600 hover:bg-slate-50"
                onClick={() => { setTwoFaRequired(false); setVerificationCode(''); }}
              >
                다시 로그인
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
