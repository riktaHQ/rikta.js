# 🧪 Test Suite

Rikta Framework test suite using Vitest.

## Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Test Structure

| File | Tests | Coverage |
|------|-------|----------|
| `container.test.ts` | DI container, tokens, scopes | Container logic |
| `decorators.test.ts` | All decorators metadata | Decorator behavior |
| `registry.test.ts` | Auto-discovery registry | Registry API |
| `router.test.ts` | Route registration, params | Router logic |
| `lifecycle.test.ts` | Hooks, events, priority | Lifecycle system |
| `exceptions.test.ts` | Errors, filters, responses | Exception handling |
| `application.test.ts` | Bootstrap, server, errors | Application lifecycle |

## Coverage Report

After running `npm run test:coverage`, find the HTML report in:
```
coverage/index.html
```

## Test Categories

### Container Tests
- Basic registration and resolution
- Singleton vs transient scopes
- Injection tokens (value, factory)
- Property injection with tokens
- Optional dependencies
- Provider types (class, existing)

### Decorator Tests
- `@Controller` metadata and prefix normalization
- `@Injectable` metadata and scope
- Route decorators (`@Get`, `@Post`, etc.)
- Parameter decorators (`@Body`, `@Param`, `@Query`, `@Headers`)
- `@HttpCode` status code

### Registry Tests
- Controller registration
- Provider registration
- Singleton pattern
- Duplicate prevention

### Router Tests
- Route registration with Fastify
- Global prefix application
- Parameter resolution
- HTTP status codes
- Async handlers
- DI integration

### Exception Tests
- `HttpException` base class
- Specific exceptions (400-504)
- Default messages and status codes
- `@Catch()` decorator metadata
- `GlobalExceptionFilter` behavior
- Stack trace inclusion
- Application integration
- Custom exception filters
- Filter fallback behavior

### Application Tests
- Bootstrap process
- Controller discovery
- Global prefix
- Server lifecycle
- Plugin registration
- Error handling

## Writing New Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../src/core/container';
import { Controller } from '../src/core/decorators/controller.decorator';

describe('MyFeature', () => {
  beforeEach(() => {
    Container.reset();
  });

  it('should do something', () => {
    // Test code
  });
});
```

## Notes

- Tests use Vitest with V8 coverage
- `beforeEach` resets Container and Registry
- Decorators execute at class definition time
- Use unique class names to avoid conflicts
- Use `controllers: []` or explicit list to avoid auto-discovery issues

