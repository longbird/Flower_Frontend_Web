import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminVbankPaymentsPage from '@/app/admin/payments/vbank/page';

vi.mock('@/lib/api/admin-payments-vbank', () => ({
  getVbankOverview: vi.fn(),
  listVbankIssues: vi.fn(),
  listVbankLogs: vi.fn(),
  listVbankPayments: vi.fn(),
  listVbankPool: vi.fn(),
  ackVbankIssue: vi.fn(),
  resolveVbankIssue: vi.fn(),
}));

import {
  getVbankOverview,
  listVbankIssues,
  listVbankLogs,
  listVbankPayments,
  listVbankPool,
} from '@/lib/api/admin-payments-vbank';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('AdminVbankOperationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getVbankOverview as ReturnType<typeof vi.fn>).mockResolvedValue({
      pool: { total: 500, available: 497, inUse: 3, disabled: 0, threshold: 20 },
      payments: { pending: 1, paid: 2, canceled: 0, reviewRequired: 1 },
      webhooks: { received24h: 4, failed24h: 1, duplicate24h: 1, invalidSignature24h: 1 },
      issues: { openCritical: 1, openWarning: 1, acked: 0 },
    });
    (listVbankIssues as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{
        id: 1,
        severity: 'CRITICAL',
        eventType: 'WEBHOOK_MID_MISMATCH',
        status: 'OPEN',
        title: '가상계좌 웹훅 MID 불일치',
        message: 'shopCode가 설정된 MID와 다릅니다.',
        paymentId: null,
        orderId: null,
        branchId: null,
        branchName: null,
        accountNumber: '08205040497612',
        occurrenceCount: 1,
        smsStatus: 'SENT',
        slackStatus: 'SENT',
        notificationError: null,
        firstSeenAt: '2026-04-30T01:00:00Z',
        lastSeenAt: '2026-04-30T01:00:00Z',
        acknowledgedAt: null,
        resolvedAt: null,
      }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    (listVbankLogs as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{
        occurredAt: '2026-04-30T01:10:00Z',
        category: 'WEBHOOK',
        severity: 'INFO',
        eventType: 'DEPOSIT',
        message: '가상계좌 입금 웹훅 수신',
        paymentId: 77,
        orderId: 123,
        branchId: 9,
        branchName: '서울지사',
        accountNumber: '08205040497612',
        amount: 55000,
        status: '1',
        sourceId: 'webhook:77',
        metadata: { transSeq: 'T-1' },
      }],
      total: 1,
      page: 1,
      pageSize: 30,
    });
    (listVbankPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{
        paymentId: 77,
        orderId: 123,
        orderNo: 'ORD-20260430-001',
        ordererName: '홍길동',
        receiverName: '김수령',
        deliveryAt: '2026-05-01T02:30:00Z',
        orderType: 'GENERAL',
        branchId: 9,
        branchName: '서울지사',
        status: 'PENDING',
        amountTotal: 55000,
        paidAmount: null,
        vbankAccountNumber: '08205040497612',
        vbankBankCode: '004',
        vbankBankName: '국민은행',
        vbankHolderName: '달려라꽃배달',
        vbankDueDate: '2026-05-01T15:00:00Z',
        paidAt: null,
        canceledAt: null,
        createdAt: '2026-04-30T01:00:00Z',
        innopayMode: 'TEST',
        innopayTid: 'pool-77',
      }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    (listVbankPool as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 30 });
  });

  it('renders operations title, tabs, overview, and open issues', async () => {
    render(
      <Wrapper>
        <AdminVbankPaymentsPage />
      </Wrapper>,
    );

    expect(screen.getByText('가상계좌 운영 로그')).toBeInTheDocument();
    expect(screen.getByText('문제')).toBeInTheDocument();
    expect(screen.getByText('타임라인')).toBeInTheDocument();
    expect(screen.getByText('결제')).toBeInTheDocument();
    expect(screen.getByText('계좌풀')).toBeInTheDocument();
    expect(await screen.findByText('가상계좌 웹훅 MID 불일치')).toBeInTheDocument();
    await waitFor(() => expect(getVbankOverview).toHaveBeenCalled());
  });

  it('can query acknowledged and resolved issues after they leave the open list', async () => {
    render(
      <Wrapper>
        <AdminVbankPaymentsPage />
      </Wrapper>,
    );

    await screen.findByText('가상계좌 웹훅 MID 불일치');
    fireEvent.click(screen.getByRole('button', { name: '해결됨' }));

    await waitFor(() => expect(listVbankIssues).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'RESOLVED' }),
    ));
  });

  it('opens a detail dialog from timeline rows', async () => {
    render(
      <Wrapper>
        <AdminVbankPaymentsPage />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: '타임라인' }));
    await screen.findByText('DEPOSIT');
    fireEvent.click(screen.getByRole('button', { name: /DEPOSIT/ }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('가상계좌 상세');
    expect(screen.getByText('webhook:77')).toBeInTheDocument();
    expect(screen.getByText(/T-1/)).toBeInTheDocument();
  });

  it('opens a detail dialog from payment rows', async () => {
    render(
      <Wrapper>
        <AdminVbankPaymentsPage />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: '결제' }));
    fireEvent.click(await screen.findByRole('button', { name: /결제 77/ }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('가상계좌 상세');
    expect(screen.getAllByText('ORD-20260430-001').length).toBeGreaterThan(0);
    expect(screen.getByText('국민은행')).toBeInTheDocument();
  });
});
