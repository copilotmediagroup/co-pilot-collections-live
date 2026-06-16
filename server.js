import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const port = process.env.PORT || 5173;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

http.createServer((req, res) => {
  const url = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const path = join(process.cwd(), url);

  if (!existsSync(path)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, { "Content-Type": types[extname(path)] || "text/plain" });
  res.end(readFileSync(path));
}).listen(port, "0.0.0.0", () => {
  console.log("Co Pilot CRM running on port " + port);
});
