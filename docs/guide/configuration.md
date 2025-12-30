# ⚙️ Configuration

Type-safe, zero-config environment management with automatic `.env` loading and Zod validation.

## Overview

Rikta's configuration system provides:

- **Type-safe configuration** with TypeScript and Zod
- **Automatic `.env` file loading** with environment-specific overrides
- **Decorator-based property mapping** with auto-generated env var names
- **Validation and coercion** using Zod schemas
- **Multiple config providers** for separation of concerns
- **Zero-config approach** - just add decorators and go

## Quick Start

### 1. Create a Config Provider

```typescript
import { AbstractConfigProvider, Provider, ConfigProperty } from '@riktajs/core';
import { z } from 'zod';

@Provider('APP_CONFIG')
export class AppConfigProvider extends AbstractConfigProvider {
  // Define validation schema
  schema() {
    return z.object({
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      APP_NAME: z.string().default('My App'),
      PORT: z.coerce.number().int().min(1).max(65535).default(3000),
      LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    });
  }

  // Map environment variables to properties
  @ConfigProperty('NODE_ENV')
  environment!: 'development' | 'production' | 'test';

  @ConfigProperty('APP_NAME')
  name!: string;

  @ConfigProperty()  // Auto-maps to PORT
  port!: number;

  @ConfigProperty()  // Auto-maps to LOG_LEVEL
  logLevel!: string;

  constructor() {
    super();
    this.populate();
  }

  // Optional: Add helper methods
  isProduction(): boolean {
    return this.environment === 'production';
  }
}
```

### 2. Create `.env` File

```bash
# .env
NODE_ENV=development
APP_NAME=Rikta App
PORT=4000
LOG_LEVEL=debug
```

### 3. Inject in Your Services

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { APP_CONFIG } from './config/app-config.provider';

@Injectable()
export class UserService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;

  getServerInfo() {
    console.log(this.config.name);        // "Rikta App"
    console.log(this.config.port);        // 4000
    console.log(this.config.isProduction()); // false
  }
}
```

## Core Concepts

### Configuration Providers

A configuration provider is a class that:
1. Extends `AbstractConfigProvider`
2. Is decorated with `@Provider(TOKEN)`
3. Defines a Zod schema for validation
4. Maps env vars to typed properties using `@ConfigProperty`

```typescript
@Provider('DATABASE_CONFIG')
export class DatabaseConfigProvider extends AbstractConfigProvider {
  schema() {
    return z.object({
      DB_HOST: z.string().default('localhost'),
      DB_PORT: z.coerce.number().int().default(5432),
      DB_NAME: z.string().min(1),
      DB_USER: z.string(),
      DB_PASSWORD: z.string(),
    });
  }

  @ConfigProperty() dbHost!: string;
  @ConfigProperty() dbPort!: number;
  @ConfigProperty() dbName!: string;
  @ConfigProperty() dbUser!: string;
  @ConfigProperty() dbPassword!: string;

  constructor() {
    super();
    this.populate();
  }

  getConnectionString(): string {
    return `postgresql://${this.dbUser}:${this.dbPassword}@${this.dbHost}:${this.dbPort}/${this.dbName}`;
  }
}
```

### How Config Providers Work

Config providers are managed by Rikta's DI container:

1. **Decoration Phase:** When you decorate a class with `@Provider(TOKEN)`, it's registered in the global registry
2. **Bootstrap Phase:** During `Rikta.create()`, all config providers are discovered and transferred to the DI container
3. **Resolution Phase:** The container manages instantiation and ensures singleton scope (one instance per token)

**Key Benefits:**
- ✅ **Singleton by default:** Config instances are created once and cached
- ✅ **Lazy initialization:** Configs are only instantiated when needed
- ✅ **Dependency Injection:** Inject configs using `@Autowired(TOKEN)`
- ✅ **Type-safe:** Full TypeScript inference for all properties

**Usage with Dependency Injection:**
```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { APP_CONFIG, AppConfigProvider } from './config/app-config.provider';

@Injectable()
class UserService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;
  
  getPort() {
    return this.config.port;  // Type-safe, injected config
  }
  
  isDev() {
    return this.config.environment === 'development';
  }
}
```

### Environment Variable Mapping

The `@ConfigProperty` decorator automatically maps property names to environment variables:

```typescript
@ConfigProperty()
apiTimeout!: number;  // Maps to API_TIMEOUT

@ConfigProperty()
dbHost!: string;      // Maps to DB_HOST

