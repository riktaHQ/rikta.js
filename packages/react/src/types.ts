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
