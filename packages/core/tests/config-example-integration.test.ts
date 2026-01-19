import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppConfigProvider, APP_CONFIG } from '../../examples/example/src/config/app-config.provider';
import { DatabaseConfigProvider, DATABASE_CONFIG } from '../../examples/example/src/config/database-config.provider';
import { resetEnvLoaded } from '../src/core/config/env-loader';
import 'reflect-metadata';

describe('Example Config Providers - Integration', () => {
  const testEnvPath = resolve(process.cwd(), '.env');
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean up test files
    if (existsSync(testEnvPath)) {
      unlinkSync(testEnvPath);
    }
    
    // Clean specific env vars that tests will use
    delete process.env.NODE_ENV;
    delete process.env.APP_NAME;
    delete process.env.PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_SSL;
    
    resetEnvLoaded();
  });

  afterEach(() => {
    // Restore env
    process.env = { ...originalEnv };
    
    // Clean up
    if (existsSync(testEnvPath)) {
      unlinkSync(testEnvPath);
    }
    
    resetEnvLoaded();
  });

  describe('AppConfigProvider', () => {
    it('should load with default values', () => {
      const config = new AppConfigProvider();

      expect(config.name).toBe('Rikta Example App');
      expect(config.version).toBe('1.0.0');
      expect(config.environment).toBe('development');
      expect(config.port).toBe(3000);
      expect(config.host).toBe('localhost');
    });

    it('should load from environment variables', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_NAME = 'Custom App';
      process.env.PORT = '8080';
      
      resetEnvLoaded();

      const config = new AppConfigProvider();

      expect(config.name).toBe('Custom App');
      expect(config.environment).toBe('production');
      expect(config.port).toBe(8080);
    });

    it('should provide helper methods', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8080';
      process.env.HOST = 'example.com';
      
      resetEnvLoaded();

      const config = new AppConfigProvider();

      expect(config.isProduction()).toBe(true);
      expect(config.isDevelopment()).toBe(false);
      expect(config.isTest()).toBe(false);
      expect(config.getServerAddress()).toBe('http://example.com:8080');
    });

    it('should generate database URL', () => {
      process.env.DB_HOST = 'db.example.com';
      process.env.DB_PORT = '5433';
      process.env.DB_NAME = 'mydb';
      process.env.DB_USER = 'admin';
      process.env.DB_PASSWORD = 'secret';
      
      resetEnvLoaded();

      const config = new AppConfigProvider();

      expect(config.getDatabaseUrl()).toBe('postgresql://admin:secret@db.example.com:5433/mydb');
    });

    it('should handle missing optional database credentials', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'testdb';
      
      resetEnvLoaded();

      const config = new AppConfigProvider();

      expect(config.getDatabaseUrl()).toBe('postgresql://localhost:5432/testdb');
    });

    it('should validate port number range', () => {
      process.env.PORT = '70000'; // Invalid port
      
      resetEnvLoaded();

      expect(() => new AppConfigProvider()).toThrow();
    });

    it('should validate environment enum', () => {
      process.env.NODE_ENV = 'invalid-env' as any;
      
      resetEnvLoaded();

      expect(() => new AppConfigProvider()).toThrow();
    });

    it('should load from .env file', () => {
      writeFileSync(testEnvPath, 
        'APP_NAME=File App\n' +
        'PORT=9000\n' +
        'DB_NAME=file_db\n'
      );

      resetEnvLoaded();

      const config = new AppConfigProvider();

      expect(config.name).toBe('File App');
      expect(config.port).toBe(9000);
    });
  });

  describe('DatabaseConfigProvider', () => {
    it('should load with default values', () => {
      const config = new DatabaseConfigProvider();

      expect(config.dbHost).toBe('localhost');
      expect(config.dbPort).toBe(5432);
      expect(config.dbName).toBe('rikta_example');
      expect(config.dbUser).toBe('postgres');
      expect(config.dbPassword).toBe('postgres');
      expect(config.dbPoolMin).toBe(2);
      expect(config.dbPoolMax).toBe(10);
      expect(config.dbSsl).toBe(false);
    });

    it('should load from environment variables', () => {
      process.env.DB_HOST = 'db.example.com';
      process.env.DB_PORT = '5433';
      process.env.DB_NAME = 'production_db';
      process.env.DB_USER = 'admin';
      process.env.DB_PASSWORD = 'secret123';
      process.env.DB_POOL_MIN = '5';
      process.env.DB_POOL_MAX = '20';
      process.env.DB_SSL = 'true';
      
      resetEnvLoaded();

      const config = new DatabaseConfigProvider();

      expect(config.dbHost).toBe('db.example.com');
      expect(config.dbPort).toBe(5433);
      expect(config.dbName).toBe('production_db');
      expect(config.dbUser).toBe('admin');
      expect(config.dbPassword).toBe('secret123');
      expect(config.dbPoolMin).toBe(5);
      expect(config.dbPoolMax).toBe(20);
      expect(config.dbSsl).toBe(true);
    });

    it('should generate connection string without SSL', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'testdb';
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpass';
      process.env.DB_SSL = '0'; // Explicit false
      
      resetEnvLoaded();

      const config = new DatabaseConfigProvider();

      expect(config.getConnectionString()).toBe('postgresql://testuser:testpass@localhost:5432/testdb');
    });

    it('should generate connection string with SSL', () => {
      process.env.DB_HOST = 'secure.db.com';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'securedb';
      process.env.DB_USER = 'admin';
      process.env.DB_PASSWORD = 'secret';
      process.env.DB_SSL = 'true';
      
      resetEnvLoaded();

      const config = new DatabaseConfigProvider();

      expect(config.getConnectionString()).toBe('postgresql://admin:secret@secure.db.com:5432/securedb?sslmode=require');
    });

    it('should return pool configuration', () => {
      process.env.DB_NAME = 'testdb';
      process.env.DB_POOL_MIN = '3';
      process.env.DB_POOL_MAX = '15';
      
      resetEnvLoaded();

      const config = new DatabaseConfigProvider();
      const poolConfig = config.getPoolConfig();

      expect(poolConfig).toEqual({
        min: 3,
        max: 15,
      });
    });

    it('should validate port range', () => {
      process.env.DB_PORT = '99999'; // Invalid
      process.env.DB_NAME = 'testdb';
      
      resetEnvLoaded();

      expect(() => new DatabaseConfigProvider()).toThrow();
    });

    it('should validate pool configuration', () => {
      process.env.DB_NAME = 'testdb';
      process.env.DB_POOL_MIN = '-1'; // Invalid
      
      resetEnvLoaded();

      expect(() => new DatabaseConfigProvider()).toThrow();
    });
  });

  describe('Multiple Config Providers', () => {
    it('should work with multiple providers simultaneously', () => {
      process.env.APP_NAME = 'Multi App';
      process.env.PORT = '4000';
      process.env.DB_NAME = 'multi_db';
      process.env.DB_PORT = '5433';
      
      resetEnvLoaded();

      const appConfig = new AppConfigProvider();
      const dbConfig = new DatabaseConfigProvider();

      expect(appConfig.name).toBe('Multi App');
      expect(appConfig.port).toBe(4000);
      expect(dbConfig.dbName).toBe('multi_db');
      expect(dbConfig.dbPort).toBe(5433);
    });

    it('should share .env loading but have separate caches', () => {
      writeFileSync(testEnvPath,
        'APP_NAME=Shared App\n' +
        'DB_NAME=shared_db\n'
      );

      resetEnvLoaded();

      const appConfig = new AppConfigProvider();
      const dbConfig = new DatabaseConfigProvider();

      expect(appConfig.name).toBe('Shared App');
      expect(dbConfig.dbName).toBe('shared_db');
    });
  });

  describe('Token constants', () => {
    it('should export correct token constants', () => {
      expect(APP_CONFIG).toBe('APP_CONFIG');
      expect(DATABASE_CONFIG).toBe('DATABASE_CONFIG');
    });
  });
});
