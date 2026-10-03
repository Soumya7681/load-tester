import { deleteReport, readReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: RouteContext<'/api/reports/[id]'>) {
  const { id } = await ctx.params;
  const report = await readReport(id);
  if (!report) return Response.json({ error: 'Not found' }, { status: 404 });
  const download = new URL(req.url).searchParams.has('download');
  return Response.json(report, {
    headers: download ? { 'content-disposition': `attachment; filename="load-test-${id}.json"` } : {},
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/reports/[id]'>) {
  const { id } = await ctx.params;
  return (await deleteReport(id))
    ? Response.json({ ok: true })
    : Response.json({ error: 'Not found' }, { status: 404 });
}
