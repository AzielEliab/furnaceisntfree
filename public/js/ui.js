import {
  FICTIONAL_EXAMPLE,
  FORMULAS,
  QUOTE_FIELDS,
  analyzeQuotes,
  buildRepairQuestions,
  calculateOffer,
  discountCheck,
  displayValue,
  formatUsd,
  gateJpeg,
  jpegRefuseCopy,
  parseMoney
} from "./engine.js";

const nav = document.querySelector("#site-nav");
const toggle = document.querySelector(".nav-toggle");
const closeBtn = document.querySelector(".nav-close");
const backdrop = document.querySelector(".nav-backdrop");

function setNav(open) {
  if (!nav || !toggle) return;
  nav.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (backdrop) backdrop.classList.toggle("is-open", open);
  nav.setAttribute("aria-hidden", open ? "false" : window.matchMedia("(max-width: 860px)").matches ? "true" : "false");
  if (open) closeBtn?.focus();
}

toggle?.addEventListener("click", () => setNav(!nav.classList.contains("is-open")));
closeBtn?.addEventListener("click", () => {
  setNav(false);
  toggle?.focus();
});
backdrop?.addEventListener("click", () => {
  setNav(false);
  toggle?.focus();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav?.classList.contains("is-open")) {
    setNav(false);
    toggle?.focus();
  }
  if (event.key !== "Tab" || !nav?.classList.contains("is-open")) return;
  const nodes = [...nav.querySelectorAll("a, button")].filter((el) => !el.hasAttribute("disabled"));
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

const page = document.body.dataset.page || location.pathname;
fetch("/count", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ path: page }),
  keepalive: true
}).catch(() => {});

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function readInputs(form) {
  const data = {};
  for (const input of form.querySelectorAll("[data-input]")) {
    if (input.type === "checkbox") {
      data[input.dataset.input] = data[input.dataset.input] || [];
      if (input.checked) data[input.dataset.input].push(input.value);
    } else {
      data[input.dataset.input] = input.value;
    }
  }
  return data;
}

function line(parent, label, value, formula) {
  const item = el("li");
  const name = el("strong", "", `${label}: `);
  const val = el("span", value === "unknown" || value === "not defined" ? "unknown money" : "money", value);
  item.append(name, val);
  if (formula) item.append(el("div", "fine", formula));
  parent.append(item);
}

function paintMeter(node, data) {
  node.replaceChildren();
  const bits = [
    ["Receipts", String(data.receipts ?? 0)],
    ["Useful — yes", String(data.useful_yes ?? 0)],
    ["Useful — no", String(data.useful_no ?? 0)],
    ["Rate", data.useful_rate === null || data.useful_rate === undefined ? "unknown" : `${Math.round(data.useful_rate * 1000) / 10}%`],
    ["With a JPEG", String(data.with_image ?? 0)]
  ];
  for (const [label, value] of bits) {
    const card = el("div");
    card.append(el("span", "fine", label), el("strong", "", value));
    node.append(card);
  }
  node.append(el("p", "fine", data.label || ""));
  if (data.useful_rate_basis) node.append(el("p", "fine", data.useful_rate_basis));
}

async function loadMeters() {
  const nodes = document.querySelectorAll("[data-meter]");
  if (!nodes.length) return;
  try {
    const response = await fetch("/api/usefulness");
    const data = await response.json();
    nodes.forEach((node) => paintMeter(node, data));
  } catch {
    nodes.forEach((node) => {
      node.textContent = "The usefulness counts could not be loaded from this server.";
    });
  }
}

