// Minimal static server for a Next.js export: node demo/serve-static.js <dir> <port>
// Used to record against a frozen copy of apps/web/out on a port of its own.

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const [dir, port] = [path.resolve(process.argv[2]), Number(process.argv[3] ?? 3100)];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain" };

http
  .createServer((req, res) => {
    const clean = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const rel = path.normalize(clean).replace(/^([/\\])+/, "");
    const candidates = [rel, `${rel}.html`, path.join(rel, "index.html")].map((p) => path.join(dir, p));
    const file = candidates.find((p) => p.startsWith(dir) && fs.existsSync(p) && fs.statSync(p).isFile());
    if (!file) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () => console.log(`serving ${dir} on ${port}`));
