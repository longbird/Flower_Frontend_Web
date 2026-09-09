import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  Download,
  ListChecks,
  LogIn,
  Monitor,
  Play,
  Settings,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: '자동콜패스 사용 매뉴얼',
  description: '설치부터 자동 콜패스 시작까지 — 화면 그대로 따라 하는 안내',
};

/**
 * 공개 사용 매뉴얼 — 로그인 없이 접근한다(/aircpm/* 인증 가드 밖의 앱 루트, /downloads 와 같은 위치).
 * 설치하려는 사람은 아직 계정이 없을 수 있으므로 인증 안쪽에 두면 안 된다.
 *
 * 서버 컴포넌트다. 내용이 고정이라 클라이언트 상태가 필요 없다.
 *
 * ★문구는 프로그램 화면에 실제로 쓰인 말을 그대로 쓴다(예: '자동콜패스 시작', '붙여넣기 후 상태',
 *   '중단하는 중...'). 매뉴얼이 화면과 다른 말을 쓰면 사용자는 그 둘이 같은 것인지부터 의심해야 한다.
 */
export default function ManualPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <header className="mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-sm mx-auto mb-4">
            <ListChecks className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">자동콜패스 사용 매뉴얼</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            설치부터 자동 콜패스를 켜기까지, 순서대로 따라 하시면 됩니다.
          </p>
        </header>

        <nav aria-label="목차" className="mb-8">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">목차</h2>
              <ol className="grid gap-1.5 sm:grid-cols-2 text-sm text-slate-600 list-decimal list-inside">
                <li>
                  <a className="hover:text-emerald-700" href="#install">
                    프로그램 설치
                  </a>
                </li>
                <li>
                  <a className="hover:text-emerald-700" href="#login">
                    로그인과 기기 승인
                  </a>
                </li>
                <li>
                  <a className="hover:text-emerald-700" href="#apps">
                    배차 프로그램 준비
                  </a>
                </li>
                <li>
                  <a className="hover:text-emerald-700" href="#direction">
                    콜패스 방향 정하기
                  </a>
                </li>
                <li>
                  <a className="hover:text-emerald-700" href="#run">
                    자동 콜패스 시작·중단
                  </a>
                </li>
                <li>
                  <a className="hover:text-emerald-700" href="#settings">
                    자주 쓰는 설정
                  </a>
                </li>
                <li>
                  <a className="hover:text-emerald-700" href="#dashboard">
                    화면 읽는 법
                  </a>
                </li>
                <li>
                  <a className="hover:text-emerald-700" href="#trouble">
                    안 될 때 확인할 것
                  </a>
                </li>
              </ol>
            </CardContent>
          </Card>
        </nav>

        <Section
          id="install"
          icon={<Download className="w-5 h-5 text-violet-600" />}
          iconWrap="bg-violet-50"
          title="1. 프로그램 설치"
          lead="업데이터 하나만 받으면 나머지는 자동입니다."
        >
          <Steps
            items={[
              <>
                <Link href="/downloads" className="text-emerald-700 underline underline-offset-2">
                  다운로드 페이지
                </Link>
                에서 <b>CPM 데스크톱 업데이터</b>를 내려받습니다.
              </>,
              <>
                받은 파일을 <b>실행</b>합니다. 관리자 권한을 묻는 창이 뜨면 <b>예</b>를 누릅니다.
              </>,
              <>필요한 파일을 자동으로 받아 설치하고, 끝나면 프로그램이 스스로 실행됩니다.</>,
            ]}
          />
          <Note>
            설치 위치는 <Code>C:\Program Files (x86)\CPM</Code> 입니다. 다음부터는 프로그램을 켤 때마다
            업데이터가 먼저 돌면서 최신 버전인지 확인하므로, 따로 다시 받으실 필요가 없습니다.
          </Note>
          <Shot caption="다운로드 페이지 · 업데이터 실행 화면" />
        </Section>

        <Section
          id="login"
          icon={<LogIn className="w-5 h-5 text-sky-600" />}
          iconWrap="bg-sky-50"
          title="2. 로그인과 기기 승인"
          lead="처음 쓰는 PC 는 관리자 승인이 한 번 필요합니다."
        >
          <Steps
            items={[
              <>
                <b>아이디</b>, <b>비밀번호</b>, <b>휴대폰 번호</b>를 입력합니다. 번호는{' '}
                <Code>01012345678</Code> 처럼 숫자만 넣습니다.
              </>,
              <>
                실행 모드에서 <b>자동화 모드</b>를 고릅니다. (모니터링·뷰어 모드는 별도 권한이 있는
                지사에서만 보입니다.)
              </>,
              <>
                <b>로그인</b>을 누릅니다.
              </>,
            ]}
          />
          <Note title="“이 PC는 아직 등록되지 않았습니다” 가 뜨면">
            처음 쓰는 PC 입니다. <b>[인증 요청]</b>을 누른 뒤 관리자에게 승인을 요청하고, 승인되면{' '}
            <b>[승인 확인]</b>을 누르세요. 승인 전에는 <b>“관리자 승인 대기 중입니다”</b> 가 나옵니다.
          </Note>
          <Shot caption="로그인 화면 · 기기 인증 화면" />
        </Section>

        <Section
          id="apps"
          icon={<Monitor className="w-5 h-5 text-amber-600" />}
          iconWrap="bg-amber-50"
          title="3. 배차 프로그램 준비"
          lead="콜을 가져올 곳과 넣을 곳이 모두 떠 있어야 합니다."
        >
          <Steps
            items={[
              <>
                평소 쓰시는 배차 프로그램(로지, 콜마너 등)을 <b>실행하고 로그인</b>합니다.
              </>,
              <>
                각 프로그램에서 <b>접수 목록 화면</b>을 열어 둡니다. 다른 화면에 있으면 자동 콜패스가
                멈춥니다.
              </>,
              <>
                창을 최소화하지 마세요. 화면을 읽어야 하므로 <b>가려지지 않게</b> 두는 것이 좋습니다.
              </>,
            ]}
          />
          <Note title="매번 켜기 번거로우면">
            설정 → <b>기본</b> 탭의 <b>“CPM 시작 시 소스·타겟 앱을 직접 실행하고 접수 탭까지 준비”</b> 를
            켜면 프로그램이 대신 띄워 줍니다. 로지 비밀번호를 함께 저장해 두어야 합니다.
          </Note>
          <Shot caption="배차 프로그램 접수 목록 화면" />
        </Section>

        <Section
          id="direction"
          icon={<Settings className="w-5 h-5 text-slate-600" />}
          iconWrap="bg-slate-100"
          title="4. 콜패스 방향 정하기"
          lead="어디서 가져와 어디에 넣을지 한 번만 정하면 됩니다."
        >
          <p className="text-sm text-slate-600 leading-relaxed">
            화면의 <b>[설정]</b> → <b>기본</b> 탭에 있는 <b>콜패스 방향</b> 에서 정합니다.
          </p>
          <Table
            rows={[
              ['가져오기', '콜을 읽어 올 프로그램을 고릅니다.'],
              ['붙여넣기', '읽은 콜을 접수할 프로그램을 고릅니다.'],
              ['붙여넣기 후 상태', '접수한 뒤 원본 콜을 어떤 상태로 바꿀지 정합니다.'],
            ]}
          />
          <Shot caption="설정 · 기본 탭" />
        </Section>

        <Section
          id="run"
          icon={<Play className="w-5 h-5 text-emerald-600" />}
          iconWrap="bg-emerald-50"
          title="5. 자동 콜패스 시작·중단"
          lead="버튼 하나로 시작하고, 언제든 멈출 수 있습니다."
        >
          <Steps
            items={[
              <>
                메인 화면의 <b>[자동콜패스 시작]</b> 을 누릅니다. 버튼이 <b>[자동콜패스 중단]</b> 으로
                바뀝니다.
              </>,
              <>
                이제 새 콜이 들어오면 자동으로 읽어 반대편에 접수합니다. 진행 상황은 화면 목록에
                나옵니다.
              </>,
              <>
                멈추려면 <b>[자동콜패스 중단]</b> 을 누릅니다. <b>진행 중인 콜은 마친 뒤</b> 멈추므로
                잠시 <b>“중단하는 중...”</b> 이 보입니다.
              </>,
            ]}
          />
          <Note title="급히 멈춰야 할 때">
            <b>ESC</b> 키를 누르면 즉시 중단합니다. 한 건이 처리되는 도중이라도 그 자리에서 멈춥니다.
          </Note>
          <Shot caption="자동 콜패스 실행 중 화면" />
        </Section>

        <Section
          id="settings"
          icon={<Settings className="w-5 h-5 text-violet-600" />}
          iconWrap="bg-violet-50"
          title="6. 자주 쓰는 설정"
          lead="설정 → 자동콜패스 탭에 있습니다."
        >
          <h3 className="text-sm font-semibold text-slate-900 mt-1">자동 중단</h3>
          <p className="text-sm text-slate-600 mt-1 mb-2 leading-relaxed">
            아래 상황에서 스스로 멈추게 합니다. 잘못된 콜이 계속 쌓이는 것을 막아 줍니다.
          </p>
          <Table
            rows={[
              ['붙여넣기 실패 시', '접수에 실패하면 멈춥니다.'],
              ['주소 일치도 … 미만', '읽어 온 주소와 검색 결과가 많이 다르면 멈춥니다.'],
              ['가져오기 연속 … 회 실패', '정한 횟수만큼 연달아 실패하면 멈춥니다.'],
              ['붙여넣기 대상 앱 미실행', '접수할 프로그램이 꺼져 있으면 멈춥니다.'],
            ]}
          />
          <h3 className="text-sm font-semibold text-slate-900 mt-5">알림</h3>
          <Table
            rows={[
              ['원본 콜 이탈 시', '가져온 콜이 원래 프로그램에서 사라지면 알려 줍니다.'],
              ['원본 콜 재진입 시', '사라졌던 콜이 다시 나타나면 알려 줍니다.'],
            ]}
          />
          <h3 className="text-sm font-semibold text-slate-900 mt-5">앱 시작 · 감시</h3>
          <Table
            rows={[
              [
                '앱 시작 시 자동콜패스 자동 시작',
                '프로그램을 켜면 알아서 시작합니다. 소스 앱이 뜰 때까지 최대 3분 기다립니다.',
              ],
              [
                '앱 시작 시 감시 켬',
                '켜면 시작할 때부터 타겟 앱을 감시합니다. 메인 화면 [감시] 버튼은 지금 상태만 바꿉니다.',
              ],
            ]}
          />
          <Shot caption="설정 · 자동콜패스 탭" />
        </Section>

        <Section
          id="dashboard"
          icon={<Monitor className="w-5 h-5 text-sky-600" />}
          iconWrap="bg-sky-50"
          title="7. 화면 읽는 법"
          lead="오늘 08:00 부터의 실적을 보여 줍니다."
        >
          <Table
            rows={[
              ['가져온 콜', '원본에서 읽어 온 콜 수입니다.'],
              ['콜패스 성공', '반대편에 접수까지 끝난 콜 수입니다.'],
              ['콜 이탈', '가져왔는데 원본에서 사라진 콜입니다.'],
              ['검색실패', '주소를 찾지 못해 접수하지 못한 콜입니다.'],
              ['성공률 · 처리속도', '성공 비율과 한 건당 평균 처리 시간입니다.'],
            ]}
          />
          <Note title="화면의 연결 표시">
            <b>● 백엔드 연결됨</b> 이면 정상입니다. <b>● 백엔드 연결 끊김</b> 이면 통계와 알림이 서버로
            올라가지 않습니다 — 인터넷 연결을 확인하세요. 콜패스 자체는 계속 동작합니다.
          </Note>
          <Shot caption="메인 대시보드" />
        </Section>

        <Section
          id="trouble"
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          iconWrap="bg-rose-50"
          title="8. 안 될 때 확인할 것"
          lead="대부분 아래 넷 중 하나입니다."
        >
          <Table
            rows={[
              [
                '시작을 눌러도 아무 일이 없다',
                '배차 프로그램이 접수 목록 화면에 있는지 확인하세요. 다른 화면이면 동작하지 않습니다.',
              ],
              [
                '혼자 멈췄다',
                '중단 사유가 화면에 표시됩니다. 설정 → 자동콜패스 → 자동 중단 항목을 확인하세요.',
              ],
              [
                '로그인이 안 된다',
                '기기 승인 대기 중일 수 있습니다. [승인 확인]을 눌러 보고, 그래도 안 되면 관리자에게 문의하세요.',
              ],
              [
                '주소를 자꾸 못 찾는다',
                '원본 콜의 주소가 너무 짧거나 지역 표기가 빠진 경우입니다. 해당 콜 번호를 관리자에게 알려 주세요.',
              ],
            ]}
          />
        </Section>

        <p className="mt-10 text-center text-xs text-slate-400 leading-relaxed">
          더 궁금한 점은 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}

