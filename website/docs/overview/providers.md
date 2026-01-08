---
sidebar_position: 3
---

# Providers

Providers are a fundamental concept in Rikta. Many of the basic Rikta classes may be treated as a provider – services, repositories, factories, helpers, and so on. The main idea of a provider is that it can be **injected** as a dependency; this means objects can create various relationships with each other, and the function of "wiring up" these objects can largely be delegated to the Rikta runtime system.

```
┌─────────────────────────────────────────────────────────────────┐
│                          Controller                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    @Autowired()                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │  Service A  │  │  Service B  │  │  Service C  │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

In the previous chapter, we built a simple `CatsController`. Controllers should handle HTTP requests and delegate more complex tasks to **providers**. Providers are plain JavaScript classes that are declared with an `@Injectable()` decorator.

## Services

Let's start by creating a simple `CatsService`. This service will be responsible for data storage and retrieval, and is designed to be used by the `CatsController`:

```typescript
import { Injectable } from '@riktajs/core';

interface Cat {
  id: string;
  name: string;
  age: number;
  breed: string;
}

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Omit<Cat, 'id'>): Cat {
    const newCat = { ...cat, id: crypto.randomUUID() };
    this.cats.push(newCat);
    return newCat;
  }

  findAll(): Cat[] {
    return this.cats;
  }

  findOne(id: string): Cat | undefined {
    return this.cats.find(cat => cat.id === id);
  }

  update(id: string, data: Partial<Cat>): Cat | undefined {
    const index = this.cats.findIndex(cat => cat.id === id);
    if (index === -1) return undefined;
    this.cats[index] = { ...this.cats[index], ...data };
    return this.cats[index];
  }

  remove(id: string): boolean {
    const index = this.cats.findIndex(cat => cat.id === id);
    if (index === -1) return false;
    this.cats.splice(index, 1);
    return true;
  }
}
```

:::info Auto-Discovery
Like controllers, services decorated with `@Injectable()` are **automatically discovered** by Rikta. No manual registration needed!
:::

Our `CatsService` is a basic class with one property and five methods. The only new feature is that it uses the `@Injectable()` decorator. The `@Injectable()` decorator attaches metadata, which declares that `CatsService` is a class that can be managed by the Rikta DI container.

Now that we have a service class to retrieve cats, let's use it inside the `CatsController`:

```typescript
import { Controller, Get, Post, Body, Autowired } from '@riktajs/core';

@Controller('/cats')
export class CatsController {
  @Autowired()
  private catsService!: CatsService;

  @Post()
  create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.create(createCatDto);
  }

  @Get()
  findAll() {
    return this.catsService.findAll();
  }
}
```

The `CatsService` is injected through the `@Autowired()` decorator. Rikta will resolve and provide an instance of `CatsService` (or, in the normal case of a singleton, return the existing instance if it has already been requested elsewhere).

## Dependency injection

Rikta is built around the strong design pattern commonly known as **Dependency injection**. We recommend reading a great article about this concept in the official [Angular documentation](https://angular.io/guide/dependency-injection).

In Rikta, thanks to TypeScript capabilities, it's extremely easy to manage dependencies because they are resolved by type. In the example below, Rikta will resolve the `catsService` by creating and returning an instance of `CatsService`:

```typescript
@Autowired()
private catsService!: CatsService;
```

## Scopes

Providers normally have a lifetime ("scope") synchronized with the application lifecycle. When the application is bootstrapped, every dependency must be resolved, and therefore every provider has to be instantiated.

However, there are ways to make your provider lifetime **request-scoped** as well. You can read more about these techniques in the [dependency injection](/docs/fundamentals/dependency-injection) chapter.

## Custom providers

Rikta has a built-in DI container that resolves relationships between providers. The `@Injectable()` decorator is the standard method for defining providers, but it's not the only one. You can also use:

### Value providers

```typescript
import { container, InjectionToken } from '@riktajs/core';

const API_KEY = new InjectionToken<string>('api.key');

container.registerValue(API_KEY, 'my-secret-api-key');
```

### Factory providers

```typescript
container.registerFactory(CONNECTION, () => {
  return new Connection(config);
});
```

### Class providers

```typescript
container.registerClass(LOGGER, ConsoleLogger);
```

## Optional providers

Occasionally, you might have dependencies that do not necessarily have to be resolved. For instance, your class may depend on a **configuration object**, but if none is passed, the default values should be used. In such a case, the dependency becomes optional.

To indicate a provider is optional, use the `@Optional()` decorator:

```typescript
import { Injectable, Autowired, Optional } from '@riktajs/core';

@Injectable()
export class HttpService {
  @Optional()
  @Autowired()
  private logger?: LoggerService;

  request(url: string) {
    this.logger?.log(`Requesting ${url}`);
    // ... rest of implementation
  }
}
```

## Property-based injection

The technique we've used so far is called property-based injection, as providers are injected via the class property with `@Autowired()`:

```typescript
@Injectable()
export class CatsService {
  @Autowired()
  private logger!: LoggerService;
}
```

## Constructor-based injection

You can also use constructor-based injection:

```typescript
@Injectable()
export class CatsService {
  constructor(
    @Autowired() private logger: LoggerService,
    @Autowired() private config: ConfigService
  ) {}
}
```

:::tip Property Injection
In Rikta, we recommend **property injection** as it's cleaner and handles circular dependencies automatically.
:::

## Registering providers

In Rikta, providers are **auto-discovered** - there's no need to manually register them in modules. Simply use the `@Injectable()` decorator and Rikta will find your providers automatically:

```typescript
@Injectable()
export class CatsService {
  // ...
}
```

When you bootstrap your application, Rikta scans the specified directories and registers all decorated classes:

```typescript
const app = await Rikta.create({
  port: 3000,
  autowired: ['./src']  // Scans for @Injectable() and @Controller()
});
```
