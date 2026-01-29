import { useState, useEffect, useCallback, useRef } from 'react';
import type { FetchState } from '../types.js';

/**
 * Options for useFetch hook
 */
export interface UseFetchOptions extends Omit<RequestInit, 'body'> {
  /** Skip initial fetch (useful for conditional fetching) */
  skip?: boolean;
  /** Dependencies that trigger refetch when changed */
  deps?: unknown[];
  /** Transform response before setting data */
  transform?: (data: unknown) => unknown;
}

/**
 * Hook for data fetching with loading and error states
 * 
 * @param url URL to fetch from
 * @param options Fetch options
 * @returns Fetch state with data, loading, error, and refetch function
 * 
 * @example
 * ```tsx
 * import { useFetch } from '@riktajs/react';
 * 
 * interface User {
 *   id: string;
 *   name: string;
 * }
 * 
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, loading, error, refetch } = useFetch<User>(
 *     `/api/users/${userId}`
 *   );
 *   
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   if (!data) return null;
 *   
 *   return (
 *     <div>
 *       <h1>{data.name}</h1>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // With options
 * const { data } = useFetch<Item[]>('/api/items', {
 *   headers: { 'Authorization': `Bearer ${token}` },
 *   deps: [token], // Refetch when token changes
 *   skip: !token,  // Don't fetch until we have a token
 * });
 * ```
 * 
 * @example
 * ```tsx
 * // With transform
 * const { data } = useFetch<{ results: Item[] }>('/api/search', {
 *   transform: (res) => res.results, // Extract just the results array
 * });
 * ```
 */
export function useFetch<T = unknown>(
  url: string,
  options: UseFetchOptions = {}
): FetchState<T> {
  const { skip = false, deps = [], transform, ...fetchOptions } = options;
  
  const [state, setState] = useState<Omit<FetchState<T>, 'refetch'>>({
    data: null,
    loading: !skip,
    error: null,
  });

  // Use ref to track if component is mounted
  const mountedRef = useRef(true);
  // Use ref to track current fetch to handle race conditions
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (skip) return;

    const fetchId = ++fetchIdRef.current;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data = await response.json();

      // Apply transform if provided
      if (transform) {
        data = transform(data);
      }

      // Only update state if this is still the current fetch and component is mounted
      if (fetchId === fetchIdRef.current && mountedRef.current) {
        setState({ data: data as T, loading: false, error: null });
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current && mountedRef.current) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setState({ data: null, loading: false, error: message });
      }
    }
  }, [url, skip, JSON.stringify(fetchOptions), transform]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, ...deps]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
  };
}
