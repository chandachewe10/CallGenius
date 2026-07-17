import { useState, useEffect, useCallback } from 'react';
import { CallRecord } from '../types';
import { storageService } from '../services/storageService';

interface UseCallRecordsReturn {
  calls: CallRecord[];
  isLoading: boolean;
  refreshCalls: () => Promise<void>;
  deleteCall: (id: string) => Promise<void>;
  updateCall: (call: CallRecord) => Promise<void>;
  getCall: (id: string) => CallRecord | undefined;
  clearAll: () => Promise<void>;
}

export function useCallRecords(): UseCallRecordsReturn {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCalls = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await storageService.getAllCalls();
      setCalls(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load calls:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const refreshCalls = useCallback(async () => {
    await loadCalls();
  }, [loadCalls]);

  const deleteCall = useCallback(async (id: string) => {
    await storageService.deleteCall(id);
    setCalls(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateCall = useCallback(async (call: CallRecord) => {
    await storageService.saveCall(call);
    setCalls(prev => {
      const index = prev.findIndex(c => c.id === call.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = call;
        return updated;
      }
      return [call, ...prev];
    });
  }, []);

  const getCall = useCallback(
    (id: string) => calls.find(c => c.id === id),
    [calls]
  );

  const clearAll = useCallback(async () => {
    await storageService.clearAllCalls();
    setCalls([]);
  }, []);

  return { calls, isLoading, refreshCalls, deleteCall, updateCall, getCall, clearAll };
}
