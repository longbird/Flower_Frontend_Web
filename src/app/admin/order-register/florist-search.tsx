'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Florist {
  id: number;
  name: string;
  phone?: string;
  sido?: string;
  gugun?: string;
  address?: string;
}

interface FloristSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (florist: Florist) => void;
}

export function FloristSearchDialog({ open, onClose, onSelect }: FloristSearchDialogProps) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['florist-search', query],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', '1');
      sp.set('size', '20');
      if (query) sp.set('q', query);
      return api<{ items: Florist[]; total: number }>(`/admin/partners/florists?${sp.toString()}`);
    },
    enabled: open,
  });

  const florists = data?.items ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
  };

  const handleSelect = (florist: Florist) => {
    onSelect(florist);
    onClose();
    setSearch('');
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-900">화원 검색</h2>
          <form onSubmit={handleSearch} className="flex gap-2 mt-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="화원명, 전화번호, 지역으로 검색"
              className="flex-1"
              autoFocus
            />
            <Button type="submit" className="bg-[#5B7A3D] hover:bg-[#4A6830] shrink-0">
              검색
            </Button>
          </form>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto border-t border-gray-200 min-h-0">
          {isLoading && (
            <div className="text-center py-8 text-gray-400 text-sm">검색 중...</div>
          )}
          {!isLoading && florists.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              {query ? '검색 결과가 없습니다' : '화원명이나 지역을 검색하세요'}
            </div>
          )}
          {florists.map((f) => (
            <button
              key={f.id}
              onClick={() => handleSelect(f)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#E8F0E0] transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="w-8 h-8 rounded-full bg-[#E8F0E0] flex items-center justify-center text-[#5B7A3D] text-xs font-bold shrink-0">
                {f.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[f.sido, f.gugun].filter(Boolean).join(' ')}
                  {f.phone ? ` · ${f.phone}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
