import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { INDEXNOW_KEY, INDEXNOW_FILENAME, INDEXNOW_PATH } from "../lib/indexnow.mjs";
import { CANONICAL_HOST, CANONICAL_ORIGIN, PATHS } from "../lib/paths.mjs";
import { jpegRefuseCopy, QUOTE_FIELDS } from "../public/js/engine.js";
import { writeSocialCard } from "./social-card.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const publicDir = path.join(root, "public");
const REVIEWED = "2026-10-31";
const PERSON_ID = "https://www.azieleliab.com/#aziel";
const WEBSITE_ID = `${CANONICAL_ORIGIN}/#website`;
const SOCIAL_IMAGE = `${CANONICAL_ORIGIN}/images/social-card.png`;
const SOCIAL_ALT = "The Furnace Isn't Free, a homeowner guide to HVAC offer structure";
const PERSON_SAME_AS = [
  PERSON_ID,
  "https://www.azieleliab.com/",
  "https://github.com/AzielEliab",
  "https://x.com/AzielEliab"
];
const SISTER_SUBJECTS = [
  { "@type": "WebSite", name: "Aziel Corpus Library", url: "https://azielcorpuslibrary.net/" },
  { "@type": "WebSite", name: "Godlock", url: "https://godlock.uk/" },
  { "@type": "WebSite", name: "He Didn't Jump", url: "https://hedidntjump.com/" },
  {
    "@type": "SoftwareSourceCode",
    name: "Aziel Runtime source",
    url: "https://github.com/AzielEliab/aziel-runtime",
    codeRepository: "https://github.com/AzielEliab/aziel-runtime"
  },
  { "@type": "WebSite", name: "Aziel Runtime hosted page", url: "https://aziel-runtime.vibelock.workers.dev/" },
  { "@type": "WebSite", name: "Time to Unseal the Book", url: "https://timetounsealthebook.net/" }
];

const NAV = [
  ["How the Offer Works", "/how-the-offer-works/"],
  ["The Numbers", "/the-numbers/"],
  ["Compare Quotes", "/compare-quotes/"],
  ["Checklist", "/checklist/"],
  ["Evidence", "/evidence/"],
  ["About", "/about/"],
  ["AZIEL", "/aziel/"]
];

const FOOTER = [
  ["Home", "/"],
  ["How the Offer Works", "/how-the-offer-works/"],
  ["The Numbers", "/the-numbers/"],
  ["Compare Quotes", "/compare-quotes/"],
  ["Checklist", "/checklist/"],
  ["Repair or Replace", "/repair-or-replace/"],
  ["Discount Reality Check", "/discount-reality-check/"],
  ["Evidence and Method", "/evidence/"],
  ["Submit an Offer", "/submit/"],
  ["AZIEL", "/aziel/"],
  ["About", "/about/"],
  ["Privacy", "/privacy/"],
  ["Terms", "/terms/"],
  ["Editorial disclosure", "/editorial/"],
  ["Corrections", "/corrections/"],
  ["Stats", "/stats/"]
];

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout({ path: pagePath, title, description, body, robots = "index,follow", jsonld = null }) {
  const canonical = pagePath === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${pagePath}`;
  const nav = NAV.map(([label, href]) => {
    const current = href === pagePath ? ' aria-current="page"' : "";
    const klass = href === "/aziel/" ? ' class="aziel-link"' : "";
    return `<a href="${href}"${klass}${current}>${label}</a>`;
  }).join("");
  const footer = FOOTER.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join("");
  const dataPage = pagePath;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Aziel Eliab">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/site.css">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SOCIAL_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(SOCIAL_ALT)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SOCIAL_IMAGE}">
<meta name="twitter:image:alt" content="${esc(SOCIAL_ALT)}">
<meta name="theme-color" content="#123B57">
${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ""}
</head>
<body data-page="${dataPage}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="header-inner">
    <a class="wordmark" href="/">
      <span class="wm-kicker">furnaceisntfree.com</span>
      <span class="wm-line">The Furnace</span>
      <span class="wm-line">Isn't Free</span>
    </a>
    <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <button type="button" class="nav-backdrop" aria-label="Close menu"></button>
    <nav id="site-nav" class="site-nav" aria-label="Primary">
      <button type="button" class="nav-close">Close</button>
      ${nav}
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="footer-inner">
    <p class="ecosystem-line">Part of the Aziel Eliab ecosystem</p>
    <p class="brand-line">We don't name companies. We name what they do.</p>
    <ul class="footer-nav">${footer}</ul>
    <p class="fine">Content reviewed ${REVIEWED}. Canonical host: furnaceisntfree.com. www.furnaceisntfree.com is an alias. This repository does not claim that the domain is deployed or that search engines have indexed it. First-party view counts live at <a href="/stats/">/stats</a> and <a href="/count">/count</a>.</p>
  </div>
</footer>
<p class="print-only">Part of the Aziel Eliab ecosystem</p>
<noscript><style>@media (max-width: 860px){ .site-nav{ display:flex !important; position:static; width:auto; } .nav-toggle,.nav-backdrop{ display:none !important; } }</style></noscript>
<script type="module" src="/js/ui.js"></script>
</body>
</html>
`;
}

function contentDate(page) {
  return page.updated || REVIEWED;
}

function pageGraph(page) {
  const url = page.path === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${page.path}`;
  const type = page.path === "/about/" ? "AboutPage" : "WebPage";
  const webpage = {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}#webpage`,
    name: page.title,
    description: page.description,
    url,
    inLanguage: "en",
    dateModified: contentDate(page),
    isPartOf: { "@id": WEBSITE_ID },
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID }
  };
  if (page.path === "/aziel/") {
    webpage.additionalProperty = [
      { "@type": "PropertyValue", name: "cap7_dns", value: "separate_from_public_icann" },
      { "@type": "PropertyValue", name: "paid_satellite", value: "HELD" },
      { "@type": "PropertyValue", name: "remain_off", value: "true" },
      { "@type": "PropertyValue", name: "mesh_tracking", value: "off" },
      { "@type": "PropertyValue", name: "indexing", value: "unconfirmed" },
      { "@type": "PropertyValue", name: "live", value: "false" }
    ];
  }
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: "The Furnace Isn't Free",
    url: `${CANONICAL_ORIGIN}/`,
    publisher: { "@id": PERSON_ID }
  };
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: "Aziel Eliab",
    url: "https://www.azieleliab.com/",
    sameAs: PERSON_SAME_AS,
    subjectOf: SISTER_SUBJECTS
  };
  const graphs = [webpage, website, person];
  if (page.jsonldExtra) graphs.push(page.jsonldExtra);
  return graphs;
}

function feedback(id, tool) {
  return `<form id="${id}" class="feedback no-print" data-tool="${tool}" hidden>
    <h3>Was this useful?</h3>
    <p class="fine">Optional. Yes or no is enough. Comments are limited to 256 characters, are not published, and must not include names, addresses, phone numbers, or account numbers.</p>
    <div class="choice"><label class="choice"><input type="radio" name="useful" value="yes"> Yes</label></div>
    <div class="choice"><label class="choice"><input type="radio" name="useful" value="no"> No</label></div>
    <div class="field">
      <label for="${id}-comment">Comment, optional</label>
      <textarea id="${id}-comment" data-comment maxlength="256"></textarea>
      <span class="char-count" data-count>0 / 256</span>
    </div>
    ${jpegFields(id)}
    <button class="btn" type="submit" disabled>Save feedback</button>
    <p data-feedback-status role="status"></p>
  </form>`;
}

