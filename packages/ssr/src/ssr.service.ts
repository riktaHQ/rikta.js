import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { ViteDevServer } from 'vite';
import type {
  SsrOptions,
  SsrRenderContext,
  ResolvedSsrOptions,
  ServerEntryModule,
} from './types.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripLeadingDotSlash(value: string): string {
  return value.replace(/^\.\//, '');
}

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
  private readonly templateCache = new Map<string, string>();
  private readonly serverEntryCache = new Map<string, ServerEntryModule>();
  private readonly manifestCache = new Map<string, Record<string, string[]>>();

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

  private resolveRenderOptions(overrides: Partial<SsrOptions>): ResolvedSsrOptions {
    if (!this.options) {
      throw new Error('SSR options not initialized');
    }

    const base = this.options;
    const resolved: ResolvedSsrOptions = {
      root: overrides.root ?? base.root,
      entryServer: overrides.entryServer ?? base.entryServer,
      template: overrides.template ?? base.template,
      dev: overrides.dev ?? base.dev,
      buildDir: overrides.buildDir ?? base.buildDir,
      ssrManifest: overrides.ssrManifest ?? base.ssrManifest,
      viteConfig: overrides.viteConfig ?? base.viteConfig,
    };

    if (resolved.dev !== base.dev) {
      throw new Error(
        'Per-controller dev mode overrides are not supported. Register a separate SSR plugin instance instead.'
      );
    }

    if (base.dev && resolved.root !== base.root) {
      throw new Error(
        'Per-controller root overrides are not supported in development mode. Register a separate SSR plugin instance instead.'
      );
    }

    return resolved;
  }

  private isDefaultRenderOptions(options: ResolvedSsrOptions): boolean {
    if (!this.options) {
      return false;
    }

    return options.root === this.options.root
      && options.entryServer === this.options.entryServer
      && options.template === this.options.template
      && options.dev === this.options.dev
      && options.buildDir === this.options.buildDir
      && options.ssrManifest === this.options.ssrManifest;
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
  }

  /**
   * Initialize production mode
   */
  private async initProduction(): Promise<void> {
    if (!this.options) {
      throw new Error('SSR options not initialized');
    }

    const templatePath = this.resolveTemplatePath(this.options);
    this.templateHtml = this.readCachedFile(templatePath);

    const manifestPath = this.resolveManifestPath(this.options);
    if (manifestPath) {
      this.manifest = this.readManifest(manifestPath);
    }

    const serverEntryPath = this.resolveServerEntryPath(this.options);
    this.serverEntry = await this.importServerEntry(serverEntryPath);
  }

  private resolveTemplatePath(options: ResolvedSsrOptions): string {
    const template = stripLeadingDotSlash(options.template);
    return this.findExistingPath('Template', [
      resolve(options.root, options.buildDir, 'client', template),
      resolve(options.root, options.buildDir, template),
      resolve(options.root, template),
      resolve(options.root, options.buildDir, 'client', 'index.html'),
    ]);
  }

  private resolveManifestPath(options: ResolvedSsrOptions): string | null {
    const manifest = stripLeadingDotSlash(options.ssrManifest);
    const candidates = [
      resolve(options.root, options.buildDir, 'client', manifest),
      resolve(options.root, options.buildDir, manifest),
      resolve(options.root, manifest),
    ];

    for (const candidate of new Set(candidates)) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private resolveServerEntryPath(options: ResolvedSsrOptions): string {
    const entryServer = stripLeadingDotSlash(options.entryServer).replace(/\.(ts|tsx|js|jsx)$/, '.js');
    return this.findExistingPath('Server entry', [
      resolve(options.root, options.buildDir, 'server', 'entry-server.js'),
      resolve(options.root, options.buildDir, entryServer),
      resolve(options.root, entryServer),
    ]);
  }

  private findExistingPath(kind: string, candidates: string[]): string {
    const uniqueCandidates = [...new Set(candidates)];

    for (const candidate of uniqueCandidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      `${kind} not found. Tried:\n` + uniqueCandidates.map((candidate) => `  - ${candidate}`).join('\n')
    );
  }

  private readCachedFile(filePath: string): string {
    const cached = this.templateCache.get(filePath);
    if (cached !== undefined) {
      return cached;
    }

    const contents = readFileSync(filePath, 'utf-8');
    this.templateCache.set(filePath, contents);
    return contents;
  }

  private readManifest(filePath: string): Record<string, string[]> {
    const cached = this.manifestCache.get(filePath);
    if (cached) {
      return cached;
    }

    const manifest = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, string[]>;
    this.manifestCache.set(filePath, manifest);
    return manifest;
  }

  private async importServerEntry(filePath: string): Promise<ServerEntryModule> {
    const cached = this.serverEntryCache.get(filePath);
    if (cached) {
      return cached;
    }

    const serverEntry = await import(pathToFileURL(filePath).href) as ServerEntryModule;
    this.serverEntryCache.set(filePath, serverEntry);
    return serverEntry;
  }

  private async loadTemplate(url: string, options: ResolvedSsrOptions): Promise<string> {
    if (options.dev) {
      if (!this.vite) {
        throw new Error('Vite dev server not initialized');
      }

      const templatePath = resolve(options.root, options.template);
      const template = readFileSync(templatePath, 'utf-8');
      return this.vite.transformIndexHtml(url, template);
    }

    if (this.isDefaultRenderOptions(options) && this.templateHtml) {
      return this.templateHtml;
    }

    return this.readCachedFile(this.resolveTemplatePath(options));
  }

  private async loadServerEntry(options: ResolvedSsrOptions): Promise<ServerEntryModule> {
    if (options.dev) {
      if (!this.vite) {
        throw new Error('Vite dev server not initialized');
      }

      const entryPath = resolve(options.root, options.entryServer);
      return this.vite.ssrLoadModule(entryPath) as Promise<ServerEntryModule>;
    }

    if (this.isDefaultRenderOptions(options) && this.serverEntry) {
      return this.serverEntry;
    }

    return this.importServerEntry(this.resolveServerEntryPath(options));
  }

  private loadManifestForOptions(options: ResolvedSsrOptions): Record<string, string[]> {
    if (options.dev) {
      return {};
    }

    if (this.isDefaultRenderOptions(options)) {
      return this.manifest;
    }

    const manifestPath = this.resolveManifestPath(options);
    return manifestPath ? this.readManifest(manifestPath) : {};
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
  async render(
    url: string,
    context: Omit<SsrRenderContext, 'url'> = {},
    overrides: Partial<SsrOptions> = {}
  ): Promise<string> {
    if (!this.isInitialized || !this.options) {
      throw new Error('SSR service not initialized. Call init() first.');
    }

    const renderOptions = this.resolveRenderOptions(overrides);

    const renderContext: SsrRenderContext = {
      url,
      ...context,
    };

    const template = await this.loadTemplate(url, renderOptions);
    const serverEntry = await this.loadServerEntry(renderOptions);
    const render = serverEntry.render;

    // Call the render function
    const result = await render(url, renderContext);

    // Handle both string and object return types
    let appHtml: string;
    let title = '';
    let head = '';
    let preloadLinks = '';
    let modules: Iterable<string> | undefined;

    if (typeof result === 'string') {
      appHtml = result;
    } else {
      appHtml = result.html;
      title = result.title ?? '';
      head = result.head ?? '';
      preloadLinks = result.preloadLinks ?? '';
      modules = result.modules;
    }

    if (!renderOptions.dev && modules) {
      const generatedPreloadLinks = this.renderPreloadLinks(
        modules,
        this.loadManifestForOptions(renderOptions)
      );
      preloadLinks = [preloadLinks, generatedPreloadLinks].filter(Boolean).join('\n');
    }

    const titleTag = title ? `<title>${escapeHtml(title)}</title>` : '';
    const hasStandaloneTitlePlaceholder = template.includes('<!--ssr-title-->');
    const hasWrappedTitlePlaceholder = template.includes('<title><!--ssr-title--></title>');
    const hasHeadPlaceholder = template.includes('<!--head-tags-->');
    const hasPreloadPlaceholder = template.includes('<!--preload-links-->');

    // Replace placeholders in template
    let html = template
      .replace('<title><!--ssr-title--></title>', titleTag)
      .replace('<!--ssr-outlet-->', appHtml)
      .replace('<!--app-->', appHtml)
      .replace('<!--ssr-title-->', escapeHtml(title))
      .replace('<!--head-tags-->', head)
      .replace('<!--preload-links-->', preloadLinks);

    const headInjections: string[] = [];

    if (titleTag && !hasStandaloneTitlePlaceholder && !hasWrappedTitlePlaceholder) {
      headInjections.push(titleTag);
    }
    if (preloadLinks && !hasPreloadPlaceholder) {
      headInjections.push(preloadLinks);
    }
    if (head && !hasHeadPlaceholder) {
      headInjections.push(head);
    }

    if (headInjections.length > 0) {
      html = html.replace('</head>', `${headInjections.join('\n')}\n</head>`);
    }

    return html;
  }

  /**
   * Generate preload links from manifest
   */
  private renderPreloadLinks(modules: Iterable<string>, manifest: Record<string, string[]>): string {
    const files = new Set<string>();

    for (const moduleId of modules) {
      const manifestEntry = manifest[moduleId] ?? [];
      for (const file of manifestEntry) {
        files.add(file);
      }
    }

    const links: string[] = [];
    for (const file of files) {
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
    this.templateCache.clear();
    this.serverEntryCache.clear();
    this.manifestCache.clear();
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
