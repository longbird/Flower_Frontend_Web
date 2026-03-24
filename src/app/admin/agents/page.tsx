'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

const ROLE_LABELS: Record<string, string> = {
  ADMIN_AGENT: '관리자',
  AGENT: '상담원',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  LOCKED: '잠금',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  LOCKED: 'destructive',
};

interface AgentForm {
  username: string;
  password: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  extension: string;
}

interface AgentEditForm {
  name: string;
  role: string;
  phone: string;
  email: string;
  extension: string;
}

const emptyCreateForm: AgentForm = {
  username: '', password: '', name: '', role: 'AGENT',
  phone: '', email: '', extension: '',
};

const emptyEditForm: AgentEditForm = {
  name: '', role: 'AGENT', phone: '', email: '', extension: '',
};

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const pageSize = 20;

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<AgentForm>(emptyCreateForm);

  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<AgentEditForm>(emptyEditForm);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agents', page, query],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('size', String(pageSize));
      if (query) sp.set('q', query);
      return api<{ items: any[]; total: number }>(`/admin/agents?${sp.toString()}`).catch(() => ({ items: [], total: 0 }));
    },
  });

  const agents = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/admin/agents', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ agentId, body }: { agentId: number; body: Record<string, unknown> }) =>
      api(`/admin/agents/${agentId}`, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      setShowEdit(false);
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (agentId: number) =>
      api(`/admin/agents/${agentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      setShowDelete(false);
      setDeleteTarget(null);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  };

  const handleCreate = () => {
    const body: Record<string, unknown> = {
      username: createForm.username.trim(),
      password: createForm.password,
      name: createForm.name.trim(),
      role: createForm.role,
    };
    if (createForm.phone.trim()) body.phone = createForm.phone.trim();
    if (createForm.email.trim()) body.email = createForm.email.trim();
    if (createForm.extension.trim()) body.extension = createForm.extension.trim();
    createMutation.mutate(body);
  };

  const openEdit = (agent: any) => {
    setEditId(agent.id);
    setEditForm({
      name: agent.name || '',
      role: agent.role || 'AGENT',
      phone: agent.phone || '',
      email: agent.email || '',
      extension: agent.extension || '',
    });
    setShowEdit(true);
  };

  const handleUpdate = () => {
    if (!editId) return;
    const body: Record<string, unknown> = {
      name: editForm.name.trim(),
      role: editForm.role,
    };
    if (editForm.phone.trim()) body.phone = editForm.phone.trim();
    if (editForm.email.trim()) body.email = editForm.email.trim();
    if (editForm.extension.trim()) body.extension = editForm.extension.trim();
    updateMutation.mutate({ agentId: editId, body });
  };

  const selectClass = 'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">상담원 관리</h1>
        <Button size="sm" className="bg-[#5B7A3D] hover:bg-[#4A6830]" onClick={() => { setCreateForm(emptyCreateForm); setShowCreate(true); }}>
          + 상담원 추가
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input placeholder="이름, 아이디 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 border-slate-200 max-w-sm" />
        <Button type="submit" size="sm" className="bg-[#5B7A3D] hover:bg-[#4A6830]">검색</Button>
      </form>

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && agents.length === 0 && (
        <div className="text-center py-12 text-slate-400">등록된 상담원이 없습니다.</div>
      )}

      <div className="space-y-2">
        {agents.map((agent: any) => (
          <Card key={agent.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{agent.name}</span>
                  <span className="text-xs text-slate-400">{agent.username}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {agent.organizationName || '-'} · {agent.email || agent.phone || '-'}
                  {agent.extension && ` · 내선 ${agent.extension}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[agent.role] || agent.role}</Badge>
                <Badge variant={STATUS_COLORS[agent.status] as any || 'secondary'}>
                  {STATUS_LABELS[agent.status] || agent.status}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800" onClick={() => openEdit(agent)}>수정</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-700" onClick={() => { setDeleteTarget({ id: agent.id, name: agent.name }); setShowDelete(true); }}>삭제</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">총 {total}건 / {page}/{totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
          </div>
        </div>
      )}

      {/* 상담원 추가 다이얼로그 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>상담원 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>아이디 *</Label>
              <Input value={createForm.username} onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} placeholder="로그인 아이디" />
            </div>
            <div>
              <Label>비밀번호 *</Label>
              <Input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="비밀번호" />
            </div>
            <div>
              <Label>이름 *</Label>
              <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="상담원 이름" />
            </div>
            <div>
              <Label>역할 *</Label>
              <select className={selectClass} value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                <option value="AGENT">상담원</option>
                <option value="ADMIN_AGENT">관리자</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>전화번호</Label>
                <Input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" />
              </div>
              <div>
                <Label>내선번호</Label>
                <Input value={createForm.extension} onChange={e => setCreateForm(f => ({ ...f, extension: e.target.value }))} placeholder="내선번호" />
              </div>
            </div>
            <div>
              <Label>이메일</Label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
          </div>
          {createMutation.isError && (
            <div className="text-sm text-red-500">생성 실패: {(createMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
            <Button className="bg-[#5B7A3D] hover:bg-[#4A6830]" disabled={!createForm.username.trim() || !createForm.password || !createForm.name.trim() || createMutation.isPending} onClick={handleCreate}>
              {createMutation.isPending ? '생성 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상담원 수정 다이얼로그 */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>상담원 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>이름 *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>역할 *</Label>
              <select className={selectClass} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                <option value="AGENT">상담원</option>
                <option value="ADMIN_AGENT">관리자</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>전화번호</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" />
              </div>
              <div>
                <Label>내선번호</Label>
                <Input value={editForm.extension} onChange={e => setEditForm(f => ({ ...f, extension: e.target.value }))} placeholder="내선번호" />
              </div>
            </div>
            <div>
              <Label>이메일</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
          </div>
          {updateMutation.isError && (
            <div className="text-sm text-red-500">수정 실패: {(updateMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>취소</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={!editForm.name.trim() || updateMutation.isPending} onClick={handleUpdate}>
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>상담원 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            <strong>{deleteTarget?.name}</strong> 상담원을 정말 삭제하시겠습니까?<br />
            이 작업은 되돌릴 수 없습니다.
          </p>
          {deleteMutation.isError && (
            <div className="text-sm text-red-500">삭제 실패: {(deleteMutation.error as any)?.message || '오류가 발생했습니다'}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>취소</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