function jpegFields(id) {
  return `<div class="field">
      <label for="${id}-file">Optional JPEG of the written invoice, estimate, or offer</label>
      <p class="help">${esc(jpegRefuseCopy())} Remove names, addresses, phone numbers, account numbers, signatures, and barcodes before you choose a file.</p>
      <input id="${id}-file" data-jpeg type="file" accept="image/jpeg,.jpg,.jpeg">
      <label class="choice"><input data-attest type="checkbox"> This is my written invoice, estimate, or offer.</label>
      <label class="choice"><input data-redact type="checkbox"> I removed names, addresses, phone numbers, account numbers, signatures, and barcodes.</label>
      <label class="choice"><input data-review type="checkbox"> I request review for possible publication later. Leave this unchecked to keep it private. Checking it does not publish anything.</label>
    </div>
    <p class="fine">The picture stays private. This site does not OCR it and does not claim to know what the pixels say beyond your confirmation.</p>`;
}

function moneyField(id, name, label) {
  return `<div class="field">
    <label for="${id}">${label}</label>
    <span class="help" id="${id}-help">US dollars. Leave blank if the quote does not say. Blank stays unknown. Type 0 only when the document says zero.</span>
    <input id="${id}" data-input="${name}" data-money="true" inputmode="decimal" autocomplete="off" aria-describedby="${id}-help">
  </div>`;
}

const pages = [];

pages.push({
  path: "/",
  title: "The Furnace Isn't Free | HVAC quote transparency",
  description:
    "A homeowner guide to free-furnace promotions. Separate the headline from equipment price, allowance, installation, and the total installed price.",
  body: `<section class="hero">
    <div class="hero-grid">
      <div>
        <p class="kicker">Homeowner price-transparency guide</p>
        <h1>The Furnace Isn't Free.</h1>
        <p class="lede">A promotion can make a package look simple. The real price is in the equipment, installation, required work, and terms. Learn what to ask before you sign.</p>
        <div class="actions">
          <a class="btn" href="/the-numbers/#calculator">Break down the offer</a>
          <a class="text-link" href="/checklist/homeowner-checklist.txt" download>Download the homeowner checklist</a>
        </div>
      </div>
      <figure class="layers">
        <figcaption>What does “free” leave out?</figcaption>
        <ol>
          <li><strong>Furnace equipment</strong><span>Quoted model and price</span></li>
          <li><strong>Promotional allowance</strong><span>Credit applied</span></li>
          <li><strong>Installation and materials</strong><span>Separately itemized</span></li>
          <li class="total"><strong>Total installed cost</strong><span>What you actually pay</span></li>
        </ol>
      </figure>
    </div>
  </section>
  <section class="wrap">
    <h2>The headline and the invoice</h2>
    <p class="lede">Headline: “Buy a new AC and get a furnace free.” A promotion is a claim. These are the questions that sit underneath it.</p>
    <div class="grid-3">
      <article class="card"><h3>The promise</h3><p>What does “free” actually include? Which furnace model, and what allowance is written down?</p></article>
      <article class="card"><h3>The specification</h3><p>Some offers may be built around a basic 80% AFUE, single-stage furnace. That is a configuration to check, not a fact about every promotion. Ask for model, efficiency, staging, capacity, venting, and compatibility.</p><p class="fine">Evidence label: analysis / inference from this site’s build notes, not an industry census.</p></article>
      <article class="card"><h3>The real total</h3><p>Equipment plus labor plus required work, minus only the credits the contract actually applies. A credit against equipment is not the same as a free installed system.</p></article>
    </div>
  </section>
  <section class="band">
    <div class="wrap">
      <h2>Four questions before you accept</h2>
      <div class="grid-4">
        <article class="question"><span class="num">1</span><h3>What exact furnace model is included?</h3></article>
        <article class="question"><span class="num">2</span><h3>What is the equipment-only allowance or credit?</h3></article>
        <article class="question"><span class="num">3</span><h3>What labor, materials, accessories, and modifications are additional?</h3></article>
        <article class="question"><span class="num">4</span><h3>What is the complete installed price, and the comparable price without the promotion?</h3></article>
      </div>
    </div>
  </section>
  <section class="wrap prose">
    <h2>A balanced starting point</h2>
    <p>Sometimes replacement is sensible. Sometimes repair is reasonable. The answer depends on diagnosis, condition, safety findings from a qualified person, compatibility, efficiency, parts availability, expected remaining life, and what you want. Age or surface rust, by itself, does not prove a furnace is unsafe. Get findings in writing.</p>
    <p>This site does not name companies. It names the parts of an offer: equipment, allowance, labor, modifications, exclusions, and total. It does not turn one quote into a claim about the trade.</p>
    <div class="grid-3">
      <article class="card"><h3>Furnace cost calculator</h3><p>See what an allowance covers and what remains. Missing numbers stay unknown.</p><a class="btn" href="/the-numbers/#calculator">Open the calculator</a></article>
      <article class="card"><h3>Compare up to three quotes</h3><p>Flag missing scope. No automatic winner.</p><a class="btn secondary" href="/compare-quotes/">Compare quotes</a></article>
      <article class="card"><h3>Repair or replace</h3><p>Build questions for a technician. This page will not diagnose the unit.</p><a class="btn secondary" href="/repair-or-replace/">Build questions</a></article>
    </div>
  </section>`
});

pages.push({
  path: "/how-the-offer-works/",
  title: "How Free-Furnace Offers Work | Installed Cost",
  updated: "2026-11-05",
  description:
    "How an HVAC package allowance differs from a zero-cost installed furnace, and what to compare on an itemized estimate.",
  body: `<article class="wrap prose">
    <p class="kicker">Offer structure</p>
    <h1>How the offer works</h1>
    <p class="lede">An advertised package discount is not the same thing as a furnace that costs nothing to install.</p>
    <h2>The allowance is not the installation</h2>
    <p>A fixed allowance against the furnace portion of a package covers only what the writing says it covers. It can offset an equipment price and still leave labor, materials, permits, and modifications on the invoice.</p>
    <ul>
      <li><strong>Equipment allowance.</strong> A stated credit against the package.</li>
      <li><strong>Furnace equipment.</strong> The exact model and the price basis for that model.</li>
      <li><strong>Installation labor.</strong> Removal, setting, connections, commissioning, and other included work.</li>
      <li><strong>Additional work.</strong> Venting, condensate, gas piping, electrical, duct transitions, controls, permits, disposal, and accessories where they apply.</li>
      <li><strong>Total installed cost.</strong> What the contract says you pay.</li>
    </ul>
    <h2>The equipment may be a basic specification</h2>
    <p>The concern this site was built to examine is that some offers may be anchored to a basic 80% AFUE, single-stage furnace — an entry-level configuration — rather than the efficiency, staging, capacity, venting, or controls a particular house needs or already has.</p>
    <p>That sentence is not a finding that every promotion uses that furnace. Ask for the manufacturer, model number, AFUE, input and output capacity, staging, blower type, venting category, warranty, and included accessories. An 80% single-stage unit is not automatically the wrong machine. Suitability depends on the house and the installation.</p>
    <p class="fine">Evidence label: analysis / inference. Source: this site’s build notes, reviewed ${REVIEWED}. Not an industry dataset.</p>
    <h2 id="faq">Questions that have short answers</h2>
    <h3>Does “free furnace” mean the installed furnace costs nothing?</h3>
    <p>Not by the word alone. Read the allowance, the equipment price, the labor, the required modifications, and the total. Use the <a href="/the-numbers/#calculator">calculator</a> with the figures from your quote. Leave unknown boxes blank.</p>
    <h3>Is installation labor usually four times the equipment price?</h3>
    <p>This site does not say that. Notes from the project mentioned examples of about $4,000 to $6,000 in labor, sometimes near four times a basic furnace’s equipment price. Treat that as a claim to investigate with your own written numbers. There is no dataset here that would support “usually.”</p>
    <h3>Do all free-furnace offers use the same entry-level model?</h3>
    <p>No such claim is made here. Model numbers have to be read off the quote.</p>
    <p><a class="btn" href="/the-numbers/#calculator">Break down a quote</a></p>
  </article>`,
  jsonldExtra: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does “free furnace” mean the installed furnace costs nothing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Not by the word alone. Read the allowance, the equipment price, the labor, the required modifications, and the total. Use the calculator with the figures from your quote. Leave unknown boxes blank."
        }
      },
      {
        "@type": "Question",
        name: "Is installation labor usually four times the equipment price?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "This site does not say that. Notes from the project mentioned examples of about $4,000 to $6,000 in labor, sometimes near four times a basic furnace’s equipment price. Treat that as a claim to investigate with your own written numbers. There is no dataset here that would support “usually.”"
        }
      },
      {
        "@type": "Question",
        name: "Do all free-furnace offers use the same entry-level model?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No such claim is made here. Model numbers have to be read off the quote."
        }
      }
    ]
  }
});

