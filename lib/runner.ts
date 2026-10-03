import { LoadTest } from './engine';
import { saveReport } from './reports';
import type { LiveEvent, LiveSnapshot, TestConfig } from './types';

type Listener = (e: LiveEvent) => void;

interface RunnerState {
  test: LoadTest | null;
  snapshot: LiveSnapshot;
  listeners: Set<Listener>;
}

const EMPTY: LiveSnapshot = {
  status: 'idle',
  id: null,
  config: null,
  ticks: [],
  stageStarts: [],
  stages: [],
  report: null,
  error: null,
};

// Each route can get its own copy of this module (and dev hot reload makes new ones),
// so the single running test lives on globalThis.
const g = globalThis as typeof globalThis & { __loadTester?: RunnerState };
const state: RunnerState = (g.__loadTester ??= { test: null, snapshot: EMPTY, listeners: new Set() });

export class BusyError extends Error {}

function broadcast(e: LiveEvent) {
  for (const fn of state.listeners) {
    try {
      fn(e);
    } catch {
      state.listeners.delete(fn);
    }
  }
}

export function getSnapshot(): LiveSnapshot {
  return state.snapshot;
}

export function subscribe(fn: Listener) {
  state.listeners.add(fn);
  return () => {
    state.listeners.delete(fn);
  };
}

export function isRunning() {
  return state.snapshot.status === 'running';
}

/** Start a test. Throws BusyError if one is running, or Error for an invalid config. */
export function startTest(input: unknown): { id: string; config: TestConfig } {
  if (isRunning()) throw new BusyError('A test is already running');
  const test = new LoadTest(input);
  const snap: LiveSnapshot = { ...EMPTY, status: 'running', id: test.id, config: test.config, ticks: [], stageStarts: [], stages: [] };
  state.test = test;
  state.snapshot = snap;
  broadcast({ type: 'started', data: { id: test.id, config: test.config } });

  test
    .run((e) => {
      if (e.type === 'tick') snap.ticks.push(e.data);
      else if (e.type === 'stageStart') snap.stageStarts.push(e.data);
      else if (e.type === 'stageEnd') snap.stages.push(e.data);
      if (e.type !== 'done') broadcast(e);
    })
    .then(async (report) => {
      await saveReport(report);
      snap.status = report.stopped ? 'stopped' : 'finished';
      snap.report = report;
      broadcast({ type: 'done', data: report });
    })
    .catch((err: Error) => {
      snap.status = 'error';
      snap.error = err.message;
      broadcast({ type: 'failed', data: { message: err.message } });
    })
    .finally(() => {
      if (state.test === test) state.test = null;
    });

  return { id: test.id, config: test.config };
}

export function stopTest() {
  if (!state.test || !isRunning()) return false;
  state.test.stop();
  return true;
}
