/** Canonical public origin. www.furnaceisntfree.com is an alias and should redirect here. */
export const CANONICAL_ORIGIN = "https://furnaceisntfree.com";
export const CANONICAL_HOST = "furnaceisntfree.com";
export const ALIAS_HOST = "www.furnaceisntfree.com";

export const SITE_NAME = "The Furnace Isn't Free";

/** HTML routes. Trailing slash except the apex, which is "/". */
export const PATHS = [
  "/",
  "/how-the-offer-works/",
  "/the-numbers/",
  "/compare-quotes/",
  "/checklist/",
  "/repair-or-replace/",
  "/discount-reality-check/",
  "/evidence/",
  "/submit/",
  "/aziel/",
  "/about/",
  "/privacy/",
  "/terms/",
  "/editorial/",
  "/corrections/",
  "/stats/"
];

export const TOOL_PATHS = {
  "free-meaning": "/the-numbers/",
  "quote-compare": "/compare-quotes/",
  "discount-check": "/discount-reality-check/",
  "repair-questions": "/repair-or-replace/",
  lattice: "/evidence/",
  "submit-offer": "/submit/"
};

export const TOOLS = Object.keys(TOOL_PATHS);

export function normalizePagePath(input) {
  if (typeof input !== "string") return null;
  let path = input.split("#")[0].split("?")[0].trim();
  if (!path.startsWith("/")) return null;
  if (path.includes("..") || path.includes("//") || path.includes("\\")) return null;
  if (path.length > 1 && path.endsWith("/")) {
    /* keep */
  } else if (path !== "/") {
    path += "/";
  }
  return PATHS.includes(path) ? path : null;
}

/**
 * Extensionless aliases of known HTML pages.
 * `/stats` is the public JSON counter and is intentionally absent.
 * Keys are the request path. Values are the permanent HTML path.
 */
export const CANONICAL_HTML_PATH = new Map(
  PATHS.filter((pagePath) => pagePath.length > 1 && pagePath !== "/stats/").map((pagePath) => [
    pagePath.slice(0, -1),
    pagePath
  ])
);

function htmlAliasTarget(pathname) {
  if (
    pathname === "/stats" ||
    pathname === "/count" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/v1/")
  ) {
    return null;
  }
  return CANONICAL_HTML_PATH.get(pathname) || null;
}

/**
 * GET and HEAD only. Hostname and a known HTML alias fold into one 301.
 * POST and other methods are left untouched so request bodies are not dropped.
 */
export function canonicalRedirectUrl(requestUrl, method) {
  const verb = String(method || "GET").toUpperCase();
  if (verb !== "GET" && verb !== "HEAD") return null;
  const url = new URL(requestUrl);
  const before = url.href;
  if (url.hostname.toLowerCase() === ALIAS_HOST) {
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
  }
  const alias = htmlAliasTarget(url.pathname);
  if (alias) url.pathname = alias;
  return url.href === before ? null : url.href;
}
