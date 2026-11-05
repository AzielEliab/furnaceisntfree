import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { handleRequest } from "../lib/api.mjs";
import worker from "../src/worker.js";
import { PATHS } from "../lib/paths.mjs";
import { createMemoryStore } from "../lib/store-memory.mjs";
import {
  analyzeQuotes,
  buildRepairQuestions,
  calculateOffer,
  clampComment,
  discountCheck,
  gateJpeg
} from "../public/js/engine.js";

const publicDir = path.resolve("public");

function jpeg(width, height, minBytes = 0) {
  const heightHi = (height >> 8) & 255;
  const heightLo = height & 255;
  const widthHi = (width >> 8) & 255;
  const widthLo = width & 255;
  const head = Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, heightHi, heightLo, widthHi, widthLo, 0x03,
    0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00
  ]);
  const pad = Math.max(0, minBytes - head.length - 2);
  return Buffer.concat([head, Buffer.alloc(pad), Buffer.from([0xff, 0xd9])]);
}

test("fictional example matches the published arithmetic", () => {
  const result = calculateOffer({
    equipment: "1500",
    allowance: "1500",
    labor: "4800",
    materials: "900",
    other: "0"
  });
  assert.equal(result.net.value, 0);
  assert.equal(result.excess.value, 0);
  assert.equal(result.install.value, 5700);
  assert.equal(result.incremental.value, 5700);
  assert.equal(Math.round(result.ratio.value * 10) / 10, 3.2);
  assert.equal(result.packageGap.state, "unknown");
});

test("blank stays unknown and explicit zero is kept", () => {
  const blank = calculateOffer({ equipment: "2000", allowance: "", labor: "", materials: "0", other: "0" });
  assert.equal(blank.net.state, "unknown");
  assert.equal(blank.install.state, "unknown");
  assert.equal(blank.incremental.state, "unknown");
  assert.equal(blank.ratio.state, "unknown");
  assert.equal(blank.inputs.materials.value, 0);
  const zero = calculateOffer({ equipment: "2000", allowance: "0", labor: "0", materials: "0", other: "0" });
  assert.equal(zero.net.value, 2000);
  assert.equal(zero.install.value, 0);
  assert.equal(zero.incremental.value, 2000);
});

test("allowance above equipment is excess, not absorbed into labor", () => {
  const result = calculateOffer({
    equipment: "1500",
    allowance: "2000",
    labor: "100",
    materials: "0",
    other: "0"
  });
  assert.equal(result.net.value, 0);
  assert.equal(result.excess.value, 500);
  assert.equal(result.incremental.value, 100);
});

test("ratio is not defined when equipment price is zero", () => {
  const result = calculateOffer({ equipment: "0", allowance: "0", labor: "100", materials: "0", other: "0" });
  assert.equal(result.ratio.state, "undefined");
  assert.equal(result.incremental.value, 100);
});

test("package gap is not inferred from component lines", () => {
  const result = calculateOffer({
    equipment: "1500",
    allowance: "1500",
    labor: "4800",
    materials: "900",
    other: "0",
    packageTotal: "9000",
    acOnly: "7000"
  });
  assert.equal(result.packageGap.value, 2000);
  assert.equal(result.incremental.value, 5700);
});

test("quote comparison flags gaps and does not rank", () => {
  const analysis = analyzeQuotes([
    { nickname: "A", furnaceModel: "AB1", afue: "80", staging: "single-stage", capacity: "80k", permits: "included", total: "9000" },
    { nickname: "B", furnaceModel: "CD2", afue: "96", staging: "two-stage", capacity: "80k", permits: "excluded", total: "" }
  ]);
  assert.equal(analysis.winner, null);
  assert.equal(analysis.ranking, null);
  assert.ok(analysis.flags.some((flag) => flag.code === "mismatch-furnaceModel"));
  assert.ok(analysis.flags.some((flag) => flag.code === "missing-total"));
  assert.match(analysis.note, /not ranked/i);
});

test("discount check refuses a deception verdict", () => {
  const result = discountCheck({
    referenceKind: "msrp",
    referencePrice: "1000",
    promoPrice: "700",
    actuallyOffered: "unknown"
  });
  assert.equal(result.verdict, null);
  assert.equal(result.gap.value, 300);
  assert.ok(result.flags.length > 0);
});

test("repair builder never issues a safety determination", () => {
  const result = buildRepairQuestions({
    diagnosis: "The unit is rusty. Is it safe?",
    ageYears: "18",
    repairEstimate: "",
    replacementEstimate: "8000"
  });
  assert.equal(result.safetyDetermination, null);
  assert.ok(result.questions.some((question) => question.id === "no-remote-safety"));
  assert.ok(result.questions.some((question) => question.id === "rust"));
  const joined = result.questions.map((question) => question.text).join(" ");
  assert.doesNotMatch(joined, /your furnace is unsafe/i);
  assert.doesNotMatch(joined, /safe to operate/i);
});

