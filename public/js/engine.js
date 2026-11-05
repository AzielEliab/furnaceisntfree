/**
 * Shared arithmetic and validation for The Furnace Isn't Free.
 * Blank inputs stay unknown. Explicit 0 is a real zero.
 * This file is imported by the browser, the local server, and tests.
 */

export const FORMULAS = {
  net: "Net equipment after allowance = max(0, equipment price − allowance).",
  excess:
    "Excess credit = max(0, allowance − equipment price). It is shown separately and is not moved onto labor or other charges.",
  install:
    "Installation and additional = labor + materials/modifications + other required charges.",
  incremental:
    "Incremental installed furnace cost = net equipment after allowance + installation and additional.",
  ratio:
    "Labor-to-equipment ratio = labor ÷ equipment-only price, only when the equipment-only price is greater than zero.",
  packageGap:
    "Package-versus-alternative difference = package total − AC-only comparison price. It is not inferred from the other lines."
};

export const FICTIONAL_EXAMPLE = {
  label: "Fictional worked example — not a market average",
  equipment: "1500",
  allowance: "1500",
  labor: "4800",
  materials: "900",
  other: "0",
  packageTotal: "",
  acOnly: "",
  note:
    "These figures are invented so the arithmetic can be checked. They are not a market average, a typical offer, or a dataset. Materials and modifications are $900. Permits, disposal, and other charges are an explicit $0 so the sum can be shown. A blank in that box would stay unknown. The allowance offsets the fictional equipment price and does not pay labor or other work. Labor is 3.2× the equipment-only figure in this example only."
};

export const QUOTE_FIELDS = [
  { key: "nickname", label: "Your label for this quote", kind: "text", requiredForScope: false },
  { key: "acModel", label: "AC model and capacity", kind: "text", requiredForScope: true },
  { key: "furnaceModel", label: "Furnace model number", kind: "text", requiredForScope: true },
  { key: "afue", label: "AFUE", kind: "text", requiredForScope: true },
  { key: "staging", label: "Staging", kind: "choice", requiredForScope: true },
  { key: "capacity", label: "Furnace input or output capacity", kind: "text", requiredForScope: true },
  { key: "laborScope", label: "Labor scope", kind: "text", requiredForScope: true },
  { key: "laborPrice", label: "Labor price (USD)", kind: "money", requiredForScope: true },
  { key: "materials", label: "Included materials and accessories", kind: "text", requiredForScope: true },
  { key: "otherWork", label: "Other required work", kind: "text", requiredForScope: true },
  { key: "allowance", label: "Equipment allowance or credit (USD)", kind: "money", requiredForScope: true },
  { key: "exclusions", label: "Exclusions", kind: "text", requiredForScope: true },
  { key: "warranty", label: "Warranty", kind: "text", requiredForScope: true },
  { key: "permits", label: "Permits", kind: "choice", requiredForScope: true },
  { key: "financing", label: "Financing terms", kind: "text", requiredForScope: true },
  { key: "total", label: "Total installed price (USD)", kind: "money", requiredForScope: true },
  { key: "expires", label: "Quote expiration", kind: "text", requiredForScope: true }
];

const SCOPE_COMPARE_KEYS = ["furnaceModel", "afue", "staging", "capacity", "permits", "warranty", "laborScope"];

export function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

