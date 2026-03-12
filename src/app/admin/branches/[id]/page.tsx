'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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

const TYPE_LABELS: Record<string, string> = {
  HEADQUARTERS: '본사',
  CALL_CENTER: '콜센터',
  BRANCH: '지사',
};

const DELEGATION_LABELS: Record<string, string> = {
  FULL: '전체 위임',
  PARTIAL: '부분 위임',
  NONE: '위임 없음',
};

interface EditForm {
  name: string;
  type: string;
  delegationMode: string;
  isActive: boolean;
  businessRegistrationNo: string;
}

const ACCOUNT_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: '활성', variant: 'default' },
  PENDING: { label: '미생성', variant: 'secondary' },
  SUSPENDED: { label: '정지', variant: 'destructive' },
};

interface AccountInfo {
  username?: string;
  managerName?: string;
  managerPhone?: string;
  status: string;
  lastLoginAt?: string;
}

interface CreateAccountForm {
  username: string;
  password: string;
  managerName: string;
  managerPhone: string;
}

interface EditAccountForm {
  managerName: string;
  managerPhone: string;
}

interface ResetPasswordForm {
  newPassword: string;
}

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState<EditForm>({
    name: '', type: 'BRANCH', delegationMode: 'NONE',
    isActive: true, businessRegistrationNo: '',
  });

  // Account management state
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [createAccountForm, setCreateAccountForm] = useState<CreateAccountForm>({
    username: '', password: '', managerName: '', managerPhone: '',
  });
  const [editAccountForm, setEditAccountForm] = useState<EditAccountForm>({
    managerName: '', managerPhone: '',
  });
  const [resetPasswordForm, setResetPasswordForm] = useState<ResetPasswordForm>({
    newPassword: '',
  });
  const [showEditHomepage, setShowEditHomepage] = useState(false);
  const [homepageForm, setHomepageForm] = useState({
    code: '', phone: '',
    virtualAccountBank: '', virtualAccountNumber: '',
  });

  const { data: branch, isLoading } = useQuery({
    queryKey: ['admin-branch', id],
    queryFn: () => api<any>(`/admin/organizations/${id}`).catch(() => null),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/admin/organizations/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branch', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-branches'] });
      setShowEdit(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      api(`/admin/organizations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branches'] });
      router.push('/admin/branches');
    },
  });

  // Account query & mutations
  const { data: account, isLoading: accountLoading } = useQuery<AccountInfo | null>({
    queryKey: ['admin-branch-account', id],
    queryFn: () => api<AccountInfo>(`/admin/branches/${id}/account`).catch(() => null),
  });

  const createAccountMutation = useMutation({
    mutationFn: (body: CreateAccountForm) =>
      api(`/admin/branches/${id}/account`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branch-account', id] });
      setShowCreateAccount(false);
      setCreateAccountForm({ username: '', password: '', managerName: '', managerPhone: '' });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: (body: EditAccountForm) =>
      api(`/admin/branches/${id}/account`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branch-account', id] });
      setShowEditAccount(false);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (body: ResetPasswordForm) =>
      api(`/admin/branches/${id}/account/reset-password`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branch-account', id] });
      setShowResetPassword(false);
      setResetPasswordForm({ newPassword: '' });
    },
  });

  const updateHomepageMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/admin/organizations/${id}`, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branch', id] });
      setShowEditHomepage(false);
      toast.success('홈페이지 정보가 저장되었습니다');
    },
    onError: () => {
      toast.error('저장에 실패했습니다');
    },
  });

  const openEditHomepage = () => {
    if (!branch) return;
    setHomepageForm({
      code: branch.code || '',
      phone: branch.phone || '',
      virtualAccountBank: branch.virtualAccountBank || '',
      virtualAccountNumber: branch.virtualAccountNumber || '',
    });
    setShowEditHomepage(true);
  };

  const handleUpdateHomepage = () => {
    updateHomepageMutation.mutate({
      code: homepageForm.code.trim() || undefined,
      phone: homepageForm.phone.trim() || undefined,
      virtualAccountBank: homepageForm.virtualAccountBank.trim() || undefined,
      virtualAccountNumber: homepageForm.virtualAccountNumber.trim() || undefined,
    });
  };

  const openEdit = () => {
    if (!branch) return;
    setForm({
      name: branch.name || '',
      type: branch.type || 'BRANCH',
      delegationMode: branch.delegationMode || 'NONE',
      isActive: branch.isActive ?? true,
      businessRegistrationNo: branch.businessRegistrationNo || '',
    });
    setShowEdit(true);
  };

  const handleUpdate = () => {
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      delegationMode: form.delegationMode,
      isActive: form.isActive,
    };
    if (form.businessRegistrationNo.trim()) body.businessRegistrationNo = form.businessRegistrationNo.trim();
    updateMutation.mutate(body);
  };

  const openEditAccount = () => {
    if (!account) return;
    setEditAccountForm({
      managerName: account.managerName || '',
      managerPhone: account.managerPhone || '',
    });
    setShowEditAccount(true);
  };

  const handleCreateAccount = () => {
    if (!createAccountForm.username.trim() || !createAccountForm.password.trim()) return;
    createAccountMutation.mutate(createAccountForm);
  };

  const handleUpdateAccount = () => {
    updateAccountMutation.mutate(editAccountForm);
  };

  const handleResetPassword = () => {
    if (!resetPasswordForm.newPassword.trim()) return;
    resetPasswordMutation.mutate(resetPasswordForm);
  };

  const selectClass = 'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none';

  if (isLoading) return <div className="text-center py-12 text-slate-400">로딩 중...</div>;
  if (!branch) return <div className="text-center py-12 text-red-500">지사를 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push('/admin/branches')}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          목록
        </Button>
        <h1 className="text-xl font-bold">{branch.name}</h1>
        <Badge variant={branch.isActive ? 'default' : 'secondary'}>{branch.isActive ? '활성' : '비활성'}</Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">지사 정보</CardTitle>
            <Button variant="outline" size="sm" onClick={openEdit}>수정</Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-400 text-xs">지사명</dt><dd className="font-medium">{branch.name}</dd></div>
            <div><dt className="text-slate-400 text-xs">유형</dt><dd>{TYPE_LABELS[branch.type] || branch.type}</dd></div>
            <div><dt className="text-slate-400 text-xs">위임 모드</dt><dd>{DELEGATION_LABELS[branch.delegationMode] || branch.delegationMode || '-'}</dd></div>
            {branch.parentName && <div><dt className="text-slate-400 text-xs">상위 조직</dt><dd>{branch.parentName}</dd></div>}
            {branch.businessRegistrationNo && <div><dt className="text-slate-400 text-xs">사업자번호</dt><dd>{branch.businessRegistrationNo}</dd></div>}
            <div><dt className="text-slate-400 text-xs">생성일</dt><dd>{branch.createdAt ? new Date(branch.createdAt).toLocaleDateString('ko-KR') : '-'}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* 홈페이지 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">홈페이지 정보</CardTitle>
            <Button variant="outline" size="sm" onClick={openEditHomepage}>수정</Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-400 text-xs">지사 코드 (slug)</dt>
              <dd className="font-medium">{branch.code || <span className="text-slate-300">-</span>}</dd>
            </div>
            {branch.code && (
              <>
                <div>
                  <dt className="text-slate-400 text-xs">홈페이지 URL</dt>
                  <dd>
                    <a
                      href={`/branch/${branch.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      /branch/{branch.code}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs">관리자 페이지 URL</dt>
                  <dd>
                    <a
                      href={`/branch/${branch.code}/manage/login`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      /branch/{branch.code}/manage/login
                    </a>
                  </dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-slate-400 text-xs">전화번호</dt>
              <dd>{branch.phone || <span className="text-slate-300">-</span>}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs">가상계좌</dt>
              <dd>
                {branch.virtualAccountBank && branch.virtualAccountNumber
                  ? `${branch.virtualAccountBank} ${branch.virtualAccountNumber}`
                  : <span className="text-slate-300">-</span>}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* 관리자 계정 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">관리자 계정</CardTitle>
            {account && account.status !== 'PENDING' && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openEditAccount}>수정</Button>
                <Button variant="outline" size="sm" onClick={() => { setResetPasswordForm({ newPassword: '' }); setShowResetPassword(true); }}>
                  비밀번호 초기화
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {accountLoading ? (
            <div className="text-sm text-slate-400">로딩 중...</div>
          ) : !account || account.status === 'PENDING' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-slate-500">등록된 계정이 없습니다.</p>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                setCreateAccountForm({ username: '', password: '', managerName: '', managerPhone: '' });
                setShowCreateAccount(true);
              }}>
                계정 생성
              </Button>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-400 text-xs">아이디</dt>
                <dd className="font-medium">{account.username || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">상태</dt>
                <dd>
                  <Badge variant={ACCOUNT_STATUS_LABELS[account.status]?.variant || 'secondary'}>
                    {ACCOUNT_STATUS_LABELS[account.status]?.label || account.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">담당자명</dt>
                <dd>{account.managerName || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">담당자 연락처</dt>
                <dd>{account.managerPhone || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">마지막 로그인</dt>
                <dd>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('ko-KR') : '-'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openEdit}>수정</Button>
        <Button variant="destructive" onClick={() => setShowDelete(true)}>삭제</Button>
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>지사 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>지사명 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>유형 *</Label>
              <select className={selectClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="BRANCH">지사</option>
                <option value="CALL_CENTER">콜센터</option>
                <option value="HEADQUARTERS">본사</option>
              </select>
            </div>
            <div>
              <Label>위임 모드 *</Label>
              <select className={selectClass} value={form.delegationMode} onChange={e => setForm(f => ({ ...f, delegationMode: e.target.value }))}>
                <option value="NONE">위임 없음</option>
                <option value="PARTIAL">부분 위임</option>
                <option value="FULL">전체 위임</option>
              </select>
            </div>
            <div>
              <Label>사업자번호</Label>
              <Input value={form.businessRegistrationNo} onChange={e => setForm(f => ({ ...f, businessRegistrationNo: e.target.value }))} placeholder="000-00-00000" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                활성 상태
              </label>
            </div>
          </div>
          {updateMutation.isError && (
            <div className="text-sm text-red-500">수정 실패: {(updateMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>취소</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={!form.name.trim() || updateMutation.isPending} onClick={handleUpdate}>
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>지사 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            <strong>{branch.name}</strong>을(를) 정말 삭제하시겠습니까?<br />
            이 작업은 되돌릴 수 없습니다.
          </p>
          {deleteMutation.isError && (
            <div className="text-sm text-red-500">삭제 실패: {(deleteMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>취소</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 계정 생성 다이얼로그 */}
      <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>계정 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>아이디 *</Label>
              <Input
                value={createAccountForm.username}
                onChange={e => setCreateAccountForm(f => ({ ...f, username: e.target.value }))}
                placeholder="로그인 아이디"
              />
            </div>
            <div>
              <Label>비밀번호 *</Label>
              <Input
                type="password"
                value={createAccountForm.password}
                onChange={e => setCreateAccountForm(f => ({ ...f, password: e.target.value }))}
                placeholder="비밀번호"
              />
            </div>
            <div>
              <Label>담당자명</Label>
              <Input
                value={createAccountForm.managerName}
                onChange={e => setCreateAccountForm(f => ({ ...f, managerName: e.target.value }))}
                placeholder="담당자 이름"
              />
            </div>
            <div>
              <Label>담당자 연락처</Label>
              <Input
                value={createAccountForm.managerPhone}
                onChange={e => setCreateAccountForm(f => ({ ...f, managerPhone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>
          </div>
          {createAccountMutation.isError && (
            <div className="text-sm text-red-500">계정 생성 실패: {(createAccountMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAccount(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!createAccountForm.username.trim() || !createAccountForm.password.trim() || createAccountMutation.isPending}
              onClick={handleCreateAccount}
            >
              {createAccountMutation.isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 계정 수정 다이얼로그 */}
      <Dialog open={showEditAccount} onOpenChange={setShowEditAccount}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>계정 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>담당자명</Label>
              <Input
                value={editAccountForm.managerName}
                onChange={e => setEditAccountForm(f => ({ ...f, managerName: e.target.value }))}
                placeholder="담당자 이름"
              />
            </div>
            <div>
              <Label>담당자 연락처</Label>
              <Input
                value={editAccountForm.managerPhone}
                onChange={e => setEditAccountForm(f => ({ ...f, managerPhone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>
          </div>
          {updateAccountMutation.isError && (
            <div className="text-sm text-red-500">수정 실패: {(updateAccountMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditAccount(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={updateAccountMutation.isPending}
              onClick={handleUpdateAccount}
            >
              {updateAccountMutation.isPending ? '저장 중...' : '저장'}
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
              <strong>{account?.username}</strong> 계정의 비밀번호를 초기화합니다.
            </p>
            <div>
              <Label>새 비밀번호 *</Label>
              <Input
                type="password"
                value={resetPasswordForm.newPassword}
                onChange={e => setResetPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="새 비밀번호 입력"
              />
            </div>
          </div>
          {resetPasswordMutation.isError && (
            <div className="text-sm text-red-500">초기화 실패: {(resetPasswordMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPassword(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!resetPasswordForm.newPassword.trim() || resetPasswordMutation.isPending}
              onClick={handleResetPassword}
            >
              {resetPasswordMutation.isPending ? '초기화 중...' : '초기화'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 홈페이지 정보 수정 다이얼로그 */}
      <Dialog open={showEditHomepage} onOpenChange={setShowEditHomepage}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>홈페이지 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>지사 코드 (slug) *</Label>
              <Input
                value={homepageForm.code}
                onChange={e => setHomepageForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="영문소문자, 숫자, 하이픈만"
              />
              {homepageForm.code && (
                <p className="text-xs text-slate-400 mt-1">URL: {homepageForm.code}.seoulflower.co.kr</p>
              )}
            </div>
            <div>
              <Label>전화번호</Label>
              <Input
                value={homepageForm.phone}
                onChange={e => setHomepageForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="02-1234-5678"
              />
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">가상계좌 정보</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>은행명</Label>
                  <Input
                    value={homepageForm.virtualAccountBank}
                    onChange={e => setHomepageForm(f => ({ ...f, virtualAccountBank: e.target.value }))}
                    placeholder="국민은행"
                  />
                </div>
                <div>
                  <Label>계좌번호</Label>
                  <Input
                    value={homepageForm.virtualAccountNumber}
                    onChange={e => setHomepageForm(f => ({ ...f, virtualAccountNumber: e.target.value }))}
                    placeholder="123-456-789012"
                  />
                </div>
              </div>
            </div>
          </div>
          {updateHomepageMutation.isError && (
            <div className="text-sm text-red-500">저장 실패: {(updateHomepageMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditHomepage(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={updateHomepageMutation.isPending}
              onClick={handleUpdateHomepage}
            >
              {updateHomepageMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
