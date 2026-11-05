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
