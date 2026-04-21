'use client';

import '@/app/globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import { adminLogout } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const NAV: Array<{ href: string; label: string }> = [
  { href: '/aircpm/certs', label: '기기 인증' },
  { href: '/aircpm/users', label: '사용자' },
  { href: '/aircpm/targetapps', label: '배차앱 설정' },
];

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export default function AircpmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn, refreshToken, logout, loadSession } = useAuthStore();

  // 세션 복원
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // 로그인/권한 가드 (login 페이지 제외)
  useEffect(() => {
    if (pathname === '/aircpm/login') return;
    if (!isLoggedIn) {
      router.replace('/aircpm/login');
      return;
    }
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      toast.error('권한이 없습니다. SUPER_ADMIN/ADMIN만 사용 가능합니다.');
      router.replace('/aircpm/login');
    }
  }, [pathname, isLoggedIn, user, router]);

  const handleLogout = async () => {
    try {
      if (refreshToken) await adminLogout(refreshToken);
    } catch {}
    logout();
    toast.info('로그아웃 되었습니다.');
    router.replace('/aircpm/login');
  };

  // 로그인 페이지는 크롬 없이 렌더
  if (pathname === '/aircpm/login') {
    return (
      <>
        {children}
        <Toaster richColors position="top-right" />
      </>
    );
  }

  // 가드 통과 대기 화면
  if (!isLoggedIn || (user && !ALLOWED_ROLES.includes(user.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
        인증 확인 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto h-14 px-4 md:px-6 flex items-center gap-6">
          <Link href="/aircpm/certs" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-slate-900 text-[15px]">AirCPM Admin</div>
              <div className="text-[10px] tracking-wider uppercase text-slate-400">Device Cert Management</div>
            </div>
          </Link>
          <nav className="flex-1 flex items-center gap-1">
            {NAV.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 hidden sm:inline">
              {user?.name || user?.username} · <span className="text-xs text-slate-400">{user?.role}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-6">{children}</div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
