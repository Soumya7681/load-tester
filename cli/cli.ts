import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { LoadTest } from '../lib/engine';
import { saveReport } from '../lib/reports';
import type { TestEvent } from '../lib/types';

const HELP = `
Usage: npm run cli -- --url <url> [options]

  -u, --url <url>          Target URL (required unless --config)
  -n, --users <list>       Concurrent users per stage, comma separated (default: 10,50,100)
  -d, --duration <sec>     Seconds per stage (default: 30)
  -r, --ramp-up <sec>      Seconds to ramp users up within each stage (default: 0)
  -m, --method <method>    HTTP method (default: GET)
  -H, --header <k: v>      Request header, repeatable
  -b, --body <string>      Request body (content-type defaults to application/json)
      --think-time <ms>    Pause per user between requests (default: 0)
      --timeout <ms>       Per-request timeout (default: 10000)
      --sla-p95 <ms>       p95 latency limit for "within SLA" (default: 1000)
      --sla-errors <pct>   Error rate limit for "within SLA" (default: 1)
  -c, --config <file>      JSON config file (same shape as the dashboard / API)
      --json               Print final report as JSON
  -h, --help               Show this help

Example:
  npm run cli -- -u http://localhost:4000/api -n 10,50,100,200 -d 20 -r 5
`;

const { values: a } = parseArgs({
  options: {
    url: { type: 'string', short: 'u' },
    users: { type: 'string', short: 'n', default: '10,50,100' },
    duration: { type: 'string', short: 'd', default: '30' },
    'ramp-up': { type: 'string', short: 'r', default: '0' },
    method: { type: 'string', short: 'm', default: 'GET' },
    header: { type: 'string', short: 'H', multiple: true, default: [] },
    body: { type: 'string', short: 'b' },
    'think-time': { type: 'string', default: '0' },
    timeout: { type: 'string', default: '10000' },
    'sla-p95': { type: 'string', default: '1000' },
    'sla-errors': { type: 'string', default: '1' },
    config: { type: 'string', short: 'c' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (a.help || (!a.url && !a.config)) {
  console.log(HELP);
  process.exit(a.help ? 0 : 1);
}

async function main() {
  let config: unknown;
  if (a.config) {
    config = JSON.parse(await fs.readFile(a.config, 'utf8'));
  } else {
    const headers: Record<string, string> = {};
    for (const h of a.header) {
      const i = h.indexOf(':');
      if (i > 0) headers[h.slice(0, i).trim()] = h.slice(i + 1).trim();
    }
    config = {
      url: a.url,
      method: a.method,
      headers,
      body: a.body,
      stages: a.users.split(',').map((u) => ({ users: Number(u.trim()), duration: Number(a.duration) })),
      rampUp: Number(a['ramp-up']),
      thinkTime: Number(a['think-time']),
      timeout: Number(a.timeout),
      slaP95: Number(a['sla-p95']),
      slaErrorRate: Number(a['sla-errors']),
    };
  }

  let test;
  try {
    test = new LoadTest(config);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }

  const c = test.config;
  const quiet = a.json;
  const log = (...x: unknown[]) => { if (!quiet) console.log(...x); };

  log(`\nTarget   ${c.method} ${c.url}`);
  log(`Stages   ${c.stages.map((s) => `${s.users} users x ${s.duration}s`).join('  ->  ')}`);
  log(`SLA      p95 <= ${c.slaP95} ms, errors <= ${c.slaErrorRate}%\n`);

  const onEvent = (e: TestEvent) => {
    if (e.type === 'stageStart') {
      log(`\n== Stage ${e.data.stage}: ${e.data.users} users for ${e.data.duration}s ==`);
    } else if (e.type === 'tick') {
      const t = e.data;
      log(
        `  t=${String(t.elapsed).padStart(6)}s  users=${String(t.activeUsers).padStart(5)}  ` +
        `rps=${String(t.rps).padStart(6)}  avg=${String(t.avg).padStart(8)}ms  ` +
        `p95=${String(t.p95).padStart(8)}ms  err=${t.errorRate}%`,
      );
    }
  };

  process.on('SIGINT', () => {
    log('\nStopping...');
    test.stop();
  });

  const report = await test.run(onEvent);
  const file = await saveReport(report);

  if (quiet) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    log('\n\nResults');
    console.table(report.stages.map((s) => ({
      users: s.users,
      requests: s.requests,
      'req/s': s.rps,
      'avg ms': s.latency.mean,
      'p50 ms': s.latency.p50,
      'p95 ms': s.latency.p95,
      'p99 ms': s.latency.p99,
      'max ms': s.latency.max,
      'errors %': s.errorRate,
      SLA: s.withinSla ? 'ok' : 'FAIL',
    })));
    const v = report.verdict;
    log(v.maxUsersWithinSla
      ? `Handled up to ${v.maxUsersWithinSla} concurrent users within SLA.`
      : 'No stage stayed within SLA.');
    if (v.firstFailure) log(`Broke at ${v.firstFailure.users} users: ${v.firstFailure.reasons.join(', ')}`);
    for (const s of report.stages) {
      if (Object.keys(s.errorTypes).length) log(`  stage ${s.stage} errors:`, s.errorTypes);
    }
    log(`\nReport saved: ${file}`);
  }

  process.exit(report.verdict.firstFailure ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