@ConfigProperty()
maxRetries!: number;  // Maps to MAX_RETRIES
```

**Conversion Rules:**
- camelCase → UPPER_SNAKE_CASE
- `apiTimeout` → `API_TIMEOUT`
- `dbHost` → `DB_HOST`

**Custom Mapping:**
You can override the auto-mapping:

```typescript
@ConfigProperty('NODE_ENV')
environment!: string;  // Maps to NODE_ENV instead of ENVIRONMENT

@ConfigProperty('API_KEY')
key!: string;  // Maps to API_KEY instead of KEY
```

## Environment Files

### File Priority

Rikta loads `.env` files in this order (later files override earlier ones):

1. `.env` - Base configuration
2. `.env.${NODE_ENV}` - Environment-specific (e.g., `.env.production`)

**Example:**
```bash
# .env
APP_NAME=My App
PORT=3000
LOG_LEVEL=info

# .env.development
LOG_LEVEL=debug
PORT=4000

# .env.production
LOG_LEVEL=warn
PORT=80
```

When `NODE_ENV=production`:
- `APP_NAME` = "My App" (from `.env`)
- `PORT` = 80 (from `.env.production`)
- `LOG_LEVEL` = "warn" (from `.env.production`)

### Environment Variable Precedence

**Highest to Lowest:**
1. **Process environment** (`process.env`) - Set by system or Docker
2. **`.env.${NODE_ENV}`** - Environment-specific file
3. **`.env`** - Base file
4. **Zod defaults** - Schema defaults

This means system environment variables always win, allowing easy Docker/Kubernetes overrides.

## Schema Validation

### Basic Types

```typescript
schema() {
  return z.object({
    // Strings
    APP_NAME: z.string(),
    APP_NAME_REQUIRED: z.string().min(1),
    APP_NAME_WITH_DEFAULT: z.string().default('My App'),

    // Numbers (with coercion from strings)
    PORT: z.coerce.number().int().min(1).max(65535),
    TIMEOUT: z.coerce.number().default(30000),

    // Booleans
    ENABLE_CACHE: z.coerce.boolean().default(false),

    // Enums
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Optional values
    API_KEY: z.string().optional(),
    SECRET: z.string().optional(),
  });
}
```

### Type Coercion

Environment variables are always strings. Use `z.coerce` to convert them:

```typescript
// Numbers
PORT: z.coerce.number().int()  // "3000" → 3000

// Booleans - IMPORTANT
DB_SSL: z.union([z.string(), z.boolean()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val === 'true' || val === '1';
  })
  .default(false)
// "true" or "1" → true
// "false" or "0" → false
```

**Note:** `z.coerce.boolean()` converts any non-empty string to `true`. Use the custom transform above for proper boolean handling.

### Advanced Validation

```typescript
schema() {
  return z.object({
    // URL validation
    DATABASE_URL: z.string().url(),
    API_ENDPOINT: z.string().url().startsWith('https://'),

    // Email validation
    ADMIN_EMAIL: z.string().email(),

    // Regex validation
    API_KEY: z.string().regex(/^[A-Z0-9]{32}$/),

    // Range validation
    POOL_SIZE: z.coerce.number().int().min(1).max(100),
    TIMEOUT: z.coerce.number().int().min(1000).max(60000),

    // Custom validation
    API_VERSION: z.string().refine(
      (val) => /^v\d+$/.test(val),
      { message: 'API version must be in format v1, v2, etc.' }
    ),

    // Dependent validation
    DB_SSL: z.boolean().default(false),
    DB_SSL_CERT: z.string().optional(),
  }).refine(
    (data) => !data.DB_SSL || data.DB_SSL_CERT,
    { message: 'DB_SSL_CERT required when DB_SSL is true' }
  );
}
```

## Multiple Config Providers

Organize configuration by domain for better separation of concerns:

```typescript
// app.config.ts
@Provider('APP_CONFIG')
export class AppConfigProvider extends AbstractConfigProvider {
  schema() {
    return z.object({
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      APP_NAME: z.string().default('My App'),
      PORT: z.coerce.number().int().default(3000),
    });
  }

  @ConfigProperty('NODE_ENV') environment!: string;
  @ConfigProperty('APP_NAME') name!: string;
  @ConfigProperty() port!: number;

  constructor() {
    super();
    this.populate();
  }
}

