'use client';

import { useEffect, useState } from 'react';
import type { LiveSnapshot, Report, StageStart, StageSummary, TestConfig, Tick } from '@/lib/types';

/** Subscribes to /api/events. EventSource reconnects on its own and gets a fresh snapshot. */
export function useLiveTest() {
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/events');
    function on<T>(type: string, fn: (data: T) => void) {
      es.addEventListener(type, (ev) => fn(JSON.parse((ev as MessageEvent<string>).data) as T));
    }
    const patch = (fn: (s: LiveSnapshot) => LiveSnapshot) => setSnap((s) => (s ? fn(s) : s));

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    on<LiveSnapshot>('snapshot', setSnap);
    on<{ id: string; config: TestConfig }>('started', ({ id, config }) =>
      setSnap({ status: 'running', id, config, ticks: [], stageStarts: [], stages: [], report: null, error: null }),
    );
    on<StageStart>('stageStart', (d) => patch((s) => ({ ...s, stageStarts: [...s.stageStarts, d] })));
    on<Tick>('tick', (d) => patch((s) => ({ ...s, ticks: [...s.ticks, d] })));
    on<StageSummary>('stageEnd', (d) => patch((s) => ({ ...s, stages: [...s.stages, d] })));
    on<Report>('done', (r) => patch((s) => ({ ...s, status: r.stopped ? 'stopped' : 'finished', report: r })));
    on<{ message: string }>('failed', ({ message }) => patch((s) => ({ ...s, status: 'error', error: message })));

    return () => es.close();
  }, []);

  return { snap, connected };
}
