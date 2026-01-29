import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import type { ViteDevServer } from 'vite';
import type {
  SsrOptions,
  SsrRenderContext,
  ResolvedSsrOptions,
  ServerEntryModule,
} from './types.js';

/**
 * SsrService - Core SSR service for Rikta
 *
 * Handles server-side rendering using Vite's SSR capabilities.
 * Supports both development (with HMR) and production modes.
 *
 * @example
 * ```typescript
 * const ssr = new SsrService();
 * await ssr.init(options);
 *
 * const html = await ssr.render('/about', { user: currentUser });
 * ```
 */
export class SsrService {
  private vite: ViteDevServer | null = null;
  private options: ResolvedSsrOptions | null = null;
  private templateHtml: string = '';
  private serverEntry: ServerEntryModule | null = null;
  private isInitialized = false;
  private manifest: Record<string, string[]> = {};

  /**
   * Initialize the SSR service
   */
  async init(opts: SsrOptions): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Resolve options with defaults
    this.options = this.resolveOptions(opts);

    if (this.options.dev) {
      await this.initDevelopment();
    } else {
      await this.initProduction();
    }

    this.isInitialized = true;
  }

  /**
   * Resolve options with defaults
   */
  private resolveOptions(opts: SsrOptions): ResolvedSsrOptions {
    const root = opts.root ?? process.cwd();
    return {
      root,
      entryServer: opts.entryServer ?? './src/entry-server',
      template: opts.template ?? './index.html',
      dev: opts.dev ?? process.env.NODE_ENV !== 'production',
      buildDir: opts.buildDir ?? 'dist',
      ssrManifest: opts.ssrManifest ?? '.vite/ssr-manifest.json',
      viteConfig: opts.viteConfig ?? {},
    };
  }

  /**
   * Initialize development mode with Vite dev server
   */
  private async initDevelopment(): Promise<void> {
    if (!this.options) {
      throw new Error('SSR options not initialized');
    }

    // Dynamically import Vite to avoid bundling issues
    const { createServer } = await import('vite');

    // Create Vite server in middleware mode
    this.vite = await createServer({
      root: this.options.root,
      server: {
        middlewareMode: true,
        hmr: true,
      },
      appType: 'custom',
      ...this.options.viteConfig,
    });

    // Read template HTML
    const templatePath = resolve(this.options.root, this.options.template);
    this.templateHtml = readFileSync(templatePath, 'utf-8');
  }

  /**
   * Initialize production mode
   */
  private async initProduction(): Promise<void> {
    if (!this.options) {
      throw new Error('SSR options not initialized');
    }

    const { root, buildDir, entryServer, template, ssrManifest } = this.options;

    // Load the template from build directory
    const templatePath = resolve(root, buildDir, 'client', template.replace('./', ''));
    const altTemplatePath = resolve(root, buildDir, 'client', 'index.html');

    if (existsSync(templatePath)) {
      this.templateHtml = readFileSync(templatePath, 'utf-8');
    } else if (existsSync(altTemplatePath)) {
      this.templateHtml = readFileSync(altTemplatePath, 'utf-8');
    } else {
      throw new Error(`Template not found at ${templatePath} or ${altTemplatePath}`);
    }

    // Load SSR manifest if it exists
    const manifestPath = resolve(root, buildDir, 'client', ssrManifest);
    if (existsSync(manifestPath)) {
      this.manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    }

    // Load the server entry
    const serverEntryPath = resolve(root, buildDir, 'server', 'entry-server.js');
    const altServerEntryPath = resolve(root, entryServer.replace(/\.(ts|tsx|js|jsx)$/, '.js'));

    if (existsSync(serverEntryPath)) {
      this.serverEntry = await import(serverEntryPath);
    } else if (existsSync(altServerEntryPath)) {
      this.serverEntry = await import(altServerEntryPath);
    } else {
      // Try with built server directory
      const builtServerPath = resolve(root, buildDir, 'server/entry-server.js');
      if (existsSync(builtServerPath)) {
        this.serverEntry = await import(builtServerPath);
      } else {
        throw new Error(
          `Server entry not found. Tried:\n` +
            `  - ${serverEntryPath}\n` +
            `  - ${altServerEntryPath}\n` +
            `  - ${builtServerPath}`
        );
      }
    }
  }

  /**
   * Get the Vite dev server (only available in dev mode)
   */
  getViteServer(): ViteDevServer | null {
    return this.vite;
  }

  /**
   * Get Vite middlewares for Fastify integration
   */
  getMiddlewares(): unknown {
    return this.vite?.middlewares;
  }

  /**
   * Render the application for a given URL
   *
   * @param url - The URL to render
   * @param context - Optional context to pass to the render function
   * @returns Full HTML string
   */
  async render(url: string, context: Omit<SsrRenderContext, 'url'> = {}): Promise<string> {
    if (!this.isInitialized || !this.options) {
      throw new Error('SSR service not initialized. Call init() first.');
    }

    const renderContext: SsrRenderContext = {
      url,
      ...context,
    };

    let template = this.templateHtml;
    let render: ServerEntryModule['render'];

    if (this.options.dev && this.vite) {
      // Development mode: use Vite to transform template and load module
      template = await this.vite.transformIndexHtml(url, template);

      const entryPath = resolve(this.options.root, this.options.entryServer);
      const module = await this.vite.ssrLoadModule(entryPath);
      render = module.render;
    } else {
      // Production mode: use pre-loaded template and module
      if (!this.serverEntry) {
        throw new Error('Server entry not loaded');
      }
      render = this.serverEntry.render;
    }

    // Call the render function
    const result = await render(url, renderContext);

    // Handle both string and object return types
    let appHtml: string;
    let title = '';
    let head = '';
    let preloadLinks = '';

    if (typeof result === 'string') {
      appHtml = result;
    } else {
      appHtml = result.html;
      title = result.title ?? '';
      head = result.head ?? '';
      preloadLinks = result.preloadLinks ?? '';
    }

    // Generate preload links from manifest (production)
    if (!this.options.dev && Object.keys(this.manifest).length > 0) {
      preloadLinks = this.renderPreloadLinks(url);
    }

    // Check if template has head placeholder
    const hasHeadPlaceholder = template.includes('<!--head-tags-->');

    // Replace placeholders in template
    let html = template
      .replace('<!--ssr-outlet-->', appHtml)
      .replace('<!--app-->', appHtml)
      .replace('<!--ssr-title-->', title ? `<title>${title}</title>` : '')
      .replace('<!--head-tags-->', head)
      .replace('<!--preload-links-->', preloadLinks);

    // Inject head tags before </head> only if no placeholder was used
    if (head && !hasHeadPlaceholder) {
      html = html.replace('</head>', `${head}\n</head>`);
    }

    return html;
  }

  /**
   * Generate preload links from manifest
   */
  private renderPreloadLinks(url: string): string {
    const links: string[] = [];

    // Get the entry point for the URL
    const entry = this.manifest[url] || this.manifest['/'] || [];

    for (const file of entry) {
      if (file.endsWith('.js')) {
        links.push(`<link rel="modulepreload" crossorigin href="${file}">`);
      } else if (file.endsWith('.css')) {
        links.push(`<link rel="stylesheet" href="${file}">`);
      }
    }

    return links.join('\n');
  }

  /**
   * Transform index HTML (dev mode only)
   */
  async transformIndexHtml(url: string, html: string): Promise<string> {
    if (!this.vite) {
      return html;
    }
    return this.vite.transformIndexHtml(url, html);
  }

  /**
   * Close the SSR service (cleanup resources)
   */
  async close(): Promise<void> {
    if (this.vite) {
      await this.vite.close();
      this.vite = null;
    }
    this.isInitialized = false;
    this.serverEntry = null;
    this.templateHtml = '';
    this.manifest = {};
  }

  /**
   * Check if service is in development mode
   */
  isDev(): boolean {
    return this.options?.dev ?? true;
  }

  /**
   * Get resolved options
   */
  getOptions(): ResolvedSsrOptions | null {
    return this.options;
  }
}
