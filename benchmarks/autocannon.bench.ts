import 'reflect-metadata';
import autocannon from 'autocannon';
import Fastify from 'fastify';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { RiktaFactory } from '../src/core/application';
import { AutocannonDataService, AutocannonApiController } from './fixtures/autocannon.fixture';
import { NestAutocannonModule } from './fixtures/nestjs-autocannon.fixture';

// ===== Benchmark Configuration =====

interface BenchConfig {
  connections: number;
  duration: number;
  pipelining: number;
}

const BENCH_CONFIGS: Record<string, BenchConfig> = {
  light: { connections: 10, duration: 10, pipelining: 1 },
  moderate: { connections: 50, duration: 20, pipelining: 1 },
  heavy: { connections: 100, duration: 30, pipelining: 10 },
};

interface User {
  id: string;
  name: string;
  email: string;
}

// ===== Benchmark Functions =====

async function runAutocannon(
  url: string,
  config: BenchConfig
): Promise<autocannon.Result> {
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url,
      connections: config.connections,
      duration: config.duration,
      pipelining: config.pipelining,
    }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });

    autocannon.track(instance, { renderProgressBar: false });
  });
}

async function setupFastify(): Promise<{ app: any; port: number }> {
  const app = Fastify({ logger: false });
  const data: User[] = [];

  app.get('/api/users', async () => data);
  app.get('/api/users/:id', async (req: any) => {
    return data.find(u => u.id === req.params.id) || { error: 'Not found' };
  });
  app.post('/api/users', async (req: any) => {
    const user = { id: Date.now().toString(), ...req.body };
    data.push(user);
    return user;
  });
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: Date.now()
  }));

  await app.listen({ port: 0, host: '127.0.0.1' });
  const port = (app.server.address() as any).port;

  return { app, port };
}

async function setupRikta(): Promise<{ app: any; port: number }> {
  const app = await RiktaFactory.create({
    port: 0,
    autowired: false,
    silent: true,
    controllers: [AutocannonApiController],
    providers: [AutocannonDataService]
  });

  const address = await app.listen();
  const port = parseInt(new URL(address).port);

  return { app, port };
}

async function setupNestJS(): Promise<{ app: any; port: number }> {
  const app = await NestFactory.create(
    NestAutocannonModule,
    new FastifyAdapter({ logger: false }),
    { logger: false }
  );

  await app.listen(0, '127.0.0.1');
  const port = (app.getHttpAdapter().getInstance().server.address() as any).port;

  return { app, port };
}

// ===== Display Functions =====

