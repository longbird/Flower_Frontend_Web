'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBranchAuthStore } from '@/lib/branch/auth-store';
import { fetchMyBranchInfo } from '@/lib/branch/branch-api';

export default function BranchManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const slug = params.slug as string;
  const isLoginPage = pathname.endsWith('/login');

  const { isLoggedIn, user, logout, loadSession } = useBranchAuthStore();
  const [branchName, setBranchName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadSession();
    setMounted(true);
  }, [loadSession]);

  // Auth guard for non-login pages
  useEffect(() => {
    if (!isLoginPage && !isLoggedIn) {
      router.replace(`/branch/${slug}/manage/login`);
    }
  }, [isLoggedIn, router, slug, isLoginPage]);

  // Fetch branch name
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchMyBranchInfo()
      .then((res) => setBranchName(res.data?.name || ''))
      .catch(() => {});
  }, [isLoggedIn]);

  // Login page bypass — render children only
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Wait for client mount before rendering (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--branch-cream)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--branch-accent)]" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  const handleLogout = () => {
    logout();
    router.replace(`/branch/${slug}/manage/login`);
  };

  const permissions = user?.permissions || [];
  const hasAllPermissions = permissions.length === 0; // 빈 배열 = 전체 접근 (레거시 호환)

  const allNavItems = [
    {
      href: `/branch/${slug}/manage/consults`,
      label: '상담 요청',
      permission: 'consults',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: `/branch/${slug}/manage/products`,
      label: '상품 관리',
      permission: 'products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      href: `/branch/${slug}/manage/settings`,
      label: '기본 정보',
      permission: 'settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const navItems = allNavItems.filter(
    (item) => hasAllPermissions || permissions.includes(item.permission)
  );

  return (
    <div className="min-h-screen bg-[var(--branch-cream)] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-[var(--branch-white)] border-r border-[var(--branch-rose-light)] flex flex-col transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--branch-rose-light)]">
          <Link
            href={`/branch/${slug}`}
            className="text-xs text-[var(--branch-text-light)] hover:text-[var(--branch-accent)] transition-colors"
          >
            &larr; 홈페이지 보기
          </Link>
          <h2 className="text-lg font-semibold text-[var(--branch-text)] mt-2">
            {branchName || '지사 관리'}
          </h2>
          <p className="text-xs text-[var(--branch-text-light)]">{user?.name}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--branch-accent)]/10 text-[var(--branch-accent)]'
                    : 'text-[var(--branch-text-light)] hover:bg-[var(--branch-rose-light)]/30 hover:text-[var(--branch-text)]'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--branch-rose-light)]">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-[var(--branch-text-light)] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b border-[var(--branch-rose-light)] bg-[var(--branch-white)] px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--branch-text-light)] hover:bg-[var(--branch-rose-light)]/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-medium text-[var(--branch-text)] text-sm">
            {branchName || '지사 관리'}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
