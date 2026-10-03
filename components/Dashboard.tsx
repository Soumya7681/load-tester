'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, WifiOff } from 'lucide-react';
import { useLiveTest } from '@/hooks/useLiveTest';
import { configSchema, formatIssue } from '@/lib/schema';
import { defaultForm, DEMO_URL, fromConfig, reviveForm, toConfigInput, type FormState } from '@/lib/form';
import { fmtDuration } from '@/lib/format';
import type { LiveSnapshot, TestConfig } from '@/lib/types';
import { LiveStats } from './LiveStats';
import { ReportView } from './ReportView';
import { StageTable } from './StageTable';
import { StageTrack } from './StageTrack';
import { TimelineChart } from './charts';
import { TestForm } from './TestForm';
import { SectionTitle } from './ui';

const STORAGE_KEY = 'load-tester:form';

// Safe because the dashboard renders on the client only (see DashboardLoader).
function loadSavedForm() {
  try {
    return reviveForm(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) ?? defaultForm();
  } catch {
    return defaultForm();
  }
}

export function Dashboard({ initialConfig }: { initialConfig: TestConfig | null }) {
  const { snap, connected } = useLiveTest();
  const [form, setForm] = useState<FormState>(() => (initialConfig ? fromConfig(initialConfig) : loadSavedForm()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = snap?.status === 'running';

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  async function start() {
    setError(null);
    const parsed = configSchema.safeParse(toConfigInput(form));
    if (!parsed.success) return setError(formatIssue(parsed.error));
    setBusy(true);
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) setError(((await res.json()) as { error: string }).error);
    } catch {
      setError('Could not reach the load tester server. Is `npm run dev` still running?');
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await fetch('/api/tests/stop', { method: 'POST' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-10">
      <section aria-labelledby="form-title" className="lg:sticky lg:top-6 lg:self-start">
        <h1 id="form-title" className="mb-1 font-display text-2xl font-medium">New load test</h1>
        <p className="mb-5 text-sm text-muted">Step up the number of users and see where your site starts to struggle.</p>
        <TestForm form={form} setForm={setForm} running={running} busy={busy} error={error} onStart={start} onStop={stop} />
      </section>

      <section aria-label="Results" aria-live="polite" className={`min-w-0 ${running ? 'max-lg:order-first' : ''}`}>
        {snap && !connected && (
          <p className="mb-4 flex items-center gap-2 rounded-md bg-sunken px-3 py-2 text-sm text-muted">
            <WifiOff className="size-4" aria-hidden /> Lost connection to the server. Reconnecting…
          </p>
        )}
        <LivePanel snap={snap} onUseDemo={() => setForm((f) => ({ ...f, method: 'GET', url: DEMO_URL }))} />
      </section>
    </div>
  );
}

function LivePanel({ snap, onUseDemo }: { snap: LiveSnapshot | null; onUseDemo: () => void }) {
  if (!snap) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Connecting…
      </p>
    );
  }
  if (snap.status === 'idle') return <EmptyState onUseDemo={onUseDemo} />;
  if (snap.status === 'error') {
    return (
      <p role="alert" className="rounded-md bg-fail-soft px-4 py-3 text-sm text-fail">
        The test failed to run: {snap.error}
      </p>
    );
  }
  if (snap.status === 'running' || !snap.report) return <RunningView snap={snap} />;

  const r = snap.report;
  return (
    <div className="space-y-6">
      <RunHeader label={r.stopped ? 'Stopped' : 'Finished'} config={r.config}>
        <Link href={`/reports/${r.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Open report <ArrowRight className="size-4" aria-hidden />
        </Link>
      </RunHeader>
      <ReportView report={r} />
    </div>
  );
}

function RunningView({ snap }: { snap: LiveSnapshot }) {
  const config = snap.config!;
  const lastTick = snap.ticks.at(-1);
  const current = snap.stageStarts.at(-1);
  const progress = current && lastTick ? Math.min(1, (lastTick.elapsed - current.startedAt) / current.duration) : 0;
  const total = config.stages.reduce((s, x) => s + x.duration, 0);

  return (
    <div className="space-y-6">
      <RunHeader label="Running" config={config} live>
        <span className="font-mono text-sm text-muted">
          {fmtDuration(lastTick?.elapsed ?? 0)} / ~{fmtDuration(total)}
        </span>
      </RunHeader>
      <StageTrack planned={config.stages} results={snap.stages} running={current ? { stage: current.stage, progress } : null} />
      <LiveStats tick={lastTick} config={config} />
      <section>
        <SectionTitle>Over time</SectionTitle>
        <TimelineChart ticks={snap.ticks} stageStarts={snap.stageStarts} slaP95={config.slaP95} live />
      </section>
      <section>
        <SectionTitle>Finished stages</SectionTitle>
        <StageTable stages={snap.stages} config={config} />
      </section>
    </div>
  );
}

function RunHeader({ label, config, live = false, children }: { label: string; config: TestConfig; live?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          {live && <span className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" aria-hidden />}
          {label}
        </p>
        <p className="truncate font-mono text-sm">
          <span className="font-semibold text-primary">{config.method}</span> {config.url}
        </p>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ onUseDemo }: { onUseDemo: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong px-6 py-10 sm:px-10">
      <h2 className="font-display text-xl font-medium">No test running</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Each stage keeps a fixed number of users sending requests at the same time. After each stage you get response
        times and error rate, and the verdict tells you the highest user count that stayed within your limits.
      </p>
      <ol className="mt-6 max-w-prose space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="font-mono text-primary">1</span>
          <span>Enter the URL of a site or API you control, or practice on the demo target first.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-primary">2</span>
          <span>Pick the user counts. Start small and double each stage, for example 10, 20, 40, 80.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-primary">3</span>
          <span>Set your limits: the slowest p95 response time and the highest error rate you accept.</span>
        </li>
      </ol>
      <div className="mt-8 rounded-md bg-sunken px-4 py-3 text-sm">
        <p className="font-medium">Try the demo target</p>
        <p className="mt-1 text-muted">
          Run <code className="rounded-sm bg-surface px-1 font-mono text-ink">npm run target</code> in a second terminal. It
          handles 20 requests at a time and starts returning 503 when overloaded.
        </p>
        <button type="button" onClick={onUseDemo} className="mt-2 text-sm font-medium text-primary hover:underline">
          Fill in {DEMO_URL}
        </button>
      </div>
    </div>
  );
}
