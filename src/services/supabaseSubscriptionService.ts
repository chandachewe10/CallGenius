import { SubscriptionPlan, SubscriptionStatus, UserSubscription } from '../types';
import { LencoMobileOperator } from './paymentService';
import { getSupabase } from '../lib/supabase';
import { authService } from './authService';

interface DbSubscriptionRow {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  reference: string | null;
  amount: number | null;
  currency: string | null;
  lenco_deposit_id: string | null;
  expires_at: string | null;
  created_at: string;
}

interface DbPaymentRow {
  id: string;
  user_id: string;
  reference: string;
  operator: string | null;
  phone: string | null;
  amount: number;
  currency: string | null;
  status: string;
  lenco_transaction_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface AdminSubscriptionEntry {
  userId: string;
  phone?: string;
  sub: UserSubscription;
}

function rowToSubscription(row: DbSubscriptionRow): UserSubscription {
  return {
    plan: row.plan,
    status: row.status,
    reference: row.reference ?? undefined,
    amount: row.amount ?? undefined,
    currency: row.currency ?? 'ZMW',
    lencoDepositId: row.lenco_deposit_id ?? undefined,
    expiresAt: row.expires_at ? Date.parse(row.expires_at) : undefined,
    createdAt: Date.parse(row.created_at),
  };
}

function subscriptionToRow(sub: UserSubscription, userId: string) {
  return {
    user_id: userId,
    plan: sub.plan,
    status: sub.status,
    reference: sub.reference ?? null,
    amount: sub.amount ?? null,
    currency: sub.currency ?? 'ZMW',
    lenco_deposit_id: sub.lencoDepositId ?? null,
    expires_at: sub.expiresAt ? new Date(sub.expiresAt).toISOString() : null,
    created_at: new Date(sub.createdAt).toISOString(),
  };
}

class SupabaseSubscriptionService {
  isAvailable(): boolean {
    return authService.isConfigured();
  }

  async fetchUserSubscription(): Promise<UserSubscription | null> {
    const supabase = getSupabase();
    const userId = await authService.getUserId();
    if (!supabase || !userId) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[SupabaseSubscriptionService] fetch failed:', error.message);
      return null;
    }

    return data ? rowToSubscription(data as DbSubscriptionRow) : null;
  }

  async upsertSubscription(sub: UserSubscription): Promise<void> {
    const supabase = getSupabase();
    const userId = await authService.ensureSession();
    if (!supabase || !userId) return;

    const payload = subscriptionToRow(sub, userId);

    if (sub.reference) {
      const { error } = await supabase.from('subscriptions').upsert(payload, {
        onConflict: 'reference',
      });
      if (error) {
        console.warn('[SupabaseSubscriptionService] upsert failed:', error.message);
      }
      return;
    }

    const { error } = await supabase.from('subscriptions').insert(payload);
    if (error) {
      console.warn('[SupabaseSubscriptionService] insert failed:', error.message);
    }
  }

  async createPayment(params: {
    reference: string;
    amount: number;
    operator: LencoMobileOperator;
    phone: string;
    lencoTransactionId?: string;
  }): Promise<void> {
    const supabase = getSupabase();
    const userId = await authService.ensureSession();
    if (!supabase || !userId) return;

    const { error } = await supabase.from('payments').upsert(
      {
        user_id: userId,
        reference: params.reference,
        operator: params.operator,
        phone: params.phone,
        amount: params.amount,
        currency: 'ZMW',
        status: 'pending',
        lenco_transaction_id: params.lencoTransactionId ?? null,
      },
      { onConflict: 'reference' },
    );

    if (error) {
      console.warn('[SupabaseSubscriptionService] payment upsert failed:', error.message);
    }
  }

  async updatePaymentStatus(reference: string, status: string, lencoTransactionId?: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    const payload: Record<string, unknown> = { status };
    if (lencoTransactionId) payload.lenco_transaction_id = lencoTransactionId;
    if (status === 'paid' || status === 'successful') {
      payload.paid_at = new Date().toISOString();
    }

    const { error } = await supabase.from('payments').update(payload).eq('reference', reference);
    if (error) {
      console.warn('[SupabaseSubscriptionService] payment update failed:', error.message);
    }
  }

  async fetchAllSubscriptions(): Promise<AdminSubscriptionEntry[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const isAdmin = await authService.isSupabaseAdmin();
    if (!isAdmin) return [];

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[SupabaseSubscriptionService] admin fetch failed:', error.message);
      return [];
    }

    const rows = (data ?? []) as DbSubscriptionRow[];
    const references = rows.map(row => row.reference).filter(Boolean) as string[];

    let phoneByReference = new Map<string, string>();
    if (references.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('reference, phone')
        .in('reference', references);

      phoneByReference = new Map(
        ((payments ?? []) as Pick<DbPaymentRow, 'reference' | 'phone'>[])
          .filter(payment => payment.phone)
          .map(payment => [payment.reference, payment.phone as string]),
      );
    }

    return rows.map(row => ({
      userId: row.user_id,
      phone: row.reference ? phoneByReference.get(row.reference) : undefined,
      sub: rowToSubscription(row),
    }));
  }

  async confirmSubscription(reference: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const isAdmin = await authService.isSupabaseAdmin();
    if (!isAdmin) return false;

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: subError } = await supabase
      .from('subscriptions')
      .update({ status: 'active', expires_at: expiresAt })
      .eq('reference', reference);

    if (subError) {
      console.warn('[SupabaseSubscriptionService] confirm failed:', subError.message);
      return false;
    }

    await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('reference', reference);

    return true;
  }

  async revokeSubscription(reference: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const isAdmin = await authService.isSupabaseAdmin();
    if (!isAdmin) return false;

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('reference', reference);

    if (error) {
      console.warn('[SupabaseSubscriptionService] revoke failed:', error.message);
      return false;
    }

    return true;
  }

  async restoreSubscriptionByPhone(phone: string): Promise<UserSubscription | null> {
    const supabase = getSupabase();
    const userId = await authService.ensureSession();
    if (!supabase || !userId) return null;

    const { data, error } = await supabase.rpc('restore_subscription_by_phone', {
      p_phone: phone.trim(),
    });

    if (error) {
      console.warn('[SupabaseSubscriptionService] restore failed:', error.message);
      throw new Error(error.message);
    }

    if (!data) return null;

    const row = data as {
      plan: SubscriptionPlan;
      status: SubscriptionStatus;
      reference?: string;
      amount?: number;
      currency?: string;
      lenco_deposit_id?: string;
      expires_at?: string;
      created_at: string;
    };

    return {
      plan: row.plan,
      status: row.status,
      reference: row.reference,
      amount: row.amount,
      currency: row.currency ?? 'ZMW',
      lencoDepositId: row.lenco_deposit_id,
      expiresAt: row.expires_at ? Date.parse(row.expires_at) : undefined,
      createdAt: Date.parse(row.created_at),
    };
  }
}

export const supabaseSubscriptionService = new SupabaseSubscriptionService();
