import { describe, it, expect } from 'vitest';
import {
  certStatusParam,
  mergeDevices,
  mobileStatusParam,
  type UnifiedDevice,
} from '@/lib/aircpm/devices';
import type { AircpmCertRequest, AircpmMobileDevice } from '@/lib/api/aircpm';

function cert(over: Partial<AircpmCertRequest> = {}): AircpmCertRequest {
  return {
    id: 1,
    userId: 'cpm07',
    name: '김철수',
    brchCd: 'm8282_1',
    serial: 'MB-A93F',
    macAddress: '3C-7C-3F-00-11-22',
    computerName: 'DESK-07',
    realIp: '1.2.3.4',
    phone: null,
    status: 'pending',
    requestedAt: '2026-07-14T08:40:00.000Z',
    decidedAt: null,
    decidedBy: null,
    rejectReason: null,
    ...over,
  };
}

function mobile(over: Partial<AircpmMobileDevice> = {}): AircpmMobileDevice {
  return {
    id: 1,
    userId: 'mob01',
    name: '홍길동',
    brchCd: 'demo',
    deviceId: 'android:9f2a1c',
    platform: 'android',
    status: 'pending',
    requestedAt: '2026-07-14T09:12:00.000Z',
    boundAt: null,
    lastSeenAt: null,
    revokedAt: null,
    decidedAt: null,
    decidedBy: null,
    rejectReason: null,
    ...over,
  };
}

const keys = (list: UnifiedDevice[]) => list.map((d) => d.key);

describe('mergeDevices', () => {
  it('데스크톱과 모바일을 한 목록으로 합치고 종류를 표시한다', () => {
    const merged = mergeDevices([cert()], [mobile()]);

    expect(merged).toHaveLength(2);
    expect(merged.map((d) => d.kind).sort()).toEqual(['desktop', 'mobile']);
  });

  it('id 가 겹쳐도 종류가 다르면 서로 다른 행이다', () => {
    // 두 테이블은 각자 AUTO_INCREMENT 라 id 1 이 양쪽에 다 있다.
    // key 를 종류로 네임스페이스하지 않으면 React 가 두 행을 하나로 취급한다.
    const merged = mergeDevices([cert({ id: 1 })], [mobile({ id: 1 })]);

    expect(new Set(keys(merged)).size).toBe(2);
  });

  it('승인 대기를 항상 맨 위에 올린다 — 처리할 것이 먼저 보여야 한다', () => {
    const merged = mergeDevices(
      [cert({ id: 10, status: 'approved', requestedAt: '2026-07-14T23:00:00.000Z' })],
      [mobile({ id: 20, status: 'pending', requestedAt: '2026-07-01T00:00:00.000Z' })],
    );

    // 모바일 대기 건이 훨씬 오래됐지만 대기는 승인보다 위다.
    expect(keys(merged)).toEqual(['mobile:20', 'desktop:10']);
  });

  it('같은 순위 안에서는 최근 요청이 먼저다', () => {
    const merged = mergeDevices(
      [cert({ id: 1, requestedAt: '2026-07-14T08:00:00.000Z' })],
      [mobile({ id: 2, requestedAt: '2026-07-14T09:00:00.000Z' })],
    );

    expect(keys(merged)).toEqual(['mobile:2', 'desktop:1']);
  });

  it('요청 시각이 없는 구 기기는 맨 뒤로 보낸다', () => {
    const merged = mergeDevices(
      [],
      [
        mobile({ id: 1, status: 'bound', requestedAt: null, boundAt: null, decidedAt: null }),
        mobile({ id: 2, status: 'bound', requestedAt: '2026-07-10T00:00:00.000Z' }),
      ],
    );

    expect(keys(merged)).toEqual(['mobile:2', 'mobile:1']);
  });

  it('두 테이블의 상태 어휘를 하나로 합친다 (approved/bound → 사용 중)', () => {
    const merged = mergeDevices(
      [cert({ id: 1, status: 'approved' })],
      [mobile({ id: 2, status: 'bound' })],
    );

    expect(merged.every((d) => d.status === 'active')).toBe(true);
  });

  it('모르는 상태값이 와도 목록을 깨뜨리지 않는다', () => {
    // 서버가 새 상태를 추가하면 Record 조회는 undefined 를 낸다 — 타입은 컴파일 타임에만 막아준다.
    const merged = mergeDevices([], [mobile({ status: 'archived' as never })]);

    expect(merged[0].status).toBe('unknown');
  });

  it('기기 식별 정보를 종류에 맞게 한 줄로 만든다', () => {
    const [m, d] = mergeDevices([cert()], [mobile()]);

    expect(m.detail).toBe('android · android:9f2a1c');
    expect(d.detail).toBe('serial: MB-A93F · mac: 3C-7C-3F-00-11-22 · DESK-07 · 1.2.3.4');
  });
});

describe('상태 필터 → 각 API 의 상태값', () => {
  it('통합 상태를 각 테이블의 원래 어휘로 되돌린다', () => {
    expect(certStatusParam('active')).toBe('approved');
    expect(mobileStatusParam('active')).toBe('bound');
    expect(certStatusParam('pending')).toBe('pending');
    expect(mobileStatusParam('pending')).toBe('pending');
  });

  it('폐기 필터에서는 데스크톱을 아예 조회하지 않는다', () => {
    // 데스크톱에는 revoked 가 없다(승인 철회 → rejected). null = 이 요청을 보내지 마라.
    expect(certStatusParam('revoked')).toBeNull();
    expect(mobileStatusParam('revoked')).toBe('revoked');
  });
});
