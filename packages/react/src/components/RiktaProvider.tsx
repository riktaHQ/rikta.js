import { useState, useCallback, useEffect, useMemo, type FC } from 'react';
import { RouterContext } from '../context/RouterContext.js';
import { SsrContext } from '../context/SsrContext.js';
import type { RiktaProviderProps, SsrData, NavigateOptions } from '../types.js';

/**
 * Get current location from window or fallback for SSR
 */
function getLocationInfo(ssrUrl?: string) {
  if (typeof window === 'undefined') {
    // During SSR, use the URL from ssrData if available
    if (ssrUrl) {
      try {
        const url = new URL(ssrUrl, 'http://localhost');
        return {
          pathname: url.pathname,
          search: url.search.slice(1),
          href: ssrUrl,
        };
      } catch {
        // Fall through to default
      }
    }
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
 * Server now puts data in normalized format: { data, url, title, description }
 */
function getSsrData(): SsrData | undefined {
  if (typeof window === 'undefined') return undefined;
  
  const rawData = window.__SSR_DATA__ as Record<string, unknown> | undefined;
  if (!rawData) return undefined;
  
  // Data should already be in normalized format from entry-server
  return rawData as unknown as SsrData;
}

/**
 * Fetch SSR data from server for client-side navigation
 */
async function fetchSsrData(url: string): Promise<SsrData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'X-Rikta-Data': '1',
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data as SsrData;
    }
  } catch (error) {
    console.warn('[RiktaReact] Failed to fetch SSR data:', error);
  }
  return null;
}

/**
 * RiktaProvider - Main provider component for Rikta React utilities
 * 
 * Provides routing context, SSR data, and navigation utilities to the app.
 * Automatically fetches new page data during client-side navigation.
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
  const [ssrData, setSsrData] = useState<SsrData | null>(() => {
    return initialSsrData ?? getSsrData() ?? null;
  });

  // Loading state for navigation
  const [isNavigating, setIsNavigating] = useState(false);

  // Initialize location state - use URL from ssrData for SSR consistency
  const [location, setLocation] = useState(() => {
    const resolvedSsrData = initialSsrData ?? getSsrData();
    return getLocationInfo(resolvedSsrData?.url);
  });
  
  // Route params state
  const [params, setParams] = useState<Record<string, string>>(initialParams);

  /**
   * Navigate to a new URL using History API with data fetching
   */
  const navigate = useCallback(async (url: string, options: NavigateOptions = {}) => {
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

    // Start navigation
    setIsNavigating(true);

    // Fetch new SSR data from server BEFORE updating anything else
    const newSsrData = await fetchSsrData(targetUrl.href);

    // Update SSR data FIRST (before location changes)
    if (newSsrData) {
      setSsrData(newSsrData);
    }

    // Update history
    if (replace) {
      window.history.replaceState(state ?? null, '', targetUrl.href);
    } else {
      window.history.pushState(state ?? null, '', targetUrl.href);
    }

    // Update location state AFTER data is ready
    setLocation({
      pathname: targetUrl.pathname,
      search: targetUrl.search.slice(1),
      href: targetUrl.href,
    });

    // Scroll to top if requested
    if (scroll) {
      window.scrollTo(0, 0);
    }

    // End navigation
    setIsNavigating(false);
  }, []);

  // Listen for popstate (browser back/forward) and fetch data
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = async () => {
      const newLocation = getLocationInfo();
      
      // Fetch data for the new URL FIRST
      setIsNavigating(true);
      const newSsrData = await fetchSsrData(newLocation.href);
      
      // Update SSR data BEFORE location
      if (newSsrData) {
        setSsrData(newSsrData);
      }
      
      // Then update location
      setLocation(newLocation);
      setIsNavigating(false);
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
    isNavigating,
  }), [location.pathname, location.search, location.href, navigate, params, isNavigating]);

  return (
    <SsrContext.Provider value={ssrData}>
      <RouterContext.Provider value={routerValue}>
        {children}
      </RouterContext.Provider>
    </SsrContext.Provider>
  );
};

RiktaProvider.displayName = 'RiktaProvider';
