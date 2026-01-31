import type { SsrData } from '../types.js';

/**
 * Cache for SSR data to avoid repeated window access
 */
let ssrDataCache: SsrData | null | undefined = undefined;

/**
 * Get SSR data from window.__SSR_DATA__
 * 
 * This is a pure utility function (not a React hook) that reads
 * the SSR data passed from the server. It can be called anywhere
 * in your application without needing a Provider wrapper.
 * 
 * The data is cached after first read for performance.
 * 
 * @returns SSR data object or null if not available
 * 
 * @example
 * ```tsx
 * import { getSsrData } from '@riktajs/react';
 * 
 * interface PageData {
 *   title: string;
 *   items: Array<{ id: string; name: string }>;
 * }
 * 
 * function ItemList() {
 *   const ssrData = getSsrData<PageData>();
 *   
 *   if (!ssrData) {
 *     return <div>Loading...</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <h1>{ssrData.data.title}</h1>
 *       <ul>
 *         {ssrData.data.items.map(item => (
 *           <li key={item.id}>{item.name}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Access directly without needing Provider
 * const ssrData = getSsrData<{ user: User }>();
 * const user = ssrData?.data.user;
 * ```
 */
export function getSsrData<T = unknown>(): SsrData<T> | null {
  // Return cached value if available
  if (ssrDataCache !== undefined) {
    return ssrDataCache as SsrData<T> | null;
  }

  // Server-side: no window
  if (typeof window === 'undefined') {
    return null;
  }

  const rawData = window.__SSR_DATA__ as SsrData<T> | undefined;
  
  if (!rawData) {
    ssrDataCache = null;
    return null;
  }

  ssrDataCache = rawData as SsrData;
  return rawData;
}

/**
 * Clear the SSR data cache
 * Useful for testing or when SSR data changes dynamically
 */
export function clearSsrDataCache(): void {
  ssrDataCache = undefined;
}

/**
 * Set SSR data manually (for testing or server-side rendering)
 * 
 * @param data - SSR data to set, or null to clear
 */
export function setSsrData(data: SsrData | null): void {
  ssrDataCache = data;
}
