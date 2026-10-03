// Display helpers shared by server and client components. Fixed locale avoids hydration mismatch.
const nf = new Intl.NumberFormat('en-US');

export function fmtNum(n: number) {
  return nf.format(Math.round(n));
}

export function fmtMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms`;
}

export function fmtPct(n: number) {
  if (n === 0) return '0%';
  return `${n < 1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n)}%`;
}

export function fmtBytes(n: number) {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

export function fmtDuration(sec: number) {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h) return `${h}h ${m % 60}m`;
  if (m) return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
  return `${s}s`;
}

export function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
