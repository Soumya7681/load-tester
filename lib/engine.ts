import http from 'node:http';
import https from 'node:https';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseConfig, type TestConfig } from './schema';
import { Histogram, samplePercentile, round } from './stats';
import type { Report, StageSummary, TestEvent, Tick, Verdict } from './types';

interface RequestResult {
  ok: boolean;
  status?: number;
  error?: string;
  bytes: number;
  latency: number;
}

/**
 * Stepped load test: runs each stage's virtual users (VUs) for its duration, one stage
 * after another, and reports per-second ticks plus a summary per stage.
 */
export class LoadTest {
  readonly id = new Date().toISOString().replace(/[:.]/g, '-');
  readonly config: TestConfig;
  stopped = false;

  private abort = new AbortController();
  private url: URL;
  private lib: typeof http | typeof https;
  private agent: http.Agent;
  private headers: Record<string, string>;
  private testStart = 0;

  constructor(input: unknown) {
    this.config = parseConfig(input);
    this.url = new URL(this.config.url);
    this.lib = this.url.protocol === 'https:' ? https : http;
    this.agent = new this.lib.Agent({ keepAlive: true, maxSockets: Infinity });
    this.headers = buildHeaders(this.config);
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.abort.abort();
  }

  async run(onEvent: (e: TestEvent) => void = () => {}): Promise<Report> {
    const startedAt = new Date().toISOString();
    this.testStart = performance.now();
    const stages: StageSummary[] = [];
    const timeline: Tick[] = [];
    const emit = (e: TestEvent) => {
      if (e.type === 'tick') timeline.push(e.data);
      onEvent(e);
    };

    try {
      for (let i = 0; i < this.config.stages.length && !this.stopped; i++) {
        const summary = await this.runStage(i, emit);
        stages.push(summary);
        emit({ type: 'stageEnd', data: summary });
      }
    } finally {
      this.agent.destroy();
    }

    const report: Report = {
      id: this.id,
      config: this.config,
      startedAt,
      finishedAt: new Date().toISOString(),
      stopped: this.stopped,
      stages,
      timeline,
      verdict: verdict(stages, this.config),
    };
    emit({ type: 'done', data: report });
    return report;
  }

  private elapsed() {
    return round((performance.now() - this.testStart) / 1000, 1);
  }

  private async runStage(index: number, emit: (e: TestEvent) => void): Promise<StageSummary> {
    const cfg = this.config;
    const { users, duration } = cfg.stages[index];
    const hist = new Histogram();
    const totals = {
      requests: 0,
      errors: 0,
      bytes: 0,
      status: {} as Record<string, number>,
      errorTypes: {} as Record<string, number>,
    };
    let tick = { requests: 0, errors: 0, latencies: [] as number[] };
    let active = 0;

    const stageStart = performance.now();
    const stageEnd = stageStart + duration * 1000;
    const over = () => this.stopped || performance.now() >= stageEnd;
    const rampMs = Math.min(cfg.rampUp, duration) * 1000;

    emit({ type: 'stageStart', data: { stage: index + 1, users, duration, startedAt: this.elapsed() } });

    const emitTick = () => {
      const t = tick;
      tick = { requests: 0, errors: 0, latencies: [] };
      emit({
        type: 'tick',
        data: {
          stage: index + 1,
          elapsed: this.elapsed(),
          activeUsers: active,
          targetUsers: users,
          rps: t.requests,
          errors: t.errors,
          errorRate: t.requests ? round((t.errors / t.requests) * 100) : 0,
          avg: t.latencies.length ? round(t.latencies.reduce((a, b) => a + b, 0) / t.latencies.length) : 0,
          p95: samplePercentile(t.latencies, 95),
          totalRequests: totals.requests,
        },
      });
    };
    const timer = setInterval(emitTick, 1000);

    const vu = async (startDelay: number) => {
      if (startDelay > 0) await this.pause(startDelay);
      if (over()) return;
      active++;
      while (!over()) {
        const r = await this.request();
        if (this.stopped) break; // aborted requests are not real results
        hist.record(r.latency);
        totals.requests++;
        tick.requests++;
        tick.latencies.push(r.latency);
        totals.bytes += r.bytes;
        if (r.status) totals.status[r.status] = (totals.status[r.status] ?? 0) + 1;
        if (!r.ok) {
          totals.errors++;
          tick.errors++;
          const key = r.error ?? `HTTP ${r.status}`;
          totals.errorTypes[key] = (totals.errorTypes[key] ?? 0) + 1;
        }
        if (cfg.thinkTime > 0) await this.pause(cfg.thinkTime);
      }
      active--;
    };

    await Promise.all(Array.from({ length: users }, (_, k) => vu((rampMs * k) / users)));
    clearInterval(timer);
    if (tick.requests > 0) emitTick();

    const elapsed = (performance.now() - stageStart) / 1000;
    const latency = hist.summary();
    const errorRate = totals.requests ? round((totals.errors / totals.requests) * 100) : 0;
    return {
      stage: index + 1,
      users,
      plannedDuration: duration,
      duration: round(elapsed),
      requests: totals.requests,
      errors: totals.errors,
      errorRate,
      rps: round(totals.requests / elapsed),
      bytesPerSec: Math.round(totals.bytes / elapsed),
      latency,
      status: totals.status,
      errorTypes: totals.errorTypes,
      withinSla: totals.requests > 0 && latency.p95 <= cfg.slaP95 && errorRate <= cfg.slaErrorRate,
    };
  }

