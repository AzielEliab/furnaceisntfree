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

export default {
  async fetch(request, env) {
    const redirectTo = canonicalRedirectUrl(request.url, request.method);
    if (redirectTo) return withTransportSecurity(Response.redirect(redirectTo, 301), request);
    const response = await handleRequest(request, { store: storeFor(env), env });
    if (response) return withTransportSecurity(response, request);
    if (env.ASSETS) return withTransportSecurity(await env.ASSETS.fetch(request), request);
    return withTransportSecurity(
      new Response("Not found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "content-signal": "search=yes, ai-input=yes, ai-train=yes"
        }
      }),
      request
    );
  }
};
