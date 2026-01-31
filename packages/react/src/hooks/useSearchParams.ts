import { useCallback } from 'react';

/**
 * Hook to access and update URL search parameters using native browser APIs
 * 
 * This hook provides a simple interface for reading and modifying URL query
 * parameters. When updating params, it triggers a full page navigation to
 * ensure SSR data is refreshed.
 * 
 * @returns Tuple of [URLSearchParams, setSearchParams function]
 * 
 * @example
 * ```tsx
 * import { useSearchParams } from '@riktajs/react';
 * 
 * function SearchPage() {
 *   const [searchParams, setSearchParams] = useSearchParams();
 *   const query = searchParams.get('q') ?? '';
 *   const page = parseInt(searchParams.get('page') ?? '1', 10);
 * 
 *   const handleSearch = (newQuery: string) => {
 *     setSearchParams({ q: newQuery, page: '1' });
 *   };
 * 
 *   const handleNextPage = () => {
 *     setSearchParams({ q: query, page: String(page + 1) });
 *   };
 * 
 *   return (
 *     <div>
 *       <input 
 *         value={query} 
 *         onChange={(e) => handleSearch(e.target.value)} 
 *       />
 *       <button onClick={handleNextPage}>Next Page</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Merge with existing params
 * function FilterComponent() {
 *   const [searchParams, setSearchParams] = useSearchParams();
 *   
 *   const updateFilter = (filter: string) => {
 *     // Get current params and update
 *     const params = Object.fromEntries(searchParams.entries());
 *     setSearchParams({ ...params, filter });
 *   };
 *   
 *   return (
 *     <select onChange={(e) => updateFilter(e.target.value)}>
 *       <option value="">All</option>
 *       <option value="active">Active</option>
 *       <option value="inactive">Inactive</option>
 *     </select>
 *   );
 * }
 * ```
 */
export function useSearchParams(): [URLSearchParams, (params: Record<string, string | number | boolean | undefined | null> | URLSearchParams) => void] {
  // Get current search params
  const getSearchParams = (): URLSearchParams => {
    if (typeof window === 'undefined') {
      return new URLSearchParams();
    }
    return new URLSearchParams(window.location.search);
  };

  const searchParams = getSearchParams();

  const setSearchParams = useCallback((params: Record<string, string | number | boolean | undefined | null> | URLSearchParams) => {
    if (typeof window === 'undefined') return;

    let newParams: URLSearchParams;
    
    if (params instanceof URLSearchParams) {
      newParams = params;
    } else {
      newParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          newParams.set(key, String(value));
        }
      }
    }
    
    const search = newParams.toString();
    const pathname = window.location.pathname;
    const newUrl = search ? `${pathname}?${search}` : pathname;
    
    // Navigate using native browser API (full page load for SSR)
    window.location.href = newUrl;
  }, []);

  return [searchParams, setSearchParams];
}
