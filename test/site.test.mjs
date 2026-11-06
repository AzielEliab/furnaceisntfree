import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { handleRequest } from "../lib/api.mjs";
import { INDEXNOW_KEY, INDEXNOW_FILENAME, INDEXNOW_PATH } from "../lib/indexnow.mjs";
import worker from "../src/worker.js";
import { CANONICAL_HTML_PATH, PATHS, canonicalRedirectUrl } from "../lib/paths.mjs";
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

function gitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().toLowerCase();
}

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
  assert.match(llms, /Alias: https:\/\/www\.furnaceisntfree\.com\/ \(Worker 301 to https:\/\/furnaceisntfree\.com\/ when www reaches this script\)/);
  assert.match(llms, /not a Search Console property check/);
  assert.match(llms, /not a crawl confirmation/);
  assert.doesNotMatch(llms, /verified/i);
  assert.match(llms, new RegExp(`Public key file: https://furnaceisntfree.com/${INDEXNOW_KEY}\\.txt`));
  assert.match(llms, /does not call IndexNow/);
  assert.match(llms, /Indexing remains unconfirmed/);
  assert.match(robots, new RegExp(`Allow: ${INDEXNOW_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(robots, /does not submit URLs/);
  assert.doesNotMatch(robots, /indexnow\.org/i);
  assert.match(llms, /Cap-7 mesh DNS and public ICANN/);
  assert.match(llms, /Paid satellite is HELD/);
  assert.match(llms, /Remain-OFF/);
  assert.doesNotMatch(llms, /indexing is live/i);
  const lastmod = (loc) => {
    const match = sitemap.match(new RegExp(`<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc><lastmod>([^<]+)</lastmod>`));
    assert.ok(match, loc);
    return match[1];
  };
  assert.equal(lastmod("https://furnaceisntfree.com/aziel/"), "2026-11-06");
  assert.equal(lastmod("https://furnaceisntfree.com/the-numbers/"), "2026-11-05");
  assert.equal(lastmod("https://furnaceisntfree.com/how-the-offer-works/"), "2026-11-05");
  assert.equal(lastmod("https://furnaceisntfree.com/discount-reality-check/"), "2026-11-05");
  assert.equal(lastmod("https://furnaceisntfree.com/"), "2026-11-06");
  assert.equal(lastmod("https://furnaceisntfree.com/about/"), "2026-11-06");
  assert.equal(lastmod("https://furnaceisntfree.com/privacy/"), "2026-10-31");
  assert.equal(lastmod("https://furnaceisntfree.com/checklist/"), "2026-10-31");
  assert.ok(cite.person.sameAs.includes("https://github.com/AzielEliab"));
  assert.ok(cite.person.sameAs.includes("https://x.com/AzielEliab"));
  assert.equal(cite.person["@id"], "https://www.azieleliab.com/#aziel");
  assert.deepEqual(cite.also_known_as, cite.person.alternateName);
  assert.deepEqual(cite.roles, cite.person.jobTitle);
  for (const name of ["Aziel Elroi Eliab", "Elias Artista", "The Revealer of The Sealed", "עזיאל", "Aziell", "Eliav"]) {
    assert.ok(cite.person.alternateName.includes(name), name);
  }
  const sisterUrls = [
    "https://www.azieleliab.com/",
    "https://www.azieleliab.com/runtime/",
    "https://azielcorpuslibrary.net/",
    "https://godlock.uk/",
    "https://hedidntjump.com/",
    "https://github.com/AzielEliab/aziel-runtime",
    "https://aziel-runtime.vibelock.workers.dev/",
    "https://timetounsealthebook.net/",
    "https://furnaceisntfree.com/"
  ];
  assert.deepEqual(cite.relatedLink, sisterUrls);
  for (const sister of sisterUrls) {
    assert.ok(cite.person.sameAs.includes(sister), sister);
    assert.ok(cite.person.subjectOf.some((item) => item.url === sister), sister);
    assert.ok(llms.includes(`- ${sister}`), sister);
  }
  for (const url of [
    "https://www.azieleliab.com/#aziel",
    "https://github.com/AzielEliab",
    "https://github.com/azieltherevealerofthesealed-arch",
    "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime",
    "https://x.com/AzielEliab"
  ]) {
    assert.ok(cite.person.sameAs.includes(url), url);
  }
  assert.equal(cite.person.sameAs.includes("https://trades-runtime.vibelock.workers.dev/"), false);
  assert.equal(cite.person.subjectOf.find((item) => item.url === "https://furnaceisntfree.com/")["@id"], "https://furnaceisntfree.com/#website");
  assert.equal(cite.tip_observation.production_source_base_tip_short, "d47caa6d");
  assert.equal(cite.tip_observation.production_noted_vid, "6a781b04");
  assert.equal(cite.tip_observation.earlier_cos_label_not_live, "472bb7c4");
  assert.equal(cite.tip_observation.indexing, "unconfirmed");
  assert.match(llms, /Aziel Elroi Eliab/);
  assert.match(llms, /Elias Artista/);
  assert.match(llms, /The Revealer of The Sealed/);
  assert.match(llms, /Roles already used for this person: digital rights activist, software developer, engineer, designer, philosopher, author, artist, researcher/);
  assert.match(llms, /They are not extra @id values/);
  assert.match(llms, /source_base_tip_short d47caa6d and noted_vid 6a781b04/);
  assert.match(llms, /472bb7c4 \/ 87b12512 was not that response and is not called live/);
  assert.doesNotMatch(llms, /15:20|Levitical|Aziel Systems|living researcher/i);
  assert.match(robots, /alternateName lattice, including Aziel Elroi Eliab, Elias Artista, The Revealer of The Sealed/);
  assert.match(robots, /Allow: \/person\.jsonld/);
  assert.match(robots, /Allow: \/who-is\n/);
  assert.match(robots, /User-agent: GPTBot\nAllow: \//);
  assert.match(robots, /User-agent: ClaudeBot\nAllow: \//);
  for (const machinePath of [
    "/person.jsonld",
    "/identity.jsonld",
    "/graph.jsonld",
    "/who-is",
    "/who-is-aziel-eliab.txt",
    "/cite.json",
    "/llms.txt",
    "/ai.txt"
  ]) {
    assert.ok(sitemap.includes(`<loc>https://furnaceisntfree.com${machinePath}</loc>`), machinePath);
  }
});

