import { SubscriptionPlanConfig } from '../constants';
import { getLencoApiBaseUrl } from '../config/env';

export type LencoMobileOperator = 'airtel' | 'mtn';

export interface MobileMoneyCollectionRequest {
  operator: LencoMobileOperator;
  phone: string;
  amount: number;
  reference: string;
  bearer?: 'customer';
}

export interface MobileMoneyCollectionResponse {
  status?: boolean;
  message?: string;
  data?: {
    id?: string;
    status?: string;
    reference?: string;
    [key: string]: unknown;
  };
}

export function createPaymentReference(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export function createPaymentSession(plan: SubscriptionPlanConfig, phone: string, operator: LencoMobileOperator) {
  return {
    reference: createPaymentReference(),
    amount: plan.price,
    planId: plan.id,
    planName: plan.name,
    phone,
    operator,
  };
}

export async function collectMobileMoney(
  request: MobileMoneyCollectionRequest,
  secretKey: string
): Promise<MobileMoneyCollectionResponse> {
  const response = await fetch(`${getLencoApiBaseUrl()}/collections/mobile-money`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operator: request.operator,
      phone: request.phone,
      amount: String(request.amount),
      reference: request.reference,
      bearer: request.bearer ?? 'customer',
    }),
  });

  let data: MobileMoneyCollectionResponse;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Payment failed (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data.message ?? `Payment failed (${response.status})`);
  }

  return data;
}

export function isCollectionSuccessful(response: MobileMoneyCollectionResponse): boolean {
  const status = response.data?.status?.toLowerCase() ?? '';
  return (
    response.status === true ||
    status === 'successful' ||
    status === 'success' ||
    status === 'paid' ||
    status === 'completed'
  );
}

export function isCollectionPending(response: MobileMoneyCollectionResponse): boolean {
  const status = response.data?.status?.toLowerCase() ?? '';
  return status === 'pending' || status === 'processing' || status === 'otp-required';
}

export function getCollectionTransactionId(response: MobileMoneyCollectionResponse): string | undefined {
  const id = response.data?.id;
  return id != null ? String(id) : undefined;
}

export const LENCO_OPERATORS: Array<{
  id: LencoMobileOperator;
  label: string;
  prefixes: string[];
}> = [
  { id: 'airtel', label: 'Airtel Money', prefixes: ['097', '077'] },
  { id: 'mtn', label: 'MTN Mobile Money', prefixes: ['096', '076'] },
];

export function suggestOperatorFromPhone(phone: string): LencoMobileOperator | null {
  const normalized = phone.replace(/\D/g, '');
  const prefix = normalized.slice(-9).slice(0, 3);
  const match = LENCO_OPERATORS.find(op => op.prefixes.includes(prefix));
  return match?.id ?? null;
}
