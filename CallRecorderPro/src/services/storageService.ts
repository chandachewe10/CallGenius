import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { File, Directory, Paths } from 'expo-file-system';
import { CallRecord, AppSettings } from '../types';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../constants';

class StorageService {
  async saveCall(call: CallRecord): Promise<void> {
    const calls = await this.getAllCalls();
    const index = calls.findIndex(c => c.id === call.id);
    if (index >= 0) {
      calls[index] = call;
    } else {
      calls.unshift(call);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(calls));
  }

  async getAllCalls(): Promise<CallRecord[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CALLS);
    if (!data) return [];
    return JSON.parse(data) as CallRecord[];
  }

  async getCallById(id: string): Promise<CallRecord | null> {
    const calls = await this.getAllCalls();
    return calls.find(c => c.id === id) ?? null;
  }

  async deleteCall(id: string): Promise<void> {
    const calls = await this.getAllCalls();
    const call = calls.find(c => c.id === id);

    if (call?.audioUri) {
      try {
        const file = new File(call.audioUri);
        if (file.exists) file.delete();
      } catch {}
    }

    const updated = calls.filter(c => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(updated));
  }

  async clearAllCalls(): Promise<void> {
    const calls = await this.getAllCalls();
    for (const call of calls) {
      if (call.audioUri) {
        try {
          const file = new File(call.audioUri);
          if (file.exists) file.delete();
        } catch {}
      }
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.CALLS);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const { openaiApiKey, ...rest } = settings;
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(rest));
    if (openaiApiKey) {
      await SecureStore.setItemAsync(STORAGE_KEYS.API_KEY, openaiApiKey);
    }
  }

  async getSettings(): Promise<AppSettings> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    const apiKey = await SecureStore.getItemAsync(STORAGE_KEYS.API_KEY);
    const base = data ? JSON.parse(data) : {};
    return { ...DEFAULT_SETTINGS, ...base, openaiApiKey: apiKey ?? '' };
  }

  async getApiKey(): Promise<string> {
    return (await SecureStore.getItemAsync(STORAGE_KEYS.API_KEY)) ?? '';
  }

  async saveApiKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.API_KEY, key);
  }

  async getStorageUsage(): Promise<number> {
    try {
      const dir = new Directory(Paths.document, 'recordings');
      if (!dir.exists) return 0;
      return dir.size ?? 0;
    } catch {
      return 0;
    }
  }
}

export const storageService = new StorageService();
