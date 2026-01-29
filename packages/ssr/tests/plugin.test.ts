import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { ssrPlugin } from '../src/plugin.js';

// Mock dependencies
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn((path: string) => {
      if (path.includes('index.html')) {
        return '<!DOCTYPE html><html><head></head><body><div id="app"><!--ssr-outlet--></div></body></html>';
      }
      throw new Error(`File not found: ${path}`);
    }),
    existsSync: vi.fn((path: string) => {
      if (path.includes('index.html')) return true;
      if (path.includes('entry-server')) return true;
      return false;
    }),
  };
});

const mockViteServer = {
  middlewares: { use: vi.fn() },
  transformIndexHtml: vi.fn((url: string, html: string) => Promise.resolve(html)),
  ssrLoadModule: vi.fn(() =>
    Promise.resolve({
      render: vi.fn((url: string) => `<div>SSR Content for ${url}</div>`),
    })
  ),
  close: vi.fn(() => Promise.resolve()),
};

vi.mock('vite', () => ({
  createServer: vi.fn(() => Promise.resolve(mockViteServer)),
}));

// Create a proper mock for @fastify/middie that adds the use method
vi.mock('@fastify/middie', () => ({
  default: async (fastify: FastifyInstance) => {
    // Add the use method to the fastify instance
    (fastify as FastifyInstance & { use: Function }).use = vi.fn();
  },
}));

describe('ssrPlugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await app.close();
    } catch {
      // Ignore close errors
    }
  });

  it('should register the plugin without errors', async () => {
    await app.register(ssrPlugin, {
      root: '/test/project',
      dev: true,
    });

    await app.ready();
    expect(app.ssr).toBeDefined();
  });

  it('should decorate fastify with ssr service', async () => {
    await app.register(ssrPlugin, {
      root: '/test/project',
      dev: true,
    });

    await app.ready();

    expect(app.ssr).toBeDefined();
    expect(typeof app.ssr.render).toBe('function');
    expect(typeof app.ssr.isDev).toBe('function');
    expect(typeof app.ssr.getViteServer).toBe('function');
  });

  it('should render SSR content via the decorated service', async () => {
    await app.register(ssrPlugin, {
      root: '/test/project',
      dev: true,
    });

    // Add a test route
    app.get('/test', async (request, reply) => {
      const html = await app.ssr.render(request.url);
      return reply.type('text/html').send(html);
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.payload).toContain('SSR Content for /test');
    expect(response.payload).toContain('<!DOCTYPE html>');
  });

  it('should be in dev mode when configured', async () => {
    await app.register(ssrPlugin, {
      root: '/test/project',
      dev: true,
    });

    await app.ready();

    expect(app.ssr.isDev()).toBe(true);
  });

  it('should have access to Vite middlewares in dev mode', async () => {
    await app.register(ssrPlugin, {
      root: '/test/project',
      dev: true,
    });

    await app.ready();

    expect(app.ssr.getMiddlewares()).toBeDefined();
  });
});