pages.push({
  path: "/the-numbers/",
  title: "Furnace Cost Calculator | Equipment, Labor & Allowance",
  updated: "2026-11-05",
  description:
    "Define MSRP, allowance, and installed cost, then calculate net equipment, labor ratio, and package difference without turning blanks into zero.",
  body: `<article class="wrap">
    <p class="kicker">Definitions and calculator</p>
    <h1>The numbers</h1>
    <p class="lede">Separate the kinds of price before you subtract anything. The calculator uses only the figures you type.</p>
    <div class="prose">
      <h2>Price words that are not interchangeable</h2>
      <table>
        <thead><tr><th>Term</th><th>What it is</th></tr></thead>
        <tbody>
          <tr><td>MSRP</td><td>A manufacturer list price. Not proof of what buyers paid.</td></tr>
          <tr><td>Advertised reference price</td><td>A price a promotion compares itself with. Ask when it applied and whether the product was offered at that price.</td></tr>
          <tr><td>Actual transaction price</td><td>What a buyer paid in a real sale. A single quote does not establish this for a market.</td></tr>
          <tr><td>Allowance</td><td>A credit the offer says it will apply. Read where it can be applied.</td></tr>
          <tr><td>Installed cost</td><td>Equipment, labor, materials, modifications, and fees, minus only the credits the contract applies.</td></tr>
        </tbody>
      </table>
      <p class="fine">Evidence label: definitions used by this site. Not a price survey.</p>
    </div>
    <section id="calculator" class="stack">
      <h2>What does “free” actually mean?</h2>
      <p>Enter actual written figures. Leave unknown fields blank.</p>
      <ul>
        <li>Net equipment after allowance = max(0, equipment price − allowance).</li>
        <li>If the allowance is larger than the equipment price, the extra credit is shown on its own line and is not subtracted from labor.</li>
        <li>Installation and additional = labor + materials/modifications + other required charges. If any of those three is blank, the sum stays unknown.</li>
        <li>Incremental installed furnace cost = net equipment after allowance + installation and additional.</li>
        <li>Labor-to-equipment ratio = labor ÷ equipment-only price, only when the equipment price is greater than zero.</li>
        <li>Package versus alternative = package total − AC-only comparison price. It is never built by adding the other lines.</li>
      </ul>
      <form id="calculator" class="tool-form card">
        <div class="grid-2">
          ${moneyField("equipment", "equipment", "Furnace equipment price")}
          ${moneyField("allowance", "allowance", "Advertised furnace allowance")}
          ${moneyField("labor", "labor", "Installation labor")}
          ${moneyField("materials", "materials", "Additional materials and modifications")}
          ${moneyField("other", "other", "Permits, disposal, and other required charges")}
          ${moneyField("packageTotal", "packageTotal", "Package total")}
          ${moneyField("acOnly", "acOnly", "AC-only comparison price")}
        </div>
        <div class="actions">
          <button class="btn" type="submit">Calculate</button>
          <button class="btn secondary" type="button" data-example>Fill the fictional example</button>
        </div>
        <p class="fine">The fictional example is labeled in the result. It is not a market average. Package total is never invented from the other lines.</p>
      </form>
      <div id="calc-results" class="results" aria-live="polite"></div>
      <noscript><p>The calculator needs JavaScript. The definitions above still apply. Blank values are unknown, not zero.</p></noscript>
      ${feedback("calc-feedback", "free-meaning")}
      <h2>Usefulness on this server</h2>
      <div class="meter" data-meter><p>Loading counts…</p></div>
    </section>
  </article>`
});

function quoteCards() {
  return [0, 1, 2]
    .map((index) => {
      const fields = QUOTE_FIELDS.map((field) => {
        const id = `q${index}-${field.key}`;
        if (field.key === "staging" || field.key === "permits") {
          const options =
            field.key === "staging"
              ? ["", "single-stage", "two-stage", "modulating", "unknown"]
              : ["", "included", "excluded", "unknown"];
          return `<div class="field"><label for="${id}">${field.label}</label><select id="${id}" data-field="${field.key}">${options
            .map((option) => `<option value="${esc(option)}">${option ? esc(option) : "Leave blank if unknown"}</option>`)
            .join("")}</select></div>`;
        }
        const money = field.kind === "money" ? ' data-money="true" inputmode="decimal"' : "";
        return `<div class="field"><label for="${id}">${field.label}</label><input id="${id}" data-field="${field.key}"${money} autocomplete="off"></div>`;
      }).join("");
      return `<article class="quote-card" data-quote="${index}"><h3>Quote ${"ABC"[index]}</h3>${fields}</article>`;
    })
    .join("");
}

pages.push({
  path: "/compare-quotes/",
  title: "Compare HVAC quotes side by side | No automatic winner",
  description:
    "Compare up to three furnace and AC quotes. Missing scope is flagged. Contractors are not ranked.",
  body: `<article class="wrap">
    <p class="kicker">Scope, not a scoreboard</p>
    <h1>Compare quotes</h1>
    <p class="lede">Put up to three written offers next to each other. The page marks what is missing and what does not match. It will not pick a contractor.</p>
    <div id="workspace" class="grid-3">${quoteCards()}</div>
    <div class="actions">
      <button class="btn" type="button" id="compare-run">Check scope</button>
      <button class="btn secondary" type="button" id="compare-print">Print summary</button>
      <button class="btn secondary" type="button" id="compare-download">Download summary</button>
    </div>
    <div id="compare-summary" class="results" aria-live="polite"></div>
    <p class="fine">The download labels every line as what you typed or as unknown. It is not an independent verification of the quotes.</p>
    ${feedback("compare-feedback", "quote-compare")}
    <h2>Usefulness on this server</h2>
    <div class="meter" data-meter><p>Loading counts…</p></div>
  </article>`
});

const checklistItems = [
  "Exact furnace and air-conditioner model numbers, plus the full equipment specification.",
  "AFUE, staging, capacity, blower, venting category, and compatibility with the house.",
  "Itemized equipment price and the promotional allowance, including where the credit may be applied.",
  "Labor scope and the labor price as its own figure.",
  "Materials, accessories, venting, condensate, gas piping, electrical, duct transitions, controls, permits, disposal, and other required work.",
  "A repair estimate and the diagnostic findings if replacement is recommended.",
  "A replacement estimate and the reason for that recommendation, in writing.",
  "Total installed price, payment schedule, and financing terms. A monthly payment is not the installed price.",
  "A comparable quote with equivalent equipment and scope, including an AC-only or keep-the-furnace price where that is appropriate.",
  "Written exclusions, warranty, change-order rules, and the quote expiration."
];