function bindFeedback(form, getSnapshot) {
  const comment = form.querySelector("[data-comment]");
  const count = form.querySelector("[data-count]");
  const status = form.querySelector("[data-feedback-status]");
  const file = form.querySelector("[data-jpeg]");
  comment?.addEventListener("input", () => {
    if (comment.value.length > 256) comment.value = comment.value.slice(0, 256);
    if (count) count.textContent = `${comment.value.length} / 256`;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Sending…";
    const vote = form.querySelector("input[name='useful']:checked");
    const payload = {
      tool: form.dataset.tool,
      useful: vote ? vote.value === "yes" : null,
      comment: comment ? comment.value : "",
      publish_consent: false,
      review_requested: Boolean(form.querySelector("[data-review]")?.checked),
      inputs: getSnapshot()
    };
    if (file?.files?.[0]) {
      const chosen = file.files[0];
      const name = chosen.name.toLowerCase();
      const typeOk = chosen.type === "image/jpeg" || chosen.type === "image/jpg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
      if (!typeOk || (chosen.type && chosen.type !== "image/jpeg" && chosen.type !== "image/jpg")) {
        status.textContent = jpegRefuseCopy();
        return;
      }
      if (!form.querySelector("[data-attest]")?.checked || !form.querySelector("[data-redact]")?.checked) {
        status.textContent = "Before a JPEG is accepted, confirm it is your written invoice, estimate, or offer, and confirm you redacted personal details.";
        return;
      }
      const bytes = new Uint8Array(await chosen.arrayBuffer());
      const gated = gateJpeg(bytes);
      if (!gated.ok) {
        status.textContent = gated.message;
        return;
      }
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      payload.jpeg_base64 = btoa(binary);
      payload.attestation = true;
      payload.redaction_confirmed = true;
    }
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        status.textContent = data.error || "The receipt was not saved.";
        return;
      }
      const parts = [
        `Saved privately as ${data.id}.`,
        `Content hash ${data.content_sha256}.`,
        "It is not published."
      ];
      if (data.image_stored) parts.push("The JPEG is stored privately and was not read by OCR.");
      if (data.corpus_status === "not_configured") {
        parts.push("Corpus handoff is not configured on this server.");
      } else if (data.corpus_status === "forwarded") {
        parts.push("A copy was forwarded to the configured corpus endpoint.");
      } else if (data.corpus_status === "forward_failed" || data.corpus_status === "token_missing") {
        parts.push(`Corpus handoff: ${data.corpus_status}. The local receipt is still saved.`);
      }
      if (payload.review_requested) {
      parts.push("You asked for a possible public review. The file is still not published.");
    }
    status.textContent = parts.join(" ");
      loadMeters();
    } catch {
      status.textContent = "The receipt could not be sent. Check the connection and try again.";
    }
  });
}

function enableFeedback(selector) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.hidden = false;
  form.querySelectorAll("button, input, textarea").forEach((node) => {
    node.disabled = false;
  });
}

const calcForm = document.querySelector("#calculator");
if (calcForm) {
  const out = document.querySelector("#calc-results");
  const render = () => {
    const inputs = readInputs(calcForm);
    inputs.calculatedAt = new Date().toISOString();
    const result = calculateOffer(inputs);
    out.replaceChildren();
    const fictional = calcForm.dataset.fictional === "true";
    if (fictional) {
      out.append(el("p", "label", "Fictional worked example — not a market average"));
      out.append(el("p", "", FICTIONAL_EXAMPLE.note));
    }
    out.append(el("p", "fine", `Calculated ${inputs.calculatedAt}. Figures below use only what is in the boxes.`));
    if (result.invalidFields.length) {
      out.append(el("p", "", "One or more boxes are not usable numbers. Those lines stay unresolved. A blank box is unknown, not zero."));
    }
    const list = el("ul", "flags");
    line(list, "Net equipment after allowance", displayValue(result.net, "usd"), FORMULAS.net);
    line(list, "Excess credit", displayValue(result.excess, "usd"), FORMULAS.excess);
    line(list, "Installation and additional", displayValue(result.install, "usd"), FORMULAS.install);
    line(list, "Incremental installed furnace cost", displayValue(result.incremental, "usd"), FORMULAS.incremental);
    line(list, "Labor-to-equipment ratio", displayValue(result.ratio, "ratio"), FORMULAS.ratio);
    line(list, "Package versus alternative", displayValue(result.packageGap, "usd"), FORMULAS.packageGap);
    out.append(list);
    if (result.excess.state === "known" && result.excess.value > 0) {
      out.append(
        el(
          "p",
          "",
          `The allowance is ${formatUsd(result.excess.value)} above the equipment price. That excess stays on its own line. It is not subtracted from labor unless a written offer says the credit applies there.`
        )
      );
    }
    const figure = out.querySelector(".money");
    if (result.incremental.state === "known") {
      const big = el("p", "big-figure", displayValue(result.incremental, "usd"));
      big.prepend(el("span", "fine", "Incremental installed furnace cost "));
      out.prepend(big);
    }
    enableFeedback("#calc-feedback");
    return inputs;
  };
  calcForm.addEventListener("submit", (event) => {
    event.preventDefault();
    calcForm.dataset.fictional = "false";
    render();
  });
  calcForm.querySelector("[data-example]")?.addEventListener("click", () => {
    for (const [key, value] of Object.entries(FICTIONAL_EXAMPLE)) {
      const input = calcForm.querySelector(`[data-input="${key}"]`);
      if (input) input.value = value;
    }
    calcForm.dataset.fictional = "true";
    render();
  });
  bindFeedback(document.querySelector("#calc-feedback"), () => {
    const inputs = readInputs(calcForm);
    inputs.fictionalExample = calcForm.dataset.fictional === "true";
    inputs.calculatedAt = new Date().toISOString();
    return inputs;
  });
}

