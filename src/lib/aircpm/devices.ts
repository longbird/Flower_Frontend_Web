import type {
  AircpmCertRequest,
  AircpmCertStatus,
  AircpmMobileDevice,
  AircpmMobileDeviceStatus,
} from '@/lib/api/aircpm';

// 데스크톱 인증(aircpm_device_cert)과 모바일 기기(aircpm_mobile_device)는 별개 테이블이다 —
// 기기를 식별하는 방법이 근본적으로 다르기 때문이다(메인보드/BIOS 시리얼+MAC vs 기기ID).
// 하지만 관리자가 하는 일은 "이 사용자의 이 기기를 승인한다"로 똑같다. 이 모듈은 두 목록을
// 화면 하나에서 다룰 수 있는 하나의 어휘로 옮긴다.

export type DeviceKind = 'desktop' | 'mobile';
export type DeviceKindFilter = DeviceKind | 'all';

// 데스크톱 approved 와 모바일 bound 는 같은 뜻이다(사용 중).
// 데스크톱에는 revoked 가 없다 — 승인을 철회하면 rejected 가 된다.
// unknown 은 서버가 우리가 모르는 상태를 보냈을 때의 안전판이다(액션 없이 읽기 전용으로 표시).
export type DeviceStatus = 'pending' | 'active' | 'rejected' | 'revoked' | 'unknown';
export type DeviceStatusFilter = Exclude<DeviceStatus, 'unknown'> | 'all';

export interface UnifiedDevice {
  key: string;
  kind: DeviceKind;
  id: number;
  userId: string;
  name: string | null;
  brchCd: string | null;
  status: DeviceStatus;
  /** 기기 식별 정보 한 줄 — 종류마다 내용이 다르다. */
  detail: string;
  /** 데스크톱 인증 요청에만 있는 연락처. */
  phone: string | null;
  requestedAt: string | null;
  /** 승인/거부된 시각. */
  decidedAt: string | null;
  /** 모바일만 기록한다. */
  lastSeenAt: string | null;
  rejectReason: string | null;
}

const CERT_STATUS: Record<AircpmCertStatus, DeviceStatus> = {
  pending: 'pending',
  approved: 'active',
  rejected: 'rejected',
};

const MOBILE_STATUS: Record<AircpmMobileDeviceStatus, DeviceStatus> = {
  pending: 'pending',
  bound: 'active',
  rejected: 'rejected',
  revoked: 'revoked',
};

export function fromCert(c: AircpmCertRequest): UnifiedDevice {
  const parts = [`serial: ${c.serial}`, `mac: ${c.macAddress || '-'}`];
  if (c.computerName) parts.push(c.computerName);
  if (c.realIp) parts.push(c.realIp);

  return {
    key: `desktop:${c.id}`,
    kind: 'desktop',
    id: c.id,
    userId: c.userId,
    name: c.name,
    brchCd: c.brchCd,
    status: CERT_STATUS[c.status] ?? 'unknown',
    detail: parts.join(' · '),
    phone: c.phone,
    requestedAt: c.requestedAt ?? null,
    decidedAt: c.decidedAt,
    lastSeenAt: null,
    rejectReason: c.rejectReason,
  };
}

export function fromMobile(d: AircpmMobileDevice): UnifiedDevice {
  return {
    key: `mobile:${d.id}`,
    kind: 'mobile',
    id: d.id,
    userId: d.userId,
    name: d.name,
    brchCd: d.brchCd,
    status: MOBILE_STATUS[d.status] ?? 'unknown',
    detail: d.platform ? `${d.platform} · ${d.deviceId}` : d.deviceId,
    phone: null,
    requestedAt: d.requestedAt,
    decidedAt: d.decidedAt ?? d.boundAt,
    lastSeenAt: d.lastSeenAt,
    rejectReason: d.rejectReason,
  };
}

// 처리해야 할 것(승인 대기)이 항상 위. 그 안에서는 최근 것부터.
// 시각이 없는 구 기기(068 이전 바인딩)는 맨 뒤로 보낸다.
function activityAt(d: UnifiedDevice): string {
  return d.requestedAt ?? d.decidedAt ?? d.lastSeenAt ?? '';
}

export function sortDevices(list: readonly UnifiedDevice[]): UnifiedDevice[] {
  const rank = (d: UnifiedDevice) => (d.status === 'pending' ? 0 : 1);

  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const byTime = activityAt(b).localeCompare(activityAt(a));
    return byTime !== 0 ? byTime : a.key.localeCompare(b.key);
  });
}

export function mergeDevices(
  certs: readonly AircpmCertRequest[],
  mobiles: readonly AircpmMobileDevice[],
): UnifiedDevice[] {
  return sortDevices([...certs.map(fromCert), ...mobiles.map(fromMobile)]);
}

/** null = 데스크톱에는 그 상태가 없다. 조회 요청 자체를 보내지 않는다. */
export function certStatusParam(f: DeviceStatusFilter): AircpmCertStatus | 'all' | null {
  switch (f) {
    case 'pending':
      return 'pending';
    case 'active':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'revoked':
      return null;
    case 'all':
      return 'all';
  }
}

export function mobileStatusParam(f: DeviceStatusFilter): AircpmMobileDeviceStatus | 'all' {
  switch (f) {
    case 'pending':
      return 'pending';
    case 'active':
      return 'bound';
    case 'rejected':
      return 'rejected';
    case 'revoked':
      return 'revoked';
    case 'all':
      return 'all';
  }
}
