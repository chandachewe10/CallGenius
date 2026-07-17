import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSubscription, SubscriptionPlan } from '../types';
import { STORAGE_KEYS } from '../constants';

class SubscriptionService {
  async getSubscription(): Promise<UserSubscription | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    if (!data) return null;
    return JSON.parse(data) as UserSubscription;
  }

  async saveSubscription(sub: UserSubscription): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
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
    amount: number
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
    return sub;
  }

  async activateSubscription(reference: string, lencoDepositId?: string): Promise<void> {
    const sub = await this.getSubscription();
    if (!sub || sub.reference !== reference) return;
    sub.status = 'active';
    sub.lencoDepositId = lencoDepositId;
    sub.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
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
}

export const subscriptionService = new SubscriptionService();
