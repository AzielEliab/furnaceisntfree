import { handleRequest } from "../lib/api.mjs";
import { ALIAS_HOST, CANONICAL_HOST } from "../lib/paths.mjs";
import { createKvStore } from "../lib/store-kv.mjs";
import { createMemoryStore } from "../lib/store-memory.mjs";

let memoryStore;

function storeFor(env) {
  if (env.SITE_KV) return createKvStore(env);
  if (!memoryStore) memoryStore = createMemoryStore();
  return memoryStore;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.toLowerCase() === ALIAS_HOST) {
      url.hostname = CANONICAL_HOST;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    const response = await handleRequest(request, { store: storeFor(env), env });
    if (response) return response;
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "content-signal": "search=yes, ai-input=yes, ai-train=yes" }
    });
  }
};
