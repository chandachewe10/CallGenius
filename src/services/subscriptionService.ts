import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSubscription, SubscriptionPlan } from '../types';
import { STORAGE_KEYS } from '../constants';
import { LencoMobileOperator } from './paymentService';
import { supabaseSubscriptionService } from './supabaseSubscriptionService';

const ALL_SUBSCRIPTIONS_KEY = '@CRP:all_subscriptions';

export interface PendingPaymentDetails {
  operator: LencoMobileOperator;
  phone: string;
  lencoTransactionId?: string;
}

class SubscriptionService {
  async getSubscription(): Promise<UserSubscription | null> {
    const cloudSub = await supabaseSubscriptionService.fetchUserSubscription();
    const localData = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    const localSub = localData ? (JSON.parse(localData) as UserSubscription) : null;

    if (cloudSub) {
      if (!localSub || cloudSub.createdAt >= localSub.createdAt) {
        await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(cloudSub));
        return cloudSub;
      }
    }

    return localSub;
  }

  async saveSubscription(sub: UserSubscription): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
    await this.registerSubscription(sub);
    await supabaseSubscriptionService.upsertSubscription(sub);
  }

  async isSubscribed(): Promise<boolean> {
    const sub = await this.getSubscription();
    if (!sub) return false;
    if (sub.status !== 'active') return false;
    if (sub.expiresAt && sub.expiresAt < Date.now()) {
      await this.expireSubscription();
      return false;
    }
    return sub.plan !== 'free';
  }

  async getCurrentPlan(): Promise<SubscriptionPlan> {
    const sub = await this.getSubscription();
    if (!sub || sub.status !== 'active') return 'free';
    if (sub.expiresAt && sub.expiresAt < Date.now()) return 'free';
    return sub.plan;
  }

  async createPendingSubscription(
    plan: SubscriptionPlan,
    reference: string,
    amount: number,
    payment?: PendingPaymentDetails,
  ): Promise<UserSubscription> {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const sub: UserSubscription = {
      plan,
      status: 'pending',
      reference,
      amount,
      currency: 'ZMW',
      expiresAt,
      createdAt: Date.now(),
    };
    await this.saveSubscription(sub);

    if (payment) {
      await supabaseSubscriptionService.createPayment({
        reference,
        amount,
        operator: payment.operator,
        phone: payment.phone,
        lencoTransactionId: payment.lencoTransactionId,
      });
    }

    return sub;
  }

  async activateSubscription(
    plan: SubscriptionPlan,
    reference: string,
    lencoDepositId?: string,
  ): Promise<UserSubscription> {
    const existing = await this.getSubscription();
    const sub: UserSubscription = {
      plan,
      status: 'active',
      reference,
      amount: existing?.reference === reference ? existing.amount : existing?.amount,
      currency: 'ZMW',
      lencoDepositId,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      createdAt: existing?.reference === reference ? existing.createdAt : Date.now(),
    };
    await this.saveSubscription(sub);
    await supabaseSubscriptionService.updatePaymentStatus(reference, 'paid', lencoDepositId);
    return sub;
  }

  async markPending(reference: string): Promise<void> {
    const sub = await this.getSubscription();
    if (!sub || sub.reference !== reference) return;
    sub.status = 'pending';
    await this.saveSubscription(sub);
  }

  private async expireSubscription(): Promise<void> {
    const sub = await this.getSubscription();
    if (!sub) return;
    sub.status = 'expired';
    await this.saveSubscription(sub);
  }

  async cancelSubscription(): Promise<void> {
    const sub = await this.getSubscription();
    if (!sub) return;
    sub.status = 'cancelled';
    await this.saveSubscription(sub);
  }

  getRemainingDays(sub: UserSubscription): number {
    if (!sub.expiresAt) return 0;
    return Math.max(0, Math.ceil((sub.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  async restoreByPhone(phone: string): Promise<UserSubscription | null> {
    const restored = await supabaseSubscriptionService.restoreSubscriptionByPhone(phone);
    if (!restored) return null;
    await this.saveSubscription(restored);
    return restored;
  }

  private async registerSubscription(sub: UserSubscription): Promise<void> {
    const data = await AsyncStorage.getItem(ALL_SUBSCRIPTIONS_KEY);
    const subs: Array<{ userId: string; sub: UserSubscription }> = data ? JSON.parse(data) : [];
    const userId = sub.reference ?? `user-${sub.createdAt}`;
    const index = subs.findIndex(entry => entry.sub.reference === sub.reference);

    const entry = { userId, sub };
    if (index >= 0) {
      subs[index] = entry;
    } else {
      subs.unshift(entry);
    }

    await AsyncStorage.setItem(ALL_SUBSCRIPTIONS_KEY, JSON.stringify(subs));
  }
}

export const subscriptionService = new SubscriptionService();
