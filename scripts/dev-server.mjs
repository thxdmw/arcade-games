import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { listenWithFallback } from "./listen-with-fallback.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.ARCADE_DEV_PORT || "5173", 10);
const mounts = [
  ["/emulatorjs/", join(projectRoot, "public", "emulatorjs")]
];
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"], [".ico", "image/x-icon"], [".webp", "image/webp"], [".png", "image/png"],
  [".zip", "application/zip"], [".wasm", "application/wasm"], [".data", "application/octet-stream"]
]);

function resolveRequestPath(pathname) {
  if (pathname === "/favicon.ico") return join(projectRoot, "assets", "favicon.ico");
  const mount = mounts.find(([prefix]) => pathname.startsWith(prefix));
  const base = mount?.[1] ?? projectRoot;
  const relative = mount ? pathname.slice(mount[0].length) : pathname.slice(1);
  const filePath = resolve(base, normalize(relative || "index.html"));
  return filePath === base || filePath.startsWith(`${base}${sep}`) ? filePath : null;
}

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Cache-Control", "no-store");

  if (pathname === "/favicon.ico") {
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Cache-Control", "public, max-age=2592000");
  }

  let filePath = resolveRequestPath(pathname);
  if (pathname.startsWith("/runtime/") && filePath && existsSync(filePath) && statSync(filePath).isDirectory()) {
    const entries = readdirSync(filePath, { withFileTypes: true })
      .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : "file" }));
    const payload = JSON.stringify(entries);
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(payload) });
    response.end(request.method === "HEAD" ? undefined : payload);
    return;
  }
  if (filePath && existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("404 - 资源不存在");
    return;
  }

  const stat = statSync(filePath);
  response.writeHead(200, {
    "Content-Type": mimeTypes.get(extname(filePath).toLowerCase()) ?? "application/octet-stream",
    "Content-Length": stat.size
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(filePath).pipe(response);
});

try {
  const actualPort = await listenWithFallback(server, port, {
    onRetry: (occupiedPort, nextPort) => {
      console.warn(`端口 ${occupiedPort} 已被占用，自动尝试 ${nextPort}`);
    }
  });
  console.log(`Arcade Vault 已启动：http://localhost:${actualPort}`);
} catch (error) {
  console.error(`开发服务器启动失败：${error.message}`);
  process.exitCode = 1;
}
