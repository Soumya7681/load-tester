import { BusyError, startTest } from '@/lib/runner';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body must be JSON' }, { status: 400 });
  }
  try {
    return Response.json(startTest(body), { status: 201 });
  } catch (err) {
    const status = err instanceof BusyError ? 409 : 400;
    return Response.json({ error: (err as Error).message }, { status });
  }
}
