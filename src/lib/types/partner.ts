export interface PartnerUser {
  id: number;
  accountId: string;
  role?: string;
  name?: string;
  type?: 'FLORIST' | 'RIDER';
  partnerId?: number;
  partnerName?: string;
}

// Step1 login response (2FA required)
export interface PartnerStep1Response {
  twoFactorStatus?: 'REQUIRED';
  sessionToken?: string;
  maskedPhone?: string;
  mockVerificationCode?: string; // dev only
}

// Step2 login response (2FA complete)
export interface PartnerStep2Response {
  accessToken: string;
  user: { id: number; accountId: string; role: string };
  newDevice?: { id: number; deviceName: string; createdAt: string };
}

// Simple login response (no 2FA)
export interface PartnerSimpleLoginResponse {
  ok: boolean;
  token: string;
  partnerId: number;
}

export type PartnerOrderStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DELIVERING'
  | 'DONE'
  | 'CANCELLED';

export interface PartnerOrder {
  orderId: number;
  status: PartnerOrderStatus;
  receiverName: string;
  receiverPhone?: string;
  address1: string;
  address2?: string;
  deliveryMemo?: string;
  desiredDate?: string;
  desiredTimeSlot?: string;
  memo?: string;
  amountTotal?: number;
  paymentStatus?: string;
}

export interface PartnerOrderDetail {
  ok: boolean;
  item: PartnerOrder;
  events?: Array<{
    eventType: string;
    actionCode?: string;
    eventAt: string;
    reasonCode?: string;
    reasonText?: string;
  }>;
}

export interface PresignResponse {
  ok: boolean;
  uploadUrl: string;
  headers?: Record<string, string>;
  fileUrl: string;
  fileKey?: string;
}

export interface ProofItem {
  id?: number;
  proofType: string;
  fileUrl: string;
  createdAt?: string;
}