test("machine identity pack keeps one person id", async () => {
  const personRaw = await readFile(path.join(publicDir, "person.jsonld"), "utf8");
  const identityRaw = await readFile(path.join(publicDir, "identity.jsonld"), "utf8");
  assert.equal(identityRaw, personRaw);
  const person = JSON.parse(personRaw);
  assert.equal(person["@id"], "https://www.azieleliab.com/#aziel");
  assert.equal(person["@type"], "Person");
  const graph = JSON.parse(await readFile(path.join(publicDir, "graph.jsonld"), "utf8"));
  const graphPerson = graph["@graph"].find((node) => node["@type"] === "Person");
  assert.equal(graphPerson["@id"], "https://www.azieleliab.com/#aziel");
  assert.deepEqual(graphPerson.sameAs, person.sameAs);
  assert.deepEqual(graphPerson.alternateName, person.alternateName);
  assert.equal(graph["@graph"].some((node) => node["@id"] && String(node["@id"]).includes("azieleliab.com/#") && node["@id"] !== "https://www.azieleliab.com/#aziel"), false);
  const who = await readFile(path.join(publicDir, "who-is"), "utf8");
  const whoTxt = await readFile(path.join(publicDir, "who-is-aziel-eliab.txt"), "utf8");
  assert.equal(who, whoTxt);
  assert.match(who, /Person @id: https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.match(who, /Aziel Elroi Eliab/);
  assert.match(who, /עזיאל אל ראי אליאב/);
  assert.match(who, /https:\/\/github\.com\/azieltherevealerofthesealed-arch/);
  assert.match(who, /https:\/\/www\.azieleliab\.com\/runtime\//);
  assert.doesNotMatch(who, /15:20|Levitical|1 Chronicles|Aziel Systems|euaziel/i);
  assert.doesNotMatch(personRaw, /15:20|Levitical|1 Chronicles|Aziel Systems|euaziel/i);
  const home = await readFile(path.join(publicDir, "index.html"), "utf8");
  const homePerson = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]).find(
    (node) => node["@type"] === "Person"
  );
  assert.deepEqual(homePerson.alternateName, person.alternateName);
  assert.deepEqual(homePerson.sameAs, person.sameAs);
  const visible = home.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<head[\s\S]*?<\/head>/g, " ");
  assert.equal(visible.includes("The Revealer of The Sealed"), false);
  assert.equal(visible.includes("15:20"), false);
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
  const azielVisible = html.replace(/<head[\s\S]*?<\/head>/g, " ").replace(/<script[\s\S]*?<\/script>/g, " ");
  assert.equal(azielVisible.includes("glama.ai"), false);
  assert.ok(html.includes("https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
  assert.match(html, /Cap-7 mesh DNS and public ICANN registration are different systems/);
  assert.match(html, /Paid satellite is HELD/);
  assert.match(html, /Remain-OFF locks stay off/);
  assert.match(html, /Mesh tracking stays off/);
  assert.doesNotMatch(html, /identity-lock|identity lock|id-lock/i);
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, " ");
  assert.match(visible, /Cap-7 mesh DNS and public ICANN/);
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const pageNode = data.find((node) => node["@type"] === "WebPage");
  assert.equal(pageNode.dateModified, "2026-11-06");
  assert.equal(pageNode.additionalProperty.find((item) => item.name === "paid_satellite").value, "HELD");
  assert.equal(pageNode.additionalProperty.find((item) => item.name === "mesh_tracking").value, "off");
  assert.equal(pageNode.additionalProperty.find((item) => item.name === "cap7_dns").value, "separate_from_public_icann");
});

