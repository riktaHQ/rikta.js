import { useContext } from 'react';
import { RouterContext } from '../context/RouterContext.js';

/**
 * Location object returned by useLocation
 */
export interface Location {
  /** Current pathname (e.g., /items/123) */
  pathname: string;
  /** Current search string without ? (e.g., page=2&sort=asc) */
  search: string;
  /** Full href */
  href: string;
  /** Parsed search params */
  searchParams: URLSearchParams;
}

/**
 * Hook to access current location information
 * 
 * @returns Location object with pathname, search, href, and searchParams
 * 
 * @example
 * ```tsx
 * import { useLocation } from '@riktajs/react';
 * 
 * function Breadcrumbs() {
 *   const location = useLocation();
 *   
 *   return (
 *     <nav>
 *       Current path: {location.pathname}
 *       {location.search && <span>?{location.search}</span>}
 *     </nav>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Access search params
 * function FilterDisplay() {
 *   const { searchParams } = useLocation();
 *   const filter = searchParams.get('filter');
 *   
 *   return filter ? <span>Filtered by: {filter}</span> : null;
 * }
 * ```
 */
export function useLocation(): Location {
  const context = useContext(RouterContext);

  return {
    pathname: context.pathname,
    search: context.search,
    href: context.href,
    searchParams: new URLSearchParams(context.search),
  };
}
