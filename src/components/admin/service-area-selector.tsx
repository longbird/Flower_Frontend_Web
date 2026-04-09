'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listFloristSidos, listFloristGuguns } from '@/lib/api/admin';
import type { SidoItem, GugunItem } from '@/lib/api/admin';

interface ServiceAreaSelectorProps {
  onAdd: (params: { area: string; gugunId: number }) => void;
  disabled?: boolean;
  existingAreas?: string[];
}

export function ServiceAreaSelector({
  onAdd,
  disabled = false,
  existingAreas = [],
}: ServiceAreaSelectorProps) {
  const [selectedSidoId, setSelectedSidoId] = useState<string>('');
  const [selectedGugunId, setSelectedGugunId] = useState<string>('');

  const { data: sidos = [] } = useQuery<SidoItem[]>({
    queryKey: ['florist-sidos'],
    queryFn: listFloristSidos,
    staleTime: 1000 * 60 * 30,
  });

  const { data: guguns = [], isFetching: isLoadingGuguns } = useQuery<GugunItem[]>({
    queryKey: ['florist-guguns', selectedSidoId],
    queryFn: () => listFloristGuguns(Number(selectedSidoId)),
    enabled: !!selectedSidoId,
    staleTime: 1000 * 60 * 30,
  });

  const handleSidoChange = (value: string) => {
    setSelectedSidoId(value);
    setSelectedGugunId('');
  };

  const handleAdd = () => {
    if (!selectedSidoId) return;

    if (selectedGugunId) {
      const gugun = guguns.find((g) => String(g.id) === selectedGugunId);
      if (!gugun) return;
      if (existingAreas.includes(gugun.name)) return;
      onAdd({ area: gugun.name, gugunId: gugun.id });
      setSelectedGugunId('');
    } else {
      const sido = sidos.find((s) => String(s.id) === selectedSidoId);
      if (!sido) return;
      if (existingAreas.includes(sido.name)) return;
      const sidoGugun = guguns.find((g) => g.name === sido.name);
      if (sidoGugun) {
        onAdd({ area: sido.name, gugunId: sidoGugun.id });
      } else {
        onAdd({ area: sido.name, gugunId: 0 });
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={selectedSidoId} onValueChange={handleSidoChange} disabled={disabled}>
        <SelectTrigger className="flex-1 min-w-0">
          <SelectValue placeholder="시/도 선택" />
        </SelectTrigger>
        <SelectContent>
          {sidos.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedGugunId}
        onValueChange={setSelectedGugunId}
        disabled={disabled || !selectedSidoId || isLoadingGuguns}
      >
        <SelectTrigger className="flex-1 min-w-0">
          <SelectValue placeholder={isLoadingGuguns ? '로딩...' : '구/군 선택 (선택사항)'} />
        </SelectTrigger>
        <SelectContent>
          {guguns.map((g) => (
            <SelectItem key={g.id} value={String(g.id)}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled || !selectedSidoId}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#5B7A3D] text-white hover:bg-[#4A6830] transition-colors disabled:opacity-50 shrink-0"
      >
        추가
      </button>
    </div>
  );
}
