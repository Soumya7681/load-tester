import type { StageSummary } from '@/lib/types';
import { fmtNum } from '@/lib/format';

/** Status codes and network errors per stage. Hidden when every request succeeded. */
export function ErrorBreakdown({ stages }: { stages: StageSummary[] }) {
  const withErrors = stages.filter((s) => s.errors > 0);
  if (withErrors.length === 0) return null;
  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-surface">
      {withErrors.map((s) => (
        <li key={s.stage} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6">
          <span className="w-24 shrink-0 font-mono text-sm font-semibold">{fmtNum(s.users)} users</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(s.errorTypes)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <span key={type} className="rounded-sm bg-fail-soft px-2 py-0.5 font-mono text-xs text-fail">
                  {type} × {fmtNum(count)}
                </span>
              ))}
            {Object.entries(s.status)
              .filter(([code]) => Number(code) < 400)
              .map(([code, count]) => (
                <span key={code} className="rounded-sm bg-sunken px-2 py-0.5 font-mono text-xs text-muted">
                  HTTP {code} × {fmtNum(count)}
                </span>
              ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