// database.config.ts
@Provider('DATABASE_CONFIG')
export class DatabaseConfigProvider extends AbstractConfigProvider {
  schema() {
    return z.object({
      DB_HOST: z.string().default('localhost'),
      DB_PORT: z.coerce.number().int().default(5432),
      DB_NAME: z.string().min(1),
      DB_USER: z.string(),
      DB_PASSWORD: z.string(),
    });
  }

  @ConfigProperty() dbHost!: string;
  @ConfigProperty() dbPort!: number;
  @ConfigProperty() dbName!: string;
  @ConfigProperty() dbUser!: string;
  @ConfigProperty() dbPassword!: string;

  constructor() {
    super();
    this.populate();
  }
}

// redis.config.ts
@Provider('REDIS_CONFIG')
export class RedisConfigProvider extends AbstractConfigProvider {
  schema() {
    return z.object({
      REDIS_HOST: z.string().default('localhost'),
      REDIS_PORT: z.coerce.number().int().default(6379),
      REDIS_PASSWORD: z.string().optional(),
    });
  }

  @ConfigProperty() redisHost!: string;
  @ConfigProperty() redisPort!: number;
  @ConfigProperty() redisPassword?: string;

  constructor() {
    super();
    this.populate();
  }
}
```

**Benefits:**
- Clear separation of concerns
- Easier testing (mock only what you need)
- Better code organization
- Type-safe access to related settings

**Shared `.env` file:**
All providers share the same `.env` files but validate only their own variables:

```bash
# .env
# App Config
NODE_ENV=production
APP_NAME=My App
PORT=3000

# Database Config
DB_HOST=db.example.com
DB_PORT=5432
DB_NAME=myapp
DB_USER=admin
DB_PASSWORD=secret

# Redis Config
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=redis_secret
```

## Helper Methods

Add domain-specific helper methods to config providers:

```typescript
@Provider('APP_CONFIG')
export class AppConfigProvider extends AbstractConfigProvider {
  schema() {
    return z.object({
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      DB_HOST: z.string().default('localhost'),
      DB_PORT: z.coerce.number().int().default(5432),
      DB_NAME: z.string().min(1),
      DB_USER: z.string().optional(),
      DB_PASSWORD: z.string().optional(),
    });
  }

  @ConfigProperty('NODE_ENV') environment!: string;
  @ConfigProperty() dbHost!: string;
  @ConfigProperty() dbPort!: number;
  @ConfigProperty() dbName!: string;
  @ConfigProperty() dbUser?: string;
  @ConfigProperty() dbPassword?: string;

  constructor() {
    super();
    this.populate();
  }

  // Environment checks
  isProduction(): boolean {
    return this.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  isTest(): boolean {
    return this.environment === 'test';
  }

  // Build connection strings
  getDatabaseUrl(): string | null {
    if (!this.dbUser || !this.dbPassword) {
      return null;
    }
    return `postgresql://${this.dbUser}:${this.dbPassword}@${this.dbHost}:${this.dbPort}/${this.dbName}`;
  }
}

// Usage with Dependency Injection
@Injectable()
export class DatabaseService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;

  async initialize() {
    if (this.config.isProduction()) {
      console.log('Running in production mode');
    }

    const dbUrl = this.config.getDatabaseUrl();
    if (dbUrl) {
      await connectToDatabase(dbUrl);
    }
  }
}
```

## Testing

### Reset Between Tests

Use `resetEnvLoaded()` to reset the `.env` loading state:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AbstractConfigProvider } from '@riktajs/core';
import { AppConfigProvider } from './app.config';

describe('AppConfigProvider', () => {
  beforeEach(() => {
    // Clean env vars
    delete process.env.APP_NAME;
    delete process.env.PORT;
    
    // Reset .env loaded flag
    AbstractConfigProvider.resetEnvLoaded();
  });

  it('should load with defaults', () => {
    const config = new AppConfigProvider();
    expect(config.name).toBe('My App');
    expect(config.port).toBe(3000);
  });

  it('should load from env vars', () => {
    process.env.APP_NAME = 'Test App';
    process.env.PORT = '4000';
    
    AbstractConfigProvider.resetEnvLoaded();
    
    const config = new AppConfigProvider();
    expect(config.name).toBe('Test App');
    expect(config.port).toBe(4000);
  });
});
```

### Testing with Mock .env Files