test("comment cap and contact details are refused", () => {
  assert.equal(clampComment("a".repeat(256)).ok, true);
  assert.equal(clampComment("a".repeat(257)).ok, false);
  assert.equal(clampComment("reach me at owner@example.com").ok, false);
  assert.equal(clampComment("call 555-201-3344").ok, false);
});

test("jpeg gate accepts a page-shaped jpeg and rejects the rest", () => {
  const ok = gateJpeg(jpeg(1200, 1600, 13000));
  assert.equal(ok.ok, true);
  assert.equal(gateJpeg(Buffer.from([0x89, 0x50, 0x4e, 0x47])).ok, false);
  assert.equal(gateJpeg(jpeg(1200, 1600, 100)).code, "too_small");
  assert.equal(gateJpeg(jpeg(200, 200, 13000)).code, "dimensions");
  assert.equal(gateJpeg(jpeg(4000, 400, 13000)).code, "aspect");
});

test("feedback receipt stores math, rejects junk images, and keeps publication off", async () => {
  const store = createMemoryStore();
  const env = {};
  const good = await handleRequest(
    new Request("http://local/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tool: "free-meaning",
        useful: true,
        comment: "Clear enough",
        inputs: { equipment: "1500", allowance: "1500", labor: "4800", materials: "900", other: "0" },
        publish_consent: true,
        review_requested: true
      })
    }),
    { store, env }
  );
  const saved = await good.json();
  assert.equal(saved.ok, true);
  assert.equal(saved.publish_consent, false);
  assert.equal(saved.publication_status, "not_published");
  assert.equal(saved.corpus_status, "not_configured");
  assert.equal(saved.ocr, false);
  const row = await store.getJson(`receipt:${saved.id}`);
  assert.equal(row.snapshot.outputs.incremental, 5700);
  assert.equal(row.publication_requested, true);

  const badImage = await handleRequest(
    new Request("http://local/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tool: "free-meaning",
        useful: false,
        jpeg_base64: Buffer.from("not a jpeg").toString("base64"),
        attestation: true,
        redaction_confirmed: true
      })
    }),
    { store, env }
  );
  assert.equal(badImage.status, 400);

  const pii = await handleRequest(
    new Request("http://local/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tool: "submit-offer", useful: true, inputs: { notes: "Call 555-010-0199" } })
    }),
    { store, env }
  );
  assert.equal(pii.status, 400);

  const jpegBytes = jpeg(1000, 1400, 14000);
  const withImage = await handleRequest(
    new Request("http://local/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tool: "submit-offer",
        useful: true,
        inputs: { claim: "Free furnace with the AC" },
        jpeg_base64: jpegBytes.toString("base64"),
        attestation: true,
        redaction_confirmed: true
      })
    }),
    { store, env }
  );
  const imageSaved = await withImage.json();
  assert.equal(imageSaved.ok, true);
  assert.equal(imageSaved.image_stored, true);
  assert.ok(await store.getBytes(imageSaved.id));

  const missingAttest = await handleRequest(
    new Request("http://local/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tool: "submit-offer",
        useful: false,
        jpeg_base64: jpegBytes.toString("base64"),
        attestation: false,
        redaction_confirmed: true
      })
    }),
    { store, env }
  );
  assert.equal(missingAttest.status, 400);

  const meter = await (await handleRequest(new Request("http://local/api/usefulness"), { store, env })).json();
  assert.equal(meter.invent_users, false);
  assert.ok(meter.useful_yes >= 2);
  assert.equal(meter.comments_public, false);
  assert.equal(meter.images_public, false);

  const locked = await handleRequest(new Request("http://local/api/receipts"), { store, env });
  assert.equal(locked.status, 401);
  const imageGet = await handleRequest(new Request(`http://local/api/receipts/${imageSaved.id}/image`), { store, env });
  assert.equal(imageGet.status, 401);
});

test("page counter separates humans and bots and ignores unknown paths", async () => {
  const store = createMemoryStore();
  const env = {};
  const human = await handleRequest(
    new Request("http://local/count", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify({ path: "/the-numbers" })
    }),
    { store, env }
  );
  assert.equal((await human.json()).class, "human");
  await handleRequest(
    new Request("http://local/count", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "GPTBot/1.0" },
      body: JSON.stringify({ path: "/" })
    }),
    { store, env }
  );
  const skipped = await handleRequest(
    new Request("http://local/count", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "/not-a-page/" })
    }),
    { store, env }
  );
  assert.equal(skipped.status, 400);
  const views = await (await handleRequest(new Request("http://local/v1/stats"), { store, env })).json();
  assert.equal(views.views, 2);
  assert.equal(views.views_human, 1);
  assert.equal(views.views_bot, 1);
  assert.equal(views.invent_users, false);
});

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

