import type { TestConfig, Tick } from '@/lib/types';
import { fmtMs, fmtNum, fmtPct } from '@/lib/format';

/** Numbers from the most recent second. One strip, hairline dividers. */
export function LiveStats({ tick, config }: { tick: Tick | undefined; config: TestConfig }) {
  const items = [
    { label: 'Active users', value: tick ? `${fmtNum(tick.activeUsers)}` : '0', sub: tick ? `of ${fmtNum(tick.targetUsers)}` : '', bad: false },
    { label: 'Requests/s', value: tick ? fmtNum(tick.rps) : '0', sub: '', bad: false },
    { label: 'p95 latency', value: tick ? fmtMs(tick.p95) : '…', sub: `limit ${fmtMs(config.slaP95)}`, bad: !!tick && tick.p95 > config.slaP95 },
    { label: 'Error rate', value: tick ? fmtPct(tick.errorRate) : '0%', sub: `limit ${config.slaErrorRate}%`, bad: !!tick && tick.errorRate > config.slaErrorRate },
    { label: 'Total requests', value: tick ? fmtNum(tick.totalRequests) : '0', sub: 'this stage', bad: false },
  ];
  return (
    <dl className="grid grid-cols-2 divide-line overflow-hidden rounded-md border border-line bg-surface sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
      {items.map((it, i) => (
        <div key={it.label} className={`px-4 py-3 ${i === items.length - 1 ? 'col-span-2 sm:col-span-1' : ''} border-line max-lg:border-b`}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{it.label}</dt>
          <dd className={`mt-1 font-mono text-2xl tabular-nums ${it.bad ? 'text-fail' : 'text-ink'}`}>{it.value}</dd>
          <dd className="h-4 text-xs text-muted">{it.sub}</dd>
        </div>
      ))}
    </dl>
  );
}
