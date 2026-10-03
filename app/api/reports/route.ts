import { listReports } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await listReports());
}