test("every page has the ecosystem footer, a real main heading, and no dead anchors", async () => {
  const files = await htmlFiles(publicDir);
  assert.ok(files.length >= PATHS.length);
  const hrefs = new Set();
  for (const file of files) {
    const html = await readFile(file, "utf8");
    assert.match(html, /Part of the Aziel Eliab ecosystem/);
    assert.match(html, /<h1[\s>]/);
    assert.equal(html.includes("1 Chronicles"), false);
    assert.doesNotMatch(html, /lorem ipsum/i);
    for (const match of html.matchAll(/href="([^"]+)"/g)) hrefs.add(match[1]);
    const withoutFeedback = html.replace(/<form id="[^"]*" class="feedback[\s\S]*?<\/form>/g, "");
    assert.doesNotMatch(withoutFeedback, /<button[^>]*\sdisabled/, file);
  }
  const apiHrefs = new Set(["/count", "/v1/count", "/v1/stats", "/stats", "/api/usefulness", "/api/health", "/openapi.json"]);
  for (const href of hrefs) {
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) continue;
    const clean = href.split("#")[0].split("?")[0];
    if (apiHrefs.has(clean) || clean.startsWith("/api/")) continue;
    const rel = clean.endsWith("/") ? `${clean}index.html` : clean;
    const file = path.join(publicDir, rel.replace(/^\//, ""));
    await readFile(file);
  }
  for (const pagePath of PATHS) {
    const rel = pagePath === "/" ? "index.html" : `${pagePath.slice(1)}index.html`;
    const html = await readFile(path.join(publicDir, rel), "utf8");
    assert.match(html, /<main id="main">/);
  }
});

test("discovery files allow indexing signals and cite the person id", async () => {
  const robots = await readFile(path.join(publicDir, "robots.txt"), "utf8");
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/);
  assert.match(robots, /GPTBot/);
  assert.doesNotMatch(robots, /Disallow:\s*\/\s*GPTBot|User-agent:\s*GPTBot[\s\S]*Disallow:\s*\//);
  const cite = JSON.parse(await readFile(path.join(publicDir, "cite.json"), "utf8"));
  assert.equal(cite.person["@id"], "https://www.azieleliab.com/#aziel");
  assert.ok(cite.person.sameAs.includes("https://www.azieleliab.com/#aziel"));
  const sitemap = await readFile(path.join(publicDir, "sitemap.xml"), "utf8");
  for (const pagePath of PATHS) {
    const loc = pagePath === "/" ? "https://furnaceisntfree.com/" : `https://furnaceisntfree.com${pagePath}`;
    assert.ok(sitemap.includes(loc), loc);
  }
  assert.equal(sitemap.includes("thefurnaceisntfree.com"), false);
  const home = await readFile(path.join(publicDir, "index.html"), "utf8");
  assert.match(home, /https:\/\/furnaceisntfree\.com\//);
  assert.equal(home.includes("thefurnaceisntfree.com"), false);
  const openapi = JSON.parse(await readFile(path.join(publicDir, "openapi.json"), "utf8"));
  assert.ok(openapi.paths["/api/feedback"]);
  const llms = await readFile(path.join(publicDir, "llms.txt"), "utf8");
  assert.match(llms, /max\(0, equipment price/);
  assert.equal(await readFile(path.join(publicDir, "ai.txt"), "utf8"), llms);
  assert.match(llms, /www\.furnaceisntfree\.com/);
});

test("aziel doors are the official sister set", async () => {
  const html = await readFile(path.join(publicDir, "aziel/index.html"), "utf8");
  const urls = [
    "https://www.azieleliab.com/",
    "https://azielcorpuslibrary.net/",
    "https://godlock.uk/",
    "https://hedidntjump.com/",
    "https://github.com/AzielEliab/aziel-runtime",
    "https://aziel-runtime.vibelock.workers.dev/",
    "https://timetounsealthebook.net/"
  ];
  for (const url of urls) assert.ok(html.includes(`href="${url}"`), url);
  assert.match(html, /Official cross-chain sister handles/);
  assert.equal(html.includes("trades-runtime"), false);
  assert.equal(html.includes("glama.ai"), false);
  assert.equal(/Cap-7|ICANN/i.test(html), false);
});

test("www alias redirects to the apex host", async () => {
  const response = await worker.fetch(new Request("https://www.furnaceisntfree.com/the-numbers/?q=1"), {});
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://furnaceisntfree.com/the-numbers/?q=1");
  const apex = await worker.fetch(new Request("https://furnaceisntfree.com/api/health"), {});
  assert.equal(apex.status, 200);
});