test("www alias redirects to the apex host", async () => {
  const response = await worker.fetch(new Request("https://www.furnaceisntfree.com/the-numbers/?q=1"), {});
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://furnaceisntfree.com/the-numbers/?q=1");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  assert.equal(/includeSubDomains|preload/i.test(response.headers.get("strict-transport-security")), false);
  const apex = await worker.fetch(new Request("https://furnaceisntfree.com/api/health"), {});
  assert.equal(apex.status, 200);
  const health = await apex.json();
  const head = gitHead();
  assert.equal(health.deployed, false);
  assert.equal(health.indexing, "unconfirmed");
  assert.equal(health.mesh_tracking, false);
  assert.equal(health.source_base_tip, head);
  assert.equal(health.source_base_tip_short, head.slice(0, 8));
  assert.equal(health.noted_vid, null);
  assert.equal(health.cloudflare_version_id, null);
  assert.equal(health.source_captured, "git-rev-parse-HEAD");
  assert.notEqual(health.source_base_tip_short, "472bb7c4");
  assert.notEqual(health.noted_vid, "87b12512");
  assert.equal(health.earlier_cos_label, "472bb7c4");
  assert.equal(health.earlier_cos_vid_prefix, "87b12512");
  assert.equal(health.earlier_cos_label_live, false);
  assert.equal(health.production_observed_tip_short, "d47caa6d");
  assert.equal(health.production_observed_vid, "6a781b04");
  assert.match(health.note, /472bb7c4 \/ 87b12512 is not that response and is not live/);
  assert.match(health.note, /does not claim LIVE indexing/);
  assert.equal(health.cap7_is_public_icann, false);
  assert.equal(health.paid_satellite, "HELD");
  assert.equal(health.remain_off, true);
});

function hstsOk(response) {
  const value = response.headers.get("strict-transport-security");
  assert.equal(value, "max-age=31536000");
  assert.equal(/includeSubDomains|preload/i.test(value), false);
}