export function parseMoney(raw) {
  if (raw === null || raw === undefined) return { state: "unknown", value: null };
  const text = String(raw).trim();
  if (text === "") return { state: "unknown", value: null };
  const cleaned = text.replace(/[$,\s]/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return { state: "invalid", value: null };
  const value = roundMoney(Number(cleaned));
  if (!Number.isFinite(value)) return { state: "invalid", value: null };
  return { state: "known", value };
}

export function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function displayValue(part, unit) {
  if (!part || part.state === "unknown") return "unknown";
  if (part.state === "invalid") return "not a number";
  if (part.state === "undefined") return "not defined";
  if (unit === "usd") return formatUsd(part.value);
  if (unit === "ratio") {
    const rounded = Math.round(part.value * 100) / 100;
    return `${rounded}×`;
  }
  if (unit === "percent") {
    const rounded = Math.round(part.value * 10) / 10;
    return `${rounded}% of the stated reference`;
  }
  return String(part.value);
}

function known(value) {
  return { state: "known", value };
}

function unknown() {
  return { state: "unknown", value: null };
}

export function calculateOffer(input = {}) {
  const equipment = parseMoney(input.equipment);
  const allowance = parseMoney(input.allowance);
  const labor = parseMoney(input.labor);
  const materials = parseMoney(input.materials);
  const other = parseMoney(input.other);
  const packageTotal = parseMoney(input.packageTotal);
  const acOnly = parseMoney(input.acOnly);

  const parsed = { equipment, allowance, labor, materials, other, packageTotal, acOnly };
  const invalidFields = Object.entries(parsed)
    .filter(([, part]) => part.state === "invalid")
    .map(([key]) => key);

  let net = unknown();
  let excess = unknown();
  if (equipment.state === "known" && allowance.state === "known") {
    net = known(Math.max(0, roundMoney(equipment.value - allowance.value)));
    excess = known(Math.max(0, roundMoney(allowance.value - equipment.value)));
  }

  let install = unknown();
  if (labor.state === "known" && materials.state === "known" && other.state === "known") {
    install = known(roundMoney(labor.value + materials.value + other.value));
  }

  let incremental = unknown();
  if (net.state === "known" && install.state === "known") {
    incremental = known(roundMoney(net.value + install.value));
  }

  let ratio = unknown();
  if (labor.state === "known" && equipment.state === "known") {
    if (equipment.value > 0) ratio = known(labor.value / equipment.value);
    else ratio = { state: "undefined", value: null, reason: "equipment-price-is-zero" };
  }

  let packageGap = unknown();
  if (packageTotal.state === "known" && acOnly.state === "known") {
    packageGap = known(roundMoney(packageTotal.value - acOnly.value));
  }

  return {
    inputs: parsed,
    invalidFields,
    net,
    excess,
    install,
    incremental,
    ratio,
    packageGap,
    formulas: FORMULAS,
    calculatedAt: input.calculatedAt || null
  };
}

function blank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function norm(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/%/g, "");
}

export function emptyQuote() {
  const quote = {};
  for (const field of QUOTE_FIELDS) quote[field.key] = "";
  return quote;
}

function quoteTouched(quote) {
  return QUOTE_FIELDS.some((field) => !blank(quote?.[field.key]));
}

function missingFields(quote) {
  return QUOTE_FIELDS.filter((field) => field.requiredForScope && blank(quote[field.key])).map(
    (field) => field.key
  );
}

export function analyzeQuotes(quotes) {
  const list = (Array.isArray(quotes) ? quotes : []).slice(0, 3).map((quote, index) => ({
    ...(quote || {}),
    index
  }));
  while (list.length < 3) list.push({ ...emptyQuote(), index: list.length });

  const active = list.filter(quoteTouched);
  const missing = active.map((quote) => ({
    index: quote.index,
    label: blank(quote.nickname) ? `Quote ${quote.index + 1}` : String(quote.nickname).slice(0, 80),
    fields: missingFields(quote)
  }));

  const flags = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      flags.push(...comparePair(active[i], active[j]));
    }
  }

  if (active.length === 1) {
    flags.push({
      level: "info",
      code: "single-quote",
      text: "Only one quote has any detail. A single quote cannot show whether the scope matches another offer. This page will not name a winner."
    });
  }
  if (active.length === 0) {
    flags.push({
      level: "info",
      code: "empty",
      text: "No quote details yet. Empty fields stay missing. They are not treated as zero and they are not filled in from another quote."
    });
  }

  return {
    activeCount: active.length,
    missing,
    flags,
    winner: null,
    ranking: null,
    note: "Scope is compared. Contractors are not ranked, scored, or declared the winner."
  };
}

function labelOf(quote) {
  return blank(quote.nickname) ? `Quote ${quote.index + 1}` : String(quote.nickname).slice(0, 80);
}

