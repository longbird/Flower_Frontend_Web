export type OrderStatus = 'UNCONFIRMED' | 'RECEIVED' | 'SENT' | 'CANCELLED';
export type OrderType = 'RECEIVE' | 'SEND';

export interface OrderMin {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  type: OrderType;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  productName?: string;
  price?: number;
  deliveryDate?: string;
  floristId?: number;
  floristName?: string;
  branchId?: number;
  branchName?: string;
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartnerOrder extends OrderMin {
  evidencePhotos?: string[];
}
