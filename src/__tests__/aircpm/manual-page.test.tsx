import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import ManualPage from '@/app/manual/page';

/**
 * 매뉴얼은 고정 내용이라 렌더가 깨지는 것 말고는 틀릴 일이 없다. 그래서 문장을 통째로
 * 검사하지 않고 **사용자가 찾는 것**만 잠근다: 8개 단계가 다 있는지, 다운로드 페이지로
 * 가는 길이 있는지, 그리고 화면 문구를 프로그램과 같게 썼는지.
 * 마지막 항목이 핵심이다 — 매뉴얼이 화면과 다른 말을 쓰면 사용자는 둘이 같은 것인지부터
 * 의심해야 한다.
 */
describe('ManualPage', () => {
  it('설치부터 문제 해결까지 8개 절을 모두 보여준다', () => {
    render(<ManualPage />);

    const headings = [
      '1. 프로그램 설치',
      '2. 로그인과 기기 승인',
      '3. 배차 프로그램 준비',
      '4. 콜패스 방향 정하기',
      '5. 자동 콜패스 시작·중단',
      '6. 자주 쓰는 설정',
      '7. 화면 읽는 법',
      '8. 안 될 때 확인할 것',
    ];
    for (const h of headings) {
      expect(screen.getByRole('heading', { name: h })).toBeInTheDocument();
    }
  });

  it('다운로드 페이지로 가는 링크가 있다', () => {
    render(<ManualPage />);

    const link = screen.getByRole('link', { name: '다운로드 페이지' });
    expect(link).toHaveAttribute('href', '/downloads');
  });

  it('프로그램 화면에 실제로 쓰인 문구를 그대로 쓴다', () => {
    render(<ManualPage />);

    // CPM 의 버튼·라벨과 글자가 같아야 한다(DlgMainDash / IDD_SETUP / IDD_SETUP_AUTO).
    // 버튼 이름은 매뉴얼 관례상 대괄호로 감싸 쓴다 — 글자 자체가 같은지만 본다.
    expect(screen.getByText(/자동콜패스 시작/)).toBeInTheDocument();
    expect(screen.getByText('붙여넣기 후 상태')).toBeInTheDocument();
    expect(screen.getByText('붙여넣기 대상 앱 미실행')).toBeInTheDocument();
    expect(screen.getByText('앱 시작 시 자동콜패스 자동 시작')).toBeInTheDocument();
  });

  it('목차가 각 절로 연결된다', () => {
    render(<ManualPage />);

    const toc = screen.getByRole('navigation', { name: '목차' });
    expect(toc).toBeInTheDocument();
    for (const id of ['install', 'login', 'apps', 'direction', 'run', 'settings', 'dashboard', 'trouble']) {
      expect(toc.querySelector(`a[href="#${id}"]`)).not.toBeNull();
    }
  });
  it('설명한 화면을 실제 캡처로 보여준다', () => {
    render(<ManualPage />);

    // 캡처가 빠지면 Shot 은 점선 상자를 그린다 — img 자체가 사라지므로 이 검사가 잡는다.
    // next/image 는 src 를 /_next/image?url=... 로 감싸 인코딩하니 디코드해서 본다.
    const shots: Array<[string, string]> = [
      ['다운로드 페이지', '/manual/downloads.png'],
      ['업데이터 실행 화면', '/manual/updater.png'],
      ['설정 · 기본 탭', '/manual/setup-basic.png'],
      ['설정 · 자동콜패스 탭', '/manual/setup-auto.png'],
      ['메인 대시보드', '/manual/dashboard.png'],
    ];
    for (const [alt, file] of shots) {
      const img = screen.getByAltText(alt);
      expect(decodeURIComponent(img.getAttribute('src') ?? '')).toContain(file);
    }
  });
});
