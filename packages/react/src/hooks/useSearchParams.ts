import { useContext, useMemo } from 'react';
import { RouterContext } from '../context/RouterContext.js';

/**
 * Hook to access and manipulate URL search parameters
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
 */
export function useSearchParams(): [URLSearchParams, (params: Record<string, string> | URLSearchParams) => void] {
  const context = useContext(RouterContext);

  const searchParams = useMemo(() => {
    return new URLSearchParams(context.search);
  }, [context.search]);

  const setSearchParams = useMemo(() => {
    return (params: Record<string, string> | URLSearchParams) => {
      const newParams = params instanceof URLSearchParams 
        ? params 
        : new URLSearchParams(params);
      
      const search = newParams.toString();
      const newUrl = search 
        ? `${context.pathname}?${search}` 
        : context.pathname;
      
      context.navigate(newUrl, { scroll: false });
    };
  }, [context.pathname, context.navigate]);

  return [searchParams, setSearchParams];
}
