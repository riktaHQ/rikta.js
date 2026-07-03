# Rikta Coding Agent Guide

This file is the operating manual for coding agents working on the Rikta monorepo.

## Mission

- Preserve Rikta's core value proposition: zero-config ergonomics, strong TypeScript DX, and low Fastify overhead.
- Prefer small, root-cause fixes over broad rewrites.
- Keep public APIs stable unless the task explicitly requires a breaking change.

## Monorepo Map

- `packages/core`: source of truth for DI, discovery, routing, lifecycle, exceptions, and validation.
- `packages/cli`: scaffolding, templates, and developer entrypoint.
- `packages/swagger`, `packages/typeorm`, `packages/queue`, `packages/passport`, `packages/react`, `packages/ssr`, `packages/mcp`: integrations and companion packages.
- `examples/*`: smoke-test style applications and usage references.
- `benchmarks`: performance measurements and regression tracking.
- `docs`: repository guides and package-level documentation.
- `website/docs`: public Docusaurus documentation.

## Baseline Commands

- Install workspace dependencies: `npm install`
- Build all workspaces: `npm run build`
- Run all workspace tests: `npm run test`

Prefer focused validation first:

- Core runtime changes: `cd packages/core && npm test && npm run build`
- Single package build: `npm run build --workspace=@riktajs/<package>`
- Single package tests: `npm run test --workspace=@riktajs/<package>`
- Public docs changes: `cd website && npm run build`
- Example changes: build the touched example workspace directly.
- Performance-sensitive core changes: `cd benchmarks && npm run bench:startup && npm run bench:requests && npm run bench:request-scope`

Avoid defaulting to root-wide test runs when a package-scoped command can validate the edited slice faster.

## Core Architecture Facts

### Runtime Model

- Rikta is Fastify-based. Performance-sensitive code lives in the core router, discovery, DI, and lifecycle paths.
- `Rikta.create()` clones the container and registry for each app instance. App-local state must not leak across multiple apps in the same process.
- Exported singletons such as the global container, registry, and request scope storage must keep stable object identity. Reset helpers should clear state, not replace exported instances.

### Discovery

- Auto-discovery prefers common source roots such as `src`, `app`, `server`, `api`, `lib`, `controllers`, `services`, and `providers`.
- If no common root exists, discovery falls back to a recursive project scan.
- Keep discovery deterministic, narrow, and cheap. Broad scanning or eager file parsing can damage cold-start time and monorepo usability.

### Dependency Injection

- `@Injectable()` defaults to singleton scope.
- `scope: 'transient'` must resolve a new instance per injection or request usage.
- `scope: 'request'` must resolve only during HTTP request handling.
- Request-scoped dependencies injected into singleton controllers, guards, middleware, interceptors, or services are exposed through a lazy proxy.
- Never rely on a request-scoped dependency in constructors, field initializers, `onProviderInit()`, or `onApplicationBootstrap()`. Those phases run without an active request context.

### Lifecycle

- Bootstrap and shutdown lifecycle hooks apply only to singleton providers.
- `OnProviderInit`, `OnProviderDestroy`, `OnApplicationBootstrap`, `OnApplicationListen`, and `OnApplicationShutdown` should not be triggered for transient or request-scoped providers.

### HTTP Pipeline

- Guards run before middleware.
- Middleware runs before the handler.
- Interceptors wrap the handler execution.
- Controller, guard, middleware, and interceptor resolution must remain scope-aware:
  - singleton instances can be cached
  - transient and request-scoped instances must be resolved at request time

## Repo-Specific Change Policy

- If you change DI, lifecycle, discovery, routing, or other public runtime semantics, update:
  - relevant tests in `packages/core/tests`
  - repository docs in `docs`
  - public docs in `website/docs`
- If you change performance-critical behavior, rerun the relevant benchmarks and update benchmark docs when claims change.
- If you change a core contract used by another package, inspect dependent packages and examples for fallout.
- Examples are not just marketing; treat them as usage verification.

## Validation Expectations

- Add regression tests for every bug fix in the core runtime.
- Keep benchmark changes measurable. If you introduce a new path or optimization, add or update a benchmark that exercises it.
- When touching public docs only, a Docusaurus build is the minimum validation step.

## Things To Avoid

- Do not introduce NestJS-style module patterns into Rikta core concepts. Rikta intentionally avoids module arrays.
- Do not widen discovery defaults casually.
- Do not add per-request allocations in hot paths unless the task requires them and the cost is measured.
- Do not update only one documentation surface when the public contract changed.

## Useful Heuristics

- For unusual application layouts, prefer explicit `autowired` patterns rather than relying on recursive discovery.
- Keep controllers thin and push reusable logic into injectable services.
- If a change affects request scope, validate both the no-request-scope path and the request-scoped proxy path.
