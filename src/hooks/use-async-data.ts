/**
 * Generic hook factory for managing async data fetching
 * Eliminates code duplication across all feature hooks
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseAsyncDataOptions {
  /** Whether to skip the initial fetch */
  skip?: boolean;
  /** Called when fetch succeeds */
  onSuccess?: (data: unknown) => void;
  /** Called when fetch fails */
  onError?: (error: Error) => void;
}

/**
 * Generic hook for managing async data fetching with loading and error states
 * @param fetcher Async function that returns data or null
 * @param dependencies Array of dependencies to trigger refetch
 * @param options Configuration options
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T | null>,
  dependencies: unknown[] = [],
  options: UseAsyncDataOptions = {}
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);

  useEffect(() => {
    fetcherRef.current = fetcher;
    optionsRef.current = options;
  }, [fetcher, options]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
      optionsRef.current.onSuccess?.(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      optionsRef.current.onError?.(err instanceof Error ? err : new Error(errorMsg));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options.skip) {
      return;
    }
    const timeoutId = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timeoutId);
  }, [...dependencies, refresh, options.skip]);

  return { data, loading, error, refresh };
}

/**
 * Hook pattern for listing data with optional filtering/sorting
 */
export function useAsyncList<T>(
  fetcher: () => Promise<T[] | null>,
  dependencies: unknown[] = [],
  options: UseAsyncDataOptions = {}
): AsyncDataState<T[]> {
  const state = useAsyncData(
    async () => (await fetcher()) ?? [],
    dependencies,
    options
  );
  return {
    ...state,
    data: state.data || [],
  };
}

/**
 * Hook pattern for loading a single entity by ID
 */
export function useAsyncDetail<T>(
  id: string | undefined,
  fetcher: (id: string) => Promise<T | null>,
  options: UseAsyncDataOptions = {}
): AsyncDataState<T> {
  return useAsyncData(
    () => (id ? fetcher(id) : Promise.resolve(null)),
    [id],
    { skip: !id, ...options }
  );
}

/**
 * Hook pattern for mutable operations with separate loading state
 */
export function useAsyncMutation<TData, TParams>(
  fetcher: (params: TParams) => Promise<TData | null>,
  onSuccess?: (data: TData) => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (params: TParams) => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetcher(params);
        onSuccess?.(result ?? undefined as unknown as TData);
        return { success: true, data: result };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        return { success: false, error: { message: errorMsg } };
      } finally {
        setLoading(false);
      }
    },
    [fetcher, onSuccess]
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { execute, loading, error, reset };
}
