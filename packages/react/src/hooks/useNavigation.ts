import { useContext, useCallback } from 'react';
import { RouterContext } from '../context/RouterContext.js';
import type { NavigateOptions } from '../types.js';

/**
 * Hook for programmatic navigation
 * 
 * @returns Object with navigate function and current location info
 * 
 * @example
 * ```tsx
 * import { useNavigation } from '@riktajs/react';
 * 
 * function MyComponent() {
 *   const { navigate, pathname } = useNavigation();
 * 
 *   const handleSubmit = async () => {
 *     await saveData();
 *     navigate('/success');
 *   };
 * 
 *   return (
 *     <button onClick={handleSubmit}>
 *       Submit (current path: {pathname})
 *     </button>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // With options
 * const { navigate } = useNavigation();
 * 
 * // Replace history entry (for redirects)
 * navigate('/login', { replace: true });
 * 
 * // Don't scroll to top
 * navigate('/next', { scroll: false });
 * 
 * // Pass state
 * navigate('/edit', { state: { from: 'list' } });
 * ```
 */
export function useNavigation() {
  const context = useContext(RouterContext);

  const navigate = useCallback(
    (url: string, options?: NavigateOptions) => {
      context.navigate(url, options);
    },
    [context.navigate]
  );

  return {
    /** Navigate to a new URL */
    navigate,
    /** Current pathname */
    pathname: context.pathname,
    /** Current search string (without ?) */
    search: context.search,
    /** Full href */
    href: context.href,
  };
}
