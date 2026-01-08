import 'reflect-metadata';
import { performance } from 'perf_hooks';
import http from 'http';
import Fastify from 'fastify';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { RiktaFactory } from '@riktajs/core';
import { RequestUserService, RequestUserController } from './fixtures/request.fixture';
import { NestRequestUserModule } from './fixtures/nestjs-request.fixture';

// ===== HTTP Client Helper =====

function httpRequest(options: http.RequestOptions, body?: any): Promise<{ statusCode: number; data: any; time: number }> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const time = performance.now() - start;
        resolve({
          statusCode: res.statusCode || 0,
          data: data ? JSON.parse(data) : null,
          time
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ===== Benchmark Functions =====

async function benchmarkRequests(
  port: number,
  requests: number = 1000
): Promise<{ times: number[]; errors: number }> {
  const times: number[] = [];
  let errors = 0;

  for (let i = 0; i < requests; i++) {
    try {
      const result = await httpRequest({
        hostname: '127.0.0.1',
        port,
        path: '/api/users',
        method: 'GET'
      });
      times.push(result.time);
    } catch (err) {
      errors++;
    }
  }

  return { times, errors };
}

async function benchmarkPostRequests(
  port: number,
  requests: number = 500
): Promise<{ times: number[]; errors: number }> {
  const times: number[] = [];
  let errors = 0;

  for (let i = 0; i < requests; i++) {
    try {
      const result = await httpRequest({
        hostname: '127.0.0.1',
        port,
        path: '/api/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        name: `User ${i}`,
        email: `user${i}@example.com`
      });
      times.push(result.time);
    } catch (err) {
      errors++;
    }
  }

  return { times, errors };
}

async function benchmarkParamRequests(
  port: number,
  requests: number = 1000
): Promise<{ times: number[]; errors: number }> {
  const times: number[] = [];
  let errors = 0;

  for (let i = 0; i < requests; i++) {
    try {
      const result = await httpRequest({
        hostname: '127.0.0.1',
        port,
        path: `/api/users/123`,
        method: 'GET'
      });
      times.push(result.time);
    } catch (err) {
      errors++;
    }
  }

  return { times, errors };
}

// ===== Statistics =====

function calculateStats(times: number[]) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const mean = sum / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { mean, min, max, median, p95, p99 };
}

function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  return `${ms.toFixed(2)}ms`;
}

