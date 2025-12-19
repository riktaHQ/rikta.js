import { describe, it, expect } from 'vitest';
import { Registry, registry } from '../src/core/registry';

describe('Registry', () => {
  // Note: We can't fully reset the registry because decorators run at class definition time
  // So we test the API behavior rather than exact counts

  describe('Controller Registration', () => {
    it('should register a controller', () => {
      class UniqueController1 {}
      registry.registerController(UniqueController1);

      expect(registry.hasController(UniqueController1)).toBe(true);
    });

    it('should not have unregistered controller', () => {
      class UnregisteredController {}
      // Don't register it
      expect(registry.hasController(UnregisteredController)).toBe(false);
    });

    it('should return controllers array', () => {
      const controllers = registry.getControllers();
      expect(Array.isArray(controllers)).toBe(true);
    });

    it('should not duplicate same controller', () => {
      class DuplicateController {}
      const beforeCount = registry.getControllers().length;
      
      registry.registerController(DuplicateController);
      registry.registerController(DuplicateController);
      
      const afterCount = registry.getControllers().length;
      expect(afterCount - beforeCount).toBe(1);
    });
  });

  describe('Provider Registration', () => {
    it('should register a provider', () => {
      class UniqueService1 {}
      registry.registerProvider(UniqueService1);

      expect(registry.hasProvider(UniqueService1)).toBe(true);
    });

    it('should not have unregistered provider', () => {
      class UnregisteredService {}
      expect(registry.hasProvider(UnregisteredService)).toBe(false);
    });

    it('should return providers array', () => {
      const providers = registry.getProviders();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should not duplicate same provider', () => {
      class DuplicateService {}
      const beforeCount = registry.getProviders().length;
      
      registry.registerProvider(DuplicateService);
      registry.registerProvider(DuplicateService);
      
      const afterCount = registry.getProviders().length;
      expect(afterCount - beforeCount).toBe(1);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = Registry.getInstance();
      const instance2 = Registry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