const compareRoot = document.querySelector("#workspace");
if (compareRoot) {
  const summary = document.querySelector("#compare-summary");
  const readQuotes = () =>
    [...compareRoot.querySelectorAll("[data-quote]")].map((card) => {
      const quote = {};
      for (const input of card.querySelectorAll("[data-field]")) quote[input.dataset.field] = input.value;
      return quote;
    });
  const render = () => {
    const analysis = analyzeQuotes(readQuotes());
    summary.replaceChildren();
    summary.append(el("h3", "", "Scope check"));
    summary.append(el("p", "", analysis.note));
    summary.append(el("p", "fine", `Quotes with any detail: ${analysis.activeCount}. Winner: none. Ranking: none.`));
    const list = el("ul", "flags");
    for (const row of analysis.missing) {
      if (!row.fields.length) continue;
      const names = row.fields.map((key) => QUOTE_FIELDS.find((field) => field.key === key)?.label || key);
      const item = el("li", "", `${row.label} is missing: ${names.join("; ")}. Missing is not zero.`);
      list.append(item);
    }
    for (const flag of analysis.flags) list.append(el("li", "", flag.text));
    summary.append(list);
    enableFeedback("#compare-feedback");
    return analysis;
  };
  document.querySelector("#compare-run")?.addEventListener("click", render);
  document.querySelector("#compare-print")?.addEventListener("click", () => {
    render();
    window.print();
  });
  document.querySelector("#compare-download")?.addEventListener("click", () => {
    const quotes = readQuotes();
    const analysis = render();
    const lines = [
      "The Furnace Isn't Free — quote comparison",
      "User-entered information. Unknowns were left blank and are listed as missing.",
      "This file does not rank contractors.",
      ""
    ];
    quotes.forEach((quote, index) => {
      lines.push(`Quote ${index + 1}`);
      for (const field of QUOTE_FIELDS) {
        const value = String(quote[field.key] || "").trim();
        lines.push(`- ${field.label}: ${value || "unknown"}`);
      }
      lines.push("");
    });
    lines.push("Flags");
    for (const row of analysis.missing) {
      lines.push(`- ${row.label} missing: ${row.fields.length ? row.fields.join(", ") : "none of the tracked fields"}`);
    }
    for (const flag of analysis.flags) lines.push(`- ${flag.text}`);
    lines.push("", analysis.note);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "quote-comparison.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  });
  bindFeedback(document.querySelector("#compare-feedback"), () => ({ quotes: readQuotes() }));
}

const discountForm = document.querySelector("#discount-tool");
if (discountForm) {
  const out = document.querySelector("#discount-results");
  const render = () => {
    const inputs = readInputs(discountForm);
    const result = discountCheck(inputs);
    out.replaceChildren();
    out.append(el("p", "", result.note));
    const list = el("ul", "flags");
    line(list, "Difference from the stated reference", displayValue(result.gap, "usd"), "Promotional price subtracted from the reference price you entered. Not a verified saving.");
    line(list, "Share of the stated reference", displayValue(result.percent, "percent"), "Calculated only when the reference price is greater than zero.");
    out.append(list);
    const flags = el("ul", "flags");
    for (const flag of result.flags) flags.append(el("li", "", flag));
    out.append(flags);
    out.append(el("p", "fine", "Verdict: none. This tool does not call an offer deceptive."));
    enableFeedback("#discount-feedback");
    return inputs;
  };
  discountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });
  bindFeedback(document.querySelector("#discount-feedback"), () => readInputs(discountForm));
}

