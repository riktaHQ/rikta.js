---
sidebar_position: 3
---

# Application Options

Rikta provides several configuration options when creating your application with `Rikta.create()`. This page documents all available options.

## Basic Configuration

```typescript
import { Rikta } from '@riktajs/core';

const app = await Rikta.create({
  port: 3000,
  host: '0.0.0.0',
  prefix: '/api/v1',
  logger: true,
  silent: false,
});
```

## All Options

### Server Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Server port to listen on |
| `host` | `string` | `'0.0.0.0'` | Server host to bind to |
| `prefix` | `string` | `''` | Global route prefix for all controllers |
| `logger` | `boolean \| object` | `true` | Enable Fastify logging |
| `silent` | `boolean` | `false` | Disable all framework console output |

### Auto-Discovery Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autowired` | `string[] \| false` | smart source-root patterns | Glob patterns for auto-discovery |
| `controllers` | `Constructor[]` | `undefined` | Explicit list of controllers |
| `providers` | `Constructor[]` | `undefined` | Additional providers to register |
| `strictDiscovery` | `boolean` | `false` | Throw on import errors during discovery |
| `onDiscoveryError` | `Function` | `undefined` | Callback for import errors |

### Exception Handling Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `exceptionFilter` | `object` | `undefined` | Global exception filter configuration |
| `exceptionFilters` | `Constructor[]` | `undefined` | Custom exception filters |

## Detailed Options

### `autowired`

Controls how Rikta discovers controllers and services.

If you do not pass `autowired`, Rikta first looks in common source roots such as
`./src`, `./app`, `./server`, `./controllers`, `./services`, and `./providers`.
Only when none of those directories exist does it fall back to a recursive
project scan.

```typescript
// Scan specific directories
const app = await Rikta.create({
  autowired: ['./src/controllers', './src/services'],
});

// Use glob patterns
const app = await Rikta.create({
  autowired: ['./src/**/*.controller.ts', './src/**/*.service.ts'],
});

// Disable auto-discovery (use explicit controllers)
const app = await Rikta.create({
  autowired: false,
  controllers: [UserController, ProductController],
});
```

### `strictDiscovery`

When enabled, throws a `DiscoveryException` if any module fails to import during auto-discovery. This is useful for catching configuration errors early in development.

```typescript
const app = await Rikta.create({
  strictDiscovery: process.env.NODE_ENV !== 'production',
});
```

:::tip Development Recommendation
Enable `strictDiscovery` in development to catch import errors early:

```typescript
const app = await Rikta.create({
  strictDiscovery: process.env.NODE_ENV === 'development',
});
```
:::

### `onDiscoveryError`

Callback invoked when a module fails to import. Called regardless of `strictDiscovery` setting.

```typescript
const app = await Rikta.create({
  onDiscoveryError: (filePath, error) => {
    console.warn(`⚠️ Failed to import ${filePath}`);
    console.warn(`   Reason: ${error.message}`);
    
    // Send to error tracking service
    errorTracker.captureException(error, { filePath });
  },
});
```

### `exceptionFilter`

Configure the global exception filter behavior.

```typescript
const app = await Rikta.create({
  exceptionFilter: {
    // Include stack traces in error responses
    includeStack: process.env.NODE_ENV !== 'production',
    
    // Log errors to console
    logErrors: true,
  },
});
```

### `exceptionFilters`

Register custom exception filters for specific exception types.

```typescript
import { ExceptionFilter, Catch, HttpException } from '@riktajs/core';

@Catch(ValidationException)
class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ValidationException, context: ExceptionContext) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: exception.errors,
    };
  }
}

const app = await Rikta.create({
  exceptionFilters: [ValidationExceptionFilter],
});
```

## DiscoveryException

When `strictDiscovery` is enabled and imports fail, a `DiscoveryException` is thrown:

```typescript
import { DiscoveryException } from '@riktajs/core';

try {
  const app = await Rikta.create({
    strictDiscovery: true,
  });
} catch (error) {
  if (error instanceof DiscoveryException) {
    console.error('Discovery failed!');
    console.error(error.getReport()); // Formatted failure report
    
    // Access individual failures
    for (const { filePath, error: err } of error.failedImports) {
      console.error(`- ${filePath}: ${err.message}`);
    }
  }
  throw error;
}
```

### DiscoveryException Properties

| Property | Type | Description |
|----------|------|-------------|
| `filePath` | `string` | First failed file path |
| `originalError` | `Error` | First failure error |
| `failedImports` | `DiscoveryFailure[]` | All failed imports |

### DiscoveryException Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getReport()` | `string` | Formatted report of all failures |

## Full Example

```typescript
import { Rikta, DiscoveryException } from '@riktajs/core';

async function bootstrap() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  try {
    const app = await Rikta.create({
      // Server config
      port: parseInt(process.env.PORT || '3000'),
      host: '0.0.0.0',
      prefix: '/api/v1',
      
      // Logging
      logger: isDevelopment,
      silent: !isDevelopment,
      
      // Discovery
      autowired: ['./src'],
      strictDiscovery: isDevelopment,
      onDiscoveryError: (file, err) => {
        console.warn(`Import warning: ${file}`);
      },
      
      // Error handling
      exceptionFilter: {
        includeStack: isDevelopment,
        logErrors: true,
      },
    });
    
    await app.listen();
    console.log(`🚀 Server running on ${app.getUrl()}`);
    
  } catch (error) {
    if (error instanceof DiscoveryException) {
      console.error('❌ Failed to start - discovery errors:');
      console.error(error.getReport());
      process.exit(1);
    }
    throw error;
  }
}

bootstrap();
```