function comparePair(a, b) {
  const flags = [];
  const left = labelOf(a);
  const right = labelOf(b);
  for (const key of SCOPE_COMPARE_KEYS) {
    const av = blank(a[key]) ? null : norm(a[key]);
    const bv = blank(b[key]) ? null : norm(b[key]);
    if (av === null || bv === null) {
      flags.push({
        level: "missing",
        code: `missing-${key}`,
        text: `${fieldLabel(key)} is missing on ${av === null ? left : right}, so these quotes do not yet describe the same scope.`
      });
      continue;
    }
    if (av !== bv) {
      flags.push({
        level: "mismatch",
        code: `mismatch-${key}`,
        text: `${fieldLabel(key)} does not match between ${left} and ${right}. Different equipment or terms are not the same offer. Neither quote is ranked above the other.`
      });
    }
  }
  if (!blank(a.financing) && !blank(b.financing) && norm(a.financing) !== norm(b.financing)) {
    flags.push({
      level: "mismatch",
      code: "financing",
      text: `Financing terms differ between ${left} and ${right}. Compare the total installed price, not only a monthly payment.`
    });
  }
  const totalA = parseMoney(a.total);
  const totalB = parseMoney(b.total);
  if (totalA.state === "unknown" || totalB.state === "unknown") {
    flags.push({
      level: "missing",
      code: "missing-total",
      text: `Total installed price is unknown on ${totalA.state === "unknown" ? left : right}. A missing total is not zero, and it is not a reason to prefer the other quote.`
    });
  }
  return flags;
}

function fieldLabel(key) {
  return QUOTE_FIELDS.find((field) => field.key === key)?.label || key;
}

export function discountCheck(input = {}) {
  const reference = parseMoney(input.referencePrice);
  const promo = parseMoney(input.promoPrice);
  const kind = ["msrp", "advertised-reference", "prior-transaction", "allowance", "unknown"].includes(
    input.referenceKind
  )
    ? input.referenceKind
    : "unknown";

  let gap = unknown();
  let percent = unknown();
  if (reference.state === "known" && promo.state === "known") {
    gap = known(roundMoney(reference.value - promo.value));
    if (reference.value > 0) percent = known(((reference.value - promo.value) / reference.value) * 100);
    else percent = { state: "undefined", value: null, reason: "reference-is-zero" };
  }

  const flags = [];
  if (kind === "unknown") {
    flags.push(
      "The reference type is unknown. An MSRP, an advertised reference price, a prior transaction price, and an allowance are not the same number."
    );
  } else if (kind === "msrp") {
    flags.push(
      "You marked this reference as MSRP. MSRP is not, by itself, the price people were actually charged."
    );
  }
  if (input.actuallyOffered !== "yes") {
    flags.push(
      "It is not established, from what you entered, that the product was offered or sold at the reference price. The comparison may still be incomplete."
    );
  }
  if (blank(input.referenceStart) && blank(input.referenceEnd)) {
    flags.push("The dates the reference price applied are unknown.");
  }
  if (!blank(input.restrictions)) {
    flags.push(
      "A coupon or price-match restriction is not automatically deceptive. The question is whether the restriction is clear before you rely on the comparison."
    );
  }
  if (blank(input.exclusions)) {
    flags.push("Exclusions were left blank. Ask what the promotional price does not include.");
  }
  if (reference.state === "invalid" || promo.state === "invalid") {
    flags.push("One of the prices is not a usable number. That line stays unresolved.");
  }

  return {
    referenceKind: kind,
    reference,
    promo,
    gap,
    percent,
    flags,
    verdict: null,
    note: "This check does not decide that an offer is deceptive, illegal, or fair. It shows what is still unclear."
  };
}

const RUST_PATTERN = /\b(rust|rusty|corrosion|corroded)\b/i;
const SAFE_PATTERN = /\b(is it safe|unsafe|safe to (run|use|operate)|dangerous)\b/i;

