'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/store';
import { adminLogin } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export default function AircpmLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 이미 로그인되어 있고 권한 있으면 바로 통과
  useEffect(() => {
    if (isLoggedIn && user && ALLOWED_ROLES.includes(user.role)) {
      router.replace('/aircpm/certs');
    }
  }, [isLoggedIn, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await adminLogin(username, password);
      // 백엔드는 자격 증명 실패 시 HTTP 200 + {ok:false, error:"..."}로 응답함
      if (!res.ok || !res.admin) {
        const message = (res as unknown as { error?: string }).error || '아이디 또는 비밀번호가 올바르지 않습니다.';
        setError(message);
        setLoading(false);
        return;
      }
      if (!ALLOWED_ROLES.includes(res.admin.role)) {
        setError('권한이 없는 계정입니다. SUPER_ADMIN 또는 ADMIN 역할이 필요합니다.');
        setLoading(false);
        return;
      }
      login(res.accessToken, res.refreshToken, res.admin);
      router.replace('/aircpm/certs');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardContent className="p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 shadow-md mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">AirCPM Admin</h1>
            <p className="text-sm text-slate-500 mt-1.5">데스크톱 클라이언트 기기 인증 관리</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] tracking-[0.22em] uppercase text-slate-500 font-semibold mb-2">
                아이디 (ID)
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="관리자 계정"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-[0.22em] uppercase text-slate-500 font-semibold mb-2">
                비밀번호 (Password)
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <p className="text-[11px] text-slate-400 text-center mt-6 leading-relaxed">
            본 페이지는 RunFlower 관리자 계정(SUPER_ADMIN · ADMIN)만 이용할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