pages.push({
  path: "/checklist/",
  title: "Homeowner HVAC checklist | Questions before you authorize work",
  description:
    "A printable checklist for furnace and air-conditioner quotes: model, allowance, labor, exclusions, warranty, and total installed price.",
  body: `<article class="wrap prose">
    <p class="kicker">Before you authorize work</p>
    <h1>Consumer checklist</h1>
    <p class="lede">Ask for these items in writing. A blank answer is unknown. It is not a reason to assume the work is included.</p>
    <div class="actions no-print">
      <button class="btn" type="button" data-print-page>Print this checklist</button>
      <a class="btn secondary" href="/checklist/homeowner-checklist.txt" download>Download text</a>
    </div>
    <ul class="check-list">
      ${checklistItems.map((item, index) => `<li><input type="checkbox" id="c${index}"><label for="c${index}">${item}</label></li>`).join("")}
    </ul>
    <p class="fine">Checking a box stores nothing. It is a reading aid on your device. This list is not a contract review and not a safety inspection.</p>
  </article>`
});

pages.push({
  path: "/repair-or-replace/",
  title: "Should I replace my furnace? Questions to ask first",
  description:
    "A repair-or-replace question builder for HVAC visits. It does not diagnose equipment and does not decide whether a furnace is safe.",
  body: `<article class="wrap">
    <p class="kicker">Questions, not a ruling</p>
    <h1>Repair or replace</h1>
    <div class="callout">
      <p><strong>This page does not inspect your furnace.</strong> It will not tell you the unit is safe or unsafe. It will not tell you to open gas equipment, bypass a safety, or do hazardous work. Age and visible rust do not, by themselves, show a heat-exchanger failure.</p>
    </div>
    <p class="lede">Enter what you were told and what you were quoted. The result is a list of questions for a qualified technician.</p>
    <form id="repair-tool" class="card tool-form">
      <div class="field"><label for="diagnosis">What you were told is wrong</label><span class="help">Leave out names, addresses, and phone numbers.</span><textarea id="diagnosis" data-input="diagnosis"></textarea></div>
      <div class="field"><label for="tests">Measured test results you were given</label><textarea id="tests" data-input="tests"></textarea></div>
      <div class="field"><label for="safetyNote">Safety findings the technician reported</label><span class="help">Copied here only so the questions can refer to them. This site does not reinterpret them.</span><textarea id="safetyNote" data-input="safetyNote"></textarea></div>
      ${moneyField("repairEstimate", "repairEstimate", "Repair estimate")}
      ${moneyField("replacementEstimate", "replacementEstimate", "Replacement estimate")}
      <div class="field"><label for="equipment">Equipment details you have</label><input id="equipment" data-input="equipmentText" autocomplete="off"></div>
      <div class="field">
      <label for="ageYears">Age in years, if known</label>
      <span class="help" id="ageYears-help">Leave blank if you were not told. Blank stays unknown. Age alone is not a safety finding.</span>
      <input id="ageYears" data-input="ageYears" data-money="true" inputmode="decimal" autocomplete="off" aria-describedby="ageYears-help">
    </div>
      <div class="field"><label for="warranty">Warranty, if stated</label><input id="warranty" data-input="warranty" autocomplete="off"></div>
      <fieldset>
        <legend>What matters most to you</legend>
        ${[
          ["cost", "Lower complete cost"],
          ["efficiency", "Efficiency"],
          ["life", "Expected remaining life"],
          ["disruption", "How much work is done in the house"],
          ["parts", "Parts availability"]
        ]
          .map(
            ([value, label]) =>
              `<label class="choice"><input type="checkbox" data-input="priorities" value="${value}"> ${label}</label>`
          )
          .join("")}
      </fieldset>
      <div class="field">
        <label for="recommended">Was replacement recommended?</label>
        <select id="recommended" data-input="replacementRecommended">
          <option value="unknown">Unknown</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <button class="btn" type="submit">Build questions</button>
    </form>
    <div id="repair-results" class="results" aria-live="polite"></div>
    <h2>Should I replace my HVAC?</h2>
    <p>This site cannot answer that for a particular house. A sensible choice depends on a written diagnosis, measurements, safety findings from a qualified person, compatibility, efficiency, parts, remaining life, and your priorities. Use the questions above, and get the answers in writing.</p>
    ${feedback("repair-feedback", "repair-questions")}
    <h2>Usefulness on this server</h2>
    <div class="meter" data-meter><p>Loading counts…</p></div>
  </article>`,
  jsonldExtra: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Should I replace my HVAC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "This site cannot answer that for a particular house. A sensible choice depends on a written diagnosis, measurements, safety findings from a qualified person, compatibility, efficiency, parts, remaining life, and your priorities. Use the questions above, and get the answers in writing."
        }
      }
    ]
  }
});

pages.push({
  path: "/discount-reality-check/",
  title: "HVAC Discount Reality Check | Offer Terms",
  updated: "2026-11-05",
  description:
    "Check whether a furnace or AC promotional price names its reference, dates, exclusions, and restrictions. No deception ruling.",
  body: `<article class="wrap">
    <p class="kicker">Reference prices</p>
    <h1>Discount reality check</h1>
    <p class="lede">A lower number is only as clear as the price it is compared with. A restriction is not automatically deceptive. The question is whether the comparison is accurate and the terms are plain.</p>
    <form id="discount-tool" class="card tool-form">
      <div class="field">
        <label for="referenceKind">What kind of reference price is this?</label>
        <select id="referenceKind" data-input="referenceKind">
          <option value="unknown">Unknown</option>
          <option value="msrp">MSRP</option>
          <option value="advertised-reference">Advertised reference price</option>
          <option value="prior-transaction">Prior transaction price</option>
          <option value="allowance">Allowance or credit</option>
        </select>
      </div>
      ${moneyField("referencePrice", "referencePrice", "Reference price")}
      ${moneyField("promoPrice", "promoPrice", "Promotional price")}
      <div class="field"><label for="referenceStart">Date the reference price started</label><input id="referenceStart" data-input="referenceStart" autocomplete="off"></div>
      <div class="field"><label for="referenceEnd">Date the reference price ended</label><input id="referenceEnd" data-input="referenceEnd" autocomplete="off"></div>
      <div class="field">
        <label for="actuallyOffered">Was the product offered or sold at that reference price?</label>
        <select id="actuallyOffered" data-input="actuallyOffered">
          <option value="unknown">Unknown</option>
          <option value="yes">Yes, as far as the papers show</option>
          <option value="no">No</option>
        </select>
      </div>
      <div class="field"><label for="exclusions">Exclusions</label><textarea id="exclusions" data-input="exclusions"></textarea></div>
      <div class="field"><label for="restrictions">Coupon or price-match restrictions</label><textarea id="restrictions" data-input="restrictions"></textarea></div>
      <button class="btn" type="submit">Check the comparison</button>
    </form>
    <div id="discount-results" class="results" aria-live="polite"></div>
    ${feedback("discount-feedback", "discount-check")}
    <h2>Usefulness on this server</h2>
    <div class="meter" data-meter><p>Loading counts…</p></div>
  </article>`
});

