'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBranchAuthStore } from '@/lib/branch/auth-store';
import { branchAdminLogin } from '@/lib/branch/branch-api';

export default function BranchLoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { isLoggedIn, login, loadSession } = useBranchAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (isLoggedIn) {
      router.replace(`/branch/${slug}/manage/consults`);
    }
  }, [isLoggedIn, router, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await branchAdminLogin(username, password);
      login(res.accessToken, res.refreshToken, res.admin);
      router.replace(`/branch/${slug}/manage/consults`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[var(--branch-rose-light)] via-[var(--branch-peach-light)] to-[var(--branch-cream)]">
      <div className="w-full max-w-sm">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href={`/branch/${slug}`}
            className="inline-flex items-center text-sm text-[var(--branch-text-light)] hover:text-[var(--branch-accent)] transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--branch-white)] rounded-3xl p-8 shadow-xl border border-[var(--branch-rose-light)]">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--branch-rose)] to-[var(--branch-accent)] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl text-[var(--branch-text)]">지사 관리자</h1>
            <p className="text-sm text-[var(--branch-text-light)] mt-2 font-light">
              로그인하여 상담 요청을 관리하세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
                아이디
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
                placeholder="아이디를 입력하세요"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--branch-accent)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-rose)] transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
