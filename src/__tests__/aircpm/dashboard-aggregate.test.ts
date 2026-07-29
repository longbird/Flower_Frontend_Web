import { describe, it, expect } from 'vitest';
import { aggregateByDay } from '@/app/aircpm/dashboard/page';
import type { AircpmDailyStatItem } from '@/lib/api/aircpm';

function row(over: Partial<AircpmDailyStatItem>): AircpmDailyStatItem {
  return {
    businessYmd: '2026-07-28',
    brchCd: 'A',
    total: 0,
    success: 0,
    failedAny: 0,
    failedPostprocess: 0,
    failedPaste: 0,
    dispatched: 0,
    dropped: 0,
    droppedUnlinked: 0,
    avgPasteMs: null,
    byKind: {},
    byPhase: {},
    ...over,
  };
}

describe('aggregateByDay', () => {
  it('같은 업무일의 여러 지사를 한 행으로 합친다', () => {
    const out = aggregateByDay([
      row({ brchCd: 'A', total: 400, success: 390, failedAny: 10, dropped: 5 }),
      row({ brchCd: 'B', total: 100, success: 98, failedAny: 2, dropped: 1 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ total: 500, success: 488, failedAny: 12, dropped: 6 });
  });

  // ★ 이 테스트가 핵심이다. 단순평균을 쓰면 콜 1건짜리 지사가 400건짜리와 같은 무게를 갖는다.
  //   실측에서 hanbuk(콜 1건, 15,969ms)과 8282call(440건, 147ms)이 같은 날에 있었다 —
  //   단순평균이면 8,058ms 라는, 어느 지사에서도 일어나지 않은 값이 표에 찍힌다.
  it('평균 붙여넣기는 성공 건수로 가중평균한다(단순평균 아님)', () => {
    const out = aggregateByDay([
      row({ brchCd: 'hanbuk', total: 1, success: 1, avgPasteMs: 15969 }),
      row({ brchCd: '8282call', total: 440, success: 440, avgPasteMs: 147 }),
    ]);
    const simpleMean = Math.round((15969 + 147) / 2); // 8058 — 이 값이 나오면 안 된다
    const weighted = Math.round((15969 * 1 + 147 * 440) / 441); // 183
    expect(out[0].avgPasteMs).toBe(weighted);
    expect(out[0].avgPasteMs).not.toBe(simpleMean);
  });

  it('avgPasteMs 가 null 인 행은 가중평균 분모에서 빠진다', () => {
    const out = aggregateByDay([
      row({ brchCd: 'A', success: 10, avgPasteMs: null }),
      row({ brchCd: 'B', success: 10, avgPasteMs: 200 }),
    ]);
    expect(out[0].avgPasteMs).toBe(200);
  });

  it('표본이 하나도 없으면 null (0 이 아니다 — 0ms 로 오독되면 안 된다)', () => {
    const out = aggregateByDay([row({ total: 5, success: 0, avgPasteMs: null })]);
    expect(out[0].avgPasteMs).toBeNull();
  });

  it('byKind 는 지사별 맵을 키 단위로 합산한다', () => {
    const out = aggregateByDay([
      row({ brchCd: 'A', byKind: { addressMismatch: 2, aborted: 1 } }),
      row({ brchCd: 'B', byKind: { addressMismatch: 3 } }),
    ]);
    expect(out[0].byKind).toEqual({ addressMismatch: 5, aborted: 1 });
  });

  it('업무일 내림차순으로 정렬한다(최근이 위)', () => {
    const out = aggregateByDay([
      row({ businessYmd: '2026-07-26' }),
      row({ businessYmd: '2026-07-28' }),
      row({ businessYmd: '2026-07-27' }),
    ]);
    expect(out.map((d) => d.businessYmd)).toEqual(['2026-07-28', '2026-07-27', '2026-07-26']);
  });

  it('빈 입력은 빈 배열', () => {
    expect(aggregateByDay([])).toEqual([]);
  });
});