```typescript
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('AppConfigProvider with .env', () => {
  const testEnvPath = resolve(process.cwd(), '.env');

  beforeEach(() => {
    if (existsSync(testEnvPath)) {
      unlinkSync(testEnvPath);
    }
    AbstractConfigProvider.resetEnvLoaded();
  });

  afterEach(() => {
    if (existsSync(testEnvPath)) {
      unlinkSync(testEnvPath);
    }
  });

  it('should load from .env file', () => {
    writeFileSync(testEnvPath, 
      'APP_NAME=File App\n' +
      'PORT=5000\n'
    );

    AbstractConfigProvider.resetEnvLoaded();

    const config = new AppConfigProvider();
    expect(config.name).toBe('File App');
    expect(config.port).toBe(5000);
  });
});
```

## Best Practices

### ✅ Do's

**1. Use descriptive property names**
```typescript
// Good
@ConfigProperty() maxConnectionPoolSize!: number;
@ConfigProperty() requestTimeoutMs!: number;

// Avoid
@ConfigProperty() max!: number;
@ConfigProperty() timeout!: number;
```

**2. Provide sensible defaults**
```typescript
schema() {
  return z.object({
    PORT: z.coerce.number().int().default(3000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    ENABLE_CACHE: z.coerce.boolean().default(true),
  });
}
```

**3. Validate constraints**
```typescript
schema() {
  return z.object({
    PORT: z.coerce.number().int().min(1).max(65535),
    POOL_SIZE: z.coerce.number().int().min(1).max(100),
    TIMEOUT: z.coerce.number().int().min(1000),
  });
}
```

**4. Use type inference**
```typescript
schema() {
  return z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  });
}

@ConfigProperty('NODE_ENV')
environment!: 'development' | 'production' | 'test';  // ✅ Type-safe
```

**5. Group related settings**
```typescript
// Good - Separate providers
class AppConfigProvider { ... }
class DatabaseConfigProvider { ... }
class RedisConfigProvider { ... }

// Avoid - One giant config
class ConfigProvider {
  // App settings
  // Database settings
  // Redis settings
  // Email settings
  // ... too much in one place
}
```

**6. Add helper methods**
```typescript
getDatabaseUrl(): string {
  return `postgresql://${this.dbUser}:${this.dbPassword}@${this.dbHost}:${this.dbPort}/${this.dbName}`;
}

isProduction(): boolean {
  return this.environment === 'production';
}
```

### ❌ Don'ts

**1. Don't use `z.coerce.boolean()` for string booleans**
```typescript
// ❌ Wrong - "false" becomes true
DB_SSL: z.coerce.boolean()

// ✅ Correct
DB_SSL: z.union([z.string(), z.boolean()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val === 'true' || val === '1';
  })
  .default(false)
```

**2. Don't forget to call `populate()`**
```typescript
// ❌ Wrong - properties won't be populated
constructor() {
  super();
}

// ✅ Correct
constructor() {
  super();
  this.populate();
}
```

**3. Don't use secrets in defaults**
```typescript
// ❌ Wrong - secrets in code
DB_PASSWORD: z.string().default('admin123')

// ✅ Correct - require secrets
DB_PASSWORD: z.string()  // No default, must be provided
```

**4. Don't skip validation**
```typescript
// ❌ Wrong - accepts any string
PORT: z.string()

// ✅ Correct - validates and coerces
PORT: z.coerce.number().int().min(1).max(65535)
```

**5. Don't mix concerns**
```typescript
// ❌ Wrong - database logic in config
class DatabaseConfigProvider {
  async connect() {
    // database connection logic here
  }
}

// ✅ Correct - config provides data, service handles logic
class DatabaseConfigProvider {
  getConnectionString(): string { ... }
}

class DatabaseService {
  constructor(private config: DatabaseConfigProvider) {}
  
  async connect() {
    const url = this.config.getConnectionString();
    // connection logic here
  }
}
```

## Advanced Topics

### Custom Transformations

Apply custom transformations to environment variables:

```typescript
schema() {
  return z.object({
    // Parse comma-separated list
    ALLOWED_ORIGINS: z.string()
      .transform((val) => val.split(',').map(s => s.trim()))
      .default('http://localhost:3000'),

    // Parse JSON
    FEATURE_FLAGS: z.string()
      .transform((val) => JSON.parse(val))
      .pipe(z.record(z.boolean()))
      .default('{}'),

    // Custom date parsing
    START_DATE: z.string()
      .transform((val) => new Date(val))
      .pipe(z.date())
      .optional(),
  });
}

