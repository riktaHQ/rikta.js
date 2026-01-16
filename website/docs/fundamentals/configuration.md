---
sidebar_position: 2
---

# Configuration

Applications often need different settings based on the environment (development, staging, production). Rikta provides a powerful, type-safe configuration system with **automatic `.env` loading** and **Abstract Config Providers**.

## Automatic Environment Variable Loading

Rikta automatically loads `.env` files **at the very start** of `Rikta.create()`, making environment variables available immediately in your main script.

### Quick Example

```typescript
// Create .env file in project root
// .env
PORT=4000
DATABASE_URL=postgresql://localhost/mydb

// main.ts
import { Rikta } from '@riktajs/core';

async function bootstrap() {
  // .env is loaded at the start of create()
  // process.env is available immediately!
  const app = await Rikta.create({
    port: parseInt(process.env.PORT || '3000')
  });
  
  await app.listen();
  console.log(`Server running on port ${process.env.PORT}`);
}

bootstrap();
```

### Loading Behavior

- `.env` files are loaded **first thing** when you call `Rikta.create()`
- Environment-specific files (`.env.development`, `.env.production`) override base `.env`
- Loading is **idempotent** - files are loaded only once
- You can manually call `loadEnvFiles()` before `create()` if needed

```typescript
import { Rikta, loadEnvFiles } from '@riktajs/core';

// Optional: load env vars before create()
loadEnvFiles();

// Now you can use process.env before create()
const port = parseInt(process.env.PORT || '3000');

const app = await Rikta.create({ port });
```

## Introduction

Rikta's configuration system is designed to be:

- **Type-safe** - Full TypeScript support with interfaces
- **Environment-aware** - Easy switching between environments
- **Validated** - Built-in Zod schema validation
- **Injectable** - Configurations work seamlessly with DI

## Abstract Config Providers

The recommended way to define configuration in Rikta is using `AbstractConfigProvider`:

```typescript
import { AbstractConfigProvider, ConfigProperty, Autowired } from '@riktajs/core';

export class AppConfigProvider extends AbstractConfigProvider<AppConfig> {
  @ConfigProperty()
  port: number = 3000;

  @ConfigProperty()
  host: string = 'localhost';

  @ConfigProperty()
  environment: 'development' | 'production' = 'development';
}
```

### Using Configuration

Inject the configuration provider anywhere:

```typescript
@Injectable()
export class ServerService {
  @Autowired()
  private config!: AppConfigProvider;

  getServerUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }
}
```

## Config Properties

### Basic Properties

Use `@ConfigProperty()` to mark configurable values:

```typescript
export class DatabaseConfigProvider extends AbstractConfigProvider<DatabaseConfig> {
  @ConfigProperty()
  host: string = 'localhost';

  @ConfigProperty()
  port: number = 5432;

  @ConfigProperty()
  database: string = 'myapp';

  @ConfigProperty()
  username: string = 'postgres';

  @ConfigProperty()
  password: string = '';
}
```

### Environment Variable Mapping

Properties can be automatically loaded from environment variables:

```typescript
export class ApiConfigProvider extends AbstractConfigProvider<ApiConfig> {
  @ConfigProperty({ env: 'API_KEY' })
  apiKey: string = '';

  @ConfigProperty({ env: 'API_URL' })
  apiUrl: string = 'https://api.example.com';

  @ConfigProperty({ env: 'API_TIMEOUT', transform: Number })
  timeout: number = 5000;
}
```

### Nested Configuration

For complex configurations, use nested providers:

```typescript
export class AppConfigProvider extends AbstractConfigProvider<AppConfig> {
  @ConfigProperty()
  port: number = 3000;

  @Autowired()
  database!: DatabaseConfigProvider;

  @Autowired()
  redis!: RedisConfigProvider;
}
```

## Validation with Zod

Integrate Zod schemas for runtime validation:

```typescript
import { z } from 'zod';
import { AbstractConfigProvider, ConfigProperty } from '@riktajs/core';

const DatabaseConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string(),
  ssl: z.boolean().default(false),
});

type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

export class DatabaseConfigProvider extends AbstractConfigProvider<DatabaseConfig> {
  schema() { return DatabaseConfigSchema }

  @ConfigProperty({ env: 'DB_HOST' })
  host: string = 'localhost';

  @ConfigProperty({ env: 'DB_PORT', transform: Number })
  port: number = 5432;

  @ConfigProperty({ env: 'DB_NAME' })
  database: string = 'myapp';

  @ConfigProperty({ env: 'DB_USER' })
  username: string = 'postgres';

  @ConfigProperty({ env: 'DB_PASSWORD' })
  password: string = '';

  @ConfigProperty({ env: 'DB_SSL', transform: (v) => v === 'true' })
  ssl: boolean = false;
}
```

