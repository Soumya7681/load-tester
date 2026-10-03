import type { StageSummary, TestConfig } from '@/lib/types';
import { fmtMs, fmtNum, fmtPct } from '@/lib/format';
import { SlaBadge } from './ui';

const th = 'px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted whitespace-nowrap';
const td = 'px-3 py-2.5 text-right font-mono text-[13px] tabular-nums whitespace-nowrap';

export function StageTable({ stages, config }: { stages: StageSummary[]; config: TestConfig }) {
  if (stages.length === 0) {
    return <p className="py-6 text-sm text-muted">The table fills in as each stage finishes.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full border-collapse">
        <caption className="sr-only">Results per stage</caption>
        <thead className="border-b border-line bg-sunken">
          <tr>
            <th scope="col" className={`${th} sticky left-0 bg-sunken text-left`}>Users</th>
            <th scope="col" className={th}>Requests</th>
            <th scope="col" className={th}>Req/s</th>
            <th scope="col" className={th}>Avg</th>
            <th scope="col" className={th}>p50</th>
            <th scope="col" className={th}>p95</th>
            <th scope="col" className={th}>p99</th>
            <th scope="col" className={th}>Max</th>
            <th scope="col" className={th}>Errors</th>
            <th scope="col" className={`${th} text-left`}>Result</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => {
            const slowP95 = s.latency.p95 > config.slaP95;
            const manyErrors = s.errorRate > config.slaErrorRate;
            return (
              <tr key={s.stage} className="border-b border-line last:border-0">
                <th scope="row" className={`${td} sticky left-0 bg-surface text-left font-semibold`}>
                  {fmtNum(s.users)}
                </th>
                <td className={td}>{fmtNum(s.requests)}</td>
                <td className={td}>{fmtNum(s.rps)}</td>
                <td className={td}>{fmtMs(s.latency.mean)}</td>
                <td className={td}>{fmtMs(s.latency.p50)}</td>
                <td className={`${td} ${slowP95 ? 'font-semibold text-fail' : ''}`}>{fmtMs(s.latency.p95)}</td>
                <td className={td}>{fmtMs(s.latency.p99)}</td>
                <td className={`${td} text-muted`}>{fmtMs(s.latency.max)}</td>
                <td className={`${td} ${manyErrors ? 'font-semibold text-fail' : ''}`}>{fmtPct(s.errorRate)}</td>
                <td className="px-3 py-2.5 text-left">
                  <SlaBadge ok={s.withinSla} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
