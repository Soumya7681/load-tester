import { DashboardLoader } from '@/components/DashboardLoader';
import { readReport } from '@/lib/reports';

// `?from=<reportId>` pre-fills the form with that report's config ("Run again").
export default async function Home({ searchParams }: PageProps<'/'>) {
  const { from } = await searchParams;
  const report = typeof from === 'string' ? await readReport(from) : null;
  return <DashboardLoader key={report?.id ?? 'new'} initialConfig={report?.config ?? null} />;
}
