'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AdminVbankIssueRow,
  AdminVbankLogRow,
  AdminVbankPaymentRow,
} from '@/lib/payments/vbank-payment-types';
import type { AdminPaymentTransaction } from '../components/PaymentTable';

type DetailValue = string | number | null | undefined | Record<string, unknown>;

interface DetailRow {
  label: string;
  value: DetailValue;
  mono?: boolean;
}

interface DetailSection {
  title: string;
  rows: DetailRow[];
}

export interface VbankDetail {
  title: string;
  subtitle?: string;
  sections: DetailSection[];
}

function valueText(value: DetailValue): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function fmtAmount(value: number | null | undefined): string {
  if (value == null) return '-';
  return `${Number(value).toLocaleString('ko-KR')}원`;
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR');
}

function parseMetadata(value: AdminVbankLogRow['metadata']): DetailValue {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return value;
    }
  }
  return value;
}

export function buildPaymentDetail(row: AdminVbankPaymentRow): VbankDetail {
  return {
    title: `가상계좌 결제 ${row.paymentId}`,
    subtitle: row.orderNo ?? `주문 ${row.orderId}`,
    sections: [
      {
        title: '결제',
        rows: [
          { label: '결제ID', value: row.paymentId, mono: true },
          { label: '주문ID', value: row.orderId, mono: true },
          { label: '주문번호', value: row.orderNo, mono: true },
          { label: '상태', value: row.status },
          { label: '요청액', value: fmtAmount(row.amountTotal) },
          { label: '입금액', value: fmtAmount(row.paidAmount) },
          { label: '발급시각', value: fmtDateTime(row.createdAt) },
          { label: '입금시각', value: fmtDateTime(row.paidAt) },
          { label: '취소시각', value: fmtDateTime(row.canceledAt) },
        ],
      },
      {
        title: '주문',
        rows: [
          { label: '주문자', value: row.ordererName },
          { label: '받는분', value: row.receiverName },
          { label: '주문구분', value: row.orderType },
          { label: '배송일', value: fmtDateTime(row.deliveryAt) },
          { label: '지사', value: row.branchName ?? row.branchId },
        ],
      },
      {
        title: '계좌',
        rows: [
          { label: '계좌번호', value: row.vbankAccountNumber, mono: true },
          { label: '은행', value: row.vbankBankName ?? row.vbankBankCode },
          { label: '예금주', value: row.vbankHolderName },
          { label: '입금마감', value: fmtDateTime(row.vbankDueDate) },
          { label: '모드', value: row.innopayMode },
          { label: 'TID', value: row.innopayTid, mono: true },
        ],
      },
    ],
  };
}

export function buildTransactionPaymentDetail(tx: AdminPaymentTransaction): VbankDetail {
  return {
    title: `가상계좌 결제 ${tx.vbank?.paymentId ?? tx.paymentKey}`,
    subtitle: tx.orderInfo?.orderNo ?? `주문 ${tx.orderId}`,
    sections: [
      {
        title: '결제',
        rows: [
          { label: '결제키', value: tx.paymentKey, mono: true },
          { label: '결제ID', value: tx.vbank?.paymentId, mono: true },
          { label: '주문ID', value: tx.orderId, mono: true },
          { label: '주문번호', value: tx.orderInfo?.orderNo, mono: true },
          { label: '상태', value: tx.status },
          { label: '금액', value: fmtAmount(tx.amount) },
          { label: '결제일시', value: fmtDateTime(tx.transactionAt) },
        ],
      },
      {
        title: '주문',
        rows: [
          { label: '주문자', value: tx.orderInfo?.ordererName },
          { label: '받는분', value: tx.orderInfo?.receiverName },
          { label: '주문구분', value: tx.orderInfo?.orderType },
          { label: '배송일', value: fmtDateTime(tx.orderInfo?.deliveryAt) },
        ],
      },
      {
        title: '계좌',
        rows: [
          { label: '계좌번호', value: tx.vbank?.accountNumber, mono: true },
          { label: '은행', value: tx.vbank?.bankName ?? tx.vbank?.bankCode },
          { label: '예금주', value: tx.vbank?.holderName },
          { label: '입금마감', value: fmtDateTime(tx.vbank?.dueDate) },
          { label: '입금액', value: fmtAmount(tx.vbank?.paidAmount) },
          { label: '모드', value: tx.vbank?.innopayMode },
        ],
      },
    ],
  };
}

