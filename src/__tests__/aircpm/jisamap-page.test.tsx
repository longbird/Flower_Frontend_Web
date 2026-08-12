import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JisamapPage from '@/app/aircpm/jisamap/page';

const h = vi.hoisted(() => ({ user: { isSuper: false, brchCd: '8282call' } as any }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/lib/auth/store', () => ({
  useAuthStore: (sel: any) => sel({ user: h.user }),
}));
vi.mock('@/lib/api/aircpm-payments', () => ({ listAircpmBranches: vi.fn() }));
vi.mock('@/lib/api/aircpm-jisamap', () => ({
  getJisamap: vi.fn(),
  getJisamapHistory: vi.fn(),
  updateJisamap: vi.fn(),
  revertJisamap: vi.fn(),
}));

import {
  getJisamap,
  getJisamapHistory,
  revertJisamap,
  updateJisamap,
} from '@/lib/api/aircpm-jisamap';
import { listAircpmBranches } from '@/lib/api/aircpm-payments';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const RULES = [
  {
    target: { name: '공오대리', tel: '1588-0005' },
    sources: [{ name: '둘둘대리', tels: ['1666-2222'] }],
  },
  {
    target: { name: 'HM법인전용', tel: '1544-6977' },
    sources: [{ name: '핸들법인', tels: ['1544-6977'] }],
  },
];

function activeResponse(over: Record<string, unknown> = {}) {
  return {
    brchCd: '8282call',
    isSuper: false,
    version: 1,
    rules: RULES,
    createdAt: '2026-08-12T00:00:00.000Z',
    createdBy: 7,
    note: '초기 시드',
    ...over,
  };
}

function renderPage() {
  return render(
    <Wrapper>
      <JisamapPage />
    </Wrapper>,
  );
}