@ConfigProperty() allowedOrigins!: string[];
@ConfigProperty() featureFlags!: Record<string, boolean>;
@ConfigProperty() startDate?: Date;
```

### Computed Properties

Create computed properties based on other config values:

```typescript
@Provider('APP_CONFIG')
export class AppConfigProvider extends AbstractConfigProvider {
  @ConfigProperty() host!: string;
  @ConfigProperty() port!: number;
  @ConfigProperty('NODE_ENV') environment!: string;

  // Computed property
  get baseUrl(): string {
    const protocol = this.environment === 'production' ? 'https' : 'http';
    return `${protocol}://${this.host}:${this.port}`;
  }

  get isSecure(): boolean {
    return this.environment === 'production';
  }
}

// Usage with DI
@Injectable()
export class ApiService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;

  getBaseUrl() {
    return this.config.baseUrl;  // "http://localhost:3000" or "https://example.com:443"
  }
}
```

### Singleton Pattern

Config providers are automatically managed as singletons by the DI container:

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { APP_CONFIG, AppConfigProvider } from './config/app-config.provider';

@Injectable()
export class UserService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;  // Same instance shared across all services
  
  getAppInfo() {
    return `${this.config.name} v${this.config.version}`;
  }
}

@Injectable()
export class ApiService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;  // Same instance as UserService
  
  getBaseUrl() {
    return `${this.config.host}:${this.config.port}`;
  }
}
```

## Error Handling

### Validation Errors

When a Zod schema validation fails during config provider initialization, an error is thrown:

```typescript
import { ZodError } from 'zod';

// Validation happens automatically when the DI container instantiates the config
// If validation fails, the application will fail to start with a clear error

try {
  const app = await Rikta.create({ port: 3000 });
} catch (error) {
  if (error instanceof ZodError) {
    console.error('Configuration validation failed:');
    error.issues.forEach(issue => {
      console.error(`- ${issue.path.join('.')}: ${issue.message}`);
    });
  }
}
```

**Example output:**
```
Configuration validation failed:
- DB_NAME: Required
- PORT: Number must be greater than or equal to 1
- NODE_ENV: Invalid enum value. Expected 'development' | 'production' | 'test', received 'staging'
```

### Missing Required Variables

Always set required variables without defaults in your `.env` or system environment:

```typescript
schema() {
  return z.object({
    DB_PASSWORD: z.string(),  // Required - no default
    API_KEY: z.string().min(32),  // Required with validation
  });
}
```

If missing, app will fail fast at startup with a clear error.

## Migration Guide

### From Environment Variables

**Before:**
```typescript
const port = parseInt(process.env.PORT || '3000');
const dbHost = process.env.DB_HOST || 'localhost';
const isProduction = process.env.NODE_ENV === 'production';
```

**After:**
```typescript
@Injectable()
export class AppService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;

  initialize() {
    const port = this.config.port;  // Type-safe number
    const dbHost = this.config.dbHost;  // Type-safe string
    const isProduction = this.config.isProduction();  // Type-safe boolean
  }
}
```

### From dotenv Package

**Before:**
```typescript
import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT!),
  dbHost: process.env.DB_HOST!,
  dbPort: parseInt(process.env.DB_PORT!),
};
```

**After:**
```typescript
@Provider(APP_CONFIG)
class AppConfigProvider extends AbstractConfigProvider {
  schema() {
    return z.object({
      PORT: z.coerce.number().int(),
      DB_HOST: z.string(),
      DB_PORT: z.coerce.number().int(),
    });
  }

  @ConfigProperty() port!: number;
  @ConfigProperty() dbHost!: string;
  @ConfigProperty() dbPort!: number;

  constructor() {
    super();
    this.populate();
  }
}

// Use in services via DI
@Injectable()
export class DatabaseService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;
  
  async connect() {
    console.log(`Connecting to ${this.config.dbHost}:${this.config.dbPort}`);
  }
}
```

## Example: Complete Application Config

