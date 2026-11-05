/** Cloudflare KV + optional R2. Used only by the Worker. */
export function createKvStore(env) {
  const kv = env.SITE_KV;
  const r2 = env.UPLOADS || null;
  let chain = Promise.resolve();
  function lock(fn) {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => {},
      () => {}
    );
    return run;
  }
  return {
    kind: "kv",
    imageKind: r2 ? "r2" : "kv",
    lock,
    async getJson(key) {
      return kv.get(key, "json");
    },
    async putJson(key, value) {
      await kv.put(key, JSON.stringify(value));
    },
    async putBytes(key, data) {
      const body = new Uint8Array(data);
      if (r2) {
        await r2.put(key, body, {
          httpMetadata: { contentType: "image/jpeg" },
          customMetadata: { visibility: "private" }
        });
        return;
      }
      if (body.byteLength > 2 * 1024 * 1024) {
        const error = new Error("image-too-large-for-kv");
        error.code = "image-too-large-for-kv";
        throw error;
      }
      let binary = "";
      for (let i = 0; i < body.length; i += 1) binary += String.fromCharCode(body[i]);
      await kv.put(`bytes:${key}`, btoa(binary));
    },
    async getBytes(key) {
      if (r2) {
        const obj = await r2.get(key);
        if (!obj) return null;
        return new Uint8Array(await obj.arrayBuffer());
      }
      const encoded = await kv.get(`bytes:${key}`);
      if (!encoded) return null;
      const binary = atob(encoded);
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
      return out;
    }
  };
}
