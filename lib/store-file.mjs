import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function createFileStore(dir) {
  const jsonDir = path.join(dir, "json");
  const byteDir = path.join(dir, "private-uploads");
  let chain = Promise.resolve();
  function lock(fn) {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => {},
      () => {}
    );
    return run;
  }
  async function fileFor(key) {
    await mkdir(jsonDir, { recursive: true });
    return path.join(jsonDir, `${key.replace(/[^a-z0-9_-]/gi, "_")}.json`);
  }
  return {
    kind: "file",
    imageKind: "file",
    lock,
    async getJson(key) {
      try {
        const raw = await readFile(await fileFor(key), "utf8");
        return JSON.parse(raw);
      } catch (error) {
        if (error && error.code === "ENOENT") return null;
        throw error;
      }
    },
    async putJson(key, value) {
      const file = await fileFor(key);
      await writeFile(file, JSON.stringify(value), "utf8");
    },
    async putBytes(key, data) {
      await mkdir(byteDir, { recursive: true });
      const safe = `${key.replace(/[^a-z0-9_-]/gi, "_")}.jpg`;
      await writeFile(path.join(byteDir, safe), Buffer.from(data));
    },
    async getBytes(key) {
      const safe = `${key.replace(/[^a-z0-9_-]/gi, "_")}.jpg`;
      try {
        const buf = await readFile(path.join(byteDir, safe));
        return new Uint8Array(buf);
      } catch (error) {
        if (error && error.code === "ENOENT") return null;
        throw error;
      }
    }
  };
}
