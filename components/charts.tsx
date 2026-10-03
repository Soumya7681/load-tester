'use client';

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fmtMs, fmtNum, fmtPct } from '@/lib/format';
import type { StageStart, StageSummary, Tick } from '@/lib/types';

type Series = { key: string; label: string; color: string; format: (n: number) => string };

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string | number; value?: number }>;
}

function ChartTooltip({ active, label, payload, series, labelFormat }: TipProps & { series: Series[]; labelFormat: (l: string | number) => string }) {
  if (!active || !payload?.length || label === undefined) return null;
  return (
    <div className="rounded-md border border-line-strong bg-surface px-3 py-2 text-xs">
      <p className="mb-1 font-medium text-ink">{labelFormat(label)}</p>
      {series.map((s) => {
        const value = payload.find((p) => p.dataKey === s.key)?.value;
        if (value === undefined) return null;
        return (
          <p key={s.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="inline-block size-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-mono text-ink">{s.format(value)}</span>
          </p>
        );
      })}
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

const axisTick = (color: string) => ({ fill: color, fontSize: 11, fontFamily: 'var(--font-jetbrains)' });

/** Requests/s, p95 and error rate over time, with stage boundaries and the p95 limit. */
export function TimelineChart({ ticks, stageStarts, slaP95, live = false }: { ticks: Tick[]; stageStarts: StageStart[]; slaP95: number; live?: boolean }) {
  const c = useThemeColors();
  const series: Series[] = [
    { key: 'rps', label: 'Requests/s', color: c.primary, format: fmtNum },
    { key: 'p95', label: 'p95 latency', color: c.accent, format: fmtMs },
    { key: 'errorRate', label: 'Error rate', color: c.fail, format: fmtPct },
  ];

  if (ticks.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border border-dashed border-line-strong text-sm text-muted">
        Waiting for the first second of data…
      </div>
    );
  }

  return (
    <figure>
      <Legend series={series} />
      <div className="h-72" role="img" aria-label="Requests per second, p95 latency and error rate over time">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={ticks} margin={{ top: 16, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={c.line} vertical={false} />
            <XAxis
              dataKey="elapsed"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={axisTick(c.muted)}
              tickFormatter={(v: number) => `${Math.round(v)}s`}
              stroke={c.line}
            />
            <YAxis yAxisId="rps" tick={axisTick(c.muted)} stroke={c.line} width={48} tickFormatter={fmtNum} />
            <YAxis yAxisId="ms" orientation="right" tick={axisTick(c.muted)} stroke={c.line} width={56} tickFormatter={fmtMs} />
            <YAxis yAxisId="pct" hide orientation="right" width={0} domain={[0, 100]} />
            {stageStarts.map((s) => (
              <ReferenceLine
                key={s.stage}
                yAxisId="rps"
                x={s.startedAt}
                stroke={c.muted}
                strokeDasharray="2 4"
                label={{ value: `${s.users}u`, position: 'insideTopLeft', fill: c.muted, fontSize: 11 }}
              />
            ))}
            <ReferenceLine yAxisId="ms" y={slaP95} stroke={c.fail} strokeDasharray="6 4" strokeOpacity={0.6} />
            <Tooltip
              cursor={{ stroke: c.muted, strokeDasharray: '2 2' }}
              content={(p) => (
                <ChartTooltip {...(p as unknown as TipProps)} series={series} labelFormat={(l) => `${Math.round(Number(l))}s into the test`} />
              )}
            />
            <Area yAxisId="rps" dataKey="rps" type="monotone" stroke={c.primary} strokeWidth={2} fill={c.primary} fillOpacity={0.08} isAnimationActive={!live} />
            <Line yAxisId="ms" dataKey="p95" type="monotone" stroke={c.accent} strokeWidth={2} dot={false} isAnimationActive={!live} />
            <Line yAxisId="pct" dataKey="errorRate" type="stepAfter" stroke={c.fail} strokeWidth={1.5} dot={false} isAnimationActive={!live} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 text-xs text-muted">
        Dotted verticals mark each stage. Dashed horizontal line is your p95 limit ({fmtMs(slaP95)}).
      </figcaption>
    </figure>
  );
}

/** How latency and errors grow as users increase: the shape of the breaking point. */
export function UsersLatencyChart({ stages, slaP95 }: { stages: StageSummary[]; slaP95: number }) {
  const c = useThemeColors();
  const series: Series[] = [
    { key: 'p50', label: 'p50', color: c.muted, format: fmtMs },
    { key: 'p95', label: 'p95', color: c.primary, format: fmtMs },
    { key: 'p99', label: 'p99', color: c.accent, format: fmtMs },
    { key: 'errorRate', label: 'Error rate', color: c.fail, format: fmtPct },
  ];
  const data = stages.map((s) => ({ users: String(s.users), ...s.latency, errorRate: s.errorRate }));

  return (
    <figure>
      <Legend series={series} />
      <div className="h-64" role="img" aria-label="Latency percentiles and error rate per user level">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={c.line} vertical={false} />
            <XAxis dataKey="users" tick={axisTick(c.muted)} stroke={c.line} />
            <YAxis yAxisId="ms" tick={axisTick(c.muted)} stroke={c.line} width={56} tickFormatter={fmtMs} />
            <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={axisTick(c.muted)} stroke={c.line} width={40} tickFormatter={(v: number) => `${v}%`} />
            <ReferenceLine yAxisId="ms" y={slaP95} stroke={c.fail} strokeDasharray="6 4" strokeOpacity={0.6} />
            <Tooltip
              cursor={{ fill: c.line, fillOpacity: 0.4 }}
              content={(p) => <ChartTooltip {...(p as unknown as TipProps)} series={series} labelFormat={(l) => `${l} users`} />}
            />
            <Bar yAxisId="pct" dataKey="errorRate" fill={c.fail} fillOpacity={0.25} maxBarSize={36} />
            <Line yAxisId="ms" dataKey="p50" stroke={c.muted} strokeWidth={1.5} dot={{ r: 3 }} />
            <Line yAxisId="ms" dataKey="p95" stroke={c.primary} strokeWidth={2.5} dot={{ r: 3.5 }} />
            <Line yAxisId="ms" dataKey="p99" stroke={c.accent} strokeWidth={1.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 text-xs text-muted">Bars show error rate (right axis). Lines show response time (left axis).</figcaption>
    </figure>
  );
}