const repairForm = document.querySelector("#repair-tool");
if (repairForm) {
  const out = document.querySelector("#repair-results");
  repairForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const inputs = readInputs(repairForm);
    const result = buildRepairQuestions(inputs);
    out.replaceChildren();
    out.append(el("p", "", result.note));
    out.append(el("p", "label warn", "No safety determination"));
    const list = el("ol", "flags");
    for (const question of result.questions) {
      const item = el("li");
      item.append(el("div", "", question.text));
      item.append(el("div", "fine", question.why));
      list.append(item);
    }
    out.append(list);
    enableFeedback("#repair-feedback");
  });
  bindFeedback(document.querySelector("#repair-feedback"), () => readInputs(repairForm));
}

const latticeForm = document.querySelector("#lattice-tool");
if (latticeForm) {
  const out = document.querySelector("#lattice-results");
  latticeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const inputs = readInputs(latticeForm);
    out.replaceChildren();
    out.append(el("h3", "", "Evidence map"));
    out.append(el("p", "", "This is a map of the claim you typed. It is not a verdict and it does not name a business."));
    const rows = [
      ["Claim", inputs.claim],
      ["Reference", inputs.reference],
      ["Conditions", inputs.conditions],
      ["Total", inputs.total],
      ["Verification", inputs.verification]
    ];
    const list = el("ul", "flags");
    for (const [label, value] of rows) {
      list.append(el("li", "", `${label}: ${String(value || "").trim() || "unknown"}`));
    }
    out.append(list);
    enableFeedback("#lattice-feedback");
  });
  bindFeedback(document.querySelector("#lattice-feedback"), () => readInputs(latticeForm));
}

const submitForm = document.querySelector("#submit-form");
if (submitForm) {
  bindFeedback(submitForm, () => readInputs(submitForm));
  const comment = submitForm.querySelector("[data-comment]");
  const count = submitForm.querySelector("[data-count]");
  comment?.addEventListener("input", () => {
    if (count) count.textContent = `${comment.value.length} / 256`;
  });
}

const contactForm = document.querySelector("#contact-form");
if (contactForm) {
  const status = contactForm.querySelector("[data-contact-status]");
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Sending…";
    const payload = {
      topic: contactForm.querySelector("[name='topic']").value,
      message: contactForm.querySelector("[name='message']").value,
      reply: contactForm.querySelector("[name='reply']").value,
      page: contactForm.querySelector("[name='page']").value
    };
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      status.textContent = data.ok
        ? `${data.note} Reference ${data.id}. Forward status: ${data.forward}.`
        : data.error || "The message was not saved.";
    } catch {
      status.textContent = "The message could not be sent.";
    }
  });
}

const statsRoot = document.querySelector("#stats-root");
if (statsRoot) {
  Promise.all([fetch("/count").then((res) => res.json()), fetch("/api/usefulness").then((res) => res.json())])
    .then(([views, meter]) => {
      statsRoot.replaceChildren();
      statsRoot.append(el("h2", "", "Page views"));
      statsRoot.append(
        el(
          "p",
          "",
          `${views.views} total views on this server (${views.views_human} classed human, ${views.views_bot} classed bot). ${views.note}`
        )
      );
      const paths = el("ul", "flags");
      for (const [key, value] of Object.entries(views.by_path || {})) {
        paths.append(el("li", "", `${key}: ${value.human} human, ${value.bot} bot`));
      }
      if (!Object.keys(views.by_path || {}).length) paths.append(el("li", "", "No page views stored yet."));
      statsRoot.append(paths);
      statsRoot.append(el("h2", "", "Usefulness"));
      const meterNode = el("div", "meter");
      statsRoot.append(meterNode);
      paintMeter(meterNode, meter);
    })
    .catch(() => {
      statsRoot.textContent = "Stats could not be loaded.";
    });
}

document.querySelector("[data-print-page]")?.addEventListener("click", () => window.print());

loadMeters();

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("input", () => {
    for (const input of form.querySelectorAll("input, textarea, select")) {
      if (input.type === "file" || input.type === "checkbox" || input.type === "radio") continue;
      const money = input.dataset.money === "true";
      if (!money) continue;
      const parsed = parseMoney(input.value);
      input.setAttribute("aria-invalid", parsed.state === "invalid" ? "true" : "false");
    }
  });
});