describe('JisamapPage — 지사 관리자', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.user = { isSuper: false, brchCd: '8282call' };
    (getJisamap as any).mockResolvedValue(activeResponse());
    (getJisamapHistory as any).mockResolvedValue({ brchCd: '8282call', items: [] });
  });

  it('자기 지사 규칙을 불러오되 brchCd 를 보내지 않는다 (서버가 강제)', async () => {
    renderPage();
    await waitFor(() => expect(getJisamap).toHaveBeenCalled());
    expect((getJisamap as any).mock.calls[0][0]).toBeUndefined();
    expect(await screen.findByDisplayValue('1588-0005')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1666-2222')).toBeInTheDocument();
  });

  it('지사 선택 드롭다운 대신 소속 지사를 고정 표시한다', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('8282call')).toBeInTheDocument());
    expect(screen.queryByLabelText('지사 선택')).not.toBeInTheDocument();
    expect(listAircpmBranches).not.toHaveBeenCalled();
  });

  it('규칙 간 소스 번호가 겹치면 오류를 띄우고 저장을 막는다', async () => {
    renderPage();
    const tel = await screen.findByLabelText('규칙 2 소스 1 번호');
    fireEvent.change(tel, { target: { value: '1666-2222' } });

    expect(await screen.findByText(/중복 등장합니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장 (새 버전 생성)' })).toBeDisabled();
  });

  it('저장 전 요약을 보여주고, 확인해야 실제로 저장한다', async () => {
    (updateJisamap as any).mockResolvedValue({ ok: true, version: 2, warnings: [] });
    renderPage();

    const name = await screen.findByLabelText('규칙 1 소스 1 지사명');
    fireEvent.change(name, { target: { value: '둘둘대리(수정)' } });

    fireEvent.click(screen.getByRole('button', { name: '저장 (새 버전 생성)' }));

    // 요약이 뜨기 전까지는 저장이 호출되지 않는다.
    expect(await screen.findByText('1개 지사 → 공오대리(1588-0005)')).toBeInTheDocument();
    expect(updateJisamap).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(updateJisamap).toHaveBeenCalled());

    const arg = (updateJisamap as any).mock.calls[0][0];
    expect(arg.brchCd).toBeUndefined();
    expect(arg.rules).toHaveLength(2);
    expect(arg.rules[0].sources[0]).toEqual({ name: '둘둘대리(수정)', tels: ['1666-2222'] });
    // 편집용 id 가 전송 payload 에 새어 나가면 백엔드 whitelist 가 400 을 낸다.
    expect(JSON.stringify(arg.rules)).not.toContain('"id"');
  });

  it('규칙을 끄면 저장 요약에서 빠지고 payload 에는 enabled:false 로 남는다', async () => {
    (updateJisamap as any).mockResolvedValue({ ok: true, version: 2, warnings: [] });
    renderPage();

    fireEvent.click(await screen.findByTestId('rule-enabled-1'));
    expect(await screen.findByText(/비활성 · CPM 에 내려가지 않음/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '저장 (새 버전 생성)' }));

    expect(await screen.findByText('1개 지사 → 공오대리(1588-0005)')).toBeInTheDocument();
    expect(screen.queryByText(/HM법인전용/)).not.toBeInTheDocument();
    expect(
      screen.getByText('비활성 규칙 1건은 설정에 남지만 CPM 에 내려가지 않습니다.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(updateJisamap).toHaveBeenCalled());

    const arg = (updateJisamap as any).mock.calls[0][0];
    // 규칙과 소스는 그대로 보존된 채 꺼진 상태로만 저장된다.
    expect(arg.rules).toHaveLength(2);
    expect(arg.rules[0].enabled).toBe(true);
    expect(arg.rules[1].enabled).toBe(false);
    expect(arg.rules[1].sources[0].tels).toEqual(['1544-6977']);
  });

  it('번호가 겹치는 두 규칙도 한쪽을 끄면 저장할 수 있다', async () => {
    renderPage();

    const tel = await screen.findByLabelText('규칙 2 소스 1 번호');
    fireEvent.change(tel, { target: { value: '1666-2222' } });
    expect(await screen.findByText(/중복 등장합니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장 (새 버전 생성)' })).toBeDisabled();

    // 겹치는 한쪽을 끄면 모호함이 사라지므로 저장이 풀린다 — 이 기능의 주 용도.
    fireEvent.click(screen.getByTestId('rule-enabled-1'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '저장 (새 버전 생성)' })).toBeEnabled(),
    );
    expect(screen.queryByText(/중복 등장합니다/)).not.toBeInTheDocument();
  });

  it('모든 규칙을 끄면 매핑이 해제된다고 경고한다', async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId('rule-enabled-0'));
    fireEvent.click(screen.getByTestId('rule-enabled-1'));

    fireEvent.click(screen.getByRole('button', { name: '저장 (새 버전 생성)' }));
    expect(await screen.findByText(/매핑이 모두 해제되고/)).toBeInTheDocument();
  });

  it('저장 직후 화면은 오류 없이 유효하다 (빈 규칙이면 경고 문구)', async () => {
    (getJisamap as any).mockResolvedValue(activeResponse({ version: 0, rules: [] }));
    renderPage();
    expect(
      await screen.findByText(/규칙이 없습니다\. CPM 은 모든 콜을 원본 지사 그대로 접수합니다\./),
    ).toBeInTheDocument();
    expect(screen.getByText('설정 없음')).toBeInTheDocument();
  });

  it('이력에서 되돌리기를 실행한다', async () => {
    (getJisamapHistory as any).mockResolvedValue({
      brchCd: '8282call',
      items: [
        { version: 2, isActive: true, rules: RULES, createdAt: null, createdBy: 7, note: null },
        { version: 1, isActive: false, rules: [RULES[0]], createdAt: null, createdBy: null, note: '초기' },
      ],
    });
    (revertJisamap as any).mockResolvedValue({ ok: true, version: 3, revertedFrom: 1 });
    renderPage();

    // Radix Tabs 는 click 이 아니라 mousedown 으로 전환한다.
    fireEvent.mouseDown(await screen.findByRole('tab', { name: '이력' }));
    fireEvent.click(await screen.findByRole('button', { name: '되돌리기' }));
    fireEvent.click(await screen.findByRole('button', { name: '되돌리기 실행' }));

    await waitFor(() => expect(revertJisamap).toHaveBeenCalledWith({
      brchCd: undefined,
      toVersion: 1,
    }));
  });
});

describe('JisamapPage — 슈퍼 관리자', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.user = { isSuper: true, brchCd: null };
    (listAircpmBranches as any).mockResolvedValue([{ brchCd: '8282call', name: '8282콜' }]);
    (getJisamap as any).mockResolvedValue(activeResponse({ isSuper: true }));
    (getJisamapHistory as any).mockResolvedValue({ brchCd: '8282call', items: [] });
  });

  it('지사를 고르기 전에는 조회하지 않는다', async () => {
    renderPage();
    await waitFor(() => expect(listAircpmBranches).toHaveBeenCalled());
    expect(
      screen.getByText('지사를 선택하면 그 지사의 매핑 규칙을 편집할 수 있습니다.'),
    ).toBeInTheDocument();
    expect(getJisamap).not.toHaveBeenCalled();
  });

  it('지사 선택 드롭다운을 보여준다', async () => {
    renderPage();
    expect(await screen.findByLabelText('지사 선택')).toBeInTheDocument();
  });
});