pages.push({
  path: "/evidence/",
  title: "Evidence and method | Business Ambiguity Lattice",
  description:
    "Five layers for reading a commercial claim: claim, reference, conditions, total, and verification. Includes a labeled illustrative case.",
  body: `<article class="wrap prose">
    <p class="kicker">Method</p>
    <h1>Evidence and method</h1>
    <p class="lede">The Business Ambiguity Lattice on this site is a practical way to unpack a commercial claim. It is this site’s operational method. A dedicated lattice paper was not the source, and the method is not presented as a verdict.</p>
    <p class="fine">The Custodial Knowledge Model (Aziel Eliab, August 2026) is a conceptual working paper cited in the build notes for stewardship and correction. It is not an independent validation of any HVAC price.</p>
    <div class="grid-3">
      <article class="card"><span class="num">01</span><h3>Claim</h3><p>What is promised? Example: “Get a furnace free.”</p></article>
      <article class="card"><span class="num">02</span><h3>Reference</h3><p>Compared with what? MSRP, list price, allowance, or a prior selling price.</p></article>
      <article class="card"><span class="num">03</span><h3>Conditions</h3><p>What qualifies it? A basic model, excluded labor, required add-ons.</p></article>
      <article class="card"><span class="num">04</span><h3>Total</h3><p>Equipment + labor + modifications + fees − credits the contract applies.</p></article>
      <article class="card"><span class="num">05</span><h3>Verification</h3><p>Itemized quote, model numbers, terms, invoices, a comparable offer.</p></article>
    </div>
    <h2>Map a claim</h2>
    <form id="lattice-tool" class="card">
      ${["claim", "reference", "conditions", "total", "verification"]
        .map(
          (key) =>
            `<div class="field"><label for="layer-${key}">${key[0].toUpperCase()}${key.slice(1)}</label><textarea id="layer-${key}" data-input="${key}"></textarea></div>`
        )
        .join("")}
      <button class="btn" type="submit">Map this claim</button>
    </form>
    <div id="lattice-results" class="results" aria-live="polite"></div>
    ${feedback("lattice-feedback", "lattice")}
    <h2>Illustrative case template</h2>
    <p><span class="label">Illustrative example</span> Last reviewed ${REVIEWED}. This is not a report about a real company, city, or invoice.</p>
    <table>
      <tbody>
        <tr><th>Title</th><td>Fictional package offer</td></tr>
        <tr><th>Date of quote</th><td>None. This row is a template.</td></tr>
        <tr><th>Region</th><td>Unknown</td></tr>
        <tr><th>Source</th><td>Invented for the calculator example</td></tr>
        <tr><th>Redaction</th><td>Not applicable. No document exists.</td></tr>
        <tr><th>Advertised claim</th><td>“Buy a new AC and get a furnace free.”</td></tr>
        <tr><th>Model</th><td>Unknown. The template refuses to invent a model number.</td></tr>
        <tr><th>Allowance</th><td>$1,500 fictional</td></tr>
        <tr><th>Equipment price</th><td>$1,500 fictional</td></tr>
        <tr><th>Labor</th><td>$4,800 fictional</td></tr>
        <tr><th>Other required work</th><td>$900 fictional materials. Permits and disposal entered as an explicit $0 in the calculator example.</td></tr>
        <tr><th>Incremental installed furnace cost</th><td>$5,700 in the fiction. The allowance covers the fictional equipment line and not the labor.</td></tr>
        <tr><th>Comparable alternative</th><td>Unknown</td></tr>
        <tr><th>Documented</th><td>Only the arithmetic of the made-up inputs.</td></tr>
        <tr><th>Unknown</th><td>Model, house, contractor, whether any real buyer saw these prices.</td></tr>
        <tr><th>What would verify a real case</th><td>A redacted itemized quote, model numbers, a comparable price without the promotion, and the written terms.</td></tr>
        <tr><th>Consumer impact</th><td>A shopper who stops at the word “free” may not ask what labor and modifications still cost.</td></tr>
        <tr><th>Corrections</th><td>None. Template first published ${REVIEWED}.</td></tr>
      </tbody>
    </table>
    <h2>Evidence labels used on this site</h2>
    <ul>
      <li>Verified document</li>
      <li>User-submitted, not independently verified</li>
      <li>Illustrative example</li>
      <li>Industry source</li>
      <li>Analysis or inference</li>
    </ul>
    <p>Broad market claims would need a dataset size, region, date range, inclusion rules, and limitations. None is published here. Corrections are listed on the <a href="/corrections/">corrections</a> page.</p>
    <h2>Usefulness on this server</h2>
    <div class="meter" data-meter><p>Loading counts…</p></div>
  </article>`
});

pages.push({
  path: "/submit/",
  title: "Submit an HVAC offer privately",
  description:
    "Send a redacted furnace or AC offer for private review. Nothing is published unless you ask and a later review agrees. JPEG invoices only.",
  body: `<article class="wrap">
    <p class="kicker">Private by default</p>
    <h1>Submit an offer</h1>
    <div class="callout">
      <p>Remove names, addresses, phone numbers, account numbers, signatures, barcodes, and other identifiers before you type or upload. Storage is for review of the offer structure. Raw submissions are not published. A request for later publication is not publication.</p>
    </div>
    <form id="submit-form" class="card" data-tool="submit-offer">
      <div class="field"><label for="region">Region, optional and general</label><span class="help">State or metro is enough. Do not enter a street address.</span><input id="region" data-input="region" autocomplete="off"></div>
      <div class="field"><label for="claim">Advertised claim, in your words</label><textarea id="claim" data-input="claim"></textarea></div>
      <div class="field"><label for="model">Model numbers, if you are willing to share them</label><input id="model" data-input="model" autocomplete="off"></div>
      <div class="field"><label for="sub-allowance">Allowance as written</label><input id="sub-allowance" data-input="allowance" data-money="true" inputmode="decimal" autocomplete="off"></div>
      <div class="field"><label for="sub-labor">Labor as written</label><input id="sub-labor" data-input="labor" data-money="true" inputmode="decimal" autocomplete="off"></div>
      <div class="field"><label for="sub-total">Total as written</label><input id="sub-total" data-input="total" data-money="true" inputmode="decimal" autocomplete="off"></div>
      <div class="field"><label for="notes">Other scope notes</label><textarea id="notes" data-input="notes"></textarea></div>
      <h2>Was sorting this offer useful?</h2>
      <div class="choice"><label class="choice"><input type="radio" name="useful" value="yes"> Yes</label></div>
      <div class="choice"><label class="choice"><input type="radio" name="useful" value="no"> No</label></div>
      <div class="field"><label for="submit-comment">Comment, optional, 256 characters</label><textarea id="submit-comment" data-comment maxlength="256"></textarea><span class="char-count" data-count>0 / 256</span></div>
      ${jpegFields("submit")}
      <button class="btn" type="submit">Save privately</button>
      <p data-feedback-status role="status"></p>
    </form>
    <h2>Usefulness on this server</h2>
    <div class="meter" data-meter><p>Loading counts…</p></div>
  </article>`
});

