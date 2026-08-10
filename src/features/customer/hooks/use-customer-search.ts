/**
 * useCustomerSearch Hook
 * Manages barber search and filtering state with debouncing and clean lifecycle
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { customerLocationService } from '../services/customer-location.service';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerExploreData } from '../types/customer';

export type CustomerLocationUiStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export function useCustomerSearch(customerId: string, initialCategory?: string) {
  const [exploreData, setExploreData] = useState<CustomerExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);
  const [locationUiStatus, setLocationUiStatus] = useState<CustomerLocationUiStatus>('idle');

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryIdRef = useRef<number>(0);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const fetchExplore = useCallback(
    async (query: string, category?: string) => {
      const currentQueryId = ++lastQueryIdRef.current;
      try {
        setLoading(true);
        const data = await customerRepository.searchBarbers(customerId, query, {
          category,
          latitude: coordsRef.current?.latitude,
          longitude: coordsRef.current?.longitude,
        });

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

  /**
   * Foreground location lookup: runs once on mount, independent of the search-trigger
   * effect above. Never presented as granted until expo-location actually confirms a
   * position -- results before this resolves use customerRepository's default-area
   * fallback, surfaced via `exploreData.locationMode`.
   */
  const requestLocation = useCallback(async () => {
    setLocationUiStatus('requesting');
    const result = await customerLocationService.getCurrentLocation();

    if (result.status === 'granted') {
      coordsRef.current = { latitude: result.latitude, longitude: result.longitude };
      setLocationUiStatus('granted');
    } else {
      coordsRef.current = null;
      setLocationUiStatus(result.status);
    }

    await fetchExplore(searchQuery, selectedCategory);
  }, [fetchExplore, searchQuery, selectedCategory]);

  useEffect(() => {
    let active = true;

    async function initLocation() {
      setLocationUiStatus('requesting');
      const result = await customerLocationService.getCurrentLocation();
      if (!active) return;

      if (result.status === 'granted') {
        coordsRef.current = { latitude: result.latitude, longitude: result.longitude };
        setLocationUiStatus('granted');
        // Refine the already-fetched (default-area) results now that a real position exists.
        await fetchExplore(searchQuery, selectedCategory);
      } else {
        coordsRef.current = null;
        setLocationUiStatus(result.status);
      }
    }

    void initLocation();
    return () => {
      active = false;
    };
    // Runs once per customerId -- deliberately excludes searchQuery/selectedCategory/fetchExplore
    // so it doesn't re-request the OS location permission dialog on every keystroke or filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

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
    locationUiStatus,
    requestLocation,
    onSearchQueryChange,
    onCategorySelect,
    clearSearch,
    refresh: () => fetchExplore(searchQuery, selectedCategory),
  };
}
