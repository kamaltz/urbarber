/**
 * useCustomerSearch Hook
 * Manages barber search and filtering state with debouncing and clean lifecycle
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { customerLocationService } from '../services/customer-location.service';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerExploreData } from '../types/customer';
import type { CategoryRecommendationRule } from '@/features/location/services/recommendation-rules';

export type CustomerLocationUiStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
type ServiceTypeFilter = 'barbershop' | 'customer_home' | undefined;

export function useCustomerSearch(
  customerId: string,
  initialCategory?: string,
  initialServiceType?: ServiceTypeFilter,
  initialSort?: CategoryRecommendationRule
) {
  const [exploreData, setExploreData] = useState<CustomerExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);

  const [locationUiStatus, setLocationUiStatus] = useState<CustomerLocationUiStatus>('idle');

  // Applied once, from the entry route params (e.g. Home's filter sheet).
  // Explore itself has no UI to change these this pass beyond clearing them
  // -- state (not a ref) so activeServiceType/activeSort below stay safe to
  // read during render.
  const [serviceType, setServiceType] = useState<ServiceTypeFilter>(initialServiceType);
  const [sort, setSort] = useState<CategoryRecommendationRule | undefined>(initialSort);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryIdRef = useRef<number>(0);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const fetchExplore = useCallback(
    async (
      query: string,
      category?: string,
      svcType?: ServiceTypeFilter,
      sortRule?: CategoryRecommendationRule
    ) => {
      const currentQueryId = ++lastQueryIdRef.current;
      try {
        setLoading(true);
        const data = await customerRepository.searchBarbers(customerId, query, {
          category,
          latitude: coordsRef.current?.latitude,
          longitude: coordsRef.current?.longitude,
          serviceType: svcType,
          sort: sortRule,
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
      await fetchExplore(searchQuery, selectedCategory, serviceType, sort);
    }

    void init();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchExplore, searchQuery, selectedCategory, serviceType, sort]);

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

    await fetchExplore(searchQuery, selectedCategory, serviceType, sort);
  }, [fetchExplore, searchQuery, selectedCategory, serviceType, sort]);

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
        await fetchExplore(searchQuery, selectedCategory, serviceType, sort);
      } else {
        coordsRef.current = null;
        setLocationUiStatus(result.status);
      }
    }

    void initLocation();
    return () => {
      active = false;
    };
    // Runs once per customerId -- deliberately excludes searchQuery/selectedCategory/
    // serviceType/sort/fetchExplore so it doesn't re-request the OS location permission
    // dialog on every keystroke or filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Refetch on focus needs the *current* filter state without making the
  // focus callback's identity depend on it -- otherwise every keystroke
  // (searchQuery) would recreate the callback and refire it immediately
  // (useFocusEffect re-runs when its callback changes while already
  // focused), defeating onSearchQueryChange's debounce. Refs give the latest
  // values without that churn.
  const currentParamsRef = useRef({ searchQuery, selectedCategory, serviceType, sort });
  useEffect(() => {
    currentParamsRef.current = { searchQuery, selectedCategory, serviceType, sort };
  }, [searchQuery, selectedCategory, serviceType, sort]);

  // Barber listing fields (e.g. acceptsHomeService) can change on another
  // device -- expo-router keeps Explore mounted across navigation, so without
  // this a Barber turning Home Service off stays invisible here until the
  // app restarts. Same refetch-on-focus pattern as useCustomerHome/
  // useCustomerProfile.
  useFocusEffect(
    useCallback(() => {
      const { searchQuery: q, selectedCategory: c, serviceType: st, sort: s } = currentParamsRef.current;
      void fetchExplore(q, c, st, s);
    }, [fetchExplore])
  );

  const onSearchQueryChange = useCallback((newQuery: string) => {
    setSearchQuery(newQuery);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      void fetchExplore(newQuery, selectedCategory, serviceType, sort);
    }, 300);
  }, [fetchExplore, selectedCategory, serviceType, sort]);

  const onCategorySelect = useCallback((categoryId?: string) => {
    const nextCategory = selectedCategory === categoryId ? undefined : categoryId;
    setSelectedCategory(nextCategory);
    void fetchExplore(searchQuery, nextCategory, serviceType, sort);
  }, [fetchExplore, searchQuery, selectedCategory, serviceType, sort]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(undefined);
    void fetchExplore('', undefined, serviceType, sort);
  }, [fetchExplore, serviceType, sort]);

  const clearAdvancedFilters = useCallback(() => {
    setServiceType(undefined);
    setSort(undefined);
    void fetchExplore(searchQuery, selectedCategory, undefined, undefined);
  }, [fetchExplore, searchQuery, selectedCategory]);

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
    activeServiceType: serviceType,
    activeSort: sort,
    clearAdvancedFilters,
    refresh: () => fetchExplore(searchQuery, selectedCategory, serviceType, sort),
  };
}
