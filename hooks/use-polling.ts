'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePollingOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  intervalMs: number;
  enabled?: boolean;
}

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface CacheEntry<T = unknown> {
  data: T | null;
  error: Error | null;
  timestamp: number;
  listeners: Set<() => void>;
  intervalId: ReturnType<typeof setInterval> | null;
  fetching: boolean;
}

const cache = new Map<string, CacheEntry>();

export function usePolling<T>({ key, fetcher, intervalMs, enabled = true }: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const notify = useCallback((entry: CacheEntry<T>) => {
    for (const listener of entry.listeners) {
      listener();
    }
  }, []);

  const doFetch = useCallback(async () => {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry || entry.fetching) return;

    entry.fetching = true;
    try {
      const result = await fetcherRef.current();
      entry.data = result;
      entry.error = null;
      entry.timestamp = Date.now();
      notify(entry);
    } catch (err) {
      entry.error = err instanceof Error ? err : new Error(String(err));
      notify(entry);
    } finally {
      entry.fetching = false;
    }
  }, [key, notify]);

  // Sync local state from cache
  const syncFromCache = useCallback(() => {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return;
    if (entry.data !== null) {
      setData(entry.data);
      setLoading(false);
    }
    setError(entry.error);
  }, [key]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let entry = cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      // First subscriber — create cache entry and start polling
      entry = {
        data: null,
        error: null,
        timestamp: 0,
        listeners: new Set(),
        intervalId: null,
        fetching: false,
      };
      cache.set(key, entry);
    }

    // Register this component as a listener
    entry.listeners.add(syncFromCache);

    // If cache already has data, use it immediately
    if (entry.data !== null) {
      setData(entry.data);
      setLoading(false);
    }

    // Start interval if we're the first listener
    if (entry.listeners.size === 1) {
      // Initial fetch
      (async () => {
        entry!.fetching = true;
        try {
          const result = await fetcherRef.current();
          entry!.data = result;
          entry!.timestamp = Date.now();
          notify(entry as CacheEntry<T>);
        } catch (err) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        } finally {
          entry!.fetching = false;
        }
      })();

      entry.intervalId = setInterval(() => {
        const e = cache.get(key) as CacheEntry<T> | undefined;
        if (!e || e.fetching) return;
        e.fetching = true;
        fetcherRef.current()
          .then((result) => {
            e.data = result;
            e.error = null;
            e.timestamp = Date.now();
            notify(e);
          })
          .catch((err) => {
            console.warn(`[usePolling] ${key} interval fetch failed:`, err instanceof Error ? err.message : err);
            e.error = err instanceof Error ? err : new Error(String(err));
            notify(e);
          })
          .finally(() => { e.fetching = false; });
      }, intervalMs);
    }

    return () => {
      const e = cache.get(key) as CacheEntry<T> | undefined;
      if (!e) return;
      e.listeners.delete(syncFromCache);

      // Last subscriber — clean up interval and cache
      if (e.listeners.size === 0) {
        if (e.intervalId) clearInterval(e.intervalId);
        cache.delete(key);
      }
    };
  }, [key, intervalMs, enabled, syncFromCache, notify]);

  const refetch = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      const entry = cache.get(key) as CacheEntry<T> | undefined;
      if (entry) {
        entry.data = result;
        entry.timestamp = Date.now();
        notify(entry);
      } else {
        // No cache entry (component may have just mounted) — update local state
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [key, notify]);

  return { data, loading, error, refetch };
}