```typescript
import { AbstractConfigProvider, Provider, ConfigProperty } from '@riktajs/core';
import { z } from 'zod';

export const APP_CONFIG = 'APP_CONFIG' as const;

@Provider(APP_CONFIG)
export class AppConfigProvider extends AbstractConfigProvider {
  schema() {
    return z.object({
      // Environment
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      
      // Application
      APP_NAME: z.string().default('My Application'),
      APP_VERSION: z.string().default('1.0.0'),
      PORT: z.coerce.number().int().min(1).max(65535).default(3000),
      HOST: z.string().default('localhost'),
      
      // Database
      DB_HOST: z.string().default('localhost'),
      DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
      DB_NAME: z.string().min(1),
      DB_USER: z.string(),
      DB_PASSWORD: z.string(),
      DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
      DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
      
      // Redis
      REDIS_HOST: z.string().default('localhost'),
      REDIS_PORT: z.coerce.number().int().default(6379),
      REDIS_PASSWORD: z.string().optional(),
      
      // API
      API_TIMEOUT: z.coerce.number().int().min(1000).default(30000),
      API_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
      
      // Security
      JWT_SECRET: z.string().min(32),
      JWT_EXPIRY: z.string().default('24h'),
      CORS_ORIGINS: z.string()
        .transform(val => val.split(',').map(s => s.trim()))
        .default('http://localhost:3000'),
      
      // Features
      ENABLE_METRICS: z.coerce.boolean().default(true),
      ENABLE_CACHE: z.coerce.boolean().default(true),
      
      // Logging
      LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      LOG_PRETTY: z.coerce.boolean().default(true),
    });
  }

  // Environment
  @ConfigProperty('NODE_ENV')
  environment!: 'development' | 'production' | 'test';
  
  // Application
  @ConfigProperty('APP_NAME')
  name!: string;
  
  @ConfigProperty('APP_VERSION')
  version!: string;
  
  @ConfigProperty()
  port!: number;
  
  @ConfigProperty()
  host!: string;
  
  // Database
  @ConfigProperty()
  dbHost!: string;
  
  @ConfigProperty()
  dbPort!: number;
  
  @ConfigProperty()
  dbName!: string;
  
  @ConfigProperty()
  dbUser!: string;
  
  @ConfigProperty()
  dbPassword!: string;
  
  @ConfigProperty()
  dbPoolMin!: number;
  
  @ConfigProperty()
  dbPoolMax!: number;
  
  // Redis
  @ConfigProperty()
  redisHost!: string;
  
  @ConfigProperty()
  redisPort!: number;
  
  @ConfigProperty()
  redisPassword?: string;
  
  // API
  @ConfigProperty()
  apiTimeout!: number;
  
  @ConfigProperty()
  apiMaxRetries!: number;
  
  // Security
  @ConfigProperty()
  jwtSecret!: string;
  
  @ConfigProperty()
  jwtExpiry!: string;
  
  @ConfigProperty()
  corsOrigins!: string[];
  
  // Features
  @ConfigProperty()
  enableMetrics!: boolean;
  
  @ConfigProperty()
  enableCache!: boolean;
  
  // Logging
  @ConfigProperty()
  logLevel!: string;
  
  @ConfigProperty()
  logPretty!: boolean;

  constructor() {
    super();
    this.populate();
  }

  // Environment helpers
  isProduction(): boolean {
    return this.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  isTest(): boolean {
    return this.environment === 'test';
  }

  // Database helpers
  getDatabaseUrl(): string {
    return `postgresql://${this.dbUser}:${this.dbPassword}@${this.dbHost}:${this.dbPort}/${this.dbName}`;
  }

  getDatabasePoolConfig() {
    return {
      min: this.dbPoolMin,
      max: this.dbPoolMax,
    };
  }

  // Redis helpers
  getRedisUrl(): string {
    if (this.redisPassword) {
      return `redis://:${this.redisPassword}@${this.redisHost}:${this.redisPort}`;
    }
    return `redis://${this.redisHost}:${this.redisPort}`;
  }

  // Application helpers
  getServerAddress(): string {
    return `${this.host}:${this.port}`;
  }
}

// Usage in services via Dependency Injection
@Injectable()
export class DatabaseService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;
  
  async connect() {
    const url = this.config.getDatabaseUrl();
    const poolConfig = this.config.getDatabasePoolConfig();
    
    console.log(`Connecting to database: ${url}`);
    console.log(`Pool config: min=${poolConfig.min}, max=${poolConfig.max}`);
  }
}

@Injectable()
export class ApiService {
  @Autowired(APP_CONFIG)
  private config!: AppConfigProvider;
  
  makeRequest() {
    const timeout = this.config.apiTimeout;
    const maxRetries = this.config.apiMaxRetries;
    
    console.log(`Making API request with timeout=${timeout}ms, retries=${maxRetries}`);
  }
}
```

## Next Steps

- Read about [Dependency Injection](./dependency-injection.md) to learn more about `@Autowired` and DI
- Learn about [Validation](./validation.md) for request validation
- Explore [Architecture](./architecture.md) for system overview

---

**Questions or issues?** Check the [GitHub repository](https://github.com/riktajs/rikta-core) or open an issue.
