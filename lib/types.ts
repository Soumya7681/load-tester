import type { TestConfig } from './schema';

export type { TestConfig, ConfigInput, Stage, Method } from './schema';

export interface LatencySummary {
  min: number;
  mean: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

/** Live metrics for one second of the test. */
export interface Tick {
  stage: number;
  elapsed: number;
  activeUsers: number;
  targetUsers: number;
  rps: number;
  errors: number;
  errorRate: number;
  avg: number;
  p95: number;
  totalRequests: number;
}

export interface StageStart {
  stage: number;
  users: number;
  duration: number;
  startedAt: number; // seconds since test start
}

export interface StageSummary {
  stage: number;
  users: number;
  plannedDuration: number;
  duration: number;
  requests: number;
  errors: number;
  errorRate: number;
  rps: number;
  bytesPerSec: number;
  latency: LatencySummary;
  status: Record<string, number>;
  errorTypes: Record<string, number>;
  withinSla: boolean;
}

export interface Verdict {
  maxUsersWithinSla: number | null;
  firstFailure: { stage: number; users: number; reasons: string[] } | null;
}

export interface Report {
  id: string;
  config: TestConfig;
  startedAt: string;
  finishedAt: string;
  stopped: boolean;
  stages: StageSummary[];
  timeline: Tick[];
  verdict: Verdict;
}

export interface ReportListItem {
  id: string;
  url: string;
  method: string;
  startedAt: string;
  stopped: boolean;
  users: number[];
  maxUsersWithinSla: number | null;
  failedAt: number | null;
}

export type TestEvent =
  | { type: 'stageStart'; data: StageStart }
  | { type: 'tick'; data: Tick }
  | { type: 'stageEnd'; data: StageSummary }
  | { type: 'done'; data: Report };

export type RunStatus = 'idle' | 'running' | 'finished' | 'stopped' | 'error';

/** Everything a dashboard needs to render the current (or last) test. */
export interface LiveSnapshot {
  status: RunStatus;
  id: string | null;
  config: TestConfig | null;
  ticks: Tick[];
  stageStarts: StageStart[];
  stages: StageSummary[];
  report: Report | null;
  error: string | null;
}

export type LiveEvent =
  | TestEvent
  | { type: 'snapshot'; data: LiveSnapshot }
  | { type: 'started'; data: { id: string; config: TestConfig } }
  | { type: 'failed'; data: { message: string } };
