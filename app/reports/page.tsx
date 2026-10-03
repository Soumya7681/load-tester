import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { DeleteReportButton } from '@/components/DeleteReportButton';
import { fmtDate } from '@/lib/format';
import { listReports } from '@/lib/reports';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage() {
  await connection(); // reports change at runtime, never prerender this list
  const reports = await listReports();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-medium">Reports</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        Every finished or stopped test is saved in the <code className="font-mono">reports/</code> folder.
      </p>

      {reports.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong px-6 py-10 text-center">
          <p className="font-display text-lg">No reports yet</p>
          <p className="mt-1 text-sm text-muted">Run a test and its results will show up here.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Start a new test
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {reports.map((r) => (
            <li key={r.id} className="grid items-center gap-x-6 gap-y-1 px-4 py-3 sm:grid-cols-[1fr_auto_auto]">
              <Link href={`/reports/${r.id}`} className="group min-w-0">
                <p className="truncate font-mono text-sm group-hover:text-primary">
                  <span className="font-semibold text-primary">{r.method}</span> {r.url}
                </p>
                <p className="text-xs text-muted">
                  {fmtDate(r.startedAt)} · {r.users.join(' → ')} users{r.stopped && ' · stopped early'}
                </p>
              </Link>
              <p className="text-sm">
                {r.failedAt !== null ? (
                  <span className="text-fail">Broke at {r.failedAt} users</span>
                ) : r.maxUsersWithinSla !== null ? (
                  <span className="text-ok">OK up to {r.maxUsersWithinSla} users</span>
                ) : (
                  <span className="text-muted">No results</span>
                )}
              </p>
              <div className="justify-self-start sm:justify-self-end">
                <DeleteReportButton id={r.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
