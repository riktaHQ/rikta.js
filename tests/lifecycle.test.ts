import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Rikta } from '../src/core/application';
import { Container } from '../src/core/container';
import { Registry } from '../src/core/registry';
import { Injectable } from '../src/core/decorators/injectable.decorator';
import { On } from '../src/core/lifecycle/on.decorator';
import { EventBus } from '../src/core/lifecycle/event-bus';
import { 
  OnProviderInit, 
  OnProviderDestroy, 
  OnApplicationBootstrap,
  OnApplicationListen,
  OnApplicationShutdown 
} from '../src/core/lifecycle/interfaces';

describe('Lifecycle', () => {
  beforeEach(() => {
    Container.reset();
    Registry.reset();
  });

  describe('Interface Hooks', () => {
    it('should call onProviderInit in priority order', async () => {
      const order: string[] = [];

      @Injectable({ priority: 100 })
      class HighPriorityService implements OnProviderInit {
        onProviderInit() {
          order.push('high');
        }
      }

      @Injectable({ priority: 50 })
      class MediumPriorityService implements OnProviderInit {
        onProviderInit() {
          order.push('medium');
        }
      }

      @Injectable({ priority: 0 })
      class LowPriorityService implements OnProviderInit {
        onProviderInit() {
          order.push('low');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      // Higher priority should be initialized first
      expect(order).toEqual(['high', 'medium', 'low']);

      await app.close();
    });

    it('should call onApplicationBootstrap after all providers initialized', async () => {
      const events: string[] = [];

      @Injectable()
      class BootstrapService implements OnProviderInit, OnApplicationBootstrap {
        onProviderInit() {
          events.push('init');
        }
        
        onApplicationBootstrap() {
          events.push('bootstrap');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      expect(events).toEqual(['init', 'bootstrap']);

      await app.close();
    });

    it('should call onApplicationListen after server starts', async () => {
      let listenAddress = '';

      @Injectable()
      class ListenService implements OnApplicationListen {
        onApplicationListen(address: string) {
          listenAddress = address;
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      expect(listenAddress).toBe('');
      
      await app.listen();
      
      expect(listenAddress).toContain('http://');

      await app.close();
    });

    it('should call onProviderDestroy in reverse priority order', async () => {
      const order: string[] = [];

      @Injectable({ priority: 100 })
      class FirstInitService implements OnProviderDestroy {
        onProviderDestroy() {
          order.push('first-init');
        }
      }

      @Injectable({ priority: 0 })
      class LastInitService implements OnProviderDestroy {
        onProviderDestroy() {
          order.push('last-init');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      await app.close();

      // Reverse order: last initialized = first destroyed
      expect(order).toEqual(['last-init', 'first-init']);
    });

    it('should call onApplicationShutdown on close', async () => {
      let shutdownSignal: string | undefined;

      @Injectable()
      class ShutdownService implements OnApplicationShutdown {
        onApplicationShutdown(signal?: string) {
          shutdownSignal = signal;
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      await app.close('SIGTERM');

      expect(shutdownSignal).toBe('SIGTERM');
    });
  });

  describe('@On() Decorator', () => {
    it('should call @On() decorated methods for lifecycle events', async () => {
      const events: string[] = [];

      @Injectable()
      class EventListenerService {
        @On('app:bootstrap')
        onBootstrap() {
          events.push('bootstrap');
        }

        @On('app:routes')
        onRoutes() {
          events.push('routes');
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      expect(events).toContain('bootstrap');
      expect(events).toContain('routes');

      await app.close();
    });

    it('should call @On() for app:listen event', async () => {
      let listenCalled = false;

      @Injectable()
      class ListenerService2 {
        @On('app:listen')
        onListen({ address }: { address: string }) {
          listenCalled = true;
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      expect(listenCalled).toBe(false);
      
      await app.listen();
      
      expect(listenCalled).toBe(true);

      await app.close();
    });

    it('should call @On() for app:shutdown event', async () => {
      let shutdownCalled = false;

      @Injectable()
      class ShutdownListener {
        @On('app:shutdown')
        onShutdown() {
          shutdownCalled = true;
        }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      expect(shutdownCalled).toBe(false);
      
      await app.close();
      
      expect(shutdownCalled).toBe(true);
    });
  });

  describe('EventBus', () => {
    it('should support once() for one-time listeners', async () => {
      const eventBus = new EventBus();
      let callCount = 0;

      eventBus.once('app:bootstrap', () => {
        callCount++;
      });

      await eventBus.emit('app:bootstrap', { providerCount: 1 });
      await eventBus.emit('app:bootstrap', { providerCount: 2 });

      expect(callCount).toBe(1);
    });

    it('should support waitFor() promise', async () => {
      const eventBus = new EventBus();

      const promise = eventBus.waitFor('app:listen');

      setTimeout(() => {
        eventBus.emit('app:listen', { address: 'http://localhost:3000', port: 3000 });
      }, 10);

      const result = await promise;

      expect(result.address).toBe('http://localhost:3000');
      expect(result.port).toBe(3000);
    });

    it('should return unsubscribe function from on()', async () => {
      const eventBus = new EventBus();
      let callCount = 0;

      const unsubscribe = eventBus.on('app:bootstrap', () => {
        callCount++;
      });

      await eventBus.emit('app:bootstrap', { providerCount: 1 });
      expect(callCount).toBe(1);

      unsubscribe();

      await eventBus.emit('app:bootstrap', { providerCount: 2 });
      expect(callCount).toBe(1); // Should not have increased
    });

    it('should clear all listeners', async () => {
      const eventBus = new EventBus();
      let callCount = 0;

      eventBus.on('app:bootstrap', () => callCount++);
      eventBus.on('app:listen', () => callCount++);

      eventBus.clear();

      await eventBus.emit('app:bootstrap', { providerCount: 1 });
      await eventBus.emit('app:listen', { address: '', port: 0 });

      expect(callCount).toBe(0);
    });

    it('should return listener count', () => {
      const eventBus = new EventBus();

      expect(eventBus.listenerCount('app:bootstrap')).toBe(0);

      eventBus.on('app:bootstrap', () => {});
      eventBus.on('app:bootstrap', () => {});
      eventBus.once('app:bootstrap', () => {});

      expect(eventBus.listenerCount('app:bootstrap')).toBe(3);
    });
  });

  describe('Priority System', () => {
    it('should respect priority in @Injectable decorator', async () => {
      const initOrder: number[] = [];

      // Note: each test must use unique class names to avoid registry conflicts
      @Injectable({ priority: 10 })
      class PriorityA10 implements OnProviderInit {
        onProviderInit() { initOrder.push(10); }
      }

      @Injectable({ priority: 50 })
      class PriorityA50 implements OnProviderInit {
        onProviderInit() { initOrder.push(50); }
      }

      @Injectable({ priority: 30 })
      class PriorityA30 implements OnProviderInit {
        onProviderInit() { initOrder.push(30); }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      // Should be sorted by priority descending
      expect(initOrder).toEqual([50, 30, 10]);

      await app.close();
    });

    it('should use 0 as default priority', async () => {
      const initOrder: number[] = [];

      @Injectable({ priority: 10 })
      class PriorityB10 implements OnProviderInit {
        onProviderInit() { initOrder.push(10); }
      }

      @Injectable() // default priority: 0
      class PriorityB0 implements OnProviderInit {
        onProviderInit() { initOrder.push(0); }
      }

      const app = await Rikta.create({
        port: 0,
        logger: false,
        controllers: [],
      });

      expect(initOrder).toEqual([10, 0]);

      await app.close();
    });
  });
});

