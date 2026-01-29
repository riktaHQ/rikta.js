import { useState, useCallback, useEffect, useMemo, type FC } from 'react';
import { RouterContext } from '../context/RouterContext.js';
import { SsrContext } from '../context/SsrContext.js';
import type { RiktaProviderProps, SsrData, NavigateOptions } from '../types.js';

/**
 * Get current location from window or fallback for SSR
 */
function getLocationInfo() {
  if (typeof window === 'undefined') {
    return { pathname: '/', search: '', href: '/' };
  }
  return {
    pathname: window.location.pathname,
    search: window.location.search.slice(1), // Remove leading ?
    href: window.location.href,
  };
}

/**
 * Get SSR data from window
 */
function getSsrData(): SsrData | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__SSR_DATA__;
}

/**
 * RiktaProvider - Main provider component for Rikta React utilities
 * 
 * Provides routing context, SSR data, and navigation utilities to the app.
 * 
 * @example
 * ```tsx
 * // In entry-client.tsx
 * import { RiktaProvider } from '@riktajs/react';
 * 
 * hydrateRoot(
 *   document.getElementById('root')!,
 *   <RiktaProvider>
 *     <App />
 *   </RiktaProvider>
 * );
 * ```
 */
export const RiktaProvider: FC<RiktaProviderProps> = ({
  ssrData: initialSsrData,
  initialParams = {},
  children,
}) => {
  // Initialize SSR data from window or props
  const [ssrData] = useState<SsrData | null>(() => {
    return initialSsrData ?? getSsrData() ?? null;
  });

  // Initialize location state
  const [location, setLocation] = useState(getLocationInfo);
  
  // Route params state
  const [params, setParams] = useState<Record<string, string>>(initialParams);

  /**
   * Navigate to a new URL using History API
   */
  const navigate = useCallback((url: string, options: NavigateOptions = {}) => {
    const { replace = false, scroll = true, state } = options;

    if (typeof window === 'undefined') return;

    // Handle full URLs vs relative paths
    let targetUrl: URL;
    try {
      targetUrl = new URL(url, window.location.origin);
    } catch {
      console.error(`[RiktaReact] Invalid URL: ${url}`);
      return;
    }

    // Only handle same-origin navigation
    if (targetUrl.origin !== window.location.origin) {
      window.location.href = url;
      return;
    }

    // Update history
    if (replace) {
      window.history.replaceState(state ?? null, '', targetUrl.href);
    } else {
      window.history.pushState(state ?? null, '', targetUrl.href);
    }

    // Update location state
    setLocation({
      pathname: targetUrl.pathname,
      search: targetUrl.search.slice(1),
      href: targetUrl.href,
    });

    // Scroll to top if requested
    if (scroll) {
      window.scrollTo(0, 0);
    }

    // Dispatch popstate event for any other listeners
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }, []);

  // Listen for popstate (browser back/forward)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setLocation(getLocationInfo());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Memoize router context value
  const routerValue = useMemo(() => ({
    pathname: location.pathname,
    search: location.search,
    href: location.href,
    navigate,
    params,
    setParams,
  }), [location.pathname, location.search, location.href, navigate, params]);

  return (
    <SsrContext.Provider value={ssrData}>
      <RouterContext.Provider value={routerValue}>
        {children}
      </RouterContext.Provider>
    </SsrContext.Provider>
  );
};

RiktaProvider.displayName = 'RiktaProvider';
