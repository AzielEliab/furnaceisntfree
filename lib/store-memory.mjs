export function createMemoryStore() {
  const json = new Map();
  const bytes = new Map();
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
    kind: "memory",
    imageKind: "memory",
    lock,
    async getJson(key) {
      return json.has(key) ? structuredClone(json.get(key)) : null;
    },
    async putJson(key, value) {
      json.set(key, structuredClone(value));
    },
    async putBytes(key, data) {
      bytes.set(key, new Uint8Array(data));
    },
    async getBytes(key) {
      return bytes.has(key) ? new Uint8Array(bytes.get(key)) : null;
    }
  };
}
