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

export type VbankAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type VbankIssueStatus = 'OPEN' | 'ACKED' | 'RESOLVED' | 'SUPPRESSED';
export type VbankLogCategory = 'PAYMENT' | 'ACCOUNT' | 'WEBHOOK' | 'WALLET' | 'ALERT';

export interface AdminVbankOverview {
  pool: { total: number; available: number; inUse: number; disabled: number; threshold: number };
  payments: { pending: number; paid: number; canceled: number; reviewRequired: number };
  webhooks: { received24h: number; failed24h: number; duplicate24h: number; invalidSignature24h: number };
  issues: { openCritical: number; openWarning: number; acked: number };
}

export interface AdminVbankIssueRow {
  id: number;
  severity: VbankAlertSeverity;
  eventType: string;
  status: VbankIssueStatus;
  title: string;
  message: string;
  paymentId: number | null;
  orderId: number | null;
  branchId: number | null;
  branchName: string | null;
  accountNumber: string | null;
  occurrenceCount: number;
  smsStatus: string;
  slackStatus: string;
  notificationError: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface AdminVbankIssuesFilters {
  severity?: VbankAlertSeverity;
  status?: VbankIssueStatus;
  eventType?: string;
  branchId?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminVbankIssuesListResponse {
  items: AdminVbankIssueRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminVbankLogRow {
  occurredAt: string;
  category: VbankLogCategory;
  severity: VbankAlertSeverity;
  eventType: string;
  message: string;
  paymentId: number | null;
  orderId: number | null;
  branchId: number | null;
  branchName: string | null;
  accountNumber: string | null;
  amount: number | null;
  status: string | null;
  sourceId: string;
  metadata: Record<string, unknown> | string | null;
}

export interface AdminVbankLogsFilters {
  severity?: VbankAlertSeverity;
  category?: VbankLogCategory;
  branchId?: number;
  paymentId?: number;
  orderId?: number;
  accountNumber?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminVbankLogsListResponse {
  items: AdminVbankLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminVbankPoolRow {
  id: number;
  bankCode: string;
  bankName: string | null;
  accountNumber: string;
  holderName: string | null;
  status: 'AVAILABLE' | 'IN_USE' | 'DISABLED';
  currentAllocationId: number | null;
  purpose: 'TOPUP' | 'CUSTOMER_ORDER' | null;
  branchId: number | null;
  branchName: string | null;
  paymentId: number | null;
  orderId: number | null;
  assignedAt: string | null;
  dueAt: string | null;
  disabledReason: string | null;
  updatedAt: string;
}

export interface AdminVbankPoolFilters {
  status?: 'AVAILABLE' | 'IN_USE' | 'DISABLED';
  accountNumber?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminVbankPoolListResponse {
  items: AdminVbankPoolRow[];
  total: number;
  page: number;
  pageSize: number;
}
