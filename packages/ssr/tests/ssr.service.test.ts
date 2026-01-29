import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SsrService } from '../src/ssr.service.js';

// Mock fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn((path: string) => {
      if (path.includes('index.html')) {
        return '<!DOCTYPE html><html><head><!--head-tags--></head><body><div id="app"><!--ssr-outlet--></div></body></html>';
      }
      if (path.includes('ssr-manifest.json')) {
        return '{}';
      }
      throw new Error(`File not found: ${path}`);
    }),
    existsSync: vi.fn((path: string) => {
      if (path.includes('index.html')) return true;
      if (path.includes('ssr-manifest.json')) return false;
      if (path.includes('entry-server')) return true;
      return false;
    }),
  };
});

// Mock Vite
const mockViteServer = {
  middlewares: {},
  transformIndexHtml: vi.fn((url: string, html: string) => Promise.resolve(html)),
  ssrLoadModule: vi.fn((entry: string) =>
    Promise.resolve({
      render: vi.fn((url: string) => `<div>Hello SSR at ${url}</div>`),
    })
  ),
  close: vi.fn(() => Promise.resolve()),
};

vi.mock('vite', () => ({
  createServer: vi.fn(() => Promise.resolve(mockViteServer)),
}));

describe('SsrService', () => {
  let service: SsrService;

  beforeEach(() => {
    service = new SsrService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await service.close();
  });

  describe('init', () => {
    it('should initialize with default options', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      expect(service.isDev()).toBe(true);
      expect(service.getOptions()).not.toBeNull();
      expect(service.getOptions()?.root).toBe('/test/project');
    });

    it('should use default values when options are not provided', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      const options = service.getOptions();
      expect(options?.entryServer).toBe('./src/entry-server');
      expect(options?.template).toBe('./index.html');
      expect(options?.buildDir).toBe('dist');
      expect(options?.ssrManifest).toBe('.vite/ssr-manifest.json');
    });

    it('should not reinitialize if already initialized', async () => {
      await service.init({ root: '/test/project', dev: true });
      await service.init({ root: '/other/project', dev: true });

      // Should keep the first initialization
      expect(service.getOptions()?.root).toBe('/test/project');
    });
  });

  describe('render', () => {
    it('should throw error if not initialized', async () => {
      await expect(service.render('/test')).rejects.toThrow(
        'SSR service not initialized. Call init() first.'
      );
    });

    it('should render HTML in development mode', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      const html = await service.render('/about');

      expect(html).toContain('<div>Hello SSR at /about</div>');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should pass context to render function', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      mockViteServer.ssrLoadModule.mockResolvedValueOnce({
        render: vi.fn((url: string, ctx: Record<string, unknown>) => 
          `<div>User: ${ctx.user || 'guest'}</div>`
        ),
      });

      const html = await service.render('/profile', { user: 'john' });

      expect(html).toContain('<div>User: john</div>');
    });
  });

  describe('getViteServer', () => {
    it('should return null before initialization', () => {
      expect(service.getViteServer()).toBeNull();
    });

    it('should return Vite server after initialization in dev mode', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      expect(service.getViteServer()).not.toBeNull();
    });
  });

  describe('getMiddlewares', () => {
    it('should return middlewares in dev mode', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      expect(service.getMiddlewares()).toBeDefined();
    });
  });

  describe('close', () => {
    it('should clean up vite server resources', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      await service.close();

      expect(service.getViteServer()).toBeNull();
    });

    it('should call Vite close in dev mode', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      await service.close();

      expect(mockViteServer.close).toHaveBeenCalled();
    });
  });

  describe('isDev', () => {
    it('should return true when in development mode', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      expect(service.isDev()).toBe(true);
    });

    it('should return true by default before initialization', () => {
      // Before init, options is null, so isDev returns default true
      expect(service.isDev()).toBe(true);
    });
  });

  describe('transformIndexHtml', () => {
    it('should transform HTML in dev mode', async () => {
      await service.init({
        root: '/test/project',
        dev: true,
      });

      await service.transformIndexHtml('/test', '<html></html>');

      expect(mockViteServer.transformIndexHtml).toHaveBeenCalledWith('/test', '<html></html>');
    });

    it('should return unchanged HTML when Vite is not available', async () => {
      const result = await service.transformIndexHtml('/test', '<html></html>');
      expect(result).toBe('<html></html>');
    });
  });
});
