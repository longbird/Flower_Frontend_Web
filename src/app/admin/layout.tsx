'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="flex h-screen">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3 md:hidden shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-slate-600 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">F</span>
              </div>
              <span className="font-semibold text-slate-800 text-sm">꽃배달 관리자</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