## Environment Files

### Using .env Files

Install a dotenv loader and configure it in your entry point:

```typescript
import 'dotenv/config';
import { Rikta } from '@riktajs/core';

async function bootstrap() {
  const app = await Rikta.create({
    port: parseInt(process.env.PORT || '3000'),
    autowired: ['./src'],
  });
  
  await app.listen();
}

bootstrap();
```

### Environment-Specific Files

Create different `.env` files for each environment:

```
.env              # Default values
.env.development  # Development overrides
.env.production   # Production overrides
.env.local        # Local overrides (gitignored)
```

## Custom Config Provider Example

Here's a complete example of a configuration provider:

```typescript
import { AbstractConfigProvider, ConfigProperty, Injectable } from '@riktajs/core';
import { z } from 'zod';

// Define the schema
const AppConfigSchema = z.object({
  name: z.string().default('Rikta App'),
  version: z.string().default('1.0.0'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  debug: z.boolean().default(false),
  server: z.object({
    host: z.string().default('0.0.0.0'),
    port: z.number().default(3000),
  }),
  cors: z.object({
    enabled: z.boolean().default(true),
    origins: z.array(z.string()).default(['*']),
  }),
});

type AppConfig = z.infer<typeof AppConfigSchema>;

@Injectable()
export class AppConfigProvider extends AbstractConfigProvider<AppConfig> {
  schema() { return AppConfigSchema}

  @ConfigProperty({ env: 'APP_NAME' })
  name: string = 'Rikta App';

  @ConfigProperty({ env: 'APP_VERSION' })
  version: string = '1.0.0';

  @ConfigProperty({ env: 'NODE_ENV' })
  environment: 'development' | 'staging' | 'production' = 'development';

  @ConfigProperty({ env: 'DEBUG', transform: (v) => v === 'true' })
  debug: boolean = false;

  @ConfigProperty({ env: 'HOST' })
  host: string = '0.0.0.0';

  @ConfigProperty({ env: 'PORT', transform: Number })
  port: number = 3000;

  @ConfigProperty({ env: 'CORS_ENABLED', transform: (v) => v === 'true' })
  corsEnabled: boolean = true;

  // Computed property
  get isDevelopment(): boolean {
    return this.environment === 'development';
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }
}
```

## Configuration in Controllers

```typescript
@Controller('/api')
export class ApiController {
  @Autowired()
  private config!: AppConfigProvider;

  @Get('/info')
  getInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
      environment: this.config.environment,
    };
  }
}
```

## Best Practices

### 1. Type Your Configurations

```typescript
// ✅ Good - typed configuration
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
}

export class DatabaseConfigProvider extends AbstractConfigProvider<DatabaseConfig> {}
```

### 2. Validate Early

```typescript
// ✅ Good - validate on startup
async function bootstrap() {
  const config = container.resolve(AppConfigProvider);
  config.validate(); // Throws if invalid
  
  const app = await Rikta.create({ ... });
}
```

### 3. Use Defaults Wisely

```typescript
// ✅ Good - sensible defaults for development
@ConfigProperty({ env: 'DB_HOST' })
host: string = 'localhost';

// ✅ Good - no default for secrets
@ConfigProperty({ env: 'DB_PASSWORD' })
password: string = ''; // Empty string, must be provided
```

### 4. Separate Concerns

```typescript
// ✅ Good - separate config providers
@Injectable()
export class DatabaseConfigProvider extends AbstractConfigProvider<DatabaseConfig> {}

@Injectable()
export class CacheConfigProvider extends AbstractConfigProvider<CacheConfig> {}

@Injectable()
export class MailConfigProvider extends AbstractConfigProvider<MailConfig> {}
```

### 5. Don't Expose Secrets

```typescript
@Controller('/api')
export class ApiController {
  @Autowired()
  private config!: AppConfigProvider;

  @Get('/config')
  getConfig() {
    // ❌ Bad - exposes secrets
    return this.config;

    // ✅ Good - only public values
    return {
      name: this.config.name,
      version: this.config.version,
    };
  }
}
```
