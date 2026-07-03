import 'reflect-metadata';
import { performance } from 'perf_hooks';
import http from 'http';
import { RiktaFactory, Injectable, Controller, Get, Autowired } from '@riktajs/core';

type ScenarioKey = 'plain' | 'requestEnabledPlain' | 'requestProxy';

interface HttpResult {
    statusCode: number;
    data: unknown;
    time: number;
}

interface ScenarioResult {
    plain: number[];
    requestEnabledPlain: number[];
    requestProxy: number[];
    errors: Record<ScenarioKey, number>;
}

function httpRequest(port: number, path: string): Promise<HttpResult> {
    return new Promise((resolve, reject) => {
        const start = performance.now();
        const req = http.request({
            hostname: '127.0.0.1',
            port,
            path,
            method: 'GET',
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode || 0,
                    data: data ? JSON.parse(data) : null,
                    time: performance.now() - start,
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function benchmarkInterleaved(
    scenarios: Record<ScenarioKey, { port: number; path: string }>,
    requests: number = 1500
): Promise<ScenarioResult> {
    const result: ScenarioResult = {
        plain: [],
        requestEnabledPlain: [],
        requestProxy: [],
        errors: {
            plain: 0,
            requestEnabledPlain: 0,
            requestProxy: 0,
        },
    };

    const scenarioOrder: ScenarioKey[] = ['plain', 'requestEnabledPlain', 'requestProxy'];

    for (let index = 0; index < requests; index++) {
        for (const scenarioKey of scenarioOrder) {
            const scenario = scenarios[scenarioKey];
            try {
                const response = await httpRequest(scenario.port, scenario.path);
                result[scenarioKey].push(response.time);
            } catch {
                result.errors[scenarioKey]++;
            }
        }
    }

    return result;
}

function calculateStats(times: number[]) {
    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((left, right) => left + right, 0);
    const mean = sum / times.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    return { mean, median, p95, p99, min, max };
}

function formatTime(ms: number): string {
    if (ms < 1) {
        return `${(ms * 1000).toFixed(2)}μs`;
    }
    return `${ms.toFixed(2)}ms`;
}

function formatDiff(candidate: number, baseline: number): string {
    const delta = ((candidate - baseline) / baseline * 100).toFixed(1);
    return delta.startsWith('-') ? `${delta}%` : `+${delta}%`;
}

@Injectable()
class PlainBenchmarkService {
    getPayload() {
        return { ok: true };
    }
}

@Controller('/bench')
class PlainBenchmarkController {
    constructor(@Autowired(PlainBenchmarkService) private readonly service: PlainBenchmarkService) { }

    @Get('/plain')
    getPlain() {
        return this.service.getPayload();
    }
}

@Injectable({ scope: 'request' })
class RequestBenchmarkContext {
    readonly requestId = Math.random().toString(36);
}

@Injectable()
class RequestEnabledPlainService {
    getPayload() {
        return { ok: true };
    }
}

@Injectable()
class RequestProxyService {
    @Autowired(RequestBenchmarkContext)
    private requestContext!: RequestBenchmarkContext;

    getPayload() {
        return { requestId: this.requestContext.requestId };
    }
}

@Controller('/bench')
class RequestEnabledPlainController {
    constructor(@Autowired(RequestEnabledPlainService) private readonly service: RequestEnabledPlainService) { }

    @Get('/plain')
    getPlain() {
        return this.service.getPayload();
    }
}

@Controller('/bench')
class RequestProxyBenchmarkController {
    constructor(@Autowired(RequestProxyService) private readonly service: RequestProxyService) { }

    @Get('/proxy')
    getProxyPayload() {
        return this.service.getPayload();
    }
}

async function runBenchmark() {
    console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║              REQUEST SCOPE PATH BENCHMARK - Rikta only                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    const requests = 1500;

    const plainApp = await RiktaFactory.create({
        port: 0,
        autowired: false,
        silent: true,
        logger: false,
        controllers: [PlainBenchmarkController],
        providers: [PlainBenchmarkService],
    });
    const plainAddress = await plainApp.listen();
    const plainPort = parseInt(new URL(plainAddress).port, 10);

    const requestEnabledApp = await RiktaFactory.create({
        port: 0,
        autowired: false,
        silent: true,
        logger: false,
        controllers: [RequestEnabledPlainController, RequestProxyBenchmarkController],
        providers: [RequestBenchmarkContext, RequestEnabledPlainService, RequestProxyService],
    });
    const requestEnabledAddress = await requestEnabledApp.listen();
    const requestEnabledPort = parseInt(new URL(requestEnabledAddress).port, 10);

    console.log(`✓ Plain Rikta app listening on ${plainPort}`);
    console.log(`✓ Request-enabled Rikta app listening on ${requestEnabledPort}\n`);

    const scenarios = {
        plain: { port: plainPort, path: '/bench/plain' },
        requestEnabledPlain: { port: requestEnabledPort, path: '/bench/plain' },
        requestProxy: { port: requestEnabledPort, path: '/bench/proxy' },
    } satisfies Record<ScenarioKey, { port: number; path: string }>;

    console.log('⏳ Warming up (200 interleaved requests per path)...');
    await benchmarkInterleaved(scenarios, 200);
    console.log('✓ Warm-up completed\n');

    console.log(`📊 Benchmarking ${requests} interleaved requests per path...`);
    const result = await benchmarkInterleaved(scenarios, requests);

    const plainStats = calculateStats(result.plain);
    const requestEnabledPlainStats = calculateStats(result.requestEnabledPlain);
    const requestProxyStats = calculateStats(result.requestProxy);

    console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║ Scenario                         │ Mean            │ Median          │ P95             │ vs Plain ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║ Plain Rikta (no request scope)   │ ${formatTime(plainStats.mean).padEnd(15)} │ ${formatTime(plainStats.median).padEnd(15)} │ ${formatTime(plainStats.p95).padEnd(15)} │ ${'baseline'.padStart(8)} ║`);
    console.log(`║ Request-enabled plain route      │ ${formatTime(requestEnabledPlainStats.mean).padEnd(15)} │ ${formatTime(requestEnabledPlainStats.median).padEnd(15)} │ ${formatTime(requestEnabledPlainStats.p95).padEnd(15)} │ ${formatDiff(requestEnabledPlainStats.mean, plainStats.mean).padStart(8)} ║`);
    console.log(`║ Request-scoped proxy route       │ ${formatTime(requestProxyStats.mean).padEnd(15)} │ ${formatTime(requestProxyStats.median).padEnd(15)} │ ${formatTime(requestProxyStats.p95).padEnd(15)} │ ${formatDiff(requestProxyStats.mean, plainStats.mean).padStart(8)} ║`);
    console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝\n');

    console.log('📈 Interpretation:');
    console.log(`   • Enabling request scope for the app adds ${formatDiff(requestEnabledPlainStats.mean, plainStats.mean)} to a plain route.`);
    console.log(`   • Using a request-scoped proxy adds ${formatDiff(requestProxyStats.mean, requestEnabledPlainStats.mean)} on top of the request-enabled plain route.`);
    console.log(`   • Errors: plain=${result.errors.plain}, requestEnabledPlain=${result.errors.requestEnabledPlain}, requestProxy=${result.errors.requestProxy}\n`);

    await plainApp.close();
    await requestEnabledApp.close();
}

runBenchmark().catch(error => {
    console.error(error);
    process.exitCode = 1;
});