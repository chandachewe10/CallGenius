import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AdminApiKey, AdminSettings, UserSubscription } from '../types';
import { STORAGE_KEYS } from '../constants';
import { getOpenAiApiKey, getLencoSecretKey, hasSupabaseConfig } from '../config/env';
import { supabaseSubscriptionService } from './supabaseSubscriptionService';
import { authService } from './authService';

function simpleHash(pin: string): string {
  let hash = 0;
  const salt = 'crp_admin_2024';
  const str = pin + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

class AdminService {
  private isAuthenticated = false;
  private sessionTimeout: ReturnType<typeof setTimeout> | null = null;

  async isAdminConfigured(): Promise<boolean> {
    try {
      const pin = await SecureStore.getItemAsync(STORAGE_KEYS.ADMIN_PIN);
      return !!pin;
    } catch {
      return false;
    }
  }

  async setupAdmin(pin: string): Promise<void> {
    const hash = simpleHash(pin);
    await SecureStore.setItemAsync(STORAGE_KEYS.ADMIN_PIN, hash);
  }

  async verifyPin(pin: string): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(STORAGE_KEYS.ADMIN_PIN);
    if (!stored) return false;
    const valid = simpleHash(pin) === stored;
    if (valid) {
      this.isAuthenticated = true;
      this.resetSessionTimeout();
    }
    return valid;
  }

  private resetSessionTimeout() {
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    this.sessionTimeout = setTimeout(() => {
      this.isAuthenticated = false;
    }, 15 * 60 * 1000);
  }

  logout() {
    this.isAuthenticated = false;
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
  }

  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  async setApiKey(service: AdminApiKey['service'], key: string): Promise<void> {
    const storageKey = this.getStorageKey(service);
    await SecureStore.setItemAsync(storageKey, key);

    const settings = await this.getAdminSettings();
    const existing = settings.apiKeys.findIndex(k => k.service === service);
    const hint = '*'.repeat(Math.max(0, key.length - 4)) + key.slice(-4);
    const entry: AdminApiKey = {
      id: `${service}_${Date.now()}`,
      name: this.getServiceName(service),
      service,
      hint,
      createdAt: Date.now(),
    };

    if (existing >= 0) {
      settings.apiKeys[existing] = entry;
    } else {
      settings.apiKeys.push(entry);
    }

    if (service === 'lenco_public') settings.lencoPublicKeySet = true;
    if (service === 'lenco_secret') settings.lencoPublicKeySet = true;

    await this.saveAdminSettings(settings);
  }

  async removeApiKey(service: AdminApiKey['service']): Promise<void> {
    const storageKey = this.getStorageKey(service);
    await SecureStore.deleteItemAsync(storageKey);

    const settings = await this.getAdminSettings();
    settings.apiKeys = settings.apiKeys.filter(k => k.service !== service);

    if (service === 'lenco_public') settings.lencoPublicKeySet = false;
    if (service === 'lenco_secret') settings.lencoPublicKeySet = false;

    await this.saveAdminSettings(settings);
  }

  async getApiKey(service: AdminApiKey['service']): Promise<string | null> {
    const storageKey = this.getStorageKey(service);
    return SecureStore.getItemAsync(storageKey);
  }

  async getOpenAIKey(): Promise<string> {
    return getOpenAiApiKey();
  }

  async getLencoSecretKey(): Promise<string> {
    const envKey = getLencoSecretKey();
    if (envKey) return envKey;
    return (await this.getApiKey('lenco_secret')) ?? '';
  }

  async getAdminSettings(): Promise<AdminSettings> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_SETTINGS);
    if (!data) {
      return {
        isAdminSetup: false,
        adminPinHash: '',
        apiKeys: [],
        lencoPublicKeySet: false,
        openaiKeySet: false,
      };
    }
    return JSON.parse(data) as AdminSettings;
  }

  private async saveAdminSettings(settings: AdminSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(settings));
  }

  async getAllSubscriptions(): Promise<Array<{ userId: string; sub: UserSubscription; phone?: string }>> {
    if (hasSupabaseConfig() && (await authService.isSupabaseAdmin())) {
      const cloudSubs = await supabaseSubscriptionService.fetchAllSubscriptions();
      if (cloudSubs.length > 0) return cloudSubs;
    }

    const data = await AsyncStorage.getItem('@CRP:all_subscriptions');
    if (!data) return [];
    return JSON.parse(data);
  }

  async confirmSubscription(reference: string): Promise<void> {
    if (hasSupabaseConfig() && (await authService.isSupabaseAdmin())) {
      const ok = await supabaseSubscriptionService.confirmSubscription(reference);
      if (ok) return;
    }

    const subs = await this.getLocalSubscriptions();
    const idx = subs.findIndex(s => s.sub.reference === reference);
    if (idx >= 0) {
      subs[idx].sub.status = 'active';
      await AsyncStorage.setItem('@CRP:all_subscriptions', JSON.stringify(subs));
    }

    const localSub = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    if (localSub) {
      const sub = JSON.parse(localSub) as UserSubscription;
      if (sub.reference === reference) {
        sub.status = 'active';
        sub.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
      }
    }
  }

  async revokeSubscription(reference: string): Promise<void> {
    if (hasSupabaseConfig() && (await authService.isSupabaseAdmin())) {
      const ok = await supabaseSubscriptionService.revokeSubscription(reference);
      if (ok) return;
    }

    const subs = await this.getLocalSubscriptions();
    const idx = subs.findIndex(s => s.sub.reference === reference);
    if (idx >= 0) {
      subs[idx].sub.status = 'cancelled';
      await AsyncStorage.setItem('@CRP:all_subscriptions', JSON.stringify(subs));
    }
  }

  async signInSupabaseAdmin(email: string, password: string) {
    return authService.signInAdmin(email, password);
  }

  async signOutSupabaseAdmin() {
    return authService.signOutAdmin();
  }

  async isSupabaseAdminConnected(): Promise<boolean> {
    return authService.isSupabaseAdmin();
  }

  isSupabaseConfigured(): boolean {
    return hasSupabaseConfig();
  }

  private async getLocalSubscriptions(): Promise<Array<{ userId: string; sub: UserSubscription }>> {
    const data = await AsyncStorage.getItem('@CRP:all_subscriptions');
    if (!data) return [];
    return JSON.parse(data);
  }

  private getStorageKey(service: AdminApiKey['service']): string {
    switch (service) {
      case 'lenco_public': return STORAGE_KEYS.LENCO_PUBLIC_KEY;
      case 'lenco_secret': return STORAGE_KEYS.LENCO_SECRET_KEY;
      default:
        throw new Error(`Unsupported admin key service: ${service}`);
    }
  }

  private getServiceName(service: AdminApiKey['service']): string {
    switch (service) {
      case 'lenco_public': return 'Lenco Public Key';
      case 'lenco_secret': return 'Lenco Secret Key';
      default:
        return service;
    }
  }
}

export const adminService = new AdminService();
