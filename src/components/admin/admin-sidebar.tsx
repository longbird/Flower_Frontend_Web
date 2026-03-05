'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth/store';
import { adminLogout } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin/florists', label: '화원 관리', icon: '🌺' },
  { href: '/admin/orders', label: '주문 관리', icon: '📦' },
  { href: '/admin/partners', label: '파트너 관리', icon: '🤝' },
  { href: '/admin/cs', label: 'CS 관리', icon: '📞' },
  { href: '/admin/dashboard', label: '대시보드', icon: '📊' },
];

export function AdminSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, refreshToken, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await adminLogout(refreshToken);
      }
    } catch {
      // ignore
    }
    logout();
    toast.info('로그아웃 되었습니다.');
    router.replace('/admin/login');
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-out md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <span className="font-semibold text-slate-800">꽃배달 관리자</span>
          </div>
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px] border-l-[3px]',
                  isActive
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50/50 text-emerald-700 border-emerald-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 border-transparent hover:text-slate-900'
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white p-4 space-y-3">
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                {user.name?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 truncate">{user.name}</div>
                <div className="text-xs text-slate-400 truncate">{user.username}</div>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full h-9 text-xs border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
            onClick={handleLogout}
          >
            로그아웃
          </Button>
        </div>
      </aside>
    </>
  );
}
