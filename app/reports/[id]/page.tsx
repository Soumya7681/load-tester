import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, RotateCcw } from 'lucide-react';
import { DeleteReportButton } from '@/components/DeleteReportButton';
import { ReportView } from '@/components/ReportView';
import { fmtDate, fmtDuration } from '@/lib/format';
import { readReport } from '@/lib/reports';

export async function generateMetadata({ params }: PageProps<'/reports/[id]'>): Promise<Metadata> {
  const report = await readReport((await params).id);
  return { title: report ? new URL(report.config.url).host : 'Report not found' };
}

export default async function ReportPage({ params }: PageProps<'/reports/[id]'>) {
  const { id } = await params;
  const report = await readReport(id);
  if (!report) notFound();
  const c = report.config;
  const ran = report.stages.reduce((s, x) => s + x.duration, 0);

  const facts = [
    ['Ran', `${fmtDate(report.startedAt)} · ${fmtDuration(ran)}`],
    ['Stages', c.stages.map((s) => `${s.users}×${s.duration}s`).join('  ')],
    ['Limits', `p95 ≤ ${c.slaP95} ms · errors ≤ ${c.slaErrorRate}%`],
    ['Per user', `ramp-up ${c.rampUp}s · think ${c.thinkTime} ms · timeout ${c.timeout} ms`],
  ];

  return (
    <article className="mx-auto max-w-5xl">
      <Link href="/reports" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> All reports
      </Link>
      <header className="mb-8 border-b border-line pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="min-w-0 break-all font-mono text-lg">
            <span className="font-semibold text-primary">{c.method}</span> {c.url}
          </h1>
          <div className="flex flex-wrap items-center gap-1">
            <Link
              href={`/?from=${report.id}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary-fill px-3 text-sm font-medium text-on-primary hover:bg-primary-hover"
            >
              <RotateCcw className="size-4" aria-hidden /> Run again
            </Link>
            <a
              href={`/api/reports/${report.id}?download`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted hover:bg-sunken hover:text-ink"
            >
              <Download className="size-4" aria-hidden /> JSON
            </a>
            <DeleteReportButton id={report.id} redirectTo="/reports" label />
          </div>
        </div>
        <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-16 shrink-0 text-muted">{k}</dt>
              <dd className="font-mono text-[13px]">{v}</dd>
            </div>
          ))}
        </dl>
      </header>
      <ReportView report={report} />
    </article>
  );
}