function displayResults(
  title: string,
  fastifyStats: any,
  riktaStats: any,
  nestStats: any,
  fastifyErrors: number,
  riktaErrors: number,
  nestErrors: number
) {
  console.log(`\n╔═══════════════════════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║ ${title.padEnd(93)} ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ Metric    │  Fastify        │  Rikta          │  NestJS         │ R vs F   │ N vs F   │ R vs N   ║');
  console.log('╟───────────┼─────────────────┼─────────────────┼─────────────────┼──────────┼──────────┼──────────╢');
  
  const metrics = [
    ['Mean', fastifyStats.mean, riktaStats.mean, nestStats.mean],
    ['Median', fastifyStats.median, riktaStats.median, nestStats.median],
    ['Min', fastifyStats.min, riktaStats.min, nestStats.min],
    ['Max', fastifyStats.max, riktaStats.max, nestStats.max],
    ['P95', fastifyStats.p95, riktaStats.p95, nestStats.p95],
    ['P99', fastifyStats.p99, riktaStats.p99, nestStats.p99],
  ];

  metrics.forEach(([name, fastify, rikta, nest]) => {
    const riktaDiff = ((rikta - fastify) / fastify * 100).toFixed(1);
    const nestDiff = ((nest - fastify) / fastify * 100).toFixed(1);
    const riktaNestDiff = ((rikta - nest) / nest * 100).toFixed(1);
    const riktaDiffStr = riktaDiff.startsWith('-') ? `${riktaDiff}%` : `+${riktaDiff}%`;
    const nestDiffStr = nestDiff.startsWith('-') ? `${nestDiff}%` : `+${nestDiff}%`;
    const riktaNestDiffStr = riktaNestDiff.startsWith('-') ? `${riktaNestDiff}%` : `+${riktaNestDiff}%`;
    console.log(`║ ${String(name).padEnd(9)} │ ${formatTime(fastify).padEnd(15)} │ ${formatTime(rikta).padEnd(15)} │ ${formatTime(nest).padEnd(15)} │ ${riktaDiffStr.padStart(8)} │ ${nestDiffStr.padStart(8)} │ ${riktaNestDiffStr.padStart(8)} ║`);
  });

  console.log('╟───────────┼─────────────────┼─────────────────┼─────────────────┼──────────┼──────────┼──────────╢');
  console.log(`║ Errors    │ ${String(fastifyErrors).padEnd(15)} │ ${String(riktaErrors).padEnd(15)} │ ${String(nestErrors).padEnd(15)} │          │          │          ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════╝');
}

// ===== Main Benchmark =====

async function runBenchmark() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       REQUEST OVERHEAD BENCHMARK - Rikta vs Fastify vs NestJS            ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const getRequests = 1000;
  const postRequests = 500;
  const paramRequests = 1000;

  // Setup Fastify
  console.log('⚙️  Setting up Fastify...');
  const fastifyApp = Fastify({ 
    logger: false,
    disableRequestLogging: true,
    bodyLimit: 1048576
  });
  
  // Use a shared service-like object for fair comparison
  const fastifyUserService = {
    users: [] as any[],
    getAll() { return this.users; },
    getById(id: string) { return { id, name: `User ${id}`, email: `user${id}@test.com` }; },
    create(data: any) {
      const user = { id: Date.now().toString(), ...data };
      this.users.push(user);
      return user;
    }
  };
  
  fastifyApp.get('/api/users', async () => fastifyUserService.getAll());
  fastifyApp.get('/api/users/:id', async (req: any) => {
    return fastifyUserService.getById(req.params.id);
  });
  fastifyApp.post('/api/users', async (req: any) => {
    return fastifyUserService.create(req.body);
  });

  await fastifyApp.listen({ port: 0, host: '127.0.0.1' });
  const fastifyPort = (fastifyApp.server.address() as any).port;
  console.log(`✓ Fastify listening on port ${fastifyPort}`);

  // Setup Rikta
  console.log('⚙️  Setting up Rikta...');
  const riktaApp = await RiktaFactory.create({
    port: 0,
    autowired: false,
    silent: true,
    logger: false,
    controllers: [RequestUserController],
    providers: [RequestUserService]
  });
  
  const riktaAddress = await riktaApp.listen();
  const riktaPort = parseInt(new URL(riktaAddress).port);
  console.log(`✓ Rikta listening on port ${riktaPort}`);

  // Setup NestJS
  console.log('⚙️  Setting up NestJS...');
  const nestApp = await NestFactory.create(
    NestRequestUserModule,
    new FastifyAdapter(),
    { logger: false }
  );
  await nestApp.listen(0, '127.0.0.1');
  const nestPort = (nestApp.getHttpAdapter().getInstance().server.address() as any).port;
  console.log(`✓ NestJS listening on port ${nestPort}\n`);

  // Warm-up
  console.log('⏳ Warming up...');
  await benchmarkRequests(fastifyPort, 100);
  await benchmarkRequests(riktaPort, 100);
  await benchmarkRequests(nestPort, 100);
  console.log('✓ Warm-up completed\n');

  // ===== GET Requests Benchmark =====
  console.log(`📊 Benchmarking GET requests (${getRequests} requests)...`);
  
  const fastifyGetResult = await benchmarkRequests(fastifyPort, getRequests);
  const fastifyGetStats = calculateStats(fastifyGetResult.times);
  console.log('  ✓ Fastify completed');

  const riktaGetResult = await benchmarkRequests(riktaPort, getRequests);
  const riktaGetStats = calculateStats(riktaGetResult.times);
  console.log('  ✓ Rikta completed');

  const nestGetResult = await benchmarkRequests(nestPort, getRequests);
  const nestGetStats = calculateStats(nestGetResult.times);
  console.log('  ✓ NestJS completed');

  displayResults('GET /api/users', fastifyGetStats, riktaGetStats, nestGetStats, 
    fastifyGetResult.errors, riktaGetResult.errors, nestGetResult.errors);

  // ===== POST Requests Benchmark =====
  console.log(`\n📊 Benchmarking POST requests (${postRequests} requests)...`);
  
  const fastifyPostResult = await benchmarkPostRequests(fastifyPort, postRequests);
  const fastifyPostStats = calculateStats(fastifyPostResult.times);
  console.log('  ✓ Fastify completed');

  const riktaPostResult = await benchmarkPostRequests(riktaPort, postRequests);
  const riktaPostStats = calculateStats(riktaPostResult.times);
  console.log('  ✓ Rikta completed');

  const nestPostResult = await benchmarkPostRequests(nestPort, postRequests);
  const nestPostStats = calculateStats(nestPostResult.times);
  console.log('  ✓ NestJS completed');

  displayResults('POST /api/users', fastifyPostStats, riktaPostStats, nestPostStats,
    fastifyPostResult.errors, riktaPostResult.errors, nestPostResult.errors);

  // ===== Param Requests Benchmark =====
  console.log(`\n📊 Benchmarking Param requests (${paramRequests} requests)...`);
  
  const fastifyParamResult = await benchmarkParamRequests(fastifyPort, paramRequests);
  const fastifyParamStats = calculateStats(fastifyParamResult.times);
  console.log('  ✓ Fastify completed');

  const riktaParamResult = await benchmarkParamRequests(riktaPort, paramRequests);
  const riktaParamStats = calculateStats(riktaParamResult.times);
  console.log('  ✓ Rikta completed');

  const nestParamResult = await benchmarkParamRequests(nestPort, paramRequests);
  const nestParamStats = calculateStats(nestParamResult.times);
  console.log('  ✓ NestJS completed');

  displayResults('GET /api/users/:id', fastifyParamStats, riktaParamStats, nestParamStats,
    fastifyParamResult.errors, riktaParamResult.errors, nestParamResult.errors);

  // ===== Summary =====
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                            SUMMARY                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const riktaAvgOverhead = [
    (riktaGetStats.mean - fastifyGetStats.mean) / fastifyGetStats.mean * 100,
    (riktaPostStats.mean - fastifyPostStats.mean) / fastifyPostStats.mean * 100,
    (riktaParamStats.mean - fastifyParamStats.mean) / fastifyParamStats.mean * 100
  ];
  const riktaAvgOverheadPercent = (riktaAvgOverhead.reduce((a, b) => a + b) / riktaAvgOverhead.length).toFixed(1);

  const nestAvgOverhead = [
    (nestGetStats.mean - fastifyGetStats.mean) / fastifyGetStats.mean * 100,
    (nestPostStats.mean - fastifyPostStats.mean) / fastifyPostStats.mean * 100,
    (nestParamStats.mean - fastifyParamStats.mean) / fastifyParamStats.mean * 100
  ];
  const nestAvgOverheadPercent = (nestAvgOverhead.reduce((a, b) => a + b) / nestAvgOverhead.length).toFixed(1);

  console.log(`📊 Average overhead vs Fastify (vanilla):`);
  console.log(`   Rikta:  ${riktaAvgOverheadPercent}%`);
  console.log(`     • GET:   ${riktaAvgOverhead[0].toFixed(1)}%`);
  console.log(`     • POST:  ${riktaAvgOverhead[1].toFixed(1)}%`);
  console.log(`     • Param: ${riktaAvgOverhead[2].toFixed(1)}%`);
  console.log(`   NestJS: ${nestAvgOverheadPercent}%`);
  console.log(`     • GET:   ${nestAvgOverhead[0].toFixed(1)}%`);
  console.log(`     • POST:  ${nestAvgOverhead[1].toFixed(1)}%`);
  console.log(`     • Param: ${nestAvgOverhead[2].toFixed(1)}%\n`);

  // Rikta vs NestJS comparison
  const riktaVsNest = [
    (riktaGetStats.mean - nestGetStats.mean) / nestGetStats.mean * 100,
    (riktaPostStats.mean - nestPostStats.mean) / nestPostStats.mean * 100,
    (riktaParamStats.mean - nestParamStats.mean) / nestParamStats.mean * 100
  ];
  const riktaVsNestAvg = (riktaVsNest.reduce((a, b) => a + b) / riktaVsNest.length).toFixed(1);
  
  console.log(`🆚 Rikta vs NestJS:`);
  console.log(`   Average: ${riktaVsNestAvg}% ${parseFloat(riktaVsNestAvg) < 0 ? '(Rikta faster)' : '(NestJS faster)'}`);
  console.log(`     • GET:   ${riktaVsNest[0].toFixed(1)}%`);
  console.log(`     • POST:  ${riktaVsNest[1].toFixed(1)}%`);
  console.log(`     • Param: ${riktaVsNest[2].toFixed(1)}%\n`);

  const totalRequests = (getRequests + postRequests + paramRequests) * 3;
  const totalErrors = fastifyGetResult.errors + fastifyPostResult.errors + fastifyParamResult.errors +
                      riktaGetResult.errors + riktaPostResult.errors + riktaParamResult.errors +
                      nestGetResult.errors + nestPostResult.errors + nestParamResult.errors;

  console.log(`✅ Total requests: ${totalRequests}`);
  console.log(`❌ Total errors: ${totalErrors}\n`);

  // Cleanup
  await fastifyApp.close();
  await riktaApp.close();
  await nestApp.close();

  console.log('🏁 Benchmark completed!\n');
}

// Run
runBenchmark().catch(console.error);
