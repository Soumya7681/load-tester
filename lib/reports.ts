import fs from 'node:fs/promises';
import path from 'node:path';
import type { Report, ReportListItem } from './types';

// process.cwd() is the project root for `next dev`, `next start` and the CLI.
export const REPORTS_DIR = path.join(process.cwd(), 'reports');
const ID_RE = /^[\w-]+$/;

const fileFor = (id: string) => path.join(REPORTS_DIR, `${id}.json`);

export async function saveReport(report: Report) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const file = fileFor(report.id);
  await fs.writeFile(file, JSON.stringify(report, null, 2));
  return file;
}

export async function listReports(): Promise<ReportListItem[]> {
  let files: string[];
  try {
    files = (await fs.readdir(REPORTS_DIR)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const items = await Promise.all(
    files.map(async (f): Promise<ReportListItem | null> => {
      try {
        const r = JSON.parse(await fs.readFile(path.join(REPORTS_DIR, f), 'utf8')) as Report;
        return {
          id: r.id,
          url: r.config.url,
          method: r.config.method,
          startedAt: r.startedAt,
          stopped: r.stopped,
          users: r.stages.map((s) => s.users),
          maxUsersWithinSla: r.verdict?.maxUsersWithinSla ?? null,
          failedAt: r.verdict?.firstFailure?.users ?? null,
        };
      } catch {
        return null; // skip unreadable or old-format files
      }
    }),
  );
  return items
    .filter((r): r is ReportListItem => r !== null)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function readReport(id: string): Promise<Report | null> {
  if (!ID_RE.test(id)) return null;
  try {
    const report = JSON.parse(await fs.readFile(fileFor(id), 'utf8')) as Report;
    report.timeline ??= [];
    return report;
  } catch {
    return null;
  }
}

export async function deleteReport(id: string) {
  if (!ID_RE.test(id)) return false;
  try {
    await fs.unlink(fileFor(id));
    return true;
  } catch {
    return false;
  }
}
