---
sidebar_position: 1
---

# Common Questions

Frequently asked questions about Rikta framework.

## General

### What is Rikta?

Rikta is a TypeScript framework for building efficient, scalable server-side applications. It's built on top of Fastify for maximum performance and features zero-config autowiring, eliminating the need for manual module registration.

### How does Rikta compare to NestJS?

| Feature | Rikta | NestJS |
|---------|-------|--------|
| Module System | Auto-discovery | Manual registration |
| HTTP Layer | Fastify | Express (default) / Fastify |
| Validation | Zod (built-in) | class-validator |
| Configuration | Built-in | @nestjs/config |
| Boilerplate | Minimal | More verbose |

Rikta focuses on simplicity and performance by eliminating the module registration overhead.

### Is Rikta production-ready?

Rikta is actively developed and tested. Check the [GitHub repository](https://github.com/riktahq/rikta) for the current status and known issues.

### What Node.js versions are supported?

Rikta supports Node.js 18 and later.

## Architecture

### Why no modules?

Traditional module systems require developers to:
- Create module files
- Manually register providers, controllers, and imports
- Handle exports for shared services
- Manage circular dependencies

Rikta uses **auto-discovery** instead - decorate your classes and they're automatically found and registered. This reduces boilerplate and eliminates common pitfalls.

### How does auto-discovery work?

When you call `Rikta.create()`:

1. Rikta scans the paths you specify in `autowired`
2. It finds all classes decorated with `@Controller()`, `@Injectable()`, etc.
3. These classes are registered in the DI container
4. Dependencies are resolved automatically

```typescript
const app = await Rikta.create({
  autowired: ['./src'], // Scans all files in ./src
});
```

### Are services global or scoped?

By default, all services in Rikta are **singletons** (global). The same instance is shared across the entire application. You can change this behavior:

```typescript
@Injectable({ scope: 'transient' })
export class MyService {
  // New instance created for each injection
}
```

### How do I handle circular dependencies?

Use **property injection** instead of constructor injection:

```typescript
// ✅ Works with circular dependencies
@Injectable()
export class ServiceA {
  @Autowired()
  private serviceB!: ServiceB;
}

@Injectable()
export class ServiceB {
  @Autowired()
  private serviceA!: ServiceA;
}
```

## Configuration

### How do I configure different environments?

Use environment variables with ConfigProperty:

```typescript
export class AppConfig extends AbstractConfigProvider<Config> {
  @ConfigProperty({ env: 'NODE_ENV' })
  environment: string = 'development';

  @ConfigProperty({ env: 'PORT', transform: Number })
  port: number = 3000;
}
```

Then set environment variables:

```bash
NODE_ENV=production PORT=8080 node dist/index.js
```

### How do I use .env files?

Install dotenv and load it at the start of your application:

```bash
npm install dotenv
```

```typescript
import 'dotenv/config';
import { Rikta } from '@riktajs/core';

async function bootstrap() {
  // Environment variables from .env are now available
}
```

### Can I use multiple configuration files?

Yes, use separate config providers for different concerns:

```typescript
@Injectable()
export class DatabaseConfig extends AbstractConfigProvider<DbConfig> {}

@Injectable()
export class RedisConfig extends AbstractConfigProvider<RedisConfig> {}

@Injectable()
export class MailConfig extends AbstractConfigProvider<MailConfig> {}
```

## Validation

### Why Zod instead of class-validator?

Zod offers several advantages:

1. **Type inference** - Types are automatically inferred from schemas
2. **Runtime validation** - Schemas work at runtime and compile time
3. **Composability** - Easy to compose and transform schemas
4. **No decorators on DTOs** - Cleaner, simpler classes
5. **Smaller bundle** - Lighter than class-transformer + class-validator

### How do I validate query parameters?

Use Zod with the `@Query()` decorator:

```typescript
const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

@Get()
findAll(@Query(QuerySchema) query: z.infer<typeof QuerySchema>) {
  // query.page and query.limit are numbers
}
```

Note: Use `z.coerce` for query params since they come as strings.

### How do I handle validation errors?

Validation errors automatically return a 400 response:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "path": ["email"], "message": "Invalid email" }
  ]
}
```

## Database

### What databases are supported?

Through `@riktajs/typeorm`, Rikta supports:
- PostgreSQL
- MySQL / MariaDB
- SQLite
- SQL Server
- Oracle
- MongoDB (via TypeORM)

### How do I run migrations?

```bash
# Generate migration
npx typeorm migration:generate -d ./src/data-source.ts ./migrations/MyMigration

# Run migrations
npx typeorm migration:run -d ./src/data-source.ts

# Revert migration
npx typeorm migration:revert -d ./src/data-source.ts
```

### How do I inject repositories?

Use the `@InjectRepository()` decorator:

```typescript
import { InjectRepository } from '@riktajs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  @InjectRepository(User)
  private userRepository!: Repository<User>;
}
```

## Testing

### How do I test controllers?

Mock the dependencies and test the controller directly:

```typescript
describe('UserController', () => {
  let controller: UserController;
  let mockService: jest.Mocked<UserService>;

  beforeEach(() => {
    mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
    } as any;

    controller = new UserController();
    (controller as any).userService = mockService;
  });

  it('should return all users', async () => {
    mockService.findAll.mockResolvedValue([{ id: '1', name: 'Test' }]);
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
  });
});
```

### How do I test with the DI container?

```typescript
import { container } from '@riktajs/core';

beforeEach(() => {
  // Reset container between tests
  container.clear();
  
  // Register mocks
  container.registerValue(DATABASE, mockDatabase);
});

it('should work with DI', () => {
  const service = container.resolve(UserService);
  // service has mock database injected
});
```

## Deployment

### How do I deploy to production?

1. Build the application: `npm run build`
2. Set environment variables
3. Run: `node dist/index.js`

Use the `rikta build` command to create a production build, then deploy the `dist` folder to your hosting platform.

### How do I run with PM2?

```bash
pm2 start dist/index.js --name my-app -i max
```

### How do I containerize with Docker?

Create a Dockerfile that copies your built application and runs `node dist/index.js`.

## Troubleshooting

### My decorators aren't working

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Services aren't being discovered

Check that:
1. The `autowired` path is correct
2. Classes have `@Injectable()` or `@Controller()` decorators
3. Files are `.ts` (not `.js`) if using TypeScript

### Circular dependency error

Use property injection instead of constructor injection:

```typescript
// Change from:
constructor(@Autowired() private other: OtherService) {}

// To:
@Autowired()
private other!: OtherService;
```

### How do I debug route registration?

Enable debug logging:

```typescript
const app = await Rikta.create({
  port: 3000,
  autowired: ['./src'],
  debug: true, // Shows registered routes
});
```
