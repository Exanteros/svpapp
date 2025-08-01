// Memory-optimized utilities
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Debounce hook to reduce API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Memory-efficient data fetching
export function useOptimizedFetch<T>(url: string, options?: RequestInit) {
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchData = useCallback(async (url: string, options?: RequestInit): Promise<T> => {
    const now = Date.now();
    const cached = cacheRef.current.get(url);
    
    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      cacheRef.current.set(url, { data, timestamp: now });
      
      // Cleanup old cache entries (memory management)
      if (cacheRef.current.size > 10) {
        const entries = Array.from(cacheRef.current.entries());
        entries
          .filter(([, { timestamp }]) => (now - timestamp) >= CACHE_DURATION)
          .forEach(([key]) => cacheRef.current.delete(key));
      }

      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }, []);

  return { fetchData };
}

// Virtualization for large lists
export function useVirtualization(items: any[], containerHeight: number, itemHeight: number) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight,
    }));
  }, [items, scrollTop, containerHeight, itemHeight]);

  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
}

// Memory cleanup utility
export function useCleanup(cleanupFn: () => void, deps: any[] = []) {
  useEffect(() => {
    return cleanupFn;
  }, deps);
}
