'use client';

import { Plus, Play, Square, Trash2 } from 'lucide-react';
import { METHODS } from '@/lib/schema';
import { fmtDuration } from '@/lib/format';
import { newId, presetStages, PRESETS, type FormState } from '@/lib/form';
import { Button, Field, Input, inputClass } from './ui';

interface Props {
  form: FormState;
  setForm: (fn: (f: FormState) => FormState) => void;
  running: boolean;
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

export function TestForm({ form, setForm, running, busy, error, onStart, onStop }: Props) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const hasBody = !['GET', 'HEAD'].includes(form.method);

  const totalSeconds = form.stages.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
  const peakUsers = Math.max(0, ...form.stages.map((s) => Number(s.users) || 0));

  const updateStage = (id: number, key: 'users' | 'duration', value: string) =>
    set('stages', form.stages.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
  const addStage = () => {
    const last = form.stages.at(-1);
    const users = last ? String(Math.min(10_000, (Number(last.users) || 10) * 2)) : '10';
    set('stages', [...form.stages, { id: newId(), users, duration: last?.duration ?? '30' }]);
  };
  const updateHeader = (id: number, key: 'key' | 'value', value: string) =>
    set('headers', form.headers.map((h) => (h.id === id ? { ...h, [key]: value } : h)));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!running) onStart();
      }}
    >
      <fieldset disabled={running} className="space-y-6 disabled:opacity-70">
        <div className="space-y-3">
          <Field label="Target URL" htmlFor="url" hint="Only test sites you own or have permission to test.">
            <div className="flex gap-2">
              <select
                aria-label="HTTP method"
                value={form.method}
                onChange={(e) => set('method', e.target.value)}
                className={`${inputClass} w-28 shrink-0 font-mono`}
              >
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <Input
                id="url"
                type="url"
                inputMode="url"
                required
                placeholder="http://localhost:3000/api/products"
                value={form.url}
                onChange={(e) => set('url', e.target.value)}
                className="min-w-0 flex-1 font-mono"
              />
            </div>
          </Field>
          {hasBody && (
            <Field label="Request body" htmlFor="body" hint="Sent as application/json unless you set a Content-Type header.">
              <textarea
                id="body"
                rows={4}
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder='{"email": "test@example.com", "password": "secret"}'
                className={`${inputClass} w-full py-2 font-mono`}
              />
            </Field>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Stages</h3>
            <span className="text-xs text-muted">
              Peak {peakUsers} users · {fmtDuration(totalSeconds)} total
            </span>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Stage presets">
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                type="button"
                title={p.note}
                onClick={() => set('stages', presetStages(i))}
                className="rounded-sm border border-line-strong px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
              >
                {p.name}
              </button>
            ))}
          </div>
          <ol className="space-y-2">
            {form.stages.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className="w-5 shrink-0 font-mono text-xs text-muted">{i + 1}</span>
                <label className="sr-only" htmlFor={`users-${s.id}`}>Stage {i + 1} users</label>
                <Input
                  id={`users-${s.id}`}
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={s.users}
                  onChange={(e) => updateStage(s.id, 'users', e.target.value)}
                  className="min-w-0 flex-1 font-mono"
                />
                <span className="shrink-0 text-xs text-muted">users for</span>
                <label className="sr-only" htmlFor={`dur-${s.id}`}>Stage {i + 1} duration in seconds</label>
                <Input
                  id={`dur-${s.id}`}
                  type="number"
                  min={1}
                  max={3600}
                  required
                  value={s.duration}
                  onChange={(e) => updateStage(s.id, 'duration', e.target.value)}
                  className="w-20 shrink-0 font-mono"
                />
                <span className="shrink-0 text-xs text-muted">s</span>
                <button
                  type="button"
                  aria-label={`Remove stage ${i + 1}`}
                  disabled={form.stages.length === 1}
                  onClick={() => set('stages', form.stages.filter((x) => x.id !== s.id))}
                  className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-sunken hover:text-fail disabled:invisible"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
          <Button variant="ghost" className="mt-2 -ml-2" onClick={addStage} disabled={form.stages.length >= 20}>
            <Plus className="size-4" aria-hidden /> Add stage
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="p95 limit (ms)" htmlFor="slaP95">
            <Input id="slaP95" type="number" min={1} value={form.slaP95} onChange={(e) => set('slaP95', e.target.value)} className="w-full font-mono" />
          </Field>
          <Field label="Error limit (%)" htmlFor="slaErrorRate">
            <Input id="slaErrorRate" type="number" min={0} max={100} step="0.1" value={form.slaErrorRate} onChange={(e) => set('slaErrorRate', e.target.value)} className="w-full font-mono" />
          </Field>
          <p className="col-span-2 -mt-1 text-xs text-muted">A stage passes when it stays under both limits.</p>
        </div>

        <details className="group rounded-md border border-line bg-surface">
          <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium text-muted hover:text-ink">
            Advanced: ramp-up, think time, timeout, headers
          </summary>
          <div className="space-y-4 border-t border-line p-3">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Ramp-up (s)" htmlFor="rampUp">
                <Input id="rampUp" type="number" min={0} value={form.rampUp} onChange={(e) => set('rampUp', e.target.value)} className="w-full font-mono" />
              </Field>
              <Field label="Think (ms)" htmlFor="thinkTime">
                <Input id="thinkTime" type="number" min={0} value={form.thinkTime} onChange={(e) => set('thinkTime', e.target.value)} className="w-full font-mono" />
              </Field>
              <Field label="Timeout (ms)" htmlFor="timeout">
                <Input id="timeout" type="number" min={100} value={form.timeout} onChange={(e) => set('timeout', e.target.value)} className="w-full font-mono" />
              </Field>
            </div>
            <p className="text-xs text-muted">
              Ramp-up spreads user start-up inside each stage. Think time is the pause each user takes between requests.
            </p>
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Headers</h3>
              <ul className="space-y-2">
                {form.headers.map((h) => (
                  <li key={h.id} className="flex gap-2">
                    <Input aria-label="Header name" placeholder="Authorization" value={h.key} onChange={(e) => updateHeader(h.id, 'key', e.target.value)} className="min-w-0 flex-1 font-mono" />
                    <Input aria-label="Header value" placeholder="Bearer eyJ…" value={h.value} onChange={(e) => updateHeader(h.id, 'value', e.target.value)} className="min-w-0 flex-1 font-mono" />
                    <button
                      type="button"
                      aria-label={`Remove header ${h.key || ''}`.trim()}
                      onClick={() => set('headers', form.headers.filter((x) => x.id !== h.id))}
                      className="grid size-10 shrink-0 place-items-center rounded-md text-muted hover:bg-sunken hover:text-fail"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" className="mt-1 -ml-2" onClick={() => set('headers', [...form.headers, { id: newId(), key: '', value: '' }])}>
                <Plus className="size-4" aria-hidden /> Add header
              </Button>
            </div>
          </div>
        </details>
      </fieldset>

      <div className="space-y-2">
        {error && (
          <p role="alert" className="rounded-md bg-fail-soft px-3 py-2 text-sm text-fail">
            {error}
          </p>
        )}
        {running ? (
          <Button variant="danger" className="w-full" onClick={onStop} disabled={busy}>
            <Square className="size-4" aria-hidden /> {busy ? 'Stopping…' : 'Stop test'}
          </Button>
        ) : (
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            <Play className="size-4" aria-hidden /> {busy ? 'Starting…' : 'Start test'}
          </Button>
        )}
      </div>
    </form>
  );
}
