'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, CreditCard, Leaf, Lock, User } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/store';
import { adminLogin } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminLogin(username, password);
      if (!res.ok) {
        throw new Error((res as unknown as { error: string }).error || '로그인에 실패했습니다.');
      }
      login(res.accessToken, res.refreshToken, res.admin);
      toast.success(`${res.admin.name}님 환영합니다.`);
      router.replace('/admin/florists');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="hidden flex-col justify-between border-r border-slate-200 bg-white p-10 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#4f6d38] text-sm font-bold text-white">
                F
              </div>
              <div>
                <div className="text-base font-bold">달려라 꽃배달</div>
                <div className="text-xs text-slate-500">Admin operations</div>
              </div>
            </div>

            <div className="mt-24 max-w-xl">
              <div className="text-sm font-semibold text-[#4f6d38]">운영 콘솔</div>
              <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">
                결제와 주문 흐름을 놓치지 않도록 설계된 관리자 화면
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600">
                오늘 처리할 결제 큐와 주문 흐름을 확인합니다.
              </p>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <CreditCard className="size-5 text-[#4f6d38]" />
                <div className="mt-3 text-sm font-bold">결제 큐</div>
                <div className="mt-1 text-xs text-slate-500">검토 필요 우선</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <CheckCircle2 className="size-5 text-emerald-700" />
                <div className="mt-3 text-sm font-bold">처리 상태</div>
                <div className="mt-1 text-xs text-slate-500">사유와 액션</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Lock className="size-5 text-slate-600" />
                <div className="mt-3 text-sm font-bold">접근 제어</div>
                <div className="mt-1 text-xs text-slate-500">관리자 전용</div>
              </div>
            </div>
          </div>

          <div className="w-fit rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="size-4 text-[#4f6d38]" />
              REAL 운영 모드
            </div>
            <div className="mt-1 text-xs text-slate-500">권한이 있는 관리자만 접속할 수 있습니다.</div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-[#4f6d38] text-white">
                <Leaf className="size-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#4f6d38] lg:hidden">운영 콘솔</div>
                <h2 className="text-xl font-bold text-slate-950">달려라 꽃배달 관리자</h2>
                <p className="text-sm text-slate-500">관리자 계정으로 로그인하세요</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:hidden">
              <div className="text-sm font-semibold text-slate-900">오늘 처리할 결제 큐와 주문 흐름을 확인합니다.</div>
              <div className="mt-1 text-xs text-slate-500">REAL 운영 모드</div>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-semibold text-slate-600">
                  아이디 (ID)
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="관리자 아이디"
                    autoComplete="username"
                    autoFocus
                    className="h-11 rounded-lg border-slate-200 bg-slate-50 pl-11 text-sm focus:border-[#4f6d38] focus:ring-2 focus:ring-[#4f6d38]/15"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-slate-600">
                  비밀번호 (PASSWORD)
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    autoComplete="current-password"
                    className="h-11 rounded-lg border-slate-200 bg-slate-50 pl-11 text-sm focus:border-[#4f6d38] focus:ring-2 focus:ring-[#4f6d38]/15"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-[#4f6d38] font-semibold text-white hover:bg-[#3d5229]"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