pages.push({
  path: "/aziel/",
  title: "AZIEL | One ecosystem, multiple doors",
  updated: "2026-11-05",
  description:
    "The Furnace Isn't Free is one public project in the Aziel Eliab ecosystem. Each linked door keeps its own purpose.",
  body: `<article class="wrap prose">
    <p class="kicker">Aziel Eliab ecosystem</p>
    <h1>One ecosystem. Multiple doors.</h1>
    <p class="lede">The Furnace Isn't Free is one public-facing project within the Aziel Eliab ecosystem. The ecosystem brings together independent research, software development, digital knowledge preservation, and public-interest experiments. Each project has its own purpose. Cross-links explain the relationship. They do not mean every project makes the same claims.</p>
    <h2>What this door is for</h2>
    <p>Make claims inspectable. Preserve the reasoning and the evidence behind a conclusion. Distinguish what is known from what is inferred. Leave room for correction. The work should serve the person using it. It does not demand belief in the author or the framework.</p>
    <h2>Stance</h2>
    <p class="fine">Published ecosystem stance, placed here as written on the public pages. Not a finding about any furnace offer.</p>
    <blockquote cite="https://www.azieleliab.com/aziel">
      <p>You don’t get to know me.</p>
      <p>You get to understand the work.</p>
      <p>Knowing is collection. A face, a timeline, a tone you could imitate. Understanding is subtraction. Take the man away and see whether anything is still true.</p>
      <p>I offer the second thing only.</p>
      <p>A self is a weather system. It passes. Work is what does not require the weather to continue existing. If you need my presence to feel the meaning, you have not found the meaning. You have found company.</p>
      <p>I am not withholding a life. I am refusing to let a life become the proof.</p>
      <p>If the work holds, the name was only a handle on the door.</p>
    </blockquote>
    <p class="source">Source: <a href="https://www.azieleliab.com/aziel">azieleliab.com/aziel</a>, read ${REVIEWED}. Evidence label: verified document (public page). Person: <a href="https://www.azieleliab.com/#aziel">Aziel Eliab</a>.</p>
    <blockquote cite="https://azielcorpuslibrary.net/">
      <p>What matters is the record.</p>
      <p>Not the name.</p>
      <p>I do not ask you to believe a name. I ask you to read a record.</p>
      <p>The public identity is the work. Opened without taking the speaker on faith.</p>
      <p>If the files hold, the name was never the point.</p>
    </blockquote>
    <p class="source">Source: <a href="https://azielcorpuslibrary.net/">azielcorpuslibrary.net</a>, read ${REVIEWED}. Evidence label: verified document (public page).</p>
    <h2>Doors</h2>
    <p>Official cross-chain sister handles. Each one is a separate public project. A link does not mean this HVAC site runs that project, restates its findings, or is deployed.</p>
    <p class="fine">These handles were requested on 5 November 2026. Each returned HTTP 200. This list is not a catalog and it is not a live-status claim.</p>
    <div class="grid-2">
      <article class="door"><h3>Aziel Eliab</h3><p>Central identity and ecosystem overview.</p><a class="btn" href="https://www.azieleliab.com/">azieleliab.com</a></article>
      <article class="door"><h3>Aziel Corpus Library</h3><p>Research archive and knowledge-library work.</p><a class="btn" href="https://azielcorpuslibrary.net/">azielcorpuslibrary.net</a></article>
      <article class="door"><h3>Godlock</h3><p>Software and infrastructure entry for a different project. This HVAC guide does not use it to score quotes.</p><a class="btn" href="https://godlock.uk/">godlock.uk</a></article>
      <article class="door"><h3>He Didn't Jump</h3><p>A separate public project. It has its own subject. It does not provide HVAC advice, and this site does not describe its findings.</p><a class="btn" href="https://hedidntjump.com/">hedidntjump.com</a></article>
      <article class="door"><h3>Aziel Runtime</h3><p>Source repository and a hosted page. This site does not restate that software’s catalog and does not run it.</p><p><a class="btn" href="https://github.com/AzielEliab/aziel-runtime">Source repository</a></p><p><a class="btn secondary" href="https://aziel-runtime.vibelock.workers.dev/">Hosted page</a></p></article>
      <article class="door"><h3>Time to Unseal the Book</h3><p>A separate public project. It has its own subject. It does not provide HVAC advice, and this site does not describe its findings.</p><a class="btn" href="https://timetounsealthebook.net/">timetounsealthebook.net</a></article>
      <article class="door"><h3>The Furnace Isn't Free</h3><p>Consumer education about HVAC offer structure, quote transparency, and pricing claims. You are here.</p><a class="btn secondary" href="/">Current site</a></article>
    </div>
    <h2>Deploy limits</h2>
    <p>Cap-7 mesh DNS and public ICANN registration are different systems. Paid satellite is HELD. Remain-OFF locks stay off. Mesh tracking stays off. Indexing is unconfirmed. This door is not marked LIVE.</p>
  </article>`
});

pages.push({
  path: "/about/",
  title: "About and contact | The Furnace Isn't Free",
  description:
    "Who publishes this HVAC quote guide, how to ask for a correction, and what the site does not do.",
  body: `<article class="wrap prose">
    <p class="kicker">About</p>
    <h1>About this site</h1>
    <p>The Furnace Isn't Free helps a homeowner read an HVAC offer: equipment, allowance, installation, required modifications, exclusions, and total installed price. It is not a contractor, not a quote, and not a law practice.</p>
    <p>Author: <a href="https://www.azieleliab.com/#aziel">Aziel Eliab</a>. The site is one door in that ecosystem. HVAC pages do not speak for the other projects.</p>
    <h2>What it will not do</h2>
    <ul>
      <li>Name a company from a single example, or accuse a business without a sourced record and review.</li>
      <li>Invent savings, market averages, or a usual labor multiple.</li>
      <li>Decide whether your furnace is safe.</li>
      <li>Publish a submission unless you ask and a documented review agrees. Asking is not enough on its own.</li>
    </ul>
    <h2>Contact, corrections, and business responses</h2>
    <p>Use this form for a correction, a factual response from a business, a privacy request, or a general note. Messages stay private. Nothing you send is placed on the public corrections log automatically.</p>
    <form id="contact-form" class="card">
      <div class="field"><label for="topic">Topic</label>
        <select id="topic" name="topic">
          <option value="general">General</option>
          <option value="correction">Correction</option>
          <option value="business-response">Business response</option>
          <option value="privacy">Privacy or deletion</option>
        </select>
      </div>
      <div class="field"><label for="page">Page you mean, optional</label><input id="page" name="page" autocomplete="off"></div>
      <div class="field"><label for="message">Message</label><textarea id="message" name="message" required></textarea></div>
      <div class="field"><label for="reply">Reply address, optional</label><span class="help">Only if you want a reply. It is stored with the private message.</span><input id="reply" name="reply" autocomplete="email" inputmode="email"></div>
      <button class="btn" type="submit">Send privately</button>
      <p data-contact-status role="status"></p>
    </form>
    <p class="fine">If no forward address is configured, the message waits in this server’s private store. See <a href="/privacy/">privacy</a> and <a href="/corrections/">corrections</a>.</p>
  </article>`
});

pages.push({
  path: "/privacy/",
  title: "Privacy | The Furnace Isn't Free",
  description: "What this HVAC guide stores, what stays private, and how to ask for deletion.",
  body: `<article class="wrap prose">
    <h1>Privacy</h1>
    <p>This page describes the site as built. It is not a claim that a particular host has already turned on every optional store.</p>
    <h2>Page views</h2>
    <p>HTML pages send the path to <code>/count</code>. The counter stores that path and a coarse human/bot class from the user agent. It does not set a cookie and it does not store your address. Totals are public at <a href="/stats/">/stats</a> and <a href="/count">/count</a>.</p>
    <h2>Calculator feedback</h2>
    <p>If you choose yes or no, a receipt stores the time, the tool name, the vote, an optional comment of at most 256 characters, and a snapshot of the calculation. Comments and fields that look like an email, phone number, or long account number are refused. Receipts are not public. Export requires a private token.</p>
    <h2>JPEG uploads</h2>
    <p>Only a JPEG of a written invoice, estimate, or offer is in scope. You must confirm that, and confirm you removed names, addresses, phone numbers, account numbers, signatures, and barcodes. The server checks that the file is a JPEG inside size and shape limits. It does not OCR the picture and does not claim to know that the picture is an invoice beyond your confirmation. Files are private. They are not published because a box was checked.</p>
    <h2>Contact messages</h2>
    <p>The about form stores the message you type and a reply address if you offer one. That record is private.</p>
    <h2>Cookies and other analytics</h2>
    <p>No third-party advertising or analytics script is included. Adding one later would be a separate decision, with consent.</p>
    <h2>Deletion</h2>
    <p>Ask on the <a href="/about/">contact form</a> with the topic Privacy or deletion, and include the receipt id if you have one. Removal depends on the operator being able to read the private store.</p>
    <p class="fine">Reviewed ${REVIEWED}.</p>
  </article>`
});

