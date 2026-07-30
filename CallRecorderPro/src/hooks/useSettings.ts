import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '../types';
import { storageService } from '../services/storageService';
import { DEFAULT_SETTINGS } from '../constants';

interface UseSettingsReturn {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await storageService.getSettings();
      setSettings(saved);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await storageService.saveSettings(newSettings);
  }, [settings]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await storageService.saveSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, isLoading, updateSettings, resetSettings };
}
