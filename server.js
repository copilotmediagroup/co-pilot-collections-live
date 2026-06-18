import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const port = process.env.PORT || 5173;
const distRoot = join(process.cwd(), "dist");
const publicRoot = join(process.cwd(), "public");
const root = existsSync(join(distRoot, "index.html")) ? distRoot : process.cwd();

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".sql": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

http.createServer((req, res) => {
  let url = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  let path = join(root, url);

  if (!existsSync(path) && url === "/config.js") {
    path = join(publicRoot, "config.js");
  }

  if (!existsSync(path)) {
    path = join(root, "index.html");
  }

  if (!existsSync(path)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, { "Content-Type": types[extname(path)] || "text/plain" });
  res.end(readFileSync(path));
}).listen(port, "0.0.0.0", () => {
  console.log("Co Pilot Collections Manager running on port " + port);
});
