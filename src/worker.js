import { handleRequest } from "../lib/api.mjs";
import { canonicalRedirectUrl } from "../lib/paths.mjs";
import { createKvStore } from "../lib/store-kv.mjs";
import { createMemoryStore } from "../lib/store-memory.mjs";

let memoryStore;

function storeFor(env) {
  if (env.SITE_KV) return createKvStore(env);
  if (!memoryStore) memoryStore = createMemoryStore();
  return memoryStore;
}

const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

function isHtmlOrText(contentType) {
  const type = String(contentType || "").toLowerCase();
  return (
    type.startsWith("text/") ||
    type.includes("application/json") ||
    type.includes("application/ld+json") ||
    type.includes("application/xml") ||
    type.includes("application/javascript") ||
    type.includes("application/manifest+json")
  );
}

/** HTML and text responses carry the same Content-Signal already published in robots.txt. */
function withContentSignal(response) {
  if (!isHtmlOrText(response.headers.get("content-type"))) return response;
  if (response.headers.get("content-signal") === CONTENT_SIGNAL) return response;
  const headers = new Headers(response.headers);
  headers.set("content-signal", CONTENT_SIGNAL);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/** HTTPS responses only. max-age=31536000, no includeSubDomains, no preload. */
function withTransportSecurity(response, request) {
  const url = new URL(request.url);
  if (url.protocol !== "https:") return response;
  const headers = new Headers(response.headers);
  headers.set("strict-transport-security", "max-age=31536000");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

const MACHINE_TYPES = new Map([
  ["/person.jsonld", "application/ld+json; charset=utf-8"],
  ["/identity.jsonld", "application/ld+json; charset=utf-8"],
  ["/graph.jsonld", "application/ld+json; charset=utf-8"],
  ["/who-is", "text/plain; charset=utf-8"],
  ["/who-is-aziel-eliab.txt", "text/plain; charset=utf-8"]
]);

export default {
  async fetch(request, env) {
    const redirectTo = canonicalRedirectUrl(request.url, request.method);
    if (redirectTo) return withTransportSecurity(Response.redirect(redirectTo, 301), request);
    const response = await handleRequest(request, { store: storeFor(env), env });
    if (response) return withTransportSecurity(withContentSignal(response), request);
    if (env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      const type = MACHINE_TYPES.get(new URL(request.url).pathname);
      if (!type || !asset.ok) return withTransportSecurity(withContentSignal(asset), request);
      const headers = new Headers(asset.headers);
      headers.set("content-type", type);
      const typed = new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
      return withTransportSecurity(withContentSignal(typed), request);
    }
    return withTransportSecurity(
      withContentSignal(
        new Response("Not found", {
          status: 404,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "content-signal": CONTENT_SIGNAL
          }
        })
      ),
      request
    );
  }
};
