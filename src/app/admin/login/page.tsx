'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Background — radial vignette matching sample: bright center, dark edges */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 45%, #4F6D38 0%, #3E5A2B 30%, #2D4420 55%, #1F3016 80%, #162410 100%)',
        }}
      />

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-sm sm:max-w-[440px] bg-white rounded-3xl shadow-2xl p-8 sm:p-10 animate-fade-in">

          {/* Logo */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-[#3A6B2A] flex items-center justify-center shadow-lg shadow-[#3A6B2A]/25">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-4">달려라 꽃배달 관리자</h1>
            <p className="text-sm text-gray-500 mt-1">관리자 대시보드에 로그인하세요</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">

            {/* Error message */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Username field */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wider"
              >
                아이디 (ID)
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your ID"
                  autoComplete="username"
                  autoFocus
                  className="h-12 pl-11 bg-gray-50 border-gray-200 rounded-xl text-sm focus:border-[#3A6B2A] focus:ring-2 focus:ring-[#3A6B2A]/20 transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wider"
              >
                비밀번호 (PASSWORD)
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-12 pl-11 bg-gray-50 border-gray-200 rounded-xl text-sm focus:border-[#3A6B2A] focus:ring-2 focus:ring-[#3A6B2A]/20 transition-all"
                />
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full py-3.5 h-auto rounded-full font-semibold text-base text-white bg-gradient-to-r from-[#3A6B2A] to-[#2D5520] shadow-lg shadow-[#2D5520]/30 hover:shadow-[#2D5520]/50 hover:from-[#2D5520] hover:to-[#224418] transition-all duration-200"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-white/40 relative z-10 tracking-wide uppercase">
        &copy; 2024 달려라 꽃배달. All rights reserved.
      </footer>
    </div>
  );
}
