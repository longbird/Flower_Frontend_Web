'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

const PERMISSION_OPTIONS = [
  { key: 'consults', label: '상담 요청' },
  { key: 'products', label: '상품 관리' },
  { key: 'settings', label: '기본 정보' },
] as const;

interface BranchAccount {
  id: number;
  username: string;
  organizationId: number;
  managerName?: string;
  managerPhone?: string;
  status: string;
  failedLoginAttempts?: number;
  lastLoginAt?: string;
  createdAt: string;
  permissions: string[];
}

interface CreateAccountForm {
  username: string;
  password: string;
  managerName: string;
  managerPhone: string;
  permissions: string[];
}

export default function BranchAccounts({ branchId }: { branchId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['admin-branch-accounts', branchId];

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAccountForm>({
    username: '', password: '', managerName: '', managerPhone: '',
    permissions: ['consults', 'products', 'settings'],
  });

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetTarget, setResetTarget] = useState<BranchAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [showPermissions, setShowPermissions] = useState(false);
  const [permTarget, setPermTarget] = useState<BranchAccount | null>(null);
  const [permForm, setPermForm] = useState<string[]>([]);

  const { data: accounts = [], isLoading } = useQuery<BranchAccount[]>({
    queryKey,
    queryFn: async () => {
      try {
        return await api<BranchAccount[]>(`/admin/branches/${branchId}/accounts`);
      } catch {
        // Fallback to old single-account API
        try {
          const single = await api<any>(`/admin/branches/${branchId}/account`);
          if (single && single.status !== 'PENDING' && single.id) {
            return [{
              ...single,
              permissions: single.permissions || [],
            }];
          }
        } catch { /* empty */ }
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateAccountForm) =>
      api(`/admin/branches/${branchId}/account`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowCreate(false);
      setCreateForm({ username: '', password: '', managerName: '', managerPhone: '', permissions: ['consults', 'products', 'settings'] });
      toast.success('계정이 생성되었습니다');
    },
    onError: (err: any) => toast.error(err?.message || '계정 생성 실패'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ accountId, newPassword: pw }: { accountId: number; newPassword: string }) =>
      api(`/admin/branches/${branchId}/accounts/${accountId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: pw }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      setShowResetPassword(false);
      setNewPassword('');
      toast.success('비밀번호가 초기화되었습니다');
    },
    onError: () => toast.error('비밀번호 초기화 실패'),
  });

  const permissionsMutation = useMutation({
    mutationFn: ({ accountId, permissions }: { accountId: number; permissions: string[] }) =>
      api(`/admin/branches/${branchId}/accounts/${accountId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowPermissions(false);
      toast.success('권한이 변경되었습니다');
    },
    onError: () => toast.error('권한 변경 실패'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ accountId, isActive }: { accountId: number; isActive: boolean }) =>
      api(`/admin/branches/${branchId}/accounts/${accountId}/toggle-active`, {
        method: 'POST',
        body: JSON.stringify({ isActive }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('계정 상태가 변경되었습니다');
    },
    onError: () => toast.error('상태 변경 실패'),
  });

  const deleteMutation = useMutation({
    mutationFn: (accountId: number) =>
      api(`/admin/branches/${branchId}/accounts/${accountId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('계정이 삭제되었습니다');
    },
    onError: () => toast.error('계정 삭제 실패'),
  });

  const openResetPassword = (account: BranchAccount) => {
    setResetTarget(account);
    setNewPassword('');
    setShowResetPassword(true);
  };

  const openPermissions = (account: BranchAccount) => {
    setPermTarget(account);
    setPermForm([...account.permissions]);
    setShowPermissions(true);
  };

  const togglePermission = (key: string) => {
    setPermForm(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const toggleCreatePermission = (key: string) => {
    setCreateForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">관리자 계정</CardTitle>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
              onClick={() => {
                setCreateForm({ username: '', password: '', managerName: '', managerPhone: '', permissions: ['consults', 'products', 'settings'] });
                setShowCreate(true);
              }}
            >
              계정 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-400">로딩 중...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-4 text-sm text-slate-500">등록된 계정이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{acc.username}</span>
                      <Badge variant={acc.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-xs">
                        {acc.status === 'ACTIVE' ? '활성' : '비활성'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => openPermissions(acc)}>
                        권한
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => openResetPassword(acc)}>
                        비밀번호
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => toggleActiveMutation.mutate({ accountId: acc.id, isActive: acc.status !== 'ACTIVE' })}
                      >
                        {acc.status === 'ACTIVE' ? '비활성화' : '활성화'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (confirm(`${acc.username} 계정을 삭제하시겠습니까?`)) {
                            deleteMutation.mutate(acc.id);
                          }
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500">
                    <div>
                      <span className="text-slate-400">담당자:</span> {acc.managerName || '-'}
                    </div>
                    <div>
                      <span className="text-slate-400">연락처:</span> {acc.managerPhone || '-'}
                    </div>
                    <div>
                      <span className="text-slate-400">마지막 로그인:</span>{' '}
                      {acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleString('ko-KR') : '-'}
                    </div>
                    <div>
                      <span className="text-slate-400">권한:</span>{' '}
                      {acc.permissions.length === 0
                        ? '없음'
                        : acc.permissions.length === PERMISSION_OPTIONS.length
                          ? '전체'
                          : acc.permissions.map(p => PERMISSION_OPTIONS.find(o => o.key === p)?.label || p).join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 계정 생성 다이얼로그 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>계정 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>아이디 *</Label>
              <Input
                value={createForm.username}
                onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                placeholder="로그인 아이디"
              />
            </div>
            <div>
              <Label>비밀번호 *</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                placeholder="비밀번호"
              />
            </div>
            <div>
              <Label>담당자명</Label>
              <Input
                value={createForm.managerName}
                onChange={e => setCreateForm(f => ({ ...f, managerName: e.target.value }))}
                placeholder="담당자 이름"
              />
            </div>
            <div>
              <Label>담당자 연락처</Label>
              <Input
                value={createForm.managerPhone}
                onChange={e => setCreateForm(f => ({ ...f, managerPhone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <Label className="mb-2 block">접근 권한</Label>
              <div className="flex flex-wrap gap-3">
                {PERMISSION_OPTIONS.map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.permissions.includes(opt.key)}
                      onChange={() => toggleCreatePermission(opt.key)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {createMutation.isError && (
            <div className="text-sm text-red-500">계정 생성 실패: {(createMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!createForm.username.trim() || !createForm.password.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(createForm)}
            >
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 초기화 다이얼로그 */}
      <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>비밀번호 초기화</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>{resetTarget?.username}</strong> 계정의 비밀번호를 초기화합니다.
            </p>
            <div>
              <Label>새 비밀번호 *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPassword(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!newPassword.trim() || resetPasswordMutation.isPending}
              onClick={() => resetTarget && resetPasswordMutation.mutate({ accountId: resetTarget.id, newPassword })}
            >
              {resetPasswordMutation.isPending ? '초기화 중...' : '초기화'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 권한 설정 다이얼로그 */}
      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>권한 설정 — {permTarget?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              이 계정이 접근할 수 있는 메뉴를 선택하세요.
            </p>
            {PERMISSION_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permForm.includes(opt.key)}
                  onChange={() => togglePermission(opt.key)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissions(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={permissionsMutation.isPending}
              onClick={() => permTarget && permissionsMutation.mutate({ accountId: permTarget.id, permissions: permForm })}
            >
              {permissionsMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
