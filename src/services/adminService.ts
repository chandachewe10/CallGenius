import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AdminApiKey, AdminSettings, UserSubscription } from '../types';
import { STORAGE_KEYS } from '../constants';

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
    const pin = await SecureStore.getItemAsync(STORAGE_KEYS.ADMIN_PIN);
    return !!pin;
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

    if (service === 'openai') settings.openaiKeySet = true;
    if (service === 'lenco_public') settings.lencoPublicKeySet = true;

    await this.saveAdminSettings(settings);
  }

  async removeApiKey(service: AdminApiKey['service']): Promise<void> {
    const storageKey = this.getStorageKey(service);
    await SecureStore.deleteItemAsync(storageKey);

    const settings = await this.getAdminSettings();
    settings.apiKeys = settings.apiKeys.filter(k => k.service !== service);

    if (service === 'openai') settings.openaiKeySet = false;
    if (service === 'lenco_public') settings.lencoPublicKeySet = false;

    await this.saveAdminSettings(settings);
  }

  async getApiKey(service: AdminApiKey['service']): Promise<string | null> {
    const storageKey = this.getStorageKey(service);
    return SecureStore.getItemAsync(storageKey);
  }

  async getOpenAIKey(): Promise<string> {
    const adminKey = await this.getApiKey('openai');
    if (adminKey) return adminKey;
    return (await SecureStore.getItemAsync(STORAGE_KEYS.API_KEY)) ?? '';
  }

  async getLencoPublicKey(): Promise<string> {
    return (await this.getApiKey('lenco_public')) ?? '';
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

  async getAllSubscriptions(): Promise<Array<{ userId: string; sub: UserSubscription }>> {
    const data = await AsyncStorage.getItem('@CRP:all_subscriptions');
    if (!data) return [];
    return JSON.parse(data);
  }

  async confirmSubscription(reference: string): Promise<void> {
    const subs = await this.getAllSubscriptions();
    const idx = subs.findIndex(s => s.sub.reference === reference);
    if (idx >= 0) {
      subs[idx].sub.status = 'active';
      await AsyncStorage.setItem('@CRP:all_subscriptions', JSON.stringify(subs));
    }
  }

  async revokeSubscription(reference: string): Promise<void> {
    const subs = await this.getAllSubscriptions();
    const idx = subs.findIndex(s => s.sub.reference === reference);
    if (idx >= 0) {
      subs[idx].sub.status = 'cancelled';
      await AsyncStorage.setItem('@CRP:all_subscriptions', JSON.stringify(subs));
    }
  }

  private getStorageKey(service: AdminApiKey['service']): string {
    switch (service) {
      case 'openai': return STORAGE_KEYS.ADMIN_OPENAI_KEY;
      case 'lenco_public': return STORAGE_KEYS.LENCO_PUBLIC_KEY;
      case 'lenco_secret': return STORAGE_KEYS.LENCO_SECRET_KEY;
    }
  }

  private getServiceName(service: AdminApiKey['service']): string {
    switch (service) {
      case 'openai': return 'OpenAI API Key';
      case 'lenco_public': return 'Lenco Public Key';
      case 'lenco_secret': return 'Lenco Secret Key';
    }
  }
}

export const adminService = new AdminService();
