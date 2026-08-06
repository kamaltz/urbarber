/**
 * useCustomerSearch Hook
 * Manages barber search and filtering state with debouncing and clean lifecycle
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerExploreData } from '../types/customer';

export function useCustomerSearch(customerId: string, initialCategory?: string) {
  const [exploreData, setExploreData] = useState<CustomerExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryIdRef = useRef<number>(0);

  const fetchExplore = useCallback(
    async (query: string, category?: string) => {
      const currentQueryId = ++lastQueryIdRef.current;
      try {
        setLoading(true);
        const data = await customerRepository.searchBarbers(customerId, query, { category });

        if (currentQueryId === lastQueryIdRef.current) {
          setExploreData(data);
          setError(null);
        }
      } catch (err: any) {
        if (currentQueryId === lastQueryIdRef.current) {
          setError(err?.message || 'Gagal memuat data pencarian barber');
        }
      } finally {
        if (currentQueryId === lastQueryIdRef.current) {
          setLoading(false);
        }
      }
    },
    [customerId]
  );

  // Initial load
  useEffect(() => {
    let active = true;

    async function init() {
      await Promise.resolve();
      if (!active) return;
      await fetchExplore(searchQuery, selectedCategory);
    }

    void init();
    return () => {
      active = false;
    };
  }, [fetchExplore, searchQuery, selectedCategory]);

  // Debounced search trigger (300ms)
  const onSearchQueryChange = useCallback((newQuery: string) => {
    setSearchQuery(newQuery);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      void fetchExplore(newQuery, selectedCategory);
    }, 300);
  }, [fetchExplore, selectedCategory]);

  const onCategorySelect = useCallback((categoryId?: string) => {
    const nextCategory = selectedCategory === categoryId ? undefined : categoryId;
    setSelectedCategory(nextCategory);
    void fetchExplore(searchQuery, nextCategory);
  }, [fetchExplore, searchQuery, selectedCategory]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(undefined);
    void fetchExplore('', undefined);
  }, [fetchExplore]);

  return {
    exploreData,
    loading,
    error,
    searchQuery,
    selectedCategory,
    onSearchQueryChange,
    onCategorySelect,
    clearSearch,
    refresh: () => fetchExplore(searchQuery, selectedCategory),
  };
}