  private pause(ms: number) {
    return sleep(ms, undefined, { signal: this.abort.signal }).catch(() => {});
  }

  private request(): Promise<RequestResult> {
    const cfg = this.config;
    return new Promise((resolve) => {
      const t0 = performance.now();
      const done = (r: Omit<RequestResult, 'latency' | 'bytes'> & { bytes?: number }) =>
        resolve({ bytes: 0, ...r, latency: performance.now() - t0 });

      const req = this.lib.request(
        this.url,
        {
          method: cfg.method,
          headers: this.headers,
          agent: this.agent,
          signal: this.abort.signal,
          timeout: cfg.timeout,
        },
        (res) => {
          let bytes = 0;
          const status = res.statusCode ?? 0;
          res.on('data', (chunk: Buffer) => { bytes += chunk.length; });
          res.on('end', () => done({ ok: status < 400, status, bytes }));
          res.on('error', (err) => done({ ok: false, status, error: errName(err), bytes }));
        },
      );
      req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
      req.on('error', (err) => done({ ok: false, error: errName(err) }));
      if (cfg.body) req.write(cfg.body);
      req.end();
    });
  }
}

function buildHeaders(cfg: TestConfig) {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg.headers)) {
    if (k.trim()) headers[k.trim().toLowerCase()] = v;
  }
  if (cfg.body) {
    headers['content-type'] ??= 'application/json';
    headers['content-length'] = String(Buffer.byteLength(cfg.body));
  }
  headers['user-agent'] ??= 'load-tester/1.0';
  return headers;
}

function errName(err: Error & { code?: string }) {
  return err.code || err.name || 'ERROR';
}

/** Highest user count that stayed within SLA, and the first stage that broke it. */
function verdict(stages: StageSummary[], cfg: TestConfig): Verdict {
  let maxUsersWithinSla: number | null = null;
  let firstFailure: Verdict['firstFailure'] = null;
  for (const s of stages) {
    if (firstFailure) break;
    if (s.withinSla) {
      maxUsersWithinSla = s.users;
      continue;
    }
    const reasons: string[] = [];
    if (s.requests === 0) reasons.push('no completed requests');
    if (s.latency.p95 > cfg.slaP95) reasons.push(`p95 ${s.latency.p95} ms > ${cfg.slaP95} ms`);
    if (s.errorRate > cfg.slaErrorRate) reasons.push(`errors ${s.errorRate}% > ${cfg.slaErrorRate}%`);
    firstFailure = { stage: s.stage, users: s.users, reasons };
  }
  return { maxUsersWithinSla, firstFailure };
}
