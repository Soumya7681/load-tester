import type { ConfigInput, TestConfig } from './schema';

// Form values are kept as strings so inputs can be empty while typing.
export interface FormStage {
  id: number;
  users: string;
  duration: string;
}

export interface FormHeader {
  id: number;
  key: string;
  value: string;
}

export interface FormState {
  url: string;
  method: string;
  headers: FormHeader[];
  body: string;
  stages: FormStage[];
  rampUp: string;
  thinkTime: string;
  timeout: string;
  slaP95: string;
  slaErrorRate: string;
}

let nextId = 1;
export const newId = () => nextId++;

const stages = (users: number[], duration: number): FormStage[] =>
  users.map((u) => ({ id: newId(), users: String(u), duration: String(duration) }));

export const PRESETS = [
  { name: 'Quick', note: '10 to 100 users, 1 min', users: [10, 50, 100], duration: 20 },
  { name: 'Standard', note: '10 to 500 users, 2.5 min', users: [10, 50, 100, 200, 500], duration: 30 },
  { name: 'Stress', note: '100 to 2,000 users, 2 min', users: [100, 500, 1000, 2000], duration: 30 },
] as const;

export const DEMO_URL = 'http://127.0.0.1:4000/api';

export function defaultForm(): FormState {
  return {
    url: '',
    method: 'GET',
    headers: [],
    body: '',
    stages: stages([...PRESETS[0].users], PRESETS[0].duration),
    rampUp: '5',
    thinkTime: '0',
    timeout: '10000',
    slaP95: '1000',
    slaErrorRate: '1',
  };
}

export function presetStages(index: number) {
  const p = PRESETS[index];
  return stages([...p.users], p.duration);
}

export function toConfigInput(f: FormState): ConfigInput {
  const headers: Record<string, string> = {};
  for (const h of f.headers) if (h.key.trim()) headers[h.key.trim()] = h.value;
  return {
    url: f.url,
    method: f.method,
    headers,
    body: ['GET', 'HEAD'].includes(f.method) ? '' : f.body,
    stages: f.stages.map((s) => ({ users: s.users, duration: s.duration })),
    rampUp: f.rampUp,
    thinkTime: f.thinkTime,
    timeout: f.timeout,
    slaP95: f.slaP95,
    slaErrorRate: f.slaErrorRate,
  };
}

export function fromConfig(c: TestConfig): FormState {
  return {
    url: c.url,
    method: c.method,
    headers: Object.entries(c.headers).map(([key, value]) => ({ id: newId(), key, value })),
    body: c.body,
    stages: c.stages.map((s) => ({ id: newId(), users: String(s.users), duration: String(s.duration) })),
    rampUp: String(c.rampUp),
    thinkTime: String(c.thinkTime),
    timeout: String(c.timeout),
    slaP95: String(c.slaP95),
    slaErrorRate: String(c.slaErrorRate),
  };
}

/** Restore a saved form, tolerating missing or old fields. */
export function reviveForm(raw: unknown): FormState | null {
  if (!raw || typeof raw !== 'object') return null;
  const base = defaultForm();
  const r = raw as Partial<FormState>;
  return {
    ...base,
    ...r,
    headers: Array.isArray(r.headers) ? r.headers.map((h) => ({ ...h, id: newId() })) : base.headers,
    stages: Array.isArray(r.stages) && r.stages.length ? r.stages.map((s) => ({ ...s, id: newId() })) : base.stages,
  };
}
