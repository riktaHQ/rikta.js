---
name: riktajs-framework
description: "Use when working in an app built with @riktajs/core or other @riktajs/* packages, or when tasks mention Rikta controllers, @Injectable, @Autowired, request scope, Provider, guards, middleware, interceptors, config providers, lifecycle hooks, Swagger, TypeORM, queue, SSR, or the Rikta CLI."
user-invocable: true
---

# RiktaJS Framework Skill

Use this skill when the codebase uses Rikta as its backend framework and the agent needs framework-specific knowledge before making changes.

## Recognition Checklist

Load this skill when one or more of these are true:

- `package.json` contains `@riktajs/core` or other `@riktajs/*` dependencies.
- The code uses `Rikta.create()`, `@Controller()`, `@Injectable()`, `@Autowired()`, `@Provider()`, `@UseGuards()`, `@UseMiddleware()`, `@UseInterceptors()`, `ssrPlugin`, `@SsrController()`, or `@Ssr()`.
- The task mentions discovery, DI scopes, request scope, config providers, EventBus, validation, Swagger, TypeORM, queue, passport, or SSR in a Rikta app.

## Mental Model

Rikta is a Fastify-based TypeScript backend framework with:

- zero-config or low-config auto-discovery
- decorator-driven routing
- a DI container with singleton, transient, and request scopes
- lifecycle hooks and an event bus
- optional companion packages for Swagger, TypeORM, queue, passport, SSR, React, and MCP

Rikta is intentionally not NestJS. Do not introduce module arrays or assume Nest-specific architecture.

## Core Framework Rules

### Discovery

- If the app layout is conventional, Rikta can discover code automatically.
- Default discovery prefers common roots such as `src`, `app`, `server`, `api`, `lib`, `controllers`, `services`, and `providers`.
- For unusual layouts, recommend explicit `autowired` patterns.

Example:

```typescript
const app = await Rikta.create({
  autowired: ["./src/controllers", "./src/services"],
});
```

### Dependency Injection

- `@Injectable()` defaults to singleton.
- `@Injectable({ scope: 'transient' })` creates a new instance for each resolution.
- `@Injectable({ scope: 'request' })` creates one instance per HTTP request.
- `@Autowired()` works for property or constructor injection.
- Use `InjectionToken` or `@Provider()` for non-class values and custom providers.

### Request Scope

- Request-scoped providers can be injected into singleton controllers, guards, middleware, interceptors, and services through a lazy proxy.
- That proxy is valid only during HTTP request handling.
- Do not access request-scoped dependencies from constructors, field initializers, `onProviderInit()`, or `onApplicationBootstrap()`.

Good example:

```typescript
@Injectable({ scope: "request" })
class RequestContext {
  readonly requestId = crypto.randomUUID();
}

@Injectable()
class AuditService {
  @Autowired()
  private requestContext!: RequestContext;

  log(message: string) {
    console.log(`[${this.requestContext.requestId}] ${message}`);
  }
}

@Controller("/orders")
class OrderController {
  @Autowired()
  private audit!: AuditService;

  @Get()
  list() {
    this.audit.log("Listing orders");
    return [];
  }
}
```

Bad example:

```typescript
@Injectable()
class StartupService implements OnProviderInit {
  @Autowired()
  private requestContext!: RequestContext;

  onProviderInit() {
    // Wrong: no request context exists here.
    console.log(this.requestContext.requestId);
  }
}
```

### Lifecycle

- `OnProviderInit`, `OnProviderDestroy`, `OnApplicationBootstrap`, `OnApplicationListen`, and `OnApplicationShutdown` are singleton-oriented lifecycle hooks.
- Do not assume transient or request-scoped providers receive bootstrap or shutdown hooks.
- Use the `EventBus` when you need pub/sub semantics instead of rigid lifecycle coupling.

### HTTP Pipeline

Execution order:

1. guards
2. middleware
3. handler
4. interceptor post-processing on unwind

Interceptors wrap the handler like an onion. Middleware does not replace guards. Guards do not mutate response flow the same way interceptors do.

## Implementation Guidance

### Preferred Patterns

- Keep controllers thin.
- Put business logic in injectable services.
- Use property injection when it makes the controller or service more readable.
- Use constructor injection when dependency ordering and explicitness matter.
- Use `@Provider()` or config providers for environment-backed or token-backed values.
- Add tests for DI scope, lifecycle, and discovery behavior when touching framework-adjacent code.

