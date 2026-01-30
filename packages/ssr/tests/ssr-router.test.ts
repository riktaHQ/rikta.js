import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import { SsrRouter } from '../src/ssr-router.js';
import { SsrController, Ssr, SSR_CONTROLLER_METADATA } from '../src/index.js';
import type { SsrService } from '../src/ssr.service.js';

// Mock @riktajs/core
vi.mock('@riktajs/core', () => ({
  container: {
    register: vi.fn(),
  },
  registry: {
    registerController: vi.fn(),
  },
}));

// Create mock route metadata key
const ROUTES_METADATA = Symbol.for('rikta:routes:metadata');

// Helper to add route metadata
function Get(path: string): MethodDecorator {
  return (target, propertyKey) => {
    const routes = Reflect.getMetadata(ROUTES_METADATA, target.constructor) || [];
    routes.push({ method: 'GET', path, handlerName: propertyKey });
    Reflect.defineMetadata(ROUTES_METADATA, routes, target.constructor);
  };
}

describe('SsrRouter', () => {
  let mockFastify: any;
  let mockSsrService: Partial<SsrService>;
  let mockContainer: any;
  let router: SsrRouter;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Fastify instance
    mockFastify = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      log: {
        error: vi.fn(),
      },
    };

    // Create mock SSR service
    mockSsrService = {
      render: vi.fn().mockResolvedValue('<html><body>Rendered</body></html>'),
    };

    // Create mock container
    mockContainer = {
      resolve: vi.fn((cls: any) => new cls()),
    };

    router = new SsrRouter(
      mockFastify,
      mockSsrService as SsrService,
      { root: '/test', dev: true },
      mockContainer
    );
  });

  describe('registerController', () => {
    it('should throw error for non-SSR controller', () => {
      class NotSsrController {
        home() {
          return {};
        }
      }

      expect(() => router.registerController(NotSsrController)).toThrow(
        'NotSsrController is not decorated with @SsrController()'
      );
    });

    it('should register SSR controller with routes', () => {
      @SsrController()
      class PageController {
        @Get('/')
        home() {
          return { page: 'home' };
        }
      }

      router.registerController(PageController, true);

      expect(mockFastify.get).toHaveBeenCalledTimes(1);
      expect(mockFastify.get).toHaveBeenCalledWith('/', expect.any(Function));
    });

    it('should register routes with controller prefix', () => {
      @SsrController('/pages')
      class PageController {
        @Get('/home')
        home() {
          return {};
        }

        @Get('/about')
        about() {
          return {};
        }
      }

      router.registerController(PageController, true);

      expect(mockFastify.get).toHaveBeenCalledTimes(2);
      expect(mockFastify.get).toHaveBeenCalledWith('/pages/home', expect.any(Function));
      expect(mockFastify.get).toHaveBeenCalledWith('/pages/about', expect.any(Function));
    });

    it('should resolve controller from container', () => {
      @SsrController()
      class PageController {
        @Get('/')
        home() {
          return {};
        }
      }

      router.registerController(PageController, true);

      expect(mockContainer.resolve).toHaveBeenCalledWith(PageController);
    });
  });

  describe('route handlers', () => {
    it('should call SSR service render with context from handler', async () => {
      @SsrController()
      class PageController {
        @Get('/')
        home() {
          return { title: 'Home', data: 'test' };
        }
      }

      router.registerController(PageController, true);

      // Get the registered handler
      const handlerCall = mockFastify.get.mock.calls[0];
      const handler = handlerCall[1];

      // Create mock request/reply
      const mockRequest = { url: '/', headers: {} };
      const mockReply = {
        type: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };

      // Call the handler
      await handler(mockRequest, mockReply);

      // Verify SSR render was called with context data
      expect(mockSsrService.render).toHaveBeenCalledWith(
        '/',
        expect.objectContaining({
          url: '/',
          // Data from handler return value
          title: 'Home',
          data: 'test',
          // SSR data for hydration
          __SSR_DATA__: { title: 'Home', data: 'test' },
        })
      );

      // Verify response
      expect(mockReply.type).toHaveBeenCalledWith('text/html');
      expect(mockReply.send).toHaveBeenCalledWith('<html><body>Rendered</body></html>');
    });

    it('should include SSR route metadata in context', async () => {
      @SsrController()
      class PageController {
        @Get('/')
        @Ssr({ title: 'Home Page', description: 'Welcome' })
        home() {
          return { data: 'test' };
        }
      }

      router.registerController(PageController, true);

      const handler = mockFastify.get.mock.calls[0][1];
      const mockRequest = { url: '/', headers: {} };
      const mockReply = {
        type: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(mockRequest, mockReply);

      expect(mockSsrService.render).toHaveBeenCalledWith(
        '/',
        expect.objectContaining({
          title: 'Home Page',
          description: 'Welcome',
        })
      );
    });

    it('should set cache headers when configured', async () => {
      @SsrController()
      class PageController {
        @Get('/')
        @Ssr({ cache: { maxAge: 60, staleWhileRevalidate: 120 } })
        home() {
          return {};
        }
      }

      router.registerController(PageController, true);

      const handler = mockFastify.get.mock.calls[0][1];
      const mockRequest = { url: '/', headers: {} };
      const mockReply = {
        type: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Cache-Control',
        'max-age=60, stale-while-revalidate=120'
      );
    });

    it('should handle async controller methods', async () => {
      @SsrController()
      class PageController {
        @Get('/')
        async home() {
          // Simulate async data fetching
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { async: true };
        }
      }

      router.registerController(PageController, true);

      const handler = mockFastify.get.mock.calls[0][1];
      const mockRequest = { url: '/', headers: {} };
      const mockReply = {
        type: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(mockRequest, mockReply);

      expect(mockSsrService.render).toHaveBeenCalledWith(
        '/',
        expect.objectContaining({
          async: true,
        })
      );
    });

    it('should handle errors gracefully', async () => {
      @SsrController()
      class PageController {
        @Get('/')
        home() {
          throw new Error('Test error');
        }
      }

      router.registerController(PageController, true);

      const handler = mockFastify.get.mock.calls[0][1];
      const mockRequest = { url: '/', headers: {} };
      const mockReply = {
        type: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(mockRequest, mockReply);

      expect(mockFastify.log.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(expect.stringContaining('500 - Server Error'));
    });
  });

  describe('path building', () => {
    it('should handle empty prefix', () => {
      @SsrController()
      class PageController {
        @Get('/home')
        home() {
          return {};
        }
      }

      router.registerController(PageController, true);

      expect(mockFastify.get).toHaveBeenCalledWith('/home', expect.any(Function));
    });

    it('should handle trailing slashes in prefix', () => {
      @SsrController('/app/')
      class PageController {
        @Get('/home')
        home() {
          return {};
        }
      }

      router.registerController(PageController, true);

      expect(mockFastify.get).toHaveBeenCalledWith('/app/home', expect.any(Function));
    });

    it('should handle root path in route', () => {
      @SsrController('/pages')
      class PageController {
        @Get('/')
        home() {
          return {};
        }
      }

      router.registerController(PageController, true);

      expect(mockFastify.get).toHaveBeenCalledWith('/pages/', expect.any(Function));
    });
  });

  describe('client-side navigation data fetch', () => {
    it('should return JSON when X-Rikta-Data header is present', async () => {
      @SsrController()
      class PageController {
        @Get('/')
        @Ssr({ title: 'Home Page', description: 'Welcome to home' })
        home() {
          return { page: 'home', features: ['a', 'b'] };
        }
      }

      router.registerController(PageController, true);

      const handler = mockFastify.get.mock.calls[0][1];
      const mockRequest = {
        url: '/',
        headers: { 'x-rikta-data': '1' },
      };
      const mockReply = {
        type: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(mockRequest, mockReply);

      // Should NOT call SSR render
      expect(mockSsrService.render).not.toHaveBeenCalled();

      // Should return JSON with normalized structure
      expect(mockReply.type).toHaveBeenCalledWith('application/json');
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { page: 'home', features: ['a', 'b'] },
          url: '/',
          title: 'Home Page',
          description: 'Welcome to home',
        })
      );
    });

    it('should return JSON without metadata when @Ssr decorator has no options', async () => {
      @SsrController()
      class PageController {
        @Get('/')
        home() {
          return { page: 'home' };
        }
      }

      router.registerController(PageController, true);

      const handler = mockFastify.get.mock.calls[0][1];
      const mockRequest = {
        url: '/test?q=search',
        headers: { 'x-rikta-data': '1' },
      };
      const mockReply = {
        type: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(mockRequest, mockReply);

      expect(mockReply.type).toHaveBeenCalledWith('application/json');
      expect(mockReply.send).toHaveBeenCalledWith({
        data: { page: 'home' },
        url: '/test?q=search',
      });
    });
  });});