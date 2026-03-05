'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePartnerAuthStore } from '@/lib/auth/partner-store';
import { Button } from '@/components/ui/button';

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, user, logout, loadSession } = usePartnerAuthStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSession();
    setLoaded(true);
  }, [loadSession]);

  useEffect(() => {
    if (loaded && !isLoggedIn && pathname !== '/partner/login') {
      router.replace('/partner/login');
    }
  }, [loaded, isLoggedIn, pathname, router]);

  if (!loaded) return null;

  if (pathname === '/partner/login') {
    return <>{children}</>;
  }

  if (!isLoggedIn) return null;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{user?.partnerName || '파트너'}</p>
              <p className="text-xs text-slate-400">주문 관리</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="min-h-[44px] text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
            onClick={() => {
              logout();
              router.replace('/partner/login');
            }}
          >
            로그아웃
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