function displayResult(name: string, result: autocannon.Result) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Requests:       ${result.requests.total.toLocaleString()} (${result.requests.average.toFixed(0)}/sec)`);
  console.log(`  Latency:        ${result.latency.mean.toFixed(2)}ms (avg) | ${result.latency.p99.toFixed(2)}ms (p99)`);
  console.log(`  Throughput:     ${(result.throughput.mean / 1024 / 1024).toFixed(2)} MB/sec`);
  console.log(`  Errors:         ${result.errors}`);
  console.log(`  Timeouts:       ${result.timeouts}`);
  console.log(`  Non-2xx:        ${result.non2xx}`);
  console.log(`${'='.repeat(60)}`);
}

function compareResults(fastifyResult: autocannon.Result, riktaResult: autocannon.Result, nestResult: autocannon.Result) {
  console.log(`\n╔═══════════════════════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║                                  COMPARISON                                                   ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║ Metric              │  Fastify     │  Rikta       │  NestJS      │ R vs F   │ N vs F   │ R vs N   ║`);
  console.log(`╟─────────────────────┼──────────────┼──────────────┼──────────────┼──────────┼──────────┼──────────╢`);

  const reqDiffR = ((riktaResult.requests.average - fastifyResult.requests.average) / fastifyResult.requests.average * 100).toFixed(1);
  const reqDiffN = ((nestResult.requests.average - fastifyResult.requests.average) / fastifyResult.requests.average * 100).toFixed(1);
  const reqDiffRN = ((riktaResult.requests.average - nestResult.requests.average) / nestResult.requests.average * 100).toFixed(1);
  
  const latDiffR = ((riktaResult.latency.mean - fastifyResult.latency.mean) / fastifyResult.latency.mean * 100).toFixed(1);
  const latDiffN = ((nestResult.latency.mean - fastifyResult.latency.mean) / fastifyResult.latency.mean * 100).toFixed(1);
  const latDiffRN = ((riktaResult.latency.mean - nestResult.latency.mean) / nestResult.latency.mean * 100).toFixed(1);
  
  const throughputDiffR = ((riktaResult.throughput.mean - fastifyResult.throughput.mean) / fastifyResult.throughput.mean * 100).toFixed(1);
  const throughputDiffN = ((nestResult.throughput.mean - fastifyResult.throughput.mean) / fastifyResult.throughput.mean * 100).toFixed(1);
  const throughputDiffRN = ((riktaResult.throughput.mean - nestResult.throughput.mean) / nestResult.throughput.mean * 100).toFixed(1);

  console.log(`║ Req/sec             │ ${fastifyResult.requests.average.toFixed(0).padEnd(12)} │ ${riktaResult.requests.average.toFixed(0).padEnd(12)} │ ${nestResult.requests.average.toFixed(0).padEnd(12)} │ ${(reqDiffR.startsWith('-') ? reqDiffR : '+' + reqDiffR).padStart(8)}% │ ${(reqDiffN.startsWith('-') ? reqDiffN : '+' + reqDiffN).padStart(8)}% │ ${(reqDiffRN.startsWith('-') ? reqDiffRN : '+' + reqDiffRN).padStart(8)}% ║`);
  console.log(`║ Latency (mean)      │ ${fastifyResult.latency.mean.toFixed(2).padEnd(10)}ms │ ${riktaResult.latency.mean.toFixed(2).padEnd(10)}ms │ ${nestResult.latency.mean.toFixed(2).padEnd(10)}ms │ ${(latDiffR.startsWith('-') ? latDiffR : '+' + latDiffR).padStart(8)}% │ ${(latDiffN.startsWith('-') ? latDiffN : '+' + latDiffN).padStart(8)}% │ ${(latDiffRN.startsWith('-') ? latDiffRN : '+' + latDiffRN).padStart(8)}% ║`);
  console.log(`║ Latency (p99)       │ ${fastifyResult.latency.p99.toFixed(2).padEnd(10)}ms │ ${riktaResult.latency.p99.toFixed(2).padEnd(10)}ms │ ${nestResult.latency.p99.toFixed(2).padEnd(10)}ms │          │          │          ║`);
  console.log(`║ Throughput (MB/s)   │ ${(fastifyResult.throughput.mean / 1024 / 1024).toFixed(2).padEnd(12)} │ ${(riktaResult.throughput.mean / 1024 / 1024).toFixed(2).padEnd(12)} │ ${(nestResult.throughput.mean / 1024 / 1024).toFixed(2).padEnd(12)} │ ${(throughputDiffR.startsWith('-') ? throughputDiffR : '+' + throughputDiffR).padStart(8)}% │ ${(throughputDiffN.startsWith('-') ? throughputDiffN : '+' + throughputDiffN).padStart(8)}% │ ${(throughputDiffRN.startsWith('-') ? throughputDiffRN : '+' + throughputDiffRN).padStart(8)}% ║`);
  console.log(`║ Total Requests      │ ${fastifyResult.requests.total.toLocaleString().padEnd(12)} │ ${riktaResult.requests.total.toLocaleString().padEnd(12)} │ ${nestResult.requests.total.toLocaleString().padEnd(12)} │          │          │          ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════════════════════╝`);
}

// ===== Main Benchmark =====

async function runBenchmark() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║      AUTOCANNON BENCHMARK - Rikta vs Fastify vs NestJS                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const configName = process.argv[2] || 'light';
  const config = BENCH_CONFIGS[configName] || BENCH_CONFIGS.light;

  console.log(`⚙️  Configuration: ${configName.toUpperCase()}`);
  console.log(`   • Connections: ${config.connections}`);
  console.log(`   • Duration: ${config.duration}s`);
  console.log(`   • Pipelining: ${config.pipelining}\n`);

  // Setup servers
  console.log('⚙️  Setting up servers...');
  const { app: fastifyApp, port: fastifyPort } = await setupFastify();
  console.log(`   ✓ Fastify on port ${fastifyPort}`);

  const { app: riktaApp, port: riktaPort } = await setupRikta();
  console.log(`   ✓ Rikta on port ${riktaPort}`);

  const { app: nestApp, port: nestPort } = await setupNestJS();
  console.log(`   ✓ NestJS on port ${nestPort}\n`);

  // Run benchmarks
  console.log('📊 Running Fastify benchmark...');
  const fastifyResult = await runAutocannon(
    `http://127.0.0.1:${fastifyPort}/api/health`,
    config
  );
  displayResult('FASTIFY RESULTS', fastifyResult);

  console.log('\n📊 Running Rikta benchmark...');
  const riktaResult = await runAutocannon(
    `http://127.0.0.1:${riktaPort}/api/health`,
    config
  );
  displayResult('RIKTA RESULTS', riktaResult);

  console.log('\n📊 Running NestJS benchmark...');
  const nestResult = await runAutocannon(
    `http://127.0.0.1:${nestPort}/api/health`,
    config
  );
  displayResult('NESTJS RESULTS', nestResult);

  // Compare
  compareResults(fastifyResult, riktaResult, nestResult);

  // Cleanup
  await fastifyApp.close();
  await riktaApp.close();
  await nestApp.close();

  console.log('\n✅ Benchmark completed!\n');
}

// Run
runBenchmark().catch(console.error);
