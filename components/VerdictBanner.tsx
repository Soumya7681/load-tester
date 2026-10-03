import type { Report } from '@/lib/types';

/** The one-sentence answer to "how many users can it take?". */
export function VerdictBanner({ report }: { report: Report }) {
  const { verdict, config, stages, stopped } = report;
  const { maxUsersWithinSla: max, firstFailure: fail } = verdict;

  let headline: React.ReactNode;
  if (stages.length === 0) headline = 'Stopped before any stage finished.';
  else if (max !== null && !fail) headline = <>Handled all <Num>{max}</Num> concurrent users within your limits.</>;
  else if (max !== null) headline = <>Handled <Num>{max}</Num> concurrent users within your limits.</>;
  else headline = <>Over your limits from the first stage (<Num>{stages[0].users}</Num> users).</>;

  return (
    <div className={`border-l-4 py-1 pl-4 ${fail ? 'border-fail' : 'border-ok'}`}>
      <p className="font-display text-2xl leading-snug sm:text-3xl">{headline}</p>
      <div className="mt-2 space-y-0.5 text-sm text-muted">
        {fail && (
          <p>
            <span className="font-medium text-fail">Broke at {fail.users} users:</span> {fail.reasons.join(', ')}.
          </p>
        )}
        {max !== null && !fail && !stopped && <p>No stage crossed the limits. Add a stage with more users to find the breaking point.</p>}
        {stopped && <p>Stopped early: results cover {stages.length} of {config.stages.length} stages.</p>}
        <p>
          Limits: p95 at most {config.slaP95} ms, errors at most {config.slaErrorRate}%.
        </p>
      </div>
    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>;
}
