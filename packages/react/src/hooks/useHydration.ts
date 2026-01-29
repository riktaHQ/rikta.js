import { useState, useEffect } from 'react';
import type { HydrationState } from '../types.js';

/**
 * Hook to track hydration state
 * 
 * Useful for rendering different content during SSR vs after hydration,
 * or for avoiding hydration mismatches.
 * 
 * @returns Hydration state object
 * 
 * @example
 * ```tsx
 * import { useHydration } from '@riktajs/react';
 * 
 * function TimeDisplay() {
 *   const { isHydrated, isServer } = useHydration();
 *   
 *   // On server and initial render, show static content
 *   // After hydration, show dynamic content
 *   if (!isHydrated) {
 *     return <span>Loading time...</span>;
 *   }
 *   
 *   return <span>{new Date().toLocaleTimeString()}</span>;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Avoid hydration mismatch with client-only content
 * function ClientOnlyComponent() {
 *   const { isHydrated } = useHydration();
 *   
 *   if (!isHydrated) {
 *     return null; // Or a placeholder
 *   }
 *   
 *   return <SomeClientOnlyLibrary />;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Conditional rendering based on environment
 * function DebugPanel() {
 *   const { isServer } = useHydration();
 *   
 *   // Never render on server, only after client hydration
 *   if (isServer) return null;
 *   
 *   return <DevTools />;
 * }
 * ```
 */
export function useHydration(): HydrationState {
  const isServer = typeof window === 'undefined';
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return {
    isHydrated,
    isServer,
  };
}