export function buildRepairQuestions(input = {}) {
  const diagnosis = String(input.diagnosis || "");
  const tests = String(input.tests || "");
  const safetyNote = String(input.safetyNote || "");
  const repair = parseMoney(input.repairEstimate);
  const replacement = parseMoney(input.replacementEstimate);
  const age = parseMoney(input.ageYears);
  const questions = [
    {
      id: "written-findings",
      text: "Please put the diagnosis, the measurements, and any safety findings in writing.",
      why: "This website cannot see the furnace. It will not call the unit safe or unsafe."
    },
    {
      id: "what-failed",
      text: "What, specifically, is reported to be failed or failing, and which measurement supports that?",
      why: "A recommendation needs a finding, not only a headline."
    },
    {
      id: "repair-scope",
      text: "What does the repair price include, and what is excluded?",
      why: "A repair total without scope cannot be compared with replacement."
    },
    {
      id: "replace-scope",
      text: "For replacement, what are the model number, AFUE, staging, capacity, venting category, and total installed price?",
      why: "Equipment identity and installed price are separate facts."
    },
    {
      id: "keep-existing",
      text: "If the existing furnace can stay, what is the written price for the AC-only or repair path with the same labor assumptions?",
      why: "The no-replacement price is the comparison a promotion should be checked against."
    },
    {
      id: "warranty",
      text: "What warranty remains on the existing equipment, what warranty comes with repair, and what warranty comes with replacement?",
      why: "Warranty length was not assumed."
    },
    {
      id: "extras",
      text: "Which permits, code items, venting changes, electrical work, gas piping, drains, pads, or disposal fees are extra?",
      why: "Required work often sits outside a headline allowance."
    }
  ];

  if (age.state === "known") {
    questions.push({
      id: "age",
      text: `The age entered here is ${age.value} years. What condition findings, other than age, are being used in the recommendation?`,
      why: "Age alone does not establish that a furnace is unsafe or that replacement is required."
    });
  } else {
    questions.push({
      id: "age-unknown",
      text: "What is the equipment age, and is age being used as a reason? Ask for the condition findings as well.",
      why: "Age was left blank, so it stays unknown."
    });
  }

  if (RUST_PATTERN.test(diagnosis) || RUST_PATTERN.test(safetyNote)) {
    questions.push({
      id: "rust",
      text: "Rust or corrosion was mentioned in what you typed. What inspection or measurement, if any, addresses the heat exchanger? Surface rust alone is not a safety determination.",
      why: "Appearance is not the same as a failed heat exchanger."
    });
  }

  if (SAFE_PATTERN.test(diagnosis) || SAFE_PATTERN.test(safetyNote) || SAFE_PATTERN.test(tests)) {
    questions.push({
      id: "no-remote-safety",
      text: "Ask the technician on site whether any safety test was done, and ask for the result in writing. A form on this website cannot answer whether the furnace is safe to run.",
      why: "Remote safety determinations are out of scope."
    });
  }

  if (blank(safetyNote)) {
    questions.push({
      id: "safety-blank",
      text: "No safety finding was entered. Ask whether a safety check was performed and what was measured. Do not treat a blank as either safe or unsafe.",
      why: "Missing information stays unknown."
    });
  } else {
    questions.push({
      id: "safety-entered",
      text: "You entered a note about safety findings. Ask for the test name and the measured result. This site will not reinterpret that note.",
      why: "The note is user-submitted and not independently verified."
    });
  }

  if (repair.state !== "known") {
    questions.push({
      id: "repair-price-unknown",
      text: "Ask for a written repair estimate. The repair price is unknown until then.",
      why: "A blank repair price is not zero."
    });
  }
  if (replacement.state !== "known") {
    questions.push({
      id: "replace-price-unknown",
      text: "Ask for a written replacement estimate that separates equipment, labor, and required modifications.",
      why: "A blank replacement price is not zero."
    });
  }
  if (repair.state === "known" && replacement.state === "known") {
    questions.push({
      id: "both-prices",
      text: `You entered ${formatUsd(repair.value)} to repair and ${formatUsd(replacement.value)} to replace. Ask which of those dollars are equipment, labor, and extra required work.`,
      why: "Two totals are not comparable until the scope of each is written down."
    });
  }
  if (!blank(input.equipmentText)) {
    questions.push({
      id: "equipment-entered",
      text: "You noted some equipment details. Ask the technician to confirm the model number, capacity, and venting on the written quote.",
      why: "The note is not checked against a manufacturer catalog."
    });
  }
  if (blank(input.warranty)) {
    questions.push({
      id: "warranty-blank",
      text: "Warranty was left blank. Ask what coverage is still in force on the existing unit.",
      why: "Unknown warranty should not be treated as expired or active."
    });
  }
  if (blank(tests)) {
    questions.push({
      id: "tests-blank",
      text: "No measured test results were entered. Ask which tests were run and what the numbers were.",
      why: "This page does not invent measurements."
    });
  }

  const priorities = Array.isArray(input.priorities) ? input.priorities : [];
  const priorityQuestions = {
    cost: "Which option has the lower complete installed cost, and what does that figure leave out?",
    efficiency: "What efficiency change is actually available in this house, and what does it require for venting and sizing?",
    life: "What remaining service life is being estimated, and what finding is that estimate based on?",
    disruption: "What access, duct, electrical, gas, or living-space work does each option require?",
    parts: "Are repair parts available, and is that a documented parts status rather than a guess?"
  };
  for (const key of Object.keys(priorityQuestions)) {
    if (priorities.includes(key)) {
      questions.push({ id: `priority-${key}`, text: priorityQuestions[key], why: "You marked this as a priority." });
    }
  }

  if (input.replacementRecommended === "yes") {
    questions.push({
      id: "why-replace",
      text: "Replacement was marked as recommended. What finding, other than age or visible rust, makes repair a poor technical choice?",
      why: "A recommendation still needs a reason you can read."
    });
  }

  return {
    questions,
    storesProse: false,
    safetyDetermination: null,
    note: "These are questions for a qualified technician. They are not a diagnosis and not a safety ruling."
  };
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d{1,2}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]\d{4}\b/;
const DIGIT_RUN_RE = /(?:\d[\s-]?){10,}/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;

