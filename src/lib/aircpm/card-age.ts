export type CardAgeLevel = 'normal' | 'warn' | 'danger';

/** 등록일(ISO) 기준 경과 수준. 30일↑ warn(주황), 60일↑ danger(적색). 스펙 요구사항 4. */
export function getCardAgeLevel(registeredAtIso: string): CardAgeLevel {
  if (!registeredAtIso) return 'normal';
  const reg = new Date(registeredAtIso);
  if (isNaN(reg.getTime())) return 'normal';
  const days = Math.floor((Date.now() - reg.getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 60) return 'danger';
  if (days >= 30) return 'warn';
  return 'normal';
}

/** 경과 수준 → Tailwind 텍스트 색상 클래스 */
export function cardAgeColorClass(level: CardAgeLevel): string {
  if (level === 'danger') return 'text-red-600';
  if (level === 'warn') return 'text-orange-500';
  return 'text-slate-900';
}
