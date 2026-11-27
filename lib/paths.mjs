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

/** /doors is the ecosystem tab. Both forms land on /aziel/ in one hop. */
const DOOR_REDIRECTS = new Map([
  ["/doors", "/aziel/"],
  ["/doors/", "/aziel/"]
]);

/** Canonical RSS document. Conventional aliases fold here in the same hop as www. */
export const FEED_PATH = "/rss.xml";

const FEED_ALIASES = new Map([
  ["/rss", FEED_PATH],
  ["/rss/", FEED_PATH],
  ["/feed", FEED_PATH],
  ["/feed/", FEED_PATH],
  ["/feed.xml", FEED_PATH]
]);

function htmlAliasTarget(pathname) {
  if (DOOR_REDIRECTS.has(pathname)) return DOOR_REDIRECTS.get(pathname);
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

function unsafePath(pathname) {
  return pathname.includes("//") || pathname.includes("\\") || /%5c/i.test(pathname);
}

/** www, a trailing dot, or a workers.dev preview. The apex itself is not folded. */
function hostFoldsToApex(hostname) {
  const host = String(hostname || "").toLowerCase();
  const bare = host.replace(/\.+$/, "");
  if (host !== bare) return true;
  if (bare === ALIAS_HOST) return true;
  return bare.endsWith(".workers.dev");
}

/** Preview health and the counter stay on workers.dev. deployed is false there. */
const WORKERS_DIRECT = new Set([
  "/api/health",
  "/health",
  "/version",
  "/api/version",
  "/count",
  "/v1/count"
]);

function workersDevServesDirect(hostname, pathname) {
  const bare = String(hostname || "").toLowerCase().replace(/\.+$/, "");
  return bare.endsWith(".workers.dev") && WORKERS_DIRECT.has(pathname);
}

/**
 * GET and HEAD only. POST and other methods are left untouched so request bodies are not dropped.
 * Every Location is https://furnaceisntfree.com plus the canonical path and query.
 * The request host, scheme, and a trailing dot are not copied.
 * //, backslash, and %5C paths are not redirected.
 */
export function canonicalRedirectUrl(requestUrl, method) {
  const verb = String(method || "GET").toUpperCase();
  if (verb !== "GET" && verb !== "HEAD") return null;
  let url;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (unsafePath(url.pathname)) return null;
  const alias = FEED_ALIASES.get(url.pathname) || htmlAliasTarget(url.pathname);
  if (!alias && workersDevServesDirect(url.hostname, url.pathname)) return null;
  const targetPath = alias || url.pathname;
  if (!alias && !hostFoldsToApex(url.hostname)) return null;
  const location = `${CANONICAL_ORIGIN}${targetPath}${url.search}`;
  return location === url.href ? null : location;
}

/**
 * Local requests carry a path, not a trusted Host. X-Forwarded-Host is ignored.
 * Protocol-relative, backslash, and %5C targets are not turned into a redirect.
 */
export function localRedirectUrl(reqUrl, method) {
  if (typeof reqUrl !== "string" || reqUrl.startsWith("//")) return null;
  if (reqUrl.includes("\\") || /%5c/i.test(reqUrl)) return null;
  let parsed;
  try {
    parsed = reqUrl.startsWith("/") ? new URL(reqUrl, CANONICAL_ORIGIN) : new URL(reqUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return canonicalRedirectUrl(parsed.href, method);
}