pages.push({
  path: "/terms/",
  title: "Terms | The Furnace Isn't Free",
  description: "Informational terms for the furnace quote guide and its calculators.",
  body: `<article class="wrap prose">
    <h1>Terms</h1>
    <p>The pages and tools are information. They are not a bid, not an inspection, not legal advice, not tax advice, and not a safety determination. Using a calculator does not create a professional relationship.</p>
    <p>You are responsible for what you type and what you upload. Do not send someone else’s personal details. Arithmetic is only as good as the numbers you enter. Unknown inputs stay unknown on purpose.</p>
    <p>Quotes, model numbers, and prices on the public pages that are marked illustrative are fiction or teaching examples. They are not offers you can accept.</p>
    <p>Governing law is not stated here until the site owner confirms it. That omission is intentional.</p>
    <p class="fine">Reviewed ${REVIEWED}.</p>
  </article>`
});

pages.push({
  path: "/editorial/",
  title: "Editorial disclosure | The Furnace Isn't Free",
  description: "How claims, examples, and corrections are labeled on this HVAC transparency site.",
  body: `<article class="wrap prose">
    <h1>Editorial disclosure</h1>
    <p>Public sentences are either tied to a source or marked as an illustration, a definition, or an inference. “Some examples” is not rewritten as “the industry usually.”</p>
    <p>The site does not call a business fraudulent, deceptive, illegal, or predatory. It criticizes the structure of a claim. It does not rank workers or companies.</p>
    <p>There is no advertising placement and no affiliate offer on these pages. The author is Aziel Eliab. A business may send a factual response through the <a href="/about/">contact form</a>. Public corrections, when any exist, are listed on the <a href="/corrections/">corrections</a> page with the date, the change, the reason, and the prior wording.</p>
    <p class="fine">Reviewed ${REVIEWED}.</p>
  </article>`
});

pages.push({
  path: "/corrections/",
  title: "Corrections | The Furnace Isn't Free",
  description: "Public correction log for The Furnace Isn't Free. No corrections have been issued yet.",
  body: `<article class="wrap prose">
    <h1>Corrections</h1>
    <p>No public correction has been issued.</p>
    <table>
      <thead><tr><th>Date</th><th>Page</th><th>What changed</th><th>Reason</th><th>Prior wording</th></tr></thead>
      <tbody><tr><td colspan="5">None.</td></tr></tbody>
    </table>
    <p>To request a correction or to send a factual response, use the <a href="/about/">contact form</a>. The request is private until a correction is actually published on this page.</p>
    <p class="fine">Log reviewed ${REVIEWED}.</p>
  </article>`
});

pages.push({
  path: "/stats/",
  title: "View and usefulness counts | The Furnace Isn't Free",
  description: "First-party page-view counts and calculator feedback totals for this server.",
  body: `<article class="wrap">
    <h1>Counts</h1>
    <p>These figures are whatever this running server has stored. They are not a measure of the HVAC market, and they are not proof of a production deploy. Human and bot views are split with a user-agent list. The usefulness rate is yes divided by yes plus no. If nobody has voted, the rate is unknown rather than zero percent dressed up as a result.</p>
    <div id="stats-root"><p>Loading counts…</p></div>
    <p class="fine">Machine-readable copies: <a href="/count">/count</a>, <a href="/v1/stats">/v1/stats</a>, <a href="/api/usefulness">/api/usefulness</a>.</p>
  </article>`
});

const notFound = layout({
  path: "/404.html",
  title: "Page not found | The Furnace Isn't Free",
  description: "That address is not a page on this site.",
  robots: "noindex",
  body: `<article class="wrap prose"><h1>Page not found</h1><p>That address is not on this site. The <a href="/">home page</a> lists the guides and tools.</p></article>`
}).replace('data-page="/404.html"', 'data-page="/404.html"');

