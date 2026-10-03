import type { Stage, StageSummary } from '@/lib/types';

type Running = { stage: number; progress: number } | null;

/** One segment per user level: passed, failed, running (with progress) or still to come. */
export function StageTrack({ planned, results, running = null }: { planned: Stage[]; results: StageSummary[]; running?: Running }) {
  const breakStage = results.find((s) => !s.withinSla)?.stage;
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Stages">
      {planned.map((p, i) => {
        const n = i + 1;
        const result = results.find((s) => s.stage === n);
        const isRunning = running?.stage === n && !result;
        const state = result ? (result.withinSla ? 'passed' : 'failed') : isRunning ? 'running' : 'pending';
        return (
          <li
            key={n}
            className="min-w-16 flex-1"
            style={{ flexGrow: p.duration }}
            aria-label={`Stage ${n}, ${p.users} users, ${state}`}
          >
            <div className="relative h-2 overflow-hidden rounded-sm bg-sunken">
              {state === 'passed' && <div className="absolute inset-0 bg-ok" />}
              {state === 'failed' && <div className="absolute inset-0 bg-fail" />}
              {state === 'running' && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-700 ease-linear"
                  style={{ width: `${Math.round((running?.progress ?? 0) * 100)}%` }}
                />
              )}
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-1">
              <span className={`font-mono text-xs ${state === 'pending' ? 'text-muted' : 'text-ink'}`}>
                {p.users}
                <span className="text-muted"> users</span>
              </span>
              {n === breakStage && <span className="text-[11px] font-semibold uppercase text-fail">breaks</span>}
              {state === 'running' && <span className="text-[11px] font-semibold uppercase text-primary">now</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
