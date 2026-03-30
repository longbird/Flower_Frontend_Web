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
import BranchAccounts from './branch-accounts';

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
  ownerName: string;
  email: string;
  ecommerceLicenseNo: string;
  partnershipEmail: string;
  phone: string;
  address: string;
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
    ownerName: '', email: '', ecommerceLicenseNo: '',
    partnershipEmail: '', phone: '', address: '',
  });

  const [showEditHomepage, setShowEditHomepage] = useState(false);
  const [homepageForm, setHomepageForm] = useState({
    code: '', phone: '', address: '',
    ownerName: '', email: '', businessRegistrationNo: '',
    ecommerceLicenseNo: '', partnershipEmail: '',
    virtualAccountBank: '', virtualAccountNumber: '', virtualAccountHolder: '',
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
      address: branch.address || '',
      ownerName: branch.ownerName || '',
      email: branch.email || '',
      businessRegistrationNo: branch.businessRegistrationNo || '',
      ecommerceLicenseNo: branch.ecommerceLicenseNo || '',
      partnershipEmail: branch.partnershipEmail || '',
      virtualAccountBank: branch.virtualAccountBank || '',
      virtualAccountNumber: branch.virtualAccountNumber || '',
      virtualAccountHolder: branch.virtualAccountHolder || '',
    });
    setShowEditHomepage(true);
  };

  const handleUpdateHomepage = () => {
    updateHomepageMutation.mutate({
      code: homepageForm.code.trim() || undefined,
      phone: homepageForm.phone.trim() || undefined,
      address: homepageForm.address.trim() || undefined,
      ownerName: homepageForm.ownerName.trim() || undefined,
      email: homepageForm.email.trim() || undefined,
      businessRegistrationNo: homepageForm.businessRegistrationNo.trim() || undefined,
      ecommerceLicenseNo: homepageForm.ecommerceLicenseNo.trim() || undefined,
      partnershipEmail: homepageForm.partnershipEmail.trim() || undefined,
      virtualAccountBank: homepageForm.virtualAccountBank.trim() || undefined,
      virtualAccountNumber: homepageForm.virtualAccountNumber.trim() || undefined,
      virtualAccountHolder: homepageForm.virtualAccountHolder.trim() || undefined,
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
      ownerName: branch.ownerName || '',
      email: branch.email || '',
      ecommerceLicenseNo: branch.ecommerceLicenseNo || '',
      partnershipEmail: branch.partnershipEmail || '',
      phone: branch.phone || '',
      address: branch.address || '',
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
    if (form.ownerName.trim()) body.ownerName = form.ownerName.trim();
    if (form.email.trim()) body.email = form.email.trim();
    if (form.ecommerceLicenseNo.trim()) body.ecommerceLicenseNo = form.ecommerceLicenseNo.trim();
    if (form.partnershipEmail.trim()) body.partnershipEmail = form.partnershipEmail.trim();
    if (form.phone.trim()) body.phone = form.phone.trim();
    if (form.address.trim()) body.address = form.address.trim();
    updateMutation.mutate(body);
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
            {branch.ownerName && <div><dt className="text-slate-400 text-xs">대표자명</dt><dd>{branch.ownerName}</dd></div>}
            {branch.businessRegistrationNo && <div><dt className="text-slate-400 text-xs">사업자번호</dt><dd>{branch.businessRegistrationNo}</dd></div>}
            {branch.ecommerceLicenseNo && <div><dt className="text-slate-400 text-xs">통신판매업신고</dt><dd>{branch.ecommerceLicenseNo}</dd></div>}
            <div><dt className="text-slate-400 text-xs">전화번호</dt><dd>{branch.phone || <span className="text-slate-300">-</span>}</dd></div>
            {branch.email && <div><dt className="text-slate-400 text-xs">이메일</dt><dd>{branch.email}</dd></div>}
            {branch.partnershipEmail && <div><dt className="text-slate-400 text-xs">제휴문의</dt><dd>{branch.partnershipEmail}</dd></div>}
            {branch.address && <div><dt className="text-slate-400 text-xs">주소</dt><dd>{branch.address}</dd></div>}
            <div>
              <dt className="text-slate-400 text-xs">가상계좌</dt>
              <dd>
                {branch.virtualAccountBank && branch.virtualAccountNumber
                  ? `${branch.virtualAccountBank} ${branch.virtualAccountNumber}`
                  : <span className="text-slate-300">-</span>}
              </dd>
            </div>
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
          </dl>
        </CardContent>
      </Card>

      {/* 관리자 계정 */}
      <BranchAccounts branchId={id} />

      <div className="flex gap-2">
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openEdit}>수정</Button>
        <Button variant="destructive" onClick={() => setShowDelete(true)}>삭제</Button>
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>지사 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>지사명 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">사업자 정보</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>대표자명</Label>
                    <Input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="홍길동" />
                  </div>
                  <div>
                    <Label>사업자번호</Label>
                    <Input value={form.businessRegistrationNo} onChange={e => setForm(f => ({ ...f, businessRegistrationNo: e.target.value }))} placeholder="000-00-00000" />
                  </div>
                </div>
                <div>
                  <Label>통신판매업신고번호</Label>
                  <Input value={form.ecommerceLicenseNo} onChange={e => setForm(f => ({ ...f, ecommerceLicenseNo: e.target.value }))} placeholder="제2023-경기안산-3299호" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">연락처</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>전화번호</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="02-1234-5678" />
                  </div>
                  <div>
                    <Label>이메일</Label>
                    <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@example.com" />
                  </div>
                </div>
                <div>
                  <Label>제휴문의 이메일</Label>
                  <Input value={form.partnershipEmail} onChange={e => setForm(f => ({ ...f, partnershipEmail: e.target.value }))} placeholder="partner@example.com" />
                </div>
                <div>
                  <Label>주소</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="서울시 강남구..." />
                </div>
              </div>
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
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">사업자 정보</p>
              <div className="space-y-3">
                <div>
                  <Label>대표자명</Label>
                  <Input value={homepageForm.ownerName} onChange={e => setHomepageForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="홍길동" />
                </div>
                <div>
                  <Label>사업자등록번호</Label>
                  <Input value={homepageForm.businessRegistrationNo} onChange={e => setHomepageForm(f => ({ ...f, businessRegistrationNo: e.target.value }))} placeholder="000-00-00000" />
                </div>
                <div>
                  <Label>통신판매업신고번호</Label>
                  <Input value={homepageForm.ecommerceLicenseNo} onChange={e => setHomepageForm(f => ({ ...f, ecommerceLicenseNo: e.target.value }))} placeholder="제2023-경기안산-3299호" />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">연락처</p>
              <div className="space-y-3">
                <div>
                  <Label>전화번호</Label>
                  <Input value={homepageForm.phone} onChange={e => setHomepageForm(f => ({ ...f, phone: e.target.value }))} placeholder="02-1234-5678" />
                </div>
                <div>
                  <Label>이메일</Label>
                  <Input value={homepageForm.email} onChange={e => setHomepageForm(f => ({ ...f, email: e.target.value }))} placeholder="info@example.com" />
                </div>
                <div>
                  <Label>제휴문의 이메일</Label>
                  <Input value={homepageForm.partnershipEmail} onChange={e => setHomepageForm(f => ({ ...f, partnershipEmail: e.target.value }))} placeholder="partner@example.com" />
                </div>
                <div>
                  <Label>주소</Label>
                  <Input value={homepageForm.address} onChange={e => setHomepageForm(f => ({ ...f, address: e.target.value }))} placeholder="서울시 강남구..." />
                </div>
              </div>
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
              <div>
                <Label>예금주</Label>
                <Input
                  value={homepageForm.virtualAccountHolder}
                  onChange={e => setHomepageForm(f => ({ ...f, virtualAccountHolder: e.target.value }))}
                  placeholder="홍길동"
                />
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
