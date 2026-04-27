export type VbankPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'CANCELED'
  | 'REVIEW_REQUIRED'
  | 'FAILED';

export interface IssueVbankRequest {
  orderId: number;
  orderName: string;
  customerName?: string;
  customerPhone?: string;
}

export interface IssueVbankResponse {
  paymentId: number;
  innopayTid: string;
  accountNumber: string;
  bankCode: string;
  bankName: string | null;
  holderName: string;
  /** ISO 8601, 입금 마감 시각 */
  dueDate: string;
  amount: number;
}

export interface PollVbankStatus {
  status: VbankPaymentStatus;
  paidAt: string | null;
  paidAmount: number | null;
}

/** Admin 모니터링용 행 */
export interface AdminVbankPaymentRow {
  paymentId: number;
  orderId: number;
  branchId: number | null;
  branchName: string | null;
  status: VbankPaymentStatus;
  amountTotal: number;
  paidAmount: number | null;
  vbankAccountNumber: string;
  vbankBankCode: string;
  vbankBankName: string | null;
  vbankHolderName: string;
  vbankDueDate: string;
  paidAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  innopayMode: 'TEST' | 'REAL';
  innopayTid: string;
}

export interface AdminVbankPaymentsListResponse {
  items: AdminVbankPaymentRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminVbankPaymentsFilters {
  status?: VbankPaymentStatus[];
  branchId?: number;
  from?: string; // ISO
  to?: string;
  mode?: 'TEST' | 'REAL';
  page?: number;
  pageSize?: number;
}
