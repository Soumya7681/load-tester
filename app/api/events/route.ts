import { getSnapshot, subscribe } from '@/lib/runner';

export const dynamic = 'force-dynamic';

// Server-Sent Events: a snapshot on connect, then every live event of the running test.
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const send = (type: string, data: unknown) => write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);

      send('snapshot', getSnapshot());
      const unsubscribe = subscribe((e) => send(e.type, e.data));
      const ping = setInterval(() => write(': ping\n\n'), 15_000);

      cleanup = () => {
        clearInterval(ping);
        unsubscribe();
      };
      req.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
