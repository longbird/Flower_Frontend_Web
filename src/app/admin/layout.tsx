'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth/store';
import { Input } from '@/components/ui/input';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="flex h-screen">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="relative w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input placeholder="검색..." className="pl-9 h-9 bg-gray-50 border-gray-200 text-sm" />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#5B7A3D] flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>
        {/* Mobile header */}
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
            <div className="w-6 h-6 rounded-md bg-[#5B7A3D] flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="font-semibold text-slate-800 text-sm">달려라 꽃배달</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthGuard>
  );
}
