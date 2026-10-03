import type { LatencySummary } from './types';

// Fixed-bucket latency histogram: 0.1 ms resolution up to 60 s, constant memory
// no matter how many requests are recorded.
const RESOLUTION = 10; // buckets per millisecond
const MAX_MS = 60_000;

export class Histogram {
  private buckets = new Uint32Array(MAX_MS * RESOLUTION + 1);
  count = 0;
  private sum = 0;
  private min = Infinity;
  private max = 0;

  record(ms: number) {
    const idx = Math.min(Math.round(ms * RESOLUTION), this.buckets.length - 1);
    this.buckets[idx]++;
    this.count++;
    this.sum += ms;
    if (ms < this.min) this.min = ms;
    if (ms > this.max) this.max = ms;
  }

  percentile(p: number) {
    if (this.count === 0) return 0;
    const target = Math.max(1, Math.ceil((p / 100) * this.count));
    let seen = 0;
    for (let i = 0; i < this.buckets.length; i++) {
      seen += this.buckets[i];
      if (seen >= target) return Math.min(i / RESOLUTION, this.max);
    }
    return this.max;
  }

  summary(): LatencySummary {
    if (this.count === 0) return { min: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
    return {
      min: round(this.min),
      mean: round(this.sum / this.count),
      p50: round(this.percentile(50)),
      p90: round(this.percentile(90)),
      p95: round(this.percentile(95)),
      p99: round(this.percentile(99)),
      max: round(this.max),
    };
  }
}

/** Percentile over a small in-memory sample (used for per-second ticks). */
export function samplePercentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = Float64Array.from(values).sort();
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return round(sorted[idx]);
}

export function round(n: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
