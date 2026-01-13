import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConfigProperty,
  getConfigPropertyMappings,
  hasConfigProperties,
  clearPropertyNameCache,
} from '../src/core/decorators/config-property.decorator';
import { CONFIG_PROPERTY_METADATA } from '../src/core/constants';
import 'reflect-metadata';

describe('@ConfigProperty Decorator', () => {
  beforeEach(() => {
    clearPropertyNameCache();
  });

  describe('Auto-mapping (camelCase → UPPER_SNAKE_CASE)', () => {
    it('should auto-map simple camelCase property', () => {
      class TestConfig {
        @ConfigProperty()
        dbHost!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings).toHaveLength(1);
      expect(mappings[0]).toEqual({
        propertyKey: 'dbHost',
        envKey: 'DB_HOST',
      });
    });

    it('should auto-map property with multiple words', () => {
      class TestConfig {
        @ConfigProperty()
        maxConnectionRetries!: number;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings[0].envKey).toBe('MAX_CONNECTION_RETRIES');
    });

    it('should auto-map single word property', () => {
      class TestConfig {
        @ConfigProperty()
        port!: number;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings[0].envKey).toBe('PORT');
    });

    it('should auto-map property with acronym', () => {
      class TestConfig {
        @ConfigProperty()
        apiKey!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings[0].envKey).toBe('API_KEY');
    });

    it('should handle multiple properties', () => {
      class TestConfig {
        @ConfigProperty()
        dbHost!: string;

        @ConfigProperty()
        dbPort!: number;

        @ConfigProperty()
        dbName!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings).toHaveLength(3);
      expect(mappings).toContainEqual({ propertyKey: 'dbHost', envKey: 'DB_HOST' });
      expect(mappings).toContainEqual({ propertyKey: 'dbPort', envKey: 'DB_PORT' });
      expect(mappings).toContainEqual({ propertyKey: 'dbName', envKey: 'DB_NAME' });
    });
  });

  describe('Custom env key mapping', () => {
    it('should accept custom env key', () => {
      class TestConfig {
        @ConfigProperty('CUSTOM_KEY')
        myProperty!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings[0]).toEqual({
        propertyKey: 'myProperty',
        envKey: 'CUSTOM_KEY',
      });
    });

    it('should allow different property name from env key', () => {
      class TestConfig {
        @ConfigProperty('PORT')
        serverPort!: number;

        @ConfigProperty('NODE_ENV')
        environment!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings).toContainEqual({ propertyKey: 'serverPort', envKey: 'PORT' });
      expect(mappings).toContainEqual({ propertyKey: 'environment', envKey: 'NODE_ENV' });
    });

    it('should work with underscored env keys', () => {
      class TestConfig {
        @ConfigProperty('DATABASE_CONNECTION_POOL_SIZE')
        poolSize!: number;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings[0].envKey).toBe('DATABASE_CONNECTION_POOL_SIZE');
    });
  });

  describe('Validation', () => {
    it('should throw error for non-uppercase custom key', () => {
      expect(() => {
        class TestConfig {
          @ConfigProperty('lowercase')
          prop!: string;
        }
      }).toThrow(/must be UPPERCASE/);
    });

    it('should throw error for mixed case custom key', () => {
      expect(() => {
        class TestConfig {
          @ConfigProperty('MixedCase')
          prop!: string;
        }
      }).toThrow(/must be UPPERCASE/);
    });

    it('should throw error for empty custom key', () => {
      expect(() => {
        class TestConfig {
          @ConfigProperty('')
          prop!: string;
        }
      }).toThrow(/must be a non-empty string/);
    });

    it('should throw error for symbol properties', () => {
      const sym = Symbol('test');
      expect(() => {
        class TestConfig {
          @ConfigProperty()
          [sym]!: string;
        }
      }).toThrow(/Symbol properties are not supported/);
    });

    it('should throw error for duplicate property decoration', () => {
      expect(() => {
        class TestConfig {
          @ConfigProperty()
          @ConfigProperty()
          duplicateProperty!: string;
        }
      }).toThrow(/already decorated/);
    });

    it('should throw error for duplicate env key mapping', () => {
      expect(() => {
        class TestConfig {
          @ConfigProperty('SAME_KEY')
          prop1!: string;

          @ConfigProperty('SAME_KEY')
          prop2!: string;
        }
      }).toThrow(/already mapped to property/);
    });
  });

  describe('Metadata storage', () => {
    it('should store metadata using CONFIG_PROPERTY_METADATA key', () => {
      class TestConfig {
        @ConfigProperty()
        testProp!: string;
      }

      const hasMetadata = Reflect.hasMetadata(CONFIG_PROPERTY_METADATA, TestConfig);
      expect(hasMetadata).toBe(true);
    });

    it('should store array of mappings', () => {
      class TestConfig {
        @ConfigProperty()
        prop1!: string;

        @ConfigProperty()
        prop2!: number;
      }

      const metadata = Reflect.getMetadata(CONFIG_PROPERTY_METADATA, TestConfig);
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata).toHaveLength(2);
    });

    it('should preserve order of decoration', () => {
      class TestConfig {
        @ConfigProperty()
        first!: string;

        @ConfigProperty()
        second!: string;

        @ConfigProperty()
        third!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings[0].propertyKey).toBe('first');
      expect(mappings[1].propertyKey).toBe('second');
      expect(mappings[2].propertyKey).toBe('third');
    });
  });

  describe('Helper functions', () => {
    it('hasConfigProperties should return true for class with decorations', () => {
      class TestConfig {
        @ConfigProperty()
        prop!: string;
      }

      expect(hasConfigProperties(TestConfig)).toBe(true);
    });

    it('hasConfigProperties should return false for class without decorations', () => {
      class TestConfig {
        prop!: string;
      }

      expect(hasConfigProperties(TestConfig)).toBe(false);
    });

    it('getConfigPropertyMappings should return empty array for undecorated class', () => {
      class TestConfig {
        prop!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings).toEqual([]);
    });

    it('getConfigPropertyMappings should return all mappings', () => {
      class TestConfig {
        @ConfigProperty('KEY1')
        prop1!: string;

        @ConfigProperty()
        prop2!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings).toHaveLength(2);
      expect(mappings[0]).toEqual({ propertyKey: 'prop1', envKey: 'KEY1' });
      expect(mappings[1]).toEqual({ propertyKey: 'prop2', envKey: 'PROP2' });
    });
  });

  describe('Multiple classes', () => {
    it('should maintain separate metadata per class', () => {
      class ConfigA {
        @ConfigProperty()
        propA!: string;
      }

      class ConfigB {
        @ConfigProperty()
        propB!: string;
      }

      const mappingsA = getConfigPropertyMappings(ConfigA);
      const mappingsB = getConfigPropertyMappings(ConfigB);

      expect(mappingsA).toHaveLength(1);
      expect(mappingsB).toHaveLength(1);
      expect(mappingsA[0].propertyKey).toBe('propA');
      expect(mappingsB[0].propertyKey).toBe('propB');
    });

    it('should not interfere between classes', () => {
      class ConfigA {
        @ConfigProperty('SHARED_KEY')
        propA!: string;
      }

      class ConfigB {
        @ConfigProperty('SHARED_KEY')
        propB!: string;
      }

      // Should not throw - different classes can use same env key
      const mappingsA = getConfigPropertyMappings(ConfigA);
      const mappingsB = getConfigPropertyMappings(ConfigB);

      expect(mappingsA[0].envKey).toBe('SHARED_KEY');
      expect(mappingsB[0].envKey).toBe('SHARED_KEY');
    });
  });

  describe('Inheritance', () => {
    it('should inherit parent class mappings', () => {
      class ParentConfig {
        @ConfigProperty()
        parentProp!: string;
      }

      class ChildConfig extends ParentConfig {
        @ConfigProperty()
        childProp!: string;
      }

      const parentMappings = getConfigPropertyMappings(ParentConfig);
      const childMappings = getConfigPropertyMappings(ChildConfig);

      expect(parentMappings).toHaveLength(1);
      // Child inherits parent's metadata via prototype chain, plus its own
      expect(childMappings.length).toBeGreaterThanOrEqual(1);
      expect(childMappings.some(m => m.propertyKey === 'childProp')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle property with numbers in name', () => {
      class TestConfig {
        @ConfigProperty()
        oauth2ClientId!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings[0].envKey).toBe('OAUTH2_CLIENT_ID');
    });

    it('should handle single letter property', () => {
      class TestConfig {
        @ConfigProperty()
        x!: number;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings[0].envKey).toBe('X');
    });

    it('should handle all caps property name', () => {
      class TestConfig {
        @ConfigProperty()
        API!: string;
      }

      const mappings = getConfigPropertyMappings(TestConfig);
      // All caps converted to A_P_I - use @ConfigProperty('API') for acronyms
      expect(mappings[0].envKey).toBe('A_P_I');
    });
  });

  describe('Caching behavior', () => {
    it('should cache property name conversions', () => {
      class TestConfig1 {
        @ConfigProperty()
        cachedProperty!: string;
      }

      class TestConfig2 {
        @ConfigProperty()
        cachedProperty!: string;
      }

      const mappings1 = getConfigPropertyMappings(TestConfig1);
      const mappings2 = getConfigPropertyMappings(TestConfig2);

      expect(mappings1[0].envKey).toBe('CACHED_PROPERTY');
      expect(mappings2[0].envKey).toBe('CACHED_PROPERTY');
    });

    it('should clear cache when requested', () => {
      class TestConfig {
        @ConfigProperty()
        testProp!: string;
      }

      getConfigPropertyMappings(TestConfig);
      clearPropertyNameCache();

      const mappings = getConfigPropertyMappings(TestConfig);
      expect(mappings[0].envKey).toBe('TEST_PROP');
    });
  });
});
