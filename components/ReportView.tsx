import type { Report } from '@/lib/types';
import { ErrorBreakdown } from './ErrorBreakdown';
import { StageTable } from './StageTable';
import { StageTrack } from './StageTrack';
import { TimelineChart, UsersLatencyChart } from './charts';
import { SectionTitle } from './ui';
import { VerdictBanner } from './VerdictBanner';

/** Full results of a finished test. Used on the dashboard and the report page. */
export function ReportView({ report }: { report: Report }) {
  const { config, stages } = report;
  const stageStarts = stagesStartsFrom(report);
  const hasErrors = stages.some((s) => s.errors > 0);
  return (
    <div className="space-y-8">
      <VerdictAndTrack report={report} />
      <section>
        <SectionTitle>Per stage</SectionTitle>
        <StageTable stages={stages} config={config} />
      </section>
      {stages.length > 1 && (
        <section>
          <SectionTitle>Users vs response time</SectionTitle>
          <UsersLatencyChart stages={stages} slaP95={config.slaP95} />
        </section>
      )}
      {report.timeline.length > 0 && (
        <section>
          <SectionTitle>Over time</SectionTitle>
          <TimelineChart ticks={report.timeline} stageStarts={stageStarts} slaP95={config.slaP95} />
        </section>
      )}
      {hasErrors && (
        <section>
          <SectionTitle>Errors by stage</SectionTitle>
          <ErrorBreakdown stages={stages} />
        </section>
      )}
    </div>
  );
}

function VerdictAndTrack({ report }: { report: Report }) {
  return (
    <div className="space-y-5">
      <VerdictBanner report={report} />
      <StageTrack planned={report.config.stages} results={report.stages} />
    </div>
  );
}

// Reports keep the timeline but not stage starts; rebuild them from the first tick of each stage.
function stagesStartsFrom(report: Report) {
  const seen = new Set<number>();
  return report.timeline.flatMap((t) => {
    if (seen.has(t.stage)) return [];
    seen.add(t.stage);
    const users = report.config.stages[t.stage - 1]?.users ?? 0;
    return [{ stage: t.stage, users, duration: 0, startedAt: Math.max(0, t.elapsed - 1) }];
  });
}
