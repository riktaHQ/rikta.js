/**
 * SSR data structure passed from server to client
 * via window.__SSR_DATA__
 */
export interface SsrData<T = unknown> {
  /** Initial data rendered on server */
  data: T;
  /** Current URL path */
  url: string;
  /** Page title (from @Ssr decorator) */
  title?: string;
  /** Page description (from @Ssr decorator) */
  description?: string;
  /** HTTP status code */
  status?: number;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Router context value interface
 */
export interface RouterContextValue {
  /** Current URL path */
  pathname: string;
  /** Current search params string (without ?) */
  search: string;
  /** Full URL */
  href: string;
  /** Navigate to a new URL */
  navigate: (url: string, options?: NavigateOptions) => void | Promise<void>;
  /** Extracted route params (e.g., { id: '123' } for /item/:id) */
  params: Record<string, string>;
  /** Update route params (used internally by RiktaProvider) */
  setParams: (params: Record<string, string>) => void;
  /** Whether a navigation is in progress */
  isNavigating?: boolean;
}

/**
 * Navigation options
 */
export interface NavigateOptions {
  /** Replace current history entry instead of pushing */
  replace?: boolean;
  /** Scroll to top after navigation */
  scroll?: boolean;
  /** Additional state to store in history */
  state?: unknown;
}

/**
 * Result type for server actions
 */
export interface ActionResult<T = unknown> {
  /** Whether the action was successful */
  success: boolean;
  /** Response data on success */
  data?: T;
  /** Error message on failure */
  error?: string;
  /** Field-specific validation errors */
  fieldErrors?: Record<string, string[]>;
}

/**
 * Fetch state for useFetch hook
 */
export interface FetchState<T = unknown> {
  /** Fetched data */
  data: T | null;
  /** Whether fetch is in progress */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually refetch data */
  refetch: () => Promise<void>;
}

/**
 * Action state for useAction hook
 */
export interface ActionState<TInput = unknown, TResult = unknown> {
  /** Execute the action */
  execute: (input: TInput) => Promise<ActionResult<TResult>>;
  /** Whether action is executing */
  pending: boolean;
  /** Last action result */
  result: ActionResult<TResult> | null;
  /** Reset action state */
  reset: () => void;
}

/**
 * Link component props
 */
export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Target URL */
  href: string;
  /** Replace history entry instead of push */
  replace?: boolean;
  /** Scroll to top after navigation */
  scroll?: boolean;
  /** Prefetch the linked page (future enhancement) */
  prefetch?: boolean;
  /** Additional state to pass to navigation */
  state?: unknown;
  /** Children elements */
  children: React.ReactNode;
}

/**
 * RiktaProvider props
 */
export interface RiktaProviderProps {
  /** Initial SSR data from server */
  ssrData?: SsrData;
  /** Initial route params extracted from URL */
  initialParams?: Record<string, string>;
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Hydration state
 */
export interface HydrationState {
  /** Whether the app has hydrated on client */
  isHydrated: boolean;
  /** Whether currently running on server */
  isServer: boolean;
}

declare global {
  interface Window {
    __SSR_DATA__?: SsrData;
  }
}