test("www and HTML aliases end on the apex in one hop", async () => {
  assert.equal(CANONICAL_HTML_PATH.has("/stats"), false);
  assert.equal(CANONICAL_HTML_PATH.get("/aziel"), "/aziel/");
  const cases = [
    ["https://www.furnaceisntfree.com/", "https://furnaceisntfree.com/"],
    ["https://www.furnaceisntfree.com/aziel", "https://furnaceisntfree.com/aziel/"],
    ["https://www.furnaceisntfree.com/aziel/", "https://furnaceisntfree.com/aziel/"],
    ["https://www.furnaceisntfree.com/aziel?q=1", "https://furnaceisntfree.com/aziel/?q=1"],
    ["https://www.furnaceisntfree.com/robots.txt", "https://furnaceisntfree.com/robots.txt"],
    ["https://www.furnaceisntfree.com/sitemap.xml?x=2", "https://furnaceisntfree.com/sitemap.xml?x=2"],
    ["https://furnaceisntfree.com/checklist", "https://furnaceisntfree.com/checklist/"],
    ["https://www.furnaceisntfree.com/stats", "https://furnaceisntfree.com/stats"],
    ["https://www.furnaceisntfree.com/images/social-card.png", "https://furnaceisntfree.com/images/social-card.png"],
    ["https://www.furnaceisntfree.com/who-is", "https://furnaceisntfree.com/who-is"],
    ["https://www.furnaceisntfree.com/person.jsonld", "https://furnaceisntfree.com/person.jsonld"]
  ];
  for (const [from, to] of cases) {
    for (const method of ["GET", "HEAD"]) {
      const response = await worker.fetch(new Request(from, { method }), {});
      assert.equal(response.status, 301, `${method} ${from}`);
      assert.equal(response.headers.get("location"), to, `${method} ${from}`);
      hstsOk(response);
      assert.equal(canonicalRedirectUrl(to, "GET"), null, to);
    }
  }
  const post = await worker.fetch(
    new Request("https://www.furnaceisntfree.com/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    }),
    {}
  );
  assert.notEqual(post.status, 301);
  assert.notEqual(post.status, 308);
  const postPage = await worker.fetch(new Request("https://furnaceisntfree.com/aziel", { method: "POST", body: "x" }), {});
  assert.notEqual(postPage.status, 301);
});

test("/stats stays JSON and slash HTML aliases are permanent", async () => {
  const store = createMemoryStore();
  const stats = await worker.fetch(new Request("https://furnaceisntfree.com/stats"), { SITE_KV: undefined });
  assert.equal(stats.status, 200);
  assert.match(stats.headers.get("content-type"), /application\/json/);
  const body = await stats.json();
  assert.equal(typeof body.views, "number");
  assert.equal(body.invent_users, false);
  const htmlAlias = await worker.fetch(new Request("https://furnaceisntfree.com/stats/"), {});
  assert.notEqual(htmlAlias.status, 301);
  assert.notEqual(htmlAlias.headers.get("content-type") || "", "application/json");
  const count = await handleRequest(new Request("https://furnaceisntfree.com/count"), { store, env: {} });
  assert.equal(count.status, 200);
  assert.match(count.headers.get("content-type"), /json/);
  const version = await handleRequest(new Request("https://furnaceisntfree.com/version"), { store, env: {} });
  assert.equal(version.status, 200);
  const versionBody = await version.json();
  const head = gitHead();
  assert.equal(versionBody.build_id, `furnace-${head.slice(0, 12)}`);
  assert.equal(versionBody.deployed, false);
  assert.equal(versionBody.indexing, "unconfirmed");
  const healthAlias = await handleRequest(new Request("https://furnaceisntfree.com/health"), { store, env: {} });
  assert.equal(healthAlias.status, 200);
  const plain = await worker.fetch(new Request("http://127.0.0.1/api/health"), {});
  assert.equal(plain.status, 200);
  assert.equal(plain.headers.get("strict-transport-security"), null);
});

test("shared head, titles, person id, and social card", async () => {
  const files = await htmlFiles(publicDir);
  const card = await readFile(path.join(publicDir, "images", "social-card.png"));
  assert.equal(card.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(card.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(card.readUInt32BE(16), 1200);
  assert.equal(card.readUInt32BE(20), 630);
  assert.ok(card.length < 200_000);
  const sisters = ["godlock.uk", "timetounsealthebook.net", "azielcorpuslibrary.net", "hedidntjump.com"];
  for (const file of files) {
    if (file.endsWith(`${path.sep}404.html`)) continue;
    const html = await readFile(file, "utf8");
    assert.match(html, /property="og:image" content="https:\/\/furnaceisntfree\.com\/images\/social-card\.png"/);
    assert.match(html, /property="og:image:width" content="1200"/);
    assert.match(html, /property="og:image:height" content="630"/);
    assert.match(html, /property="og:image:alt" content="The Furnace Isn't Free, a homeowner guide to HVAC offer structure"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.match(html, /name="twitter:title"/);
    assert.match(html, /name="twitter:description"/);
    assert.match(html, /name="twitter:image" content="https:\/\/furnaceisntfree\.com\/images\/social-card\.png"/);
    assert.match(html, /name="twitter:image:alt"/);
    assert.equal(html.includes("https://www.azieleliab.com/#aziel"), true);
    assert.doesNotMatch(html, /"@id":"https:\/\/www\.azieleliab\.com\/#(?!aziel")/);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const website = data.find((node) => node["@type"] === "WebSite");
    const person = data.find((node) => node["@type"] === "Person");
    assert.equal(website["@id"], "https://furnaceisntfree.com/#website");
    assert.equal(website.publisher["@id"], "https://www.azieleliab.com/#aziel");
    assert.equal(person["@id"], "https://www.azieleliab.com/#aziel");
    assert.deepEqual(
      data.filter((node) => node["@type"] === "Person").map((node) => node["@id"]),
      ["https://www.azieleliab.com/#aziel"]
    );
    assert.ok(person.alternateName.includes("Aziel Elroi Eliab"));
    assert.ok(person.alternateName.includes("The Revealer of The Sealed"));
    assert.ok(person.sameAs.includes("https://furnaceisntfree.com/"), file);
    assert.ok(person.sameAs.includes("https://github.com/AzielEliab/aziel-runtime"), file);
    assert.ok(person.sameAs.includes("https://www.azieleliab.com/runtime/"), file);
    for (const sister of sisters) assert.ok(person.sameAs.some((url) => url.includes(sister)), file);
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<head[\s\S]*?<\/head>/g, " ");
    assert.equal(visible.includes("The Revealer of the Sealed"), false, file);
    assert.equal(visible.includes("Elias Artista"), false, file);
    assert.equal(visible.includes("Aziel Elroi Eliab"), false, file);
    assert.equal(visible.includes("15:20"), false, file);
    assert.equal(visible.includes("Levitical"), false, file);
    assert.equal(visible.includes("Aziel Systems"), false, file);
    assert.doesNotMatch(visible, /living researcher/i, file);
    assert.equal(data.some((node) => node["@type"] === "Organization"), false);
    assert.equal(data.some((node) => node["@type"] === "Book"), false);
    const pageNode = data.find((node) => node["@type"] === "WebPage" || node["@type"] === "AboutPage");
    const loc = pageNode.url;
    const sitemap = await readFile(path.join(publicDir, "sitemap.xml"), "utf8");
    const match = sitemap.match(new RegExp(`<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc><lastmod>([^<]+)</lastmod>`));
    assert.equal(pageNode.dateModified, match[1], loc);
  }
  const about = await readFile(path.join(publicDir, "about/index.html"), "utf8");
  assert.match(about, /"@type":"AboutPage"/);
  const home = await readFile(path.join(publicDir, "index.html"), "utf8");
  assert.doesNotMatch(home, /AboutPage/);
  for (const file of ["index.html", "about/index.html", "aziel/index.html"]) {
    const html = await readFile(path.join(publicDir, file), "utf8");
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const pageNode = data.find((node) => node["@type"] === "WebPage" || node["@type"] === "AboutPage");
    const faq = data.find((node) => node["@id"] && String(node["@id"]).endsWith("#person-faq"));
    assert.ok(faq, file);
    assert.equal(faq.about["@id"], "https://www.azieleliab.com/#aziel");
    assert.ok(pageNode.relatedLink.includes("https://www.azieleliab.com/runtime/"), file);
    assert.ok(pageNode.relatedLink.includes("https://furnaceisntfree.com/"), file);
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<head[\s\S]*?<\/head>/g, " ");
    for (const question of faq.mainEntity) {
      assert.equal(visible.includes(question.name), false, question.name);
      assert.equal(visible.includes("The Revealer of the Sealed"), false, file);
    }
    if (file !== "index.html") {
      assert.equal(pageNode.mainEntity["@id"], "https://www.azieleliab.com/#aziel");
      assert.equal(pageNode.about["@id"], "https://www.azieleliab.com/#aziel");
    } else {
      assert.equal(pageNode.mainEntity, undefined);
    }
  }
  const numbersPage = await readFile(path.join(publicDir, "the-numbers/index.html"), "utf8");
  assert.equal(numbersPage.includes("#person-faq"), false);
  const numbersData = JSON.parse(numbersPage.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(numbersData.find((node) => node["@type"] === "WebPage").relatedLink, undefined);
  assert.ok(numbersData.find((node) => node["@type"] === "Person").sameAs.includes("https://furnaceisntfree.com/"));
  const numbers = await readFile(path.join(publicDir, "the-numbers/index.html"), "utf8");
  assert.match(numbers, /<title>Furnace Cost Calculator \| Equipment, Labor &amp; Allowance<\/title>/);
  const offer = await readFile(path.join(publicDir, "how-the-offer-works/index.html"), "utf8");
  assert.match(offer, /<title>How Free-Furnace Offers Work \| Installed Cost<\/title>/);
  const discount = await readFile(path.join(publicDir, "discount-reality-check/index.html"), "utf8");
  assert.match(discount, /<title>HVAC Discount Reality Check \| Offer Terms<\/title>/);
  for (const file of ["how-the-offer-works/index.html", "repair-or-replace/index.html"]) {
    const html = await readFile(path.join(publicDir, file), "utf8");
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const faq = data.find((node) => node["@type"] === "FAQPage");
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    for (const question of faq.mainEntity) {
      assert.ok(visible.includes(question.name), question.name);
      assert.ok(visible.includes(question.acceptedAnswer.text), question.acceptedAnswer.text);
    }
  }
  const missing = await readFile(path.join(publicDir, "404.html"), "utf8");
  assert.match(missing, /<h1>Page not found<\/h1>/);
  assert.match(missing, /href="\/"/);
  assert.match(missing, /noindex/);
  const robots = await readFile(path.join(publicDir, "robots.txt"), "utf8");
  assert.match(robots, /User-agent: ClaudeBot\nAllow: \//);
  assert.match(robots, /User-agent: PerplexityBot\nAllow: \//);
  assert.match(robots, /User-agent: Google-Extended\nAllow: \//);
  assert.doesNotMatch(robots, /Disallow:\s*\/\s*$/m);
});

test("indexnow key is public text and is not submitted", async () => {
  assert.match(INDEXNOW_KEY, /^[0-9a-f]{32}$/);
  const disk = await readFile(path.join(publicDir, INDEXNOW_FILENAME), "utf8");
  assert.equal(disk, INDEXNOW_KEY);
  const response = await worker.fetch(new Request(`https://furnaceisntfree.com${INDEXNOW_PATH}`), {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(await response.text(), INDEXNOW_KEY);
  const www = await worker.fetch(new Request(`https://www.furnaceisntfree.com${INDEXNOW_PATH}`), {});
  assert.equal(www.status, 301);
  assert.equal(www.headers.get("location"), `https://furnaceisntfree.com${INDEXNOW_PATH}`);
  const openapi = JSON.parse(await readFile(path.join(publicDir, "openapi.json"), "utf8"));
  assert.equal(openapi.paths[INDEXNOW_PATH].get.summary.includes("Does not submit URLs"), true);
});

test("health provenance uses the build tip and cloudflare version metadata", async () => {
  const store = createMemoryStore();
  const head = gitHead();
  const paths = ["/api/health", "/health", "/version", "/api/version"];
  for (const route of paths) {
    const response = await handleRequest(new Request(`https://furnaceisntfree.com${route}`), { store, env: {} });
    assert.equal(response.status, 200, route);
    const body = await response.json();
    assert.equal(body.source_base_tip, head, route);
    assert.equal(body.deployed, false, route);
    assert.equal(body.indexing, "unconfirmed", route);
    assert.equal(body.noted_vid, null, route);
    assert.equal(body.mesh_tracking, false, route);
  }
  const ray = await handleRequest(
    new Request("https://furnaceisntfree.com/api/health", { headers: { "cf-ray": "230b030023ae2822-SJC" } }),
    { store, env: {} }
  );
  const rayBody = await ray.json();
  assert.equal(rayBody.deployed, false);
  assert.equal(rayBody.noted_vid, null);
  assert.equal(rayBody.cloudflare_version_id, null);
  const local = await handleRequest(new Request("https://furnaceisntfree.com/api/health"), {
    store,
    env: { CF_VERSION_METADATA: { id: "local", tag: "", timestamp: "" }, SOURCE_BASE_TIP: "" }
  });
  const localBody = await local.json();
  assert.equal(localBody.deployed, false);
  assert.equal(localBody.noted_vid, null);
  assert.equal(localBody.source_base_tip, head);
  const ignored = await handleRequest(new Request("https://furnaceisntfree.com/api/health"), {
    store,
    env: { SOURCE_BASE_TIP: "SET_AT_COS_DEPLOY" }
  });
  assert.equal((await ignored.json()).source_base_tip, head);
  const override = "0123456789abcdef0123456789abcdef01234567";
  const overridden = await handleRequest(new Request("https://furnaceisntfree.com/api/version"), {
    store,
    env: { SOURCE_BASE_TIP: override }
  });
  const overriddenBody = await overridden.json();
  assert.equal(overriddenBody.source_base_tip, override);
  assert.equal(overriddenBody.source_base_tip_short, "01234567");
  assert.equal(overriddenBody.source_captured, "env.SOURCE_BASE_TIP");
  assert.equal(overriddenBody.build_id, "furnace-0123456789ab");
  assert.equal(overriddenBody.deployed, false);
  const versionId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const live = await handleRequest(new Request("https://furnaceisntfree.com/api/health"), {
    store,
    env: { CF_VERSION_METADATA: { id: versionId, tag: "production", timestamp: "2026-11-05T00:00:00.000Z" } }
  });
  const liveBody = await live.json();
  assert.equal(liveBody.deployed, true);
  assert.equal(liveBody.noted_vid, "aaaaaaaa");
  assert.equal(liveBody.cloudflare_version_id, versionId);
  assert.equal(liveBody.cloudflare_version_tag, "production");
  assert.equal(liveBody.indexing, "unconfirmed");
  assert.equal(liveBody.mesh_tracking, false);
  assert.match(liveBody.note, /does not claim LIVE/);
  const preview = await handleRequest(new Request("https://the-furnace-isnt-free.workers.dev/api/health"), {
    store,
    env: { CF_VERSION_METADATA: { id: versionId, tag: "", timestamp: "" } }
  });
  const previewBody = await preview.json();
  assert.equal(previewBody.deployed, false);
  assert.equal(previewBody.noted_vid, "aaaaaaaa");
  assert.equal(previewBody.cloudflare_version_id, versionId);
  assert.equal(previewBody.indexing, "unconfirmed");
});
