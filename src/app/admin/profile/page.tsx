'use client';

import { useAuthStore } from '@/lib/auth/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">내 정보</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">계정 정보</CardTitle></CardHeader>
        <CardContent>
          {user ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><dt className="text-slate-400 text-xs">이름</dt><dd className="font-medium">{user.name || '-'}</dd></div>
              <div><dt className="text-slate-400 text-xs">아이디</dt><dd>{user.username || '-'}</dd></div>
              <div>
                <dt className="text-slate-400 text-xs">역할</dt>
                <dd><Badge>{user.role || '-'}</Badge></dd>
              </div>
              <div><dt className="text-slate-400 text-xs">소속</dt><dd>{user.organization ? String(user.organization) : '-'}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">로그인 정보를 불러올 수 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
