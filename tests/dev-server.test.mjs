import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { listenWithFallback } from "../scripts/listen-with-fallback.mjs";

function closeServer(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test("默认端口被占用时自动顺延，而不是直接启动失败", async (context) => {
  const occupiedServer = createServer();
  await new Promise((resolve) => occupiedServer.listen(0, "127.0.0.1", resolve));
  const occupiedPort = occupiedServer.address().port;
  const arcadeServer = createServer();
  context.after(async () => {
    await closeServer(arcadeServer);
    await closeServer(occupiedServer);
  });

  const retries = [];
  const actualPort = await listenWithFallback(arcadeServer, occupiedPort, {
    host: "127.0.0.1",
    maxAttempts: 5,
    onRetry: (from, to) => retries.push([from, to])
  });

  assert.equal(actualPort, occupiedPort + 1);
  assert.deepEqual(retries, [[occupiedPort, occupiedPort + 1]]);
});
