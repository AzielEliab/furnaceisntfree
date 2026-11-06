# Environment

No variable is required to run `npm start` or `npm test`. Secrets stay empty until the owner supplies them. Do not commit `.dev.vars`.

| Name | Where | Required | Purpose |
| --- | --- | --- | --- |
| `PORT` | Local Node only | No | Listen port. Default `43127`. |
| `HOST` | Local Node only | No | Bind address. Default `0.0.0.0`. |
| `CANONICAL_ORIGIN` | Worker var and local env | No | Defaults to `https://furnaceisntfree.com`. Used in receipt URLs. GET and HEAD on `www.furnaceisntfree.com` 301 to this origin when the Worker receives the request. |
| `SITE_KV` | Cloudflare KV binding | For durable counts | Page views, receipt index, usefulness totals. Not a string secret. |
| `UPLOADS` | Cloudflare R2 binding | For private JPEGs in production | Invoice/estimate/offer bytes. Keep the bucket private. |
| `RECEIPT_READ_TOKEN` | Secret | To export receipts | `Authorization: Bearer` for `GET /api/receipts` and `GET /api/receipts/{id}/image`. If unset, export stays 401. |
| `CORPUS_INGEST_URL` | Secret or var | No | Owner-supplied azielcorpuslibrary.net ingest URL. Empty means no outbound write. |
| `CORPUS_INGEST_TOKEN` | Secret | With the URL | Bearer token for that URL. If the URL is set and the token is not, status is `token_missing` and nothing is sent. |
| `CORPUS_FORWARD_IMAGES` | Var | No | `true` attaches JPEG bytes to the corpus payload. Default `false` (hash and size only). |
| `CONTACT_FORWARD_URL` | Secret or var | No | Optional forward for the private contact form. |
| `CONTACT_FORWARD_TOKEN` | Secret | With the URL | Bearer token for the contact forward. |
| `SOURCE_BASE_TIP` | Worker var, empty in git | No | Runtime override for the git SHA reported by `/api/health`. Used only when the value is 40 hex characters. The empty placeholder in `wrangler.toml` is ignored. Do not commit a SHA. |
| `CF_VERSION_METADATA` | Version metadata binding | On Cloudflare | Worker version id, tag, and timestamp. `noted_vid` is the first 8 hex characters of that id. `CF-Ray` is not this id. |

Wrangler preview reads `.dev.vars`. Production secrets should be set with `wrangler secret put`, not committed.

`/api/health`, `/health`, `/version`, and `/api/version` read the commit captured by `scripts/write-build-provenance.mjs` when the bundle is built. `npm test`, `npm run build`, and `wrangler deploy` run that script. It prefers `git rev-parse HEAD`, then `WORKERS_CI_COMMIT_SHA`, then `CF_PAGES_COMMIT_SHA`, then a 40-hex `SOURCE_BASE_TIP` in the build environment. `lib/build.generated.mjs` is gitignored so a committed SHA cannot go stale. `deployed` is true only when the version metadata id is a UUID and the request host is `furnaceisntfree.com`. Indexing stays `unconfirmed`. The IndexNow key file is `https://furnaceisntfree.com/80eed0a6b524a05bdf7b07e287f6d12a.txt`. Nothing in this repository calls IndexNow.

HTTPS responses from the Worker send `Strict-Transport-Security: max-age=31536000`. The header does not include `includeSubDomains` or `preload`.

`www.furnaceisntfree.com` reaches that 301 only if this Worker is the script for that hostname. `run_worker_first` is true so the script sees the Host before static assets. The custom-domain routes in `wrangler.toml` stay commented. Attaching the www hostname is a Cloudflare zone bind. This repository cannot do that bind, and it does not deploy.

Local files:

- `data/json/` — view totals, receipts, contact messages
- `data/private-uploads/` — JPEG bytes, not served as static files
