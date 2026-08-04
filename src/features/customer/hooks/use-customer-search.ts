/**
 * useCustomerSearch Hook
 * Manages barber search and filtering state
 */

import { useCallback, useState } from 'react';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerExploreData } from '../types/customer';

interface SearchFilters {
  category?: string;
  location?: string;
  maxDistance?: number;
}

export function useCustomerSearch(customerId: string) {
  const [exploreData, setExploreData] = useState<CustomerExploreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});

  const search = useCallback(
    async (query: string, searchFilters?: SearchFilters) => {
      if (!customerId) return;

      try {
        setLoading(true);
        setError(null);
        setSearchQuery(query);

        if (searchFilters) {
          setFilters(searchFilters);
        }

        const data = await customerRepository.searchBarbers(customerId, query, searchFilters);

        if (data) {
          setExploreData(data);
        } else {
          setError('Search failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    [customerId]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters({});
    setExploreData(null);
  }, []);

  const updateCategory = useCallback(
    async (categoryId: string) => {
      if (!customerId) return;

      try {
        setLoading(true);
        const result = await customerRepository.updateCategoryFilter(customerId, categoryId);

        if (result.success && result.categories) {
          setExploreData((prev) =>
            prev
              ? {
                  ...prev,
                  categoryChips: result.categories || [],
                }
              : null
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setLoading(false);
      }
    },
    [customerId]
  );

  return {
    exploreData,
    loading,
    error,
    searchQuery,
    filters,
    search,
    clearSearch,
    updateCategory,
  };
}