function fileFor(pagePath) {
  if (pagePath === "/") return path.join(publicDir, "index.html");
  return path.join(publicDir, pagePath.replace(/^\//, ""), "index.html");
}

await mkdir(publicDir, { recursive: true });
for (const page of pages) {
  if (!PATHS.includes(page.path)) throw new Error(`Missing path constant for ${page.path}`);
  const graphs = pageGraph(page);
  const html = layout({
    path: page.path,
    title: page.title,
    description: page.description,
    body: page.body,
    jsonld: JSON.stringify(graphs).replace(/</g, "\\u003c")
  });
  const file = fileFor(page.path);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}

await writeFile(path.join(publicDir, "404.html"), notFound);

const checklistText = `The Furnace Isn't Free — homeowner checklist
Part of the Aziel Eliab ecosystem
Reviewed ${REVIEWED}

Ask for each item in writing. If it is not on the page, it is unknown. Unknown is not zero and it is not "included."

${checklistItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}

This list does not diagnose equipment and it is not a contract review.
We don't name companies. We name what they do.
`;
await mkdir(path.join(publicDir, "checklist"), { recursive: true });
await writeFile(path.join(publicDir, "checklist", "homeowner-checklist.txt"), checklistText);

const urls = PATHS.map((pagePath) => {
  const loc = pagePath === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${pagePath}`;
  const page = pages.find((item) => item.path === pagePath);
  const lastmod = page ? contentDate(page) : REVIEWED;
  const priority = pagePath === "/" ? "1.0" : "0.8";
  return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>${priority}</priority></url>`;
}).join("\n");
await writeFile(
  path.join(publicDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);

const robots = `# The Furnace Isn't Free — open crawl
# Growth-ON: search, AI input, and AI train are allowed.
# Do not treat this file as proof that any index has listed the site.
# Canonical host: ${CANONICAL_ORIGIN}
# Person: https://www.azieleliab.com/#aziel
# IndexNow key file: ${CANONICAL_ORIGIN}/${INDEXNOW_KEY}.txt
# keyLocation is that URL. The key is public by design. This file does not submit URLs and does not confirm indexing.

User-agent: *
Allow: /
Allow: /count
Allow: /v1/count
Allow: /v1/stats
Allow: /stats
Allow: /api/usefulness
Allow: /api/health
Allow: /health
Allow: /version
Allow: /sitemap.xml
Allow: /llms.txt
Allow: /ai.txt
Allow: /cite.json
Allow: /openapi.json
Allow: ${INDEXNOW_PATH}
Disallow: /api/receipts
Disallow: /api/contact

Content-Signal: search=yes, ai-input=yes, ai-train=yes

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: CCBot
Allow: /

User-agent: Applebot
Allow: /

User-agent: Amazonbot
Allow: /

Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml
`;
await writeFile(path.join(publicDir, "robots.txt"), robots);

const llms = `# The Furnace Isn't Free

Author: Aziel Eliab
Person @id: https://www.azieleliab.com/#aziel
Canonical: ${CANONICAL_ORIGIN}/
Alias: https://www.furnaceisntfree.com/ (Worker 301 to ${CANONICAL_ORIGIN}/ when www reaches this script)
When GET or HEAD for www.furnaceisntfree.com reaches this Worker, the script responds 301 to the apex and keeps the path and query. Known HTML aliases such as /aziel fold into that same hop. This describes Worker behavior when www is attached to this script. It is not a Search Console property check, not a crawl confirmation, and not proof that public www is attached. If another route serves www, the 301 does not run.
Subject: HVAC quote transparency, free-furnace promotions, furnace installation cost, repair-or-replace questions.
This site does not name companies. It explains offer structure.
It does not publish industry-average prices. Illustrative dollars are labeled fictional.
It does not decide whether a furnace is safe.

## Pages
${PATHS.map((pagePath) => `- ${pagePath === "/" ? CANONICAL_ORIGIN + "/" : CANONICAL_ORIGIN + pagePath}`).join("\n")}

## Calculator
Blank money inputs stay unknown. Explicit 0 is zero.
Net equipment after allowance = max(0, equipment price − allowance).
Excess allowance above the equipment price is shown separately and is not applied to labor.
Installation and additional = labor + materials/modifications + other required charges.
Incremental installed furnace cost = net equipment after allowance + installation and additional.
Labor-to-equipment ratio = labor ÷ equipment-only price only when equipment-only price > 0.
Package difference = package total − AC-only comparison price, and is not inferred from the other lines.
Fictional example (not a market average): equipment $1,500, allowance $1,500, labor $4,800, materials $900, other charges an explicit $0. Incremental installed furnace cost $5,700. Labor ratio 3.2× in that fiction only.

## Quote comparison
Up to three quotes. Missing fields are flagged. Contractors are not ranked.

## Receipts
POST /api/feedback stores a private usefulness receipt (yes/no, comment ≤ 256 characters, calculation snapshot, optional JPEG).
JPEG path accepts image/jpeg only, with user attestation that the file is a written invoice, estimate, or offer, plus a redaction confirmation.
The site does not OCR uploads.
Corpus forwarding is off until CORPUS_INGEST_URL and CORPUS_INGEST_TOKEN are set. This file does not claim a live corpus write.
GET /count and GET /v1/stats are the page-view counter. GET /stats is that same JSON. The HTML totals page is /stats/.
GET /api/usefulness is the public meter. Comments and images are not in that response.
GET /api/health, GET /health, GET /version, and GET /api/version report the git revision captured when the bundle was built. When Cloudflare version metadata is present they also report that Worker version id. deployed is true only on ${CANONICAL_HOST} when a real version id is present. Indexing stays unconfirmed. These routes do not ping IndexNow.

## IndexNow
Public key file: ${CANONICAL_ORIGIN}/${INDEXNOW_KEY}.txt
The file body is the key. The Worker serves it as text/plain. Bing, Yandex, Seznam, and Naver can use that file to accept a later ping. This site does not call IndexNow and does not submit URLs. Indexing remains unconfirmed.

## Limits
Cap-7 mesh DNS and public ICANN registration are different systems. Paid satellite is HELD. Remain-OFF locks stay off. Mesh tracking stays off. Indexing is unconfirmed. This file is not a LIVE claim.

## Sister doors
Official cross-chain sister handles linked from /aziel. A link is not a deployment claim and not a catalog.
- https://www.azieleliab.com/
- https://azielcorpuslibrary.net/
- https://godlock.uk/
- https://hedidntjump.com/
- https://github.com/AzielEliab/aziel-runtime
- https://aziel-runtime.vibelock.workers.dev/
- https://timetounsealthebook.net/
- ${CANONICAL_ORIGIN}/

Indexing is requested. This document does not assert that any search engine has indexed the host.
`;
await writeFile(path.join(publicDir, "llms.txt"), llms);
await writeFile(path.join(publicDir, "ai.txt"), llms);

const cite = {
  author: "Aziel Eliab",
  author_id: "https://www.azieleliab.com/#aziel",
  person_id: "https://www.azieleliab.com/#aziel",
  site: `${CANONICAL_ORIGIN}/`,
  canonical: `${CANONICAL_ORIGIN}/`,
  alias: "https://www.furnaceisntfree.com/",
  title: "The Furnace Isn't Free",
  about: "Homeowner education on HVAC offer structure, furnace allowances, and quote transparency.",
  person: {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: "Aziel Eliab",
    url: "https://www.azieleliab.com/",
    sameAs: PERSON_SAME_AS,
    subjectOf: SISTER_SUBJECTS
  },
  work: {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: "The Furnace Isn't Free",
    url: `${CANONICAL_ORIGIN}/`,
    publisher: { "@id": PERSON_ID }
  },
  reviewed: REVIEWED,
  note: "One project in the Aziel Eliab ecosystem. This file does not restate other projects' catalogs, and it does not claim production DNS is live."
};
await writeFile(path.join(publicDir, "cite.json"), JSON.stringify(cite, null, 2) + "\n");

const openapi = {
  openapi: "3.1.0",
  info: {
    title: "The Furnace Isn't Free",
    version: "1.0.0",
    summary: "Page-view counter, usefulness receipts, and private offer notes.",
    description:
      "Public reads are counts only. Receipt export and private JPEGs require RECEIPT_READ_TOKEN. This document does not mean the production domain is deployed."
  },
  servers: [{ url: CANONICAL_ORIGIN }, { url: "http://127.0.0.1:43127" }],
  paths: {
    "/count": {
      get: { summary: "Read page-view totals", responses: { 200: { description: "View totals" } } },
      post: { summary: "Count one known HTML path", responses: { 200: { description: "Counted" } } }
    },
    "/v1/count": { get: { summary: "Alias of GET /count", responses: { 200: { description: "View totals" } } } },
    "/v1/stats": { get: { summary: "Alias of the view counter JSON", responses: { 200: { description: "View totals" } } } },
    "/stats": {
      get: { summary: "View counter JSON. The human page is /stats/", responses: { 200: { description: "View totals" } } }
    },
    "/api/usefulness": { get: { summary: "Public usefulness meter", responses: { 200: { description: "Aggregates" } } } },
    "/api/feedback": {
      post: { summary: "Store a private usefulness receipt and optional JPEG", responses: { 200: { description: "Receipt id" } } }
    },
    "/api/receipts": {
      get: { summary: "Private receipt export", responses: { 401: { description: "Token required" } } }
    },
    "/api/health": {
      get: {
        summary: "Git revision captured at build, plus the Cloudflare version id when that binding is present. Indexing stays unconfirmed.",
        responses: { 200: { description: "Health" } }
      }
    },
    "/health": { get: { summary: "Alias of GET /api/health", responses: { 200: { description: "Health" } } } },
    "/version": { get: { summary: "Alias of GET /api/health", responses: { 200: { description: "Health" } } } },
    "/api/version": { get: { summary: "Alias of GET /api/health", responses: { 200: { description: "Health" } } } },
    [INDEXNOW_PATH]: {
      get: {
        summary: "IndexNow key file. Public by design. Does not submit URLs.",
        responses: { 200: { description: "text/plain key" } }
      }
    },
    "/api/contact": { post: { summary: "Private contact message", responses: { 200: { description: "Stored" } } } }
  }
};
await writeFile(path.join(publicDir, "openapi.json"), JSON.stringify(openapi, null, 2) + "\n");
await writeFile(path.join(publicDir, INDEXNOW_FILENAME), INDEXNOW_KEY);
await writeSocialCard(path.join(publicDir, "images", "social-card.png"));

console.log(`Rendered ${pages.length} pages into ${publicDir}`);
