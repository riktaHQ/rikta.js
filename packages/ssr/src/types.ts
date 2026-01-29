/**
 * SSR Options
 */
export interface SsrOptions {
  /**
   * Project root directory where vite.config.ts is located
   * @default process.cwd()
   */
  root?: string;

  /**
   * Path to server entry file (relative to root)
   * @default './src/entry-server'
   */
  entryServer?: string;

  /**
   * Path to HTML template (relative to root)
   * @default './index.html'
   */
  template?: string;

  /**
   * Enable development mode with HMR
   * @default process.env.NODE_ENV !== 'production'
   */
  dev?: boolean;

  /**
   * Build output directory (relative to root)
   * @default 'dist'
   */
  buildDir?: string;

  /**
   * SSR manifest filename
   * @default 'ssr-manifest.json'
   */
  ssrManifest?: string;

  /**
   * Custom Vite configuration overrides
   */
  viteConfig?: Record<string, unknown>;
}

/**
 * Context passed to the render function
 */
export interface SsrRenderContext {
  /**
   * The request URL
   */
  url: string;

  /**
   * Custom context data
   */
  [key: string]: unknown;
}

/**
 * Result from SSR render
 */
export interface SsrRenderResult {
  /**
   * Rendered HTML string
   */
  html: string;

  /**
   * Page title
   */
  title?: string;

  /**
   * Head tags to inject
   */
  head?: string;

  /**
   * Preload links for assets
   */
  preloadLinks?: string;
}

/**
 * Server entry module interface
 */
export interface ServerEntryModule {
  /**
   * Render function that returns HTML
   */
  render: (url: string, context?: SsrRenderContext) => Promise<string | SsrRenderResult> | string | SsrRenderResult;
}

/**
 * Resolved SSR Options with all defaults applied
 */
export interface ResolvedSsrOptions {
  root: string;
  entryServer: string;
  template: string;
  dev: boolean;
  buildDir: string;
  ssrManifest: string;
  viteConfig: Record<string, unknown>;
}

/**
 * Extended SSR context with route metadata
 */
export interface SsrExtendedContext extends SsrRenderContext {
  /**
   * Page title (from @Ssr decorator)
   */
  title?: string;

  /**
   * Meta description (from @Ssr decorator)
   */
  description?: string;

  /**
   * Additional meta tags
   */
  meta?: Record<string, string>;

  /**
   * SSR data to be serialized and hydrated on client
   */
  __SSR_DATA__?: Record<string, unknown>;
}

/**
 * Constructor type for controllers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = any> = new (...args: any[]) => T;
