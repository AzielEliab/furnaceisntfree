# Environment

No variable is required to run `npm start` or `npm test`. Secrets stay empty until the owner supplies them. Do not commit `.dev.vars`.

| Name | Where | Required | Purpose |
| --- | --- | --- | --- |
| `PORT` | Local Node only | No | Listen port. Default `43127`. |
| `HOST` | Local Node only | No | Bind address. Default `0.0.0.0`. |
| `CANONICAL_ORIGIN` | Worker var and local env | No | Defaults to `https://furnaceisntfree.com`. Used in receipt URLs. `www.furnaceisntfree.com` redirects to this origin. |
| `SITE_KV` | Cloudflare KV binding | For durable counts | Page views, receipt index, usefulness totals. Not a string secret. |
| `UPLOADS` | Cloudflare R2 binding | For private JPEGs in production | Invoice/estimate/offer bytes. Keep the bucket private. |
| `RECEIPT_READ_TOKEN` | Secret | To export receipts | `Authorization: Bearer` for `GET /api/receipts` and `GET /api/receipts/{id}/image`. If unset, export stays 401. |
| `CORPUS_INGEST_URL` | Secret or var | No | Owner-supplied azielcorpuslibrary.net ingest URL. Empty means no outbound write. |
| `CORPUS_INGEST_TOKEN` | Secret | With the URL | Bearer token for that URL. If the URL is set and the token is not, status is `token_missing` and nothing is sent. |
| `CORPUS_FORWARD_IMAGES` | Var | No | `true` attaches JPEG bytes to the corpus payload. Default `false` (hash and size only). |
| `CONTACT_FORWARD_URL` | Secret or var | No | Optional forward for the private contact form. |
| `CONTACT_FORWARD_TOKEN` | Secret | With the URL | Bearer token for the contact forward. |

Wrangler preview reads `.dev.vars`. Production secrets should be set with `wrangler secret put`, not committed.

Local files:

- `data/json/` — view totals, receipts, contact messages
- `data/private-uploads/` — JPEG bytes, not served as static files
