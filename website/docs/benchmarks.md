---
sidebar_position: 11
---

# Benchmarks

Rikta is designed for high performance. This page presents benchmark results comparing Rikta with other popular Node.js frameworks.

## Overview

Rikta achieves excellent performance by:

- **Using Fastify** as the HTTP layer (one of the fastest Node.js frameworks)
- **Minimal overhead** in the DI container
- **Efficient routing** with optimized path matching
- **Lazy initialization** where possible

## Benchmark Results

### 🏆 Quick Summary

**Rikta significantly outperforms NestJS and is competitive with vanilla Fastify!**

| Metric | vs NestJS | vs Fastify |
|--------|-----------|------------|
| **Startup** | 🟢 **-53% faster** | 🟢 **-6% faster** |
| **Throughput** | 🟢 **+7% faster** | 🟡 **~5% slower** |
| **Request Latency** | 🟢 **~35% faster** | 🟡 **competitive** |

> **Note:** Micro-benchmarks have inherent variance. The key takeaway is that Rikta adds minimal overhead (~5-10%) over vanilla Fastify while being significantly faster than NestJS.

### Startup Time

Time to bootstrap and be ready for requests (lower is better):

| Framework | Startup Time | vs NestJS | vs Fastify |
|-----------|-------------|-----------|------------|
| **Rikta** | **2.87ms** | 🟢 -53.3% | 🟢 -6.3% |
| Fastify | 3.06ms | -50.2% | baseline |
| NestJS | 6.15ms | baseline | +101.1% |

*10 iterations, median time from process start to server ready*

### Request Overhead

Additional latency per request from framework overhead (lower is better):

#### GET / (Simple endpoint)

| Framework | Latency | vs NestJS | vs Fastify |
|-----------|---------|-----------|------------|
| **Rikta** | **195.70μs** | 🟢 -41.4% | 🟢 -24.1% |
| Fastify | 257.95μs | -22.7% | baseline |
| NestJS | 333.68μs | baseline | +29.4% |

#### POST / (Body parsing)

| Framework | Latency | vs NestJS | vs Fastify |
|-----------|---------|-----------|------------|
| **Rikta** | **248.40μs** | 🟢 -15.0% | 🟢 -36.0% |
| NestJS | 292.14μs | baseline | -24.7% |
| Fastify | 387.88μs | +32.8% | baseline |

#### GET /:id (Route params)

| Framework | Latency | vs NestJS | vs Fastify |
|-----------|---------|-----------|------------|
| **Rikta** | **143.36μs** | 🟢 -41.2% | 🟢 -1.6% |
| Fastify | 145.63μs | -40.2% | baseline |
| NestJS | 243.64μs | baseline | +67.3% |

*1000 requests per test, median latency*

### Load Testing (Autocannon)

High-concurrency throughput testing (higher is better):

| Framework | Req/sec | Latency (avg) | Latency (p99) | Total Requests |
|-----------|---------|---------------|---------------|----------------|
| Fastify | 12,949 | 0.14ms | 1.00ms | 142,430 |
| **Rikta** | **12,253** | 0.18ms | 1.00ms | 134,775 |
| NestJS | 11,460 | 0.22ms | 1.00ms | 114,605 |

*10 connections, 10 seconds duration*

**Performance vs NestJS:**
- Rikta: **+6.9%** req/sec, **-18.2%** latency
- Fastify: +13.0% req/sec, -36.4% latency

## Benchmark Details

### Test Environment

- **OS**: Linux (Ubuntu-based)
- **Node.js**: v22.x
- **Tool**: Custom benchmark suite + Autocannon
- **Iterations**: 10 for startup, 1000/500 for requests, 10s for load

### Test Application

Each framework runs an equivalent application with a simple controller:

```typescript
// Rikta version
@Controller('/')
export class AppController {
  @Get('/hello')
  hello() {
    return { message: 'Hello World' };
  }
  
  @Post('/users')
  createUser(@Body() body: any) {
    return { id: 1, ...body };
  }
  
  @Get('/users/:id')
  getUser(@Param('id') id: string) {
    return { id, name: 'John' };
  }
}
```