### Things To Avoid

- Do not introduce NestJS modules or provider arrays into Rikta apps unless the app already built an explicit wrapper around them.
- Do not read request-scoped values during bootstrap.
- Do not manually resolve request-scoped providers outside request handling.
- Do not depend on recursive auto-discovery when the app layout is unusual; use explicit patterns.

## Common Rikta Surfaces

- Controllers and routing: `@Controller`, `@Get`, `@Post`, `@Param`, `@Body`, `@Query`, `@Headers`
- DI and config: `@Injectable`, `@Autowired`, `InjectionToken`, `@Provider`, config providers
- Request pipeline: `@UseGuards`, `@UseMiddleware`, `@UseInterceptors`
- SSR and fullstack: `ssrPlugin`, `app.server.ssr`, `app.server.registerSsrController`, `@SsrController`, `@Ssr`, `HeadBuilder`, `Head`
- Validation: Zod schemas with request decorators
- Lifecycle: `OnProviderInit`, `OnApplicationBootstrap`, `OnApplicationListen`, `OnApplicationShutdown`, `EventBus`

## Companion Packages

When the app uses additional Rikta packages, inspect these areas:

- `@riktajs/swagger`: OpenAPI decorators and document generation
- `@riktajs/typeorm`: database bootstrap and provider lifecycle
- `@riktajs/queue`: workers, processors, and queue-backed providers
- `@riktajs/passport`: authentication guards and user context
- `@riktajs/ssr`: SSR routes, rendering, template integration, and production build layout
- `@riktajs/react`: hydration, SSR data access, and client-side navigation data fetching
- `@riktajs/cli`: scaffolding, generated templates, and project layout conventions

### SSR Package Guidance

- Register SSR with `await app.server.register(ssrPlugin, options)`. This decorates the Fastify instance with `app.server.ssr` and `app.server.registerSsrController(...)`.
- Prefer `@SsrController()` for HTML routes and keep regular `@Controller()` APIs separate unless mixed routing is intentional and well-tested.
- SSR routes support `@UseGuards()`, `@UseMiddleware()`, and `@UseInterceptors()`. Reason about them in the same order as core routes: guards, middleware, handler, then interceptor unwind.
- Request-scoped providers on SSR routes still obey the same constraint as the rest of Rikta: only access them during request handling. If SSR behavior diverges from standard HTTP routes, inspect request-scope wrapping first.
- Safe per-controller SSR overrides inside one app root are `entryServer`, `template`, `buildDir`, and `ssrManifest`. Keep `root`, `dev`, and `viteConfig` at plugin scope unless you intentionally register a separate SSR plugin instance.
- Typical SSR templates use `<!--ssr-title-->`, `<!--head-tags-->`, `<!--preload-links-->`, and `<!--ssr-outlet-->` placeholders.
- For `@riktajs/react`, client-side navigation fetches route data with the `X-Rikta-Data: 1` header. SSR handlers may return JSON instead of full HTML for that request mode.
- Production SSR usually needs three artifacts: a server runtime bundle, a client bundle generated with `--ssrManifest`, and an SSR entry bundle.
- If the server entry returns `modules`, Rikta can derive preload links from the Vite SSR manifest. If preloads look wrong, inspect the manifest shape before changing route logic.
- In production, static serving should expose both hashed assets and root-level public files without swallowing application routes.
- When working on the first-party SSR package, validate with `cd packages/ssr && npm test && npm run build`. For a smoke check of the shipped React example, run `cd examples/example-ssr-react && npm run build`.

## Validation Advice For App Repos

- Inspect `package.json` first and follow the app's own scripts.
- Typical commands are `npm run dev`, `npm run build`, and `npm run test`, but do not assume them blindly.
- If you change framework wiring, validate both the route behavior and the lifecycle or discovery behavior involved.
- For SSR work, validate both request-time behavior and build-time layout: HTML render path, data-only navigation path, and production output structure.

## Output Expectations

When answering or coding in a Rikta app:

- explain framework-specific constraints when they affect the design
- prefer Rikta-native patterns over generic Express or NestJS patterns
- mention request-scope proxy limitations when they are relevant
- call out SSR-specific build and template constraints when they matter to the fix
- keep examples aligned with actual Rikta decorators and lifecycle names
