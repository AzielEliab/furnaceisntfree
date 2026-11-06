import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleRequest } from "../lib/api.mjs";
import { canonicalRedirectUrl } from "../lib/paths.mjs";
import { createFileStore } from "../lib/store-file.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 43127);
const host = process.env.HOST || "0.0.0.0";
const store = createFileStore(path.join(root, "data"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jsonld": "application/ld+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png"
};

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  let rel = decoded;
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(publicDir, rel));
  if (!file.startsWith(publicDir)) return null;
  return file;
}

async function readRequestBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 6_500_000) {
      const error = new Error("too-large");
      error.code = "too-large";
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function send(res, response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);
  if (response.body) {
    response.arrayBuffer().then((buf) => {
      res.end(Buffer.from(buf));
    });
    return;
  }
  res.end();
}

const server = createServer(async (req, res) => {
  try {
    const method = req.method || "GET";
    const hostHeader = req.headers.host || "127.0.0.1";
    const redirectTo = canonicalRedirectUrl(`http://${hostHeader}${req.url}`, method);
    if (redirectTo) {
      res.writeHead(301, {
        location: redirectTo,
        "content-signal": "search=yes, ai-input=yes, ai-train=yes",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer"
      });
      res.end();
      return;
    }
    const body =
      method === "GET" || method === "HEAD" ? undefined : await readRequestBody(req);
    const headers = new Headers();
    const skip = new Set(["connection", "transfer-encoding", "keep-alive", "upgrade", "host", "content-length"]);
    for (const [key, value] of Object.entries(req.headers)) {
      if (skip.has(key.toLowerCase()) || value == null) continue;
      if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
      else headers.set(key, value);
    }
    const request = new Request(`http://127.0.0.1${req.url}`, {
      method,
      headers,
      body: body && body.length ? body : undefined
    });
    const api = await handleRequest(request, { store, env: process.env });
    if (api) {
      send(res, api);
      return;
    }
    const file = resolveFile(new URL(req.url, "http://127.0.0.1").pathname);
    if (!file) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("Bad path");
      return;
    }
    try {
      const data = await readFile(file);
      const ext = path.extname(file);
      const pathname = new URL(req.url, "http://127.0.0.1").pathname;
      const headers = {
        "content-type": pathname === "/who-is" ? "text/plain; charset=utf-8" : MIME[ext] || "application/octet-stream",
        "x-content-type-options": "nosniff",
        "content-signal": "search=yes, ai-input=yes, ai-train=yes",
        "referrer-policy": "no-referrer"
      };
      if (method === "HEAD") {
        res.writeHead(200, headers);
        res.end();
        return;
      }
      res.writeHead(200, headers);
      res.end(data);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        const missing = await readFile(path.join(publicDir, "404.html"));
        res.writeHead(404, {
          "content-type": "text/html; charset=utf-8",
          "content-signal": "search=yes, ai-input=yes, ai-train=yes",
          "x-content-type-options": "nosniff"
        });
        res.end(method === "HEAD" ? undefined : missing);
        return;
      }
      throw error;
    }
  } catch (error) {
    if (error && error.code === "too-large") {
      res.writeHead(413, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "Upload is too large." }));
      return;
    }
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

server.listen(port, host, () => {
  console.log(`The Furnace Isn't Free listening at http://127.0.0.1:${port}`);
});