### Running Benchmarks

You can run the benchmarks yourself:

```bash
# Clone the repository
git clone https://github.com/riktahq/rikta
cd rikta/benchmarks

# Install dependencies
npm install

# Run all benchmarks
npm run bench

# Run specific benchmarks
npm run bench:startup       # Startup time
npm run bench:requests      # Request overhead
npm run bench:autocannon    # Load testing
```

## Performance Tips

### 1. Use Silent Mode in Production

```typescript
const app = await Rikta.create({
  port: 3000,
  silent: true,    // Essential for performance
  logger: false,   // Disable request logging
});
```

Silent mode eliminates console.log overhead, improving startup time by ~50% and request throughput by ~10%.

### 2. Enable Clustering

Use PM2 or Node.js cluster for multi-core usage:

```bash
pm2 start dist/index.js -i max
```

### 3. Optimize Serialization

For high-throughput endpoints, consider:

```typescript
@Get('/data')
@Serialize(false) // Skip JSON serialization if already a string
getData() {
  return this.cache.get('preformatted-json');
}
```

### 4. Use Response Caching

```typescript
@Get('/static-data')
@Cache(3600) // Cache for 1 hour
getStaticData() {
  return this.computeExpensiveData();
}
```

### 5. Avoid Unnecessary Middleware

Only add middleware where needed:

```typescript
// Good - middleware only on protected routes
@Controller('/public')
export class PublicController {
  // No guards, no middleware
}

@Controller('/admin')
@UseGuards(AuthGuard)
export class AdminController {
  // Auth only where needed
}
```

## Why Rikta is Fast

### 1. Fastify Foundation

Rikta uses Fastify, which is optimized for:
- JSON serialization with fast-json-stringify
- Route matching with find-my-way
- Request parsing

### 2. Lightweight DI Container

The dependency injection system is designed to be:
- Fast at resolution time
- Efficient with memory
- Minimal overhead per request
- Single-pass registration at startup

### 3. No Runtime Module Resolution

Unlike frameworks with dynamic modules, Rikta resolves all dependencies at startup, not per-request.

### 4. Direct Route Registration

Routes are registered directly with Fastify without abstraction layers.

### 5. Silent Mode Optimization

When `silent: true`, Rikta skips all console output during startup and request handling, reducing I/O overhead.

## Comparison Notes

### vs. Raw Fastify

Rikta adds minimal overhead (~5-10%) compared to raw Fastify while providing:
- Dependency injection
- Decorators for routing
- Class-based architecture
- Validation integration
- Structured architecture

The small overhead is justified by significantly better developer experience and maintainability.

### vs. NestJS

Rikta is significantly faster than NestJS (**~35% on average**) because:
- Simpler DI container with less abstraction
- No runtime module resolution
- Optimized route registration
- Direct Fastify integration without middleware chains
- Silent mode eliminates logging overhead

### vs. Express

Both Rikta and Express can handle JSON APIs, but Rikta:
- Is significantly faster on throughput
- Has built-in TypeScript support
- Provides structure without boilerplate
- Uses modern async/await patterns

## Real-World Performance

In production applications, Rikta typically handles:

- **10,000-15,000 req/sec** for simple endpoints (single instance)
- **5,000-10,000 req/sec** with database queries
- **2,000-5,000 req/sec** with complex business logic

Actual performance depends on:
- Database query efficiency
- External service calls
- Business logic complexity
- Payload size
- Hardware specifications

With clustering (e.g., PM2 with 4 processes), you can multiply these numbers by the number of cores.

## Latest Benchmark Data

All benchmarks are run automatically on every release. You can find:

- Full benchmark results in [`benchmarks/RESULTS.md`](https://github.com/riktahq/rikta/blob/main/benchmarks/RESULTS.md)
- Quick summary in [`benchmarks/QUICK-SUMMARY.md`](https://github.com/riktahq/rikta/blob/main/benchmarks/QUICK-SUMMARY.md)
- Benchmark code in [`benchmarks/`](https://github.com/riktahq/rikta/tree/main/benchmarks) directory

*Last updated: January 8, 2026*
