'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
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
  allowFloristSearch: boolean;
  allowFloristPhotoManagement: boolean;
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
    allowFloristSearch: false, allowFloristPhotoManagement: false,
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

  const openEdit = () => {
    if (!branch) return;
    setForm({
      name: branch.name || '',
      type: branch.type || 'BRANCH',
      delegationMode: branch.delegationMode || 'NONE',
      isActive: branch.isActive ?? true,
      businessRegistrationNo: branch.businessRegistrationNo || '',
      allowFloristSearch: branch.allowFloristSearch ?? false,
      allowFloristPhotoManagement: branch.allowFloristPhotoManagement ?? false,
    });
    setShowEdit(true);
  };

  const handleUpdate = () => {
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      delegationMode: form.delegationMode,
      isActive: form.isActive,
      allowFloristSearch: form.allowFloristSearch,
      allowFloristPhotoManagement: form.allowFloristPhotoManagement,
    };
    if (form.businessRegistrationNo.trim()) body.businessRegistrationNo = form.businessRegistrationNo.trim();
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
        <CardHeader><CardTitle className="text-base">지사 정보</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-400 text-xs">지사명</dt><dd className="font-medium">{branch.name}</dd></div>
            <div><dt className="text-slate-400 text-xs">유형</dt><dd>{TYPE_LABELS[branch.type] || branch.type}</dd></div>
            <div><dt className="text-slate-400 text-xs">위임 모드</dt><dd>{DELEGATION_LABELS[branch.delegationMode] || branch.delegationMode || '-'}</dd></div>
            {branch.parentName && <div><dt className="text-slate-400 text-xs">상위 조직</dt><dd>{branch.parentName}</dd></div>}
            {branch.businessRegistrationNo && <div><dt className="text-slate-400 text-xs">사업자번호</dt><dd>{branch.businessRegistrationNo}</dd></div>}
            <div><dt className="text-slate-400 text-xs">화원 검색 허용</dt><dd>{branch.allowFloristSearch ? '예' : '아니오'}</dd></div>
            <div><dt className="text-slate-400 text-xs">화원 사진 관리 허용</dt><dd>{branch.allowFloristPhotoManagement ? '예' : '아니오'}</dd></div>
            <div><dt className="text-slate-400 text-xs">생성일</dt><dd>{branch.createdAt ? new Date(branch.createdAt).toLocaleDateString('ko-KR') : '-'}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push(`/admin/branches/${id}/pricing`)}>가격 관리</Button>
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
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.allowFloristSearch} onChange={e => setForm(f => ({ ...f, allowFloristSearch: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                화원 검색 허용
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.allowFloristPhotoManagement} onChange={e => setForm(f => ({ ...f, allowFloristPhotoManagement: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                사진 관리 허용
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
    </div>
  );
}
