import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';

// Import decorators
import {
  SsrController,
  isSsrController,
  getSsrControllerMetadata,
  Ssr,
  isSsrRoute,
  getSsrRouteMetadata,
  SSR_CONTROLLER_METADATA,
  SSR_ROUTE_METADATA,
} from '../src/index.js';

// Mock @riktajs/core to prevent registration errors
vi.mock('@riktajs/core', () => ({
  container: {
    register: vi.fn(),
  },
  registry: {
    registerController: vi.fn(),
  },
}));

describe('SSR Decorators', () => {
  describe('@SsrController()', () => {
    it('should mark a class as an SSR controller', () => {
      @SsrController()
      class TestController {}

      expect(isSsrController(TestController)).toBe(true);
    });

    it('should store metadata with empty prefix by default', () => {
      @SsrController()
      class TestController {}

      const metadata = getSsrControllerMetadata(TestController);
      expect(metadata).toBeDefined();
      expect(metadata?.prefix).toBe('');
      expect(metadata?.ssrOptions).toEqual({});
    });

    it('should accept string prefix', () => {
      @SsrController('/pages')
      class TestController {}

      const metadata = getSsrControllerMetadata(TestController);
      expect(metadata?.prefix).toBe('/pages');
    });

    it('should normalize prefix without leading slash', () => {
      @SsrController('pages')
      class TestController {}

      const metadata = getSsrControllerMetadata(TestController);
      expect(metadata?.prefix).toBe('/pages');
    });

    it('should accept options object with prefix', () => {
      @SsrController({ prefix: '/app' })
      class TestController {}

      const metadata = getSsrControllerMetadata(TestController);
      expect(metadata?.prefix).toBe('/app');
    });

    it('should accept SSR options', () => {
      @SsrController({
        prefix: '/admin',
        entryServer: './src/admin-entry.tsx',
        template: './admin.html',
      })
      class AdminController {}

      const metadata = getSsrControllerMetadata(AdminController);
      expect(metadata?.prefix).toBe('/admin');
      expect(metadata?.ssrOptions).toEqual({
        entryServer: './src/admin-entry.tsx',
        template: './admin.html',
      });
    });

    it('should also register as regular controller', () => {
      @SsrController('/test')
      class TestController {}

      const CONTROLLER_METADATA = Symbol.for('rikta:controller:metadata');
      const controllerMeta = Reflect.getMetadata(CONTROLLER_METADATA, TestController);
      expect(controllerMeta).toBeDefined();
      expect(controllerMeta.prefix).toBe('/test');
    });

    it('should mark as injectable', () => {
      @SsrController()
      class TestController {}

      const INJECTABLE_METADATA = Symbol.for('rikta:injectable:metadata');
      const injectableMeta = Reflect.getMetadata(INJECTABLE_METADATA, TestController);
      expect(injectableMeta).toBeDefined();
      expect(injectableMeta.scope).toBe('singleton');
    });
  });

  describe('@Ssr()', () => {
    it('should mark a method as SSR route', () => {
      class TestController {
        @Ssr()
        home() {
          return {};
        }
      }

      expect(isSsrRoute(TestController, 'home')).toBe(true);
    });

    it('should store default metadata', () => {
      class TestController {
        @Ssr()
        home() {
          return {};
        }
      }

      const metadata = getSsrRouteMetadata(TestController, 'home');
      expect(metadata).toBeDefined();
      expect(metadata?.enabled).toBe(true);
      expect(metadata?.options).toEqual({});
    });

    it('should accept title option', () => {
      class TestController {
        @Ssr({ title: 'Home Page' })
        home() {
          return {};
        }
      }

      const metadata = getSsrRouteMetadata(TestController, 'home');
      expect(metadata?.options.title).toBe('Home Page');
    });

    it('should accept description option', () => {
      class TestController {
        @Ssr({ description: 'Welcome to our site' })
        home() {
          return {};
        }
      }

      const metadata = getSsrRouteMetadata(TestController, 'home');
      expect(metadata?.options.description).toBe('Welcome to our site');
    });

    it('should accept meta tags option', () => {
      class TestController {
        @Ssr({ meta: { author: 'John Doe', robots: 'index,follow' } })
        home() {
          return {};
        }
      }

      const metadata = getSsrRouteMetadata(TestController, 'home');
      expect(metadata?.options.meta).toEqual({
        author: 'John Doe',
        robots: 'index,follow',
      });
    });

    it('should accept cache options', () => {
      class TestController {
        @Ssr({
          cache: {
            maxAge: 60,
            staleWhileRevalidate: 120,
          },
        })
        home() {
          return {};
        }
      }

      const metadata = getSsrRouteMetadata(TestController, 'home');
      expect(metadata?.options.cache).toEqual({
        maxAge: 60,
        staleWhileRevalidate: 120,
      });
    });

    it('should accept all options together', () => {
      class TestController {
        @Ssr({
          title: 'Product Page',
          description: 'Browse our products',
          meta: { og_type: 'website' },
          cache: { maxAge: 300 },
        })
        products() {
          return {};
        }
      }

      const metadata = getSsrRouteMetadata(TestController, 'products');
      expect(metadata?.enabled).toBe(true);
      expect(metadata?.options.title).toBe('Product Page');
      expect(metadata?.options.description).toBe('Browse our products');
      expect(metadata?.options.meta).toEqual({ og_type: 'website' });
      expect(metadata?.options.cache?.maxAge).toBe(300);
    });

    it('should return undefined for non-SSR methods', () => {
      class TestController {
        apiEndpoint() {
          return {};
        }
      }

      expect(isSsrRoute(TestController, 'apiEndpoint')).toBe(false);
      expect(getSsrRouteMetadata(TestController, 'apiEndpoint')).toBeUndefined();
    });
  });

  describe('Combined usage', () => {
    it('should work with @SsrController and @Ssr together', () => {
      @SsrController('/pages')
      class PageController {
        @Ssr({ title: 'Home' })
        home() {
          return { page: 'home' };
        }

        @Ssr({ title: 'About Us' })
        about() {
          return { page: 'about' };
        }
      }

      // Controller metadata
      expect(isSsrController(PageController)).toBe(true);
      const controllerMeta = getSsrControllerMetadata(PageController);
      expect(controllerMeta?.prefix).toBe('/pages');

      // Route metadata
      expect(isSsrRoute(PageController, 'home')).toBe(true);
      expect(getSsrRouteMetadata(PageController, 'home')?.options.title).toBe('Home');

      expect(isSsrRoute(PageController, 'about')).toBe(true);
      expect(getSsrRouteMetadata(PageController, 'about')?.options.title).toBe('About Us');
    });

    it('should allow mixing SSR and non-SSR methods in SsrController', () => {
      @SsrController()
      class MixedController {
        @Ssr({ title: 'Dashboard' })
        dashboard() {
          return { page: 'dashboard' };
        }

        // This method could be used internally or called differently
        getData() {
          return { data: 'raw' };
        }
      }

      expect(isSsrRoute(MixedController, 'dashboard')).toBe(true);
      expect(isSsrRoute(MixedController, 'getData')).toBe(false);
    });
  });
});
