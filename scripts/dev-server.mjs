import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.ARCADE_DEV_PORT || "5173", 10);
const mounts = [
  ["/roms/", join(projectRoot, "runtime", "roms")],
  ["/bios/", join(projectRoot, "runtime", "bios")],
  ["/covers/", join(projectRoot, "runtime", "covers")],
  ["/emulatorjs/", join(projectRoot, "public", "emulatorjs")]
];
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"], [".webp", "image/webp"], [".png", "image/png"],
  [".zip", "application/zip"], [".wasm", "application/wasm"], [".data", "application/octet-stream"]
]);

function resolveRequestPath(pathname) {
  const mount = mounts.find(([prefix]) => pathname.startsWith(prefix));
  const base = mount?.[1] ?? projectRoot;
  const relative = mount ? pathname.slice(mount[0].length) : pathname.slice(1);
  const filePath = resolve(base, normalize(relative || "index.html"));
  return filePath === base || filePath.startsWith(`${base}${sep}`) ? filePath : null;
}

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let filePath = resolveRequestPath(pathname);
  if (filePath && existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Cache-Control", "no-store");

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

server.listen(port, "0.0.0.0", () => {
  console.log(`Arcade Vault 已启动：http://localhost:${port}`);
});
