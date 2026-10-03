// Demo site to practice load testing safely on your own machine.
// Simulates a server with limited capacity: it handles CAPACITY requests at a time,
// queues the rest (latency grows), and returns 503 once the queue is full.
//
//   GET /           fast page (~5 ms)
//   GET /api        "database" endpoint (~30 ms of work, capacity limited)
//   GET /slow       slow endpoint (100-400 ms)
//   POST /login     echo JSON body after ~50 ms
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 4000);
const CAPACITY = Number(process.env.CAPACITY ?? 20);
const MAX_QUEUE = Number(process.env.MAX_QUEUE ?? 200);

let busy = 0;
const queue: Array<(ok: boolean) => void> = [];

function acquire(): Promise<boolean> {
  if (busy < CAPACITY) {
    busy++;
    return Promise.resolve(true);
  }
  if (queue.length >= MAX_QUEUE) return Promise.resolve(false);
  return new Promise((resolve) => { queue.push(resolve); });
}

function release() {
  const next = queue.shift();
  if (next) next(true);
  else busy--;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function limited(res: http.ServerResponse, workMs: number, body: unknown) {
  if (!(await acquire())) {
    res.writeHead(503, { 'content-type': 'text/plain' });
    return res.end('Service Unavailable: overloaded');
  }
  try {
    await wait(workMs);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  } finally {
    release();
  }
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');

  if (req.method === 'GET' && pathname === '/') {
    await wait(5);
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end('<h1>Demo target</h1><p>Point the load tester at /api, /slow or /login.</p>');
  }
  if (req.method === 'GET' && pathname === '/api') {
    return limited(res, 30, { items: Array.from({ length: 20 }, (_, i) => ({ id: i, name: `item ${i}` })) });
  }
  if (req.method === 'GET' && pathname === '/slow') {
    return limited(res, 100 + Math.random() * 300, { ok: true });
  }
  if (req.method === 'POST' && pathname === '/login') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    return limited(res, 50, { ok: true, received: raw.length });
  }
  res.writeHead(404);
  res.end('not found');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Demo target on http://127.0.0.1:${PORT} (capacity ${CAPACITY}, queue ${MAX_QUEUE})`);
});

setInterval(() => {
  if (busy || queue.length) console.log(`busy=${busy} queued=${queue.length}`);
}, 2000).unref();
