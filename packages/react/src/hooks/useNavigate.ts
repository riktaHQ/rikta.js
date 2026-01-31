import { useCallback } from 'react';

/**
 * Options for navigation
 */
export interface NavigateOptions {
  /** Replace current history entry instead of pushing (uses location.replace) */
  replace?: boolean;
}

/**
 * Navigate function type
 * 
 * @param path - The path to navigate to
 * @param paramsOrOptions - Either query params object or navigate options
 * @param options - Navigate options (when params are provided)
 */
export type NavigateFn = {
  (path: string, options?: NavigateOptions): void;
  (path: string, params: Record<string, string | number | boolean | undefined | null>, options?: NavigateOptions): void;
};

/**
 * Build a URL with query parameters
 */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params || Object.keys(params).length === 0) {
    return path;
  }

  const url = new URL(path, window.location.origin);
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  // Return relative URL (pathname + search)
  return url.pathname + url.search;
}

/**
 * Hook for programmatic navigation using native browser APIs
 * 
 * This hook provides a simple way to navigate between pages using
 * standard browser navigation (full page loads for SSR pages).
 * 
 * @returns Navigate function
 * 
 * @example
 * ```tsx
 * import { useNavigate } from '@riktajs/react';
 * 
 * function MyComponent() {
 *   const navigate = useNavigate();
 * 
 *   const handleClick = () => {
 *     // Simple navigation
 *     navigate('/dashboard');
 *   };
 * 
 *   const handleSearch = (query: string) => {
 *     // Navigation with query params
 *     navigate('/search', { q: query, page: 1 });
 *     // Results in: /search?q=query&page=1
 *   };
 * 
 *   const handleLogin = () => {
 *     // Replace current history entry (for redirects)
 *     navigate('/login', { replace: true });
 *   };
 * 
 *   const handleFilter = (filter: string) => {
 *     // Params + options
 *     navigate('/items', { filter, sort: 'name' }, { replace: true });
 *   };
 * 
 *   return <button onClick={handleClick}>Go to Dashboard</button>;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // After form submission
 * function CreateItemForm() {
 *   const navigate = useNavigate();
 * 
 *   const handleSubmit = async (data: FormData) => {
 *     const result = await createItem(data);
 *     if (result.success) {
 *       navigate(`/items/${result.id}`);
 *     }
 *   };
 * 
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useNavigate(): NavigateFn {
  const navigate = useCallback((
    path: string,
    paramsOrOptions?: Record<string, string | number | boolean | undefined | null> | NavigateOptions,
    maybeOptions?: NavigateOptions
  ) => {
    // Skip on server
    if (typeof window === 'undefined') return;

    let url: string;
    let options: NavigateOptions | undefined;

    // Determine if second argument is params or options
    if (paramsOrOptions && typeof paramsOrOptions === 'object') {
      // Check if it looks like NavigateOptions (has only 'replace' key)
      const keys = Object.keys(paramsOrOptions);
      const isOptions = keys.length === 0 || (keys.length === 1 && keys[0] === 'replace');
      
      if (isOptions && !maybeOptions) {
        // It's options
        url = path;
        options = paramsOrOptions as NavigateOptions;
      } else {
        // It's params
        url = buildUrl(path, paramsOrOptions as Record<string, string | number | boolean | undefined | null>);
        options = maybeOptions;
      }
    } else {
      url = path;
      options = undefined;
    }

    // Perform navigation using native browser API
    if (options?.replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  }, []) as NavigateFn;

  return navigate;
}
