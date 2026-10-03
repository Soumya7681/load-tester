import { stopTest } from '@/lib/runner';

export async function POST() {
  return stopTest()
    ? Response.json({ ok: true })
    : Response.json({ error: 'No test is running' }, { status: 409 });
}
