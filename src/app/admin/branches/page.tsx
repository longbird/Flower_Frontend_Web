'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface OrgForm {
  name: string;
  type: string;
  delegationMode: string;
  businessRegistrationNo: string;
  parentId: string;
}

const emptyForm: OrgForm = {
  name: '',
  type: 'BRANCH',
  delegationMode: 'NONE',
  businessRegistrationNo: '',
  parentId: '',
};

export default function BranchesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<OrgForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => api<any>('/admin/organizations').catch(() => []),
  });

  const branches = Array.isArray(data) ? data : (data?.items ?? []);

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/admin/organizations', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branches'] });
      setShowCreate(false);
      setForm(emptyForm);
    },
  });

  const handleCreate = () => {
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      delegationMode: form.delegationMode,
    };
    if (form.businessRegistrationNo.trim()) body.businessRegistrationNo = form.businessRegistrationNo.trim();
    if (form.parentId.trim()) body.parentId = Number(form.parentId);
    createMutation.mutate(body);
  };

  const selectClass = 'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">지사 관리</h1>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
          + 지사 추가
        </Button>
      </div>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && branches.length === 0 && (
        <div className="text-center py-12 text-slate-400">등록된 지사가 없습니다.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch: any) => (
          <Card key={branch.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/admin/branches/${branch.id}`)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{branch.name}</span>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[branch.type] || branch.type}</Badge>
                  <Badge variant={branch.isActive ? 'default' : 'secondary'}>{branch.isActive ? '활성' : '비활성'}</Badge>
                </div>
              </div>
              {branch.delegationMode && (
                <div className="text-xs text-slate-500">위임: {DELEGATION_LABELS[branch.delegationMode] || branch.delegationMode}</div>
              )}
              {branch.parentName && <div className="text-xs text-slate-500">상위: {branch.parentName}</div>}
              <div className="text-xs text-slate-400">{branch.businessRegistrationNo || ''}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 지사 추가 다이얼로그 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>지사 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>지사명 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="지사명을 입력하세요" />
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
            <div>
              <Label>상위 조직 ID</Label>
              <select className={selectClass} value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}>
                <option value="">없음</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={String(b.id)}>{b.name} ({TYPE_LABELS[b.type] || b.type})</option>
                ))}
              </select>
            </div>
          </div>
          {createMutation.isError && (
            <div className="text-sm text-red-500">생성 실패: {(createMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!form.name.trim() || createMutation.isPending} onClick={handleCreate}>
              {createMutation.isPending ? '생성 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
