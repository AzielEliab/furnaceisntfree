import { CANONICAL_ORIGIN, TOOL_PATHS, normalizePagePath } from "./paths.mjs";
import {
  analyzeQuotes,
  buildRepairQuestions,
  calculateOffer,
  clampComment,
  discountCheck,
  gateJpeg,
  looksLikeContact
} from "../public/js/engine.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Accept, Authorization",
  "content-signal": "search=yes, ai-input=yes, ai-train=yes",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer"
};

const BOT_RE =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|preview|monitor|health|pingdom|uptimerobot|headless|wget|curl|python-requests|go-http|axios|gptbot|chatgpt|oai-search|claude|anthropic|perplexity|bytespider|ccbot|amazonbot|applebot|googlebot|bingbot|duckduck|semrush|ahrefs|mj12|petalbot|yandex|baidu/i;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function classifyAgent(userAgent) {
  const ua = userAgent || "";
  if (!ua.trim()) return "bot";
  return BOT_RE.test(ua) ? "bot" : "human";
}

function emptyViews() {
  return {
    views: 0,
    views_human: 0,
    views_bot: 0,
    by_path: {}
  };
}

function emptyUsefulness() {
  return {
    receipts: 0,
    useful_yes: 0,
    useful_no: 0,
    with_image: 0,
    by_tool: {}
  };
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `tfi_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function originOf(env) {
  return String(env.CANONICAL_ORIGIN || CANONICAL_ORIGIN).replace(/\/$/, "");
}

function tokenOk(request, env) {
  const expected = env.RECEIPT_READ_TOKEN || "";
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function clientKey(request) {
  const forwarded = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || "local";
}

const rateBuckets = new Map();

function rateLimit(request) {
  const key = clientKey(request);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const bucket = rateBuckets.get(key) || [];
  const fresh = bucket.filter((stamp) => now - stamp < windowMs);
  if (fresh.length >= 30) return false;
  fresh.push(now);
  rateBuckets.set(key, fresh);
  return true;
}

function decodeJpeg(body) {
  if (!body.jpeg_base64) return { present: false };
  let raw = String(body.jpeg_base64);
  const comma = raw.indexOf(",");
  if (raw.startsWith("data:")) {
    const header = raw.slice(0, comma).toLowerCase();
    if (!header.includes("image/jpeg") && !header.includes("image/jpg")) {
      return { present: true, error: "Only image/jpeg is accepted. Other image types are refused." };
    }
    raw = raw.slice(comma + 1);
  }
  if (raw.length > 6_000_000) {
    return { present: true, error: "That upload is too large." };
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
    return { present: true, error: "The upload could not be read as a JPEG." };
  }
  const binary = atob(raw.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const gated = gateJpeg(bytes);
  if (!gated.ok) return { present: true, error: gated.message, code: gated.code };
  return { present: true, bytes, info: gated };
}

function clip(value, limit = 120) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, limit);
}

function collectContactHits(value, path, hits) {
  if (typeof value === "string") {
    if (looksLikeContact(value)) hits.push(path || "field");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectContactHits(item, `${path}[${index}]`, hits));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "jpeg_base64") continue;
      collectContactHits(item, path ? `${path}.${key}` : key, hits);
    }
  }
}

function snapshotFor(tool, body) {
  if (tool === "free-meaning") {
    const result = calculateOffer({
      equipment: body.inputs?.equipment ?? "",
      allowance: body.inputs?.allowance ?? "",
      labor: body.inputs?.labor ?? "",
      materials: body.inputs?.materials ?? "",
      other: body.inputs?.other ?? "",
      packageTotal: body.inputs?.packageTotal ?? "",
      acOnly: body.inputs?.acOnly ?? "",
      calculatedAt: body.inputs?.calculatedAt || new Date().toISOString()
    });
    return {
      inputs: Object.fromEntries(
        Object.entries(result.inputs).map(([key, part]) => [key, part.state === "known" ? part.value : part.state])
      ),
      outputs: {
        net: result.net.state === "known" ? result.net.value : result.net.state,
        excess: result.excess.state === "known" ? result.excess.value : result.excess.state,
        install: result.install.state === "known" ? result.install.value : result.install.state,
        incremental: result.incremental.state === "known" ? result.incremental.value : result.incremental.state,
        ratio: result.ratio.state === "known" ? Math.round(result.ratio.value * 100) / 100 : result.ratio.state,
        packageGap: result.packageGap.state === "known" ? result.packageGap.value : result.packageGap.state
      },
      invalidFields: result.invalidFields,
      fictionalExample: body.inputs?.fictionalExample === true
    };
  }
  if (tool === "quote-compare") {
    const quotes = Array.isArray(body.inputs?.quotes) ? body.inputs.quotes.slice(0, 3) : [];
    const sanitized = quotes.map((quote) => {
      const next = {};
      for (const [key, value] of Object.entries(quote || {})) {
        next[key] = clip(value, ["laborPrice", "allowance", "total"].includes(key) ? 32 : 120);
      }
      return next;
    });
    return { quotes: sanitized, analysis: analyzeQuotes(sanitized) };
  }
  if (tool === "discount-check") {
    const result = discountCheck(body.inputs || {});
    return {
      referenceKind: result.referenceKind,
      reference: result.reference.state === "known" ? result.reference.value : result.reference.state,
      promo: result.promo.state === "known" ? result.promo.value : result.promo.state,
      gap: result.gap.state === "known" ? result.gap.value : result.gap.state,
      percent: result.percent.state === "known" ? Math.round(result.percent.value * 10) / 10 : result.percent.state,
      actuallyOffered: ["yes", "no", "unknown"].includes(body.inputs?.actuallyOffered)
        ? body.inputs.actuallyOffered
        : "unknown",
      referenceStart: clip(body.inputs?.referenceStart, 32),
      referenceEnd: clip(body.inputs?.referenceEnd, 32),
      exclusions: clip(body.inputs?.exclusions, 160),
      restrictions: clip(body.inputs?.restrictions, 160),
      flagCount: result.flags.length,
      verdict: null
    };
  }
  if (tool === "repair-questions") {
    const built = buildRepairQuestions(body.inputs || {});
    return {
      questions: built.questions.map((item) => ({ id: item.id, text: item.text })),
      safetyDetermination: null,
      userProseStored: false,
      note: "Diagnosis text is used to choose questions and is not copied into the receipt."
    };
  }
  if (tool === "lattice") {
    const layers = {};
    for (const key of ["claim", "reference", "conditions", "total", "verification"]) {
      layers[key] = clip(body.inputs?.[key], 160);
    }
    return { layers, verdict: null };
  }
  if (tool === "submit-offer") {
    return {
      region: clip(body.inputs?.region, 80),
      claim: clip(body.inputs?.claim, 240),
      model: clip(body.inputs?.model, 120),
      allowance: clip(body.inputs?.allowance, 32),
      labor: clip(body.inputs?.labor, 32),
      total: clip(body.inputs?.total, 32),
      notes: clip(body.inputs?.notes, 240),
      publication: "held_for_review",
      note: "Private submission. Not published, even if review was requested."
    };
  }
  return { ignored: true };
}

function viewsPayload(views, store) {
  return {
    ok: true,
    product: "the-furnace-isnt-free",
    site: "furnaceisntfree.com",
    author: "Aziel Eliab",
    views: views.views,
    views_human: views.views_human,
    views_bot: views.views_bot,
    by_path: views.by_path,
    invent_users: false,
    storage: store.kind,
    note: "First-party page-view counter for HTML documents on this host. Human and bot are split with a user-agent list. Health checks count as bot. This is not a mesh-node count and it does not invent visitors. Durable totals on Cloudflare need the SITE_KV binding; without it, counts stay on the instance that received them."
  };
}

function meterPayload(totals) {
  const votes = totals.useful_yes + totals.useful_no;
  return {
    ok: true,
    label: "Feedback counts recorded by this site. Not a market survey and not a rating of any contractor.",
    receipts: totals.receipts,
    useful_yes: totals.useful_yes,
    useful_no: totals.useful_no,
    useful_rate: votes === 0 ? null : Math.round((totals.useful_yes / votes) * 1000) / 1000,
    useful_rate_basis: "yes ÷ (yes + no). Receipts with no yes/no vote are excluded from the rate.",
    with_image: totals.with_image,
    by_tool: totals.by_tool,
    invent_users: false,
    comments_public: false,
    images_public: false
  };
}

async function readViews(store) {
  return (await store.getJson("views")) || emptyViews();
}

async function readTotals(store) {
  return (await store.getJson("usefulness")) || emptyUsefulness();
}

async function forwardCorpus(env, receipt, imageBytes) {
  const url = env.CORPUS_INGEST_URL || "";
  const token = env.CORPUS_INGEST_TOKEN || "";
  if (!url) return { corpus_status: "not_configured" };
  if (!token) return { corpus_status: "token_missing" };
  const payload = {
    schema: "the-furnace-isnt-free.receipt.v1",
    ingest_as_receipt: {
      id: receipt.id,
      canonical_url: receipt.canonical_url,
      content_sha256: receipt.content_sha256,
      created_at: receipt.created_at
    },
    kind: "tool-usefulness",
    tool: receipt.tool,
    useful: receipt.useful,
    comment: receipt.comment,
    snapshot: receipt.snapshot,
    image: receipt.image
      ? {
          present: true,
          sha256: receipt.image.sha256,
          bytes: receipt.image.bytes,
          width: receipt.image.width,
          height: receipt.image.height,
          forwarded: env.CORPUS_FORWARD_IMAGES === "true"
        }
      : { present: false },
    publish_consent: false,
    source: originOf(env)
  };
  if (env.CORPUS_FORWARD_IMAGES === "true" && imageBytes) {
    let binary = "";
    for (let i = 0; i < imageBytes.length; i += 1) binary += String.fromCharCode(imageBytes[i]);
    payload.image.jpeg_base64 = btoa(binary);
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "user-agent": "the-furnace-isnt-free/1.0"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      return { corpus_status: "forward_failed", corpus_http_status: response.status };
    }
    return { corpus_status: "forwarded" };
  } catch {
    return { corpus_status: "forward_failed" };
  }
}

export async function handleRequest(request, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const { store, env } = ctx;
  const method = request.method.toUpperCase();

  const isApi =
    path === "/count" ||
    path === "/v1/count" ||
    path === "/stats" ||
    path === "/v1/stats" ||
    path.startsWith("/api/");

  if (!isApi) return null;

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });

  if ((path === "/count" || path === "/v1/count") && (method === "GET" || method === "HEAD")) {
    const views = await readViews(store);
    return json(viewsPayload(views, store));
  }

  if ((path === "/stats" || path === "/v1/stats") && (method === "GET" || method === "HEAD")) {
    const views = await readViews(store);
    return json(viewsPayload(views, store));
  }

  if ((path === "/count" || path === "/v1/count") && method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const page = normalizePagePath(body.path || "");
    if (!page) return json({ ok: false, error: "Unknown page path. View was not counted." }, 400);
    const bucket = classifyAgent(request.headers.get("user-agent"));
    const views = await store.lock(async () => {
      const current = (await store.getJson("views")) || emptyViews();
      current.views += 1;
      if (bucket === "human") current.views_human += 1;
      else current.views_bot += 1;
      current.by_path[page] = current.by_path[page] || { human: 0, bot: 0 };
      current.by_path[page][bucket] += 1;
      await store.putJson("views", current);
      return current;
    });
    return json({ ok: true, counted: true, path: page, class: bucket, views: views.views });
  }

  if (path === "/api/health" && (method === "GET" || method === "HEAD")) {
    return json({
      ok: true,
      product: "the-furnace-isnt-free",
      canonical: originOf(env),
      storage: store.kind,
      image_storage: store.imageKind,
      corpus_configured: Boolean(env.CORPUS_INGEST_URL && env.CORPUS_INGEST_TOKEN),
      receipt_export_enabled: Boolean(env.RECEIPT_READ_TOKEN),
      deployed: false,
      note: "This health check does not mean a production DNS deploy has succeeded."
    });
  }

  if (path === "/api/usefulness" && (method === "GET" || method === "HEAD")) {
    const totals = await readTotals(store);
    return json(meterPayload(totals));
  }

  if (path === "/api/receipts" && (method === "GET" || method === "HEAD")) {
    if (!tokenOk(request, env)) {
      return json(
        {
          ok: false,
          error: "Receipt export is private. Set RECEIPT_READ_TOKEN and send Authorization: Bearer <token>."
        },
        401
      );
    }
    const index = (await store.getJson("receipt-index")) || [];
    const receipts = [];
    for (const id of index.slice(-500)) {
      const row = await store.getJson(`receipt:${id}`);
      if (row) receipts.push(row);
    }
    return json({ ok: true, count: receipts.length, receipts });
  }

  const imageMatch = path.match(/^\/api\/receipts\/(tfi_[a-f0-9]+)\/image$/);
  if (imageMatch && (method === "GET" || method === "HEAD")) {
    if (!tokenOk(request, env)) return json({ ok: false, error: "Private image." }, 401);
    const bytes = await store.getBytes(imageMatch[1]);
    if (!bytes) return json({ ok: false, error: "No image stored for that receipt." }, 404);
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-disposition": "attachment"
      }
    });
  }

  if (path === "/api/feedback" && method === "POST") {
    if (!rateLimit(request)) return json({ ok: false, error: "Too many submissions from this network. Try again later." }, 429);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Send JSON." }, 400);
    }
    const tool = body.tool;
    if (!TOOL_PATHS[tool]) return json({ ok: false, error: "Unknown tool." }, 400);
    if (!(body.useful === true || body.useful === false || body.useful === null || body.useful === undefined)) {
      return json({ ok: false, error: "Useful must be yes, no, or omitted." }, 400);
    }
    const comment = clampComment(body.comment);
    if (!comment.ok) return json({ ok: false, error: comment.error }, 400);
    const contactHits = [];
    collectContactHits(body.inputs, "inputs", contactHits);
    if (contactHits.length) {
      return json(
        {
          ok: false,
          error:
            "A field looks like an email, phone number, or account number. Remove it before sending. Names, addresses, and signatures do not belong in these boxes."
        },
        400
      );
    }

    const image = decodeJpeg(body);
    if (image.error) return json({ ok: false, error: image.error, code: image.code || "jpeg" }, 400);
    if (image.present) {
      if (body.attestation !== true) {
        return json(
          {
            ok: false,
            error: "Check the box confirming this JPEG is your written invoice, estimate, or offer. Other images are not accepted."
          },
          400
        );
      }
      if (body.redaction_confirmed !== true) {
        return json(
          {
            ok: false,
            error:
              "Confirm you removed names, addresses, phone numbers, account numbers, signatures, and barcodes before upload."
          },
          400
        );
      }
    }

    const hasVote = body.useful === true || body.useful === false;
    const hasComment = comment.comment.length > 0;
    const hasInputs = body.inputs && typeof body.inputs === "object";
    if (!hasVote && !hasComment && !hasInputs && !image.present) {
      return json({ ok: false, error: "Nothing to record." }, 400);
    }

    const createdAt = new Date().toISOString();
    const canonical = `${originOf(env)}${TOOL_PATHS[tool]}`;
    const snapshot = snapshotFor(tool, body);
    const id = randomId();
    let imageMeta = null;
    if (image.present) {
      const imageHash = await sha256Hex(image.bytes);
      try {
        await store.putBytes(id, image.bytes);
      } catch (error) {
        const code = error && error.code === "image-too-large-for-kv" ? "image-too-large-for-kv" : "image-store-failed";
        return json(
          {
            ok: false,
            error:
              code === "image-too-large-for-kv"
                ? "Private image storage on KV accepts up to 2 MB. Add the UPLOADS R2 bucket or send a smaller JPEG."
                : "The image could not be stored. Feedback was not saved. You can send the yes/no vote again without the file.",
            code
          },
          503
        );
      }
      imageMeta = {
        sha256: imageHash,
        bytes: image.info.bytes,
        width: image.info.width,
        height: image.info.height,
        content_type: "image/jpeg",
        storage_key: id,
        public: false,
        ocr: false
      };
    }

    const draft = {
      id,
      schema: "the-furnace-isnt-free.receipt.v1",
      created_at: createdAt,
      tool,
      useful: hasVote ? body.useful : null,
      comment: comment.comment,
      snapshot,
      canonical_url: canonical,
      image: imageMeta,
      publish_consent: false,
      publication_requested: body.review_requested === true,
      publication_status: "not_published",
      attestation: image.present ? true : false,
      redaction_confirmed: image.present ? true : false
    };
    const contentBytes = new TextEncoder().encode(
      JSON.stringify({
        schema: draft.schema,
        tool: draft.tool,
        useful: draft.useful,
        comment: draft.comment,
        snapshot: draft.snapshot,
        image_sha256: imageMeta ? imageMeta.sha256 : null,
        canonical_url: canonical
      })
    );
    draft.content_sha256 = await sha256Hex(contentBytes);
    const corpus = await forwardCorpus(env, draft, image.present ? image.bytes : null);
    draft.corpus_status = corpus.corpus_status;
    if (corpus.corpus_http_status) draft.corpus_http_status = corpus.corpus_http_status;

    await store.lock(async () => {
      await store.putJson(`receipt:${id}`, draft);
      const index = (await store.getJson("receipt-index")) || [];
      index.push(id);
      await store.putJson("receipt-index", index);
      const totals = (await store.getJson("usefulness")) || emptyUsefulness();
      totals.receipts += 1;
      if (draft.useful === true) totals.useful_yes += 1;
      if (draft.useful === false) totals.useful_no += 1;
      if (imageMeta) totals.with_image += 1;
      totals.by_tool[tool] = totals.by_tool[tool] || { receipts: 0, yes: 0, no: 0, images: 0 };
      totals.by_tool[tool].receipts += 1;
      if (draft.useful === true) totals.by_tool[tool].yes += 1;
      if (draft.useful === false) totals.by_tool[tool].no += 1;
      if (imageMeta) totals.by_tool[tool].images += 1;
      await store.putJson("usefulness", totals);
    });

    return json({
      ok: true,
      id: draft.id,
      content_sha256: draft.content_sha256,
      canonical_url: draft.canonical_url,
      created_at: draft.created_at,
      corpus_status: draft.corpus_status,
      image_stored: Boolean(imageMeta),
      publish_consent: false,
      publication_status: "not_published",
      private: true,
      ocr: false
    });
  }

  if (path === "/api/contact" && method === "POST") {
    if (!rateLimit(request)) return json({ ok: false, error: "Too many messages. Try again later." }, 429);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Send JSON." }, 400);
    }
    const message = String(body.message || "").trim();
    if (message.length < 10) return json({ ok: false, error: "Write a short message so the request is clear." }, 400);
    if (message.length > 4000) return json({ ok: false, error: "Message is too long." }, 400);
    const topic = ["correction", "business-response", "privacy", "general"].includes(body.topic)
      ? body.topic
      : "general";
    const reply = String(body.reply || "").trim().slice(0, 200);
    const id = randomId();
    const record = {
      id,
      created_at: new Date().toISOString(),
      topic,
      message,
      reply_offered: reply,
      page: clip(body.page, 160),
      status: "private",
      published: false
    };
    await store.lock(async () => {
      const list = (await store.getJson("contact")) || [];
      list.push(record);
      await store.putJson("contact", list);
    });
    let forward = "not_configured";
    if (env.CONTACT_FORWARD_URL && env.CONTACT_FORWARD_TOKEN) {
      try {
        const response = await fetch(env.CONTACT_FORWARD_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${env.CONTACT_FORWARD_TOKEN}`
          },
          body: JSON.stringify(record),
          signal: AbortSignal.timeout(8000)
        });
        forward = response.ok ? "forwarded" : "forward_failed";
      } catch {
        forward = "forward_failed";
      }
    }
    return json({
      ok: true,
      id,
      private: true,
      published: false,
      forward,
      note: "The message is stored privately on this server. It is not published. A person sees it only if private storage is reviewed or a forward URL is configured."
    });
  }

  return json({ ok: false, error: "Not found" }, 404);
}
