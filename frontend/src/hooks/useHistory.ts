/**
 * QueryMind — useHistory Hook
 * Dual-storage query history: localStorage + IndexedDB for PWA offline.
 * Stores last 50 entries with FIFO eviction.
 */

import { useState, useEffect, useCallback } from 'react';

export interface LocalHistoryEntry {
  id: string;
  natural_language: string;
  sql: string;
  row_count: number;
  timestamp: string;
  error: string | null;
}

const STORAGE_KEY = 'querymind_history';
const MAX_ENTRIES = 50;

// ─── IndexedDB helpers for PWA offline support ────────────────

const DB_NAME = 'QueryMindDB';
const STORE_NAME = 'history';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbPutAll(entries: LocalHistoryEntry[]): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    entries.forEach((entry) => store.put(entry));
  } catch {
    // Silently fail — localStorage is the primary store
  }
}

// ─── Hook ─────────────────────────────────────────────────────

export function useHistory() {
  const [entries, setEntries] = useState<LocalHistoryEntry[]>([]);

  // Load history on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LocalHistoryEntry[];
        setEntries(parsed);
      } catch {
        setEntries([]);
      }
    }
  }, []);

  // Persist to both localStorage and IndexedDB
  const persist = useCallback((updated: LocalHistoryEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    idbPutAll(updated);
  }, []);

  const addEntry = useCallback(
    (entry: Omit<LocalHistoryEntry, 'id' | 'timestamp'>) => {
      setEntries((prev) => {
        const newEntry: LocalHistoryEntry = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        const updated = [...prev, newEntry].slice(-MAX_ENTRIES);
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
    idbPutAll([]);
  }, []);

  return {
    entries: [...entries].reverse(), // Most recent first
    addEntry,
    clearAll,
    count: entries.length,
  };
}
