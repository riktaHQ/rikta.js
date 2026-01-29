import { useCallback, type FC, type MouseEvent } from 'react';
import { useNavigation } from '../hooks/useNavigation.js';
import type { LinkProps } from '../types.js';

/**
 * Link component for client-side navigation
 * 
 * Renders an anchor tag that uses the History API for navigation
 * instead of causing a full page reload.
 * 
 * @example
 * ```tsx
 * import { Link } from '@riktajs/react';
 * 
 * function Nav() {
 *   return (
 *     <nav>
 *       <Link href="/">Home</Link>
 *       <Link href="/about">About</Link>
 *       <Link href="/items/123">Item 123</Link>
 *     </nav>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // With options
 * <Link href="/dashboard" replace scroll={false}>
 *   Dashboard
 * </Link>
 * ```
 */
export const Link: FC<LinkProps> = ({
  href,
  replace = false,
  scroll = true,
  prefetch = false,
  state,
  children,
  onClick,
  ...restProps
}) => {
  const { navigate } = useNavigation();

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      // Call user's onClick handler if provided
      onClick?.(e);

      // Don't handle if default was prevented
      if (e.defaultPrevented) return;

      // Don't handle modified clicks (open in new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Don't handle right clicks
      if (e.button !== 0) return;

      // Don't handle target="_blank" etc.
      const target = (e.currentTarget as HTMLAnchorElement).target;
      if (target && target !== '_self') return;

      // Don't handle external links
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }

      // Handle the navigation
      e.preventDefault();
      navigate(href, { replace, scroll, state });
    },
    [href, replace, scroll, state, navigate, onClick]
  );

  // Prefetch support could be added here in the future
  // using <link rel="prefetch"> or Intersection Observer

  return (
    <a href={href} onClick={handleClick} {...restProps}>
      {children}
    </a>
  );
};

Link.displayName = 'Link';
