import { GENERATED_BUILD } from "./build.generated.mjs";
import { CANONICAL_HOST } from "./paths.mjs";

export const PRODUCT = "the-furnace-isnt-free";

const SHA40 = /^[0-9a-f]{40}$/;
const VERSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const PROVENANCE_NOTE =
  "source_base_tip is the git commit captured when this bundle was built (git rev-parse HEAD, otherwise WORKERS_CI_COMMIT_SHA, CF_PAGES_COMMIT_SHA, or a 40-hex SOURCE_BASE_TIP). It is not a hand-edited constant. noted_vid is the first 8 hex characters of the Cloudflare Worker version id from the version metadata binding, and cloudflare_version_id is that full id. Both are null when the binding is missing or the id is not a deployed version UUID. CF-Ray is a per-request id and is not a version. deployed is true only when that version id is present and the request host is furnaceisntfree.com. On 2026-11-06 production health reported source_base_tip_short d47caa6d and noted_vid 6a781b04. Earlier Cos label 472bb7c4 / 87b12512 is not that response and is not live. indexing is unconfirmed. This response does not submit IndexNow, does not enable mesh tracking, and does not claim LIVE indexing.";

function hostnameOf(requestUrl) {
  try {
    return new URL(requestUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function versionMetadata(env) {
  const meta = env && typeof env.CF_VERSION_METADATA === "object" ? env.CF_VERSION_METADATA : null;
  if (!meta) return null;
  const id = typeof meta.id === "string" ? meta.id.trim().toLowerCase() : "";
  if (!VERSION_UUID.test(id)) return null;
  const tag = typeof meta.tag === "string" ? meta.tag.trim() : "";
  return { id, tag };
}

/**
 * @param {Record<string, unknown>} [env]
 * @param {string} [requestUrl]
 */
export function resolveProvenance(env = {}, requestUrl = "") {
  const override = String(env.SOURCE_BASE_TIP || "").trim().toLowerCase();
  const fromEnv = SHA40.test(override);
  const generated = String(GENERATED_BUILD.source_base_tip || "").trim().toLowerCase();
  const tip = fromEnv ? override : generated;
  const tipOk = SHA40.test(tip);
  const version = versionMetadata(env);
  const onApex = hostnameOf(requestUrl) === CANONICAL_HOST;
  return {
    product: PRODUCT,
    build_id: tipOk ? `furnace-${tip.slice(0, 12)}` : "furnace-unknown",
    source_base_tip: tipOk ? tip : null,
    source_base_tip_short: tipOk ? tip.slice(0, 8) : null,
    source_captured: fromEnv ? "env.SOURCE_BASE_TIP" : GENERATED_BUILD.captured || "missing",
    noted_vid: version ? version.id.slice(0, 8) : null,
    cloudflare_version_id: version ? version.id : null,
    cloudflare_version_tag: version && version.tag ? version.tag : null,
    deployed: Boolean(version && onApex),
    indexing: "unconfirmed",
    note: PROVENANCE_NOTE
  };
}
