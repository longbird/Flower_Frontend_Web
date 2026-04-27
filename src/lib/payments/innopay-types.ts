export * from './vbank-payment-types';

export type InnopayMode = 'TEST' | 'REAL';

export interface InnopayCredentialsMasked {
  mode: InnopayMode | null;
  merchantId: string | null;
  apiBaseUrl: string | null;
  updatedAt: string | null; // ISO string from backend Date serialization
}

export interface UpdateInnopayCredentialsRequest {
  mode: InnopayMode;
  merchantId: string;
  licenseKey: string;
  apiBaseUrl: string;
}

export interface BranchTopupVbank {
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  holderName: string;
  active: boolean;
  issuedAt: string | null;
}