function Section({
  id,
  icon,
  iconWrap,
  title,
  lead,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  iconWrap: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-5 scroll-mt-6">
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconWrap}`}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{lead}</p>
            </div>
          </div>
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
          <span className="shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-slate-100 first:border-t-0">
              <th
                scope="row"
                className="text-left align-top font-medium text-slate-800 py-2 pr-4 whitespace-nowrap"
              >
                {k}
              </th>
              <td className="text-slate-600 py-2 leading-relaxed">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3.5">
      {title && <p className="text-sm font-medium text-slate-800 mb-1">{title}</p>}
      <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[13px] font-mono">
      {children}
    </code>
  );
}

/**
 * 화면 캡처 자리. 이미지가 준비되면 이 자리에 넣는다.
 * 빈 상자를 남겨 두는 이유: 캡처가 없다는 사실이 눈에 보여야 나중에 채워진다.
 * 글만으로도 순서를 따라갈 수 있게 썼으므로 지금 상태로도 매뉴얼은 성립한다.
 */
function Shot({ caption }: { caption: string }) {
  return (
    <figure className="mt-4">
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 h-32 flex items-center justify-center">
        <span className="text-xs text-slate-400">화면 캡처 준비 중</span>
      </div>
      <figcaption className="mt-1.5 text-xs text-slate-400 text-center">{caption}</figcaption>
    </figure>
  );
}
