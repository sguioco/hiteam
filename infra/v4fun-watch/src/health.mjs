import { createServer } from "node:http";

export function startHealthServer(port, status) {
  const server = createServer((request, response) => {
    const snapshot = status();
    const stale = snapshot.lastCompletedAt
      ? Date.now() - Date.parse(snapshot.lastCompletedAt) > Math.max(5000, Number(snapshot.intervalMs ?? 500) * 10)
      : true;
    const ready = snapshot.running === true && !stale;
    if (request.url === "/ready") {
      response.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
      response.end(JSON.stringify({ ...snapshot, ready, stale }));
      return;
    }
    if (request.url === "/health" || request.url === "/") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ...snapshot, ready, stale }));
      return;
    }
    response.writeHead(404).end();
  });
  server.listen(port, "0.0.0.0");
  return server;
}