export function looksLikeContact(value) {
  const text = String(value || "");
  if (!text.trim()) return false;
  return EMAIL_RE.test(text) || PHONE_RE.test(text) || SSN_RE.test(text) || DIGIT_RUN_RE.test(text);
}

export function clampComment(value) {
  if (value === null || value === undefined) return { ok: true, comment: "" };
  const comment = String(value);
  if (comment.length > 256) return { ok: false, error: "Comment is longer than 256 characters." };
  if (looksLikeContact(comment)) {
    return {
      ok: false,
      error: "Remove email addresses, phone numbers, and long account numbers from the comment. They are not stored."
    };
  }
  return { ok: true, comment: comment.trim() };
}

export const JPEG_MAX_BYTES = 4 * 1024 * 1024;
export const JPEG_MIN_BYTES = 12 * 1024;
export const JPEG_MIN_EDGE = 400;
export const JPEG_MAX_RATIO = 8;

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

export function inspectJpeg(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    return { ok: false, reason: "not_jpeg" };
  }
  let offset = 2;
  let width = 0;
  let height = 0;
  let found = false;
  while (offset + 1 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xd9) break;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (offset + 3 >= buf.length) return { ok: false, reason: "truncated" };
    const length = (buf[offset + 2] << 8) + buf[offset + 3];
    if (length < 2 || offset + 2 + length > buf.length) return { ok: false, reason: "truncated" };
    if (SOF_MARKERS.has(marker) && length >= 7) {
      height = (buf[offset + 5] << 8) + buf[offset + 6];
      width = (buf[offset + 7] << 8) + buf[offset + 8];
      found = true;
    }
    offset += 2 + length;
  }
  if (!found || !width || !height) return { ok: false, reason: "no_dimensions" };
  return { ok: true, width, height };
}

export function gateJpeg(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (buf.length > JPEG_MAX_BYTES) {
    return { ok: false, code: "too_large", message: "That file is over 4 MB. A smaller JPEG of the document is required." };
  }
  if (buf.length < JPEG_MIN_BYTES) {
    return {
      ok: false,
      code: "too_small",
      message: "That file is too small to be a photo or scan of a written offer. Other images are not accepted."
    };
  }
  const info = inspectJpeg(buf);
  if (!info.ok) {
    return {
      ok: false,
      code: info.reason,
      message: "That file is not a JPEG this site can accept. Export or photograph the document as a .jpg."
    };
  }
  if (info.width < JPEG_MIN_EDGE || info.height < JPEG_MIN_EDGE) {
    return {
      ok: false,
      code: "dimensions",
      message: "That image is smaller than 400 pixels on one side. A readable page photo is required. Icons and unrelated pictures are not accepted."
    };
  }
  const ratio = Math.max(info.width, info.height) / Math.min(info.width, info.height);
  if (ratio > JPEG_MAX_RATIO) {
    return {
      ok: false,
      code: "aspect",
      message: "That image is shaped like a banner or a strip, not a page. Upload a JPEG of the invoice, estimate, or offer."
    };
  }
  return { ok: true, width: info.width, height: info.height, bytes: buf.length };
}

export function jpegRefuseCopy() {
  return "This upload accepts a JPEG (.jpg) of your written invoice, estimate, or offer only. Other images are not allowed. The site does not read or OCR the picture. If this is the wrong file, remove it and continue without an upload.";
}

export const COMMENT_CAP = 256;
