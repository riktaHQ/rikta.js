import { getSsrData } from '../utils/getSsrData.js';

/**
 * SSR data type with optional url field
 */
interface SsrDataWithUrl {
  url?: string;
  [key: string]: unknown;
}

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
 * Get location info from SSR data or window
 * Uses SSR data first to ensure hydration consistency
 */
function getLocation(): Location {
  // First try to get URL from SSR data (works both server and client)
  const ssrData = getSsrData<SsrDataWithUrl>();
  
  if (ssrData?.url) {
    const url = new URL(ssrData.url, 'http://localhost');
    const search = url.search.slice(1); // Remove leading ?
    return {
      pathname: url.pathname,
      search,
      href: ssrData.url,
      searchParams: new URLSearchParams(search),
    };
  }

  // Fallback to window.location on client
  if (typeof window !== 'undefined') {
    const search = window.location.search.slice(1); // Remove leading ?
    return {
      pathname: window.location.pathname,
      search,
      href: window.location.href,
      searchParams: new URLSearchParams(search),
    };
  }

  // SSR fallback when no data available
  return {
    pathname: '/',
    search: '',
    href: '/',
    searchParams: new URLSearchParams(),
  };
}

/**
 * Hook to access current location information using native browser APIs
 * 
 * This hook reads directly from `window.location` and provides a convenient
 * interface for accessing URL information.
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
 * 
 * @example
 * ```tsx
 * // Use pathname for conditional rendering
 * function Navigation() {
 *   const { pathname } = useLocation();
 *   
 *   return (
 *     <nav>
 *       <a href="/" className={pathname === '/' ? 'active' : ''}>Home</a>
 *       <a href="/about" className={pathname === '/about' ? 'active' : ''}>About</a>
 *     </nav>
 *   );
 * }
 * ```
 */
export function useLocation(): Location {
  return getLocation();
}