export function buildLogDetail(row: AdminVbankLogRow): VbankDetail {
  return {
    title: `타임라인 ${row.sourceId}`,
    subtitle: `${row.category} · ${row.eventType}`,
    sections: [
      {
        title: '이벤트',
        rows: [
          { label: '소스ID', value: row.sourceId, mono: true },
          { label: '발생시각', value: fmtDateTime(row.occurredAt) },
          { label: '구분', value: row.category },
          { label: '심각도', value: row.severity },
          { label: '이벤트', value: row.eventType },
          { label: '내용', value: row.message },
          { label: '상태', value: row.status },
        ],
      },
      {
        title: '연결 정보',
        rows: [
          { label: '결제ID', value: row.paymentId, mono: true },
          { label: '주문ID', value: row.orderId, mono: true },
          { label: '지사', value: row.branchName ?? row.branchId },
          { label: '계좌번호', value: row.accountNumber, mono: true },
          { label: '금액', value: fmtAmount(row.amount) },
        ],
      },
      {
        title: '메타데이터',
        rows: [{ label: 'metadata', value: parseMetadata(row.metadata), mono: true }],
      },
    ],
  };
}

export function buildIssueDetail(row: AdminVbankIssueRow): VbankDetail {
  return {
    title: `문제 ${row.id}`,
    subtitle: row.title,
    sections: [
      {
        title: '문제',
        rows: [
          { label: '문제ID', value: row.id, mono: true },
          { label: '심각도', value: row.severity },
          { label: '상태', value: row.status },
          { label: '이벤트', value: row.eventType },
          { label: '제목', value: row.title },
          { label: '내용', value: row.message },
          { label: '발생횟수', value: row.occurrenceCount },
        ],
      },
      {
        title: '연결 정보',
        rows: [
          { label: '결제ID', value: row.paymentId, mono: true },
          { label: '주문ID', value: row.orderId, mono: true },
          { label: '지사', value: row.branchName ?? row.branchId },
          { label: '계좌번호', value: row.accountNumber, mono: true },
        ],
      },
      {
        title: '처리',
        rows: [
          { label: 'SMS', value: row.smsStatus },
          { label: 'Slack', value: row.slackStatus },
          { label: '알림오류', value: row.notificationError },
          { label: '최초 발생', value: fmtDateTime(row.firstSeenAt) },
          { label: '최근 발생', value: fmtDateTime(row.lastSeenAt) },
          { label: '확인시각', value: fmtDateTime(row.acknowledgedAt) },
          { label: '해결시각', value: fmtDateTime(row.resolvedAt) },
        ],
      },
    ],
  };
}

export function VbankDetailDialog({
  detail,
  onClose,
}: {
  detail: VbankDetail | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!detail} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>가상계좌 상세</DialogTitle>
          <DialogDescription>
            선택한 가상계좌 결제, 문제, 타임라인 이벤트의 상세 정보입니다.
          </DialogDescription>
        </DialogHeader>

        {detail && (
          <div className="space-y-4">
            <div>
              <div className="text-base font-semibold text-slate-900">{detail.title}</div>
              {detail.subtitle && <div className="mt-1 text-sm text-slate-500">{detail.subtitle}</div>}
            </div>

            {detail.sections.map((section) => (
              <section key={section.title} className="rounded-md border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                  {section.title}
                </div>
                <dl className="divide-y divide-slate-100">
                  {section.rows.map((row) => (
                    <div key={`${section.title}-${row.label}`} className="grid grid-cols-[110px_1fr] gap-3 px-3 py-2 text-sm">
                      <dt className="text-slate-500">{row.label}</dt>
                      <dd className={row.mono ? 'whitespace-pre-wrap break-all font-mono text-xs text-slate-800' : 'whitespace-pre-wrap break-words text-slate-900'}>
                        {valueText(row.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
