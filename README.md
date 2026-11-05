# The Furnace Isn't Free

Homeowner guide to HVAC offer structure: what a “free furnace” allowance covers, what installation still costs, and how to compare written quotes without ranking contractors.

Canonical host used in code and metadata: `https://furnaceisntfree.com`. `www.furnaceisntfree.com` is an alias. GET and HEAD 301 to the apex in one hop when this Worker receives the request, including a trailing slash on known HTML pages. The Worker runs before static assets so that redirect is not skipped. The www custom domain stays commented in `wrangler.toml`. Attaching that hostname is a Cloudflare bind, not something this repository can finish, and this tree does not deploy.

## Run locally

```bash
npm test
npm start
```

`npm start` renders the pages and serves them at `http://127.0.0.1:43127` (override with `PORT`). No API keys are required. Page views and private receipts are stored under `data/`, which is gitignored.

## Build

```bash
npm run build
```

Static files land in `public/`. Logic shared by the browser and the server is in `public/js/engine.js`.

## Deploy

Preferred host is Cloudflare Workers with static assets, matching the other Aziel Eliab hubs.

1. Install dependencies (`npm install`) so Wrangler is available.
2. Create a KV namespace and an R2 bucket. Uncomment `SITE_KV` and `UPLOADS` in `wrangler.toml` and paste the ids.
3. Copy `.dev.vars.example` to `.dev.vars` and set `RECEIPT_READ_TOKEN`. Leave the corpus variables empty until the owner supplies a real ingest URL and token.
4. Preview locally with `npm run cf:dev`.
5. Uncomment the `furnaceisntfree.com` and `www.furnaceisntfree.com` routes in `wrangler.toml` only after that zone is on the same account. Leave them commented until an approved deploy. The www route is the custom-domain bind the Worker cannot create by itself.
6. Deploy the whole site in one step: `npx wrangler deploy`. Do not publish a partial set of pages.

A deploy is live only after `https://furnaceisntfree.com` responds with this site. A workers.dev preview is not that hostname. This repository does not claim a deploy until that command has succeeded.

Page-view durability on Cloudflare requires the `SITE_KV` binding. Without it, counts live only in the isolate that received them. Private JPEGs should use the `UPLOADS` R2 bucket. If R2 is absent and KV is present, JPEG bytes up to 2 MB are stored in KV. Larger files are refused with a clear error.

### How the counter maps to sister hubs

| This site | Sister pattern |
| --- | --- |
| `POST /count` with `{ "path": "/the-numbers/" }` from each HTML page | Corpus and azieleliab.com increment views on a document load |
| `GET /count`, `GET /v1/count`, `GET /stats`, `GET /v1/stats` | Public JSON totals, same spirit as `/count` and `/v1/stats` |
| Human vs bot via a user-agent list | Same idea as the corpus counter’s human/bot split, with a smaller list |
| `SITE_KV` | Durable totals, the way sister Workers persist counts |
| `GET /api/usefulness` | Separate meter for calculator feedback, not a visitor invention |

`/stats` is JSON. The readable totals page is `/stats/`.

The counter is not a mesh-node count and it does not invent users.

## Receipts and the usefulness meter

After a calculator, quote check, discount check, repair-question list, or claim map, a person can answer “Was this useful?” Optional comment, hard-capped at 256 characters in the browser and again on the server. Optional JPEG (`.jpg` / `image/jpeg` only) of a written invoice, estimate, or offer.

The server stores a private receipt:

- id (`tfi_…`)
- timestamp
- tool name
- useful yes, no, or omitted
- comment
- snapshot of inputs and server-computed outputs (no safety verdict, no contractor rank)
- content SHA-256 over the canonical JSON
- canonical URL on `https://furnaceisntfree.com`
- image SHA-256, pixel size, and private bytes when a JPEG was accepted

Publication stays off. A review request is recorded and does not publish the file. The public meter (`GET /api/usefulness`) returns counts only. Comments and images are not in that response. `GET /api/receipts` returns 401 until `RECEIPT_READ_TOKEN` is set and sent as `Authorization: Bearer …`.

JPEG rules, without OCR:

1. The person must check “This is my written invoice, estimate, or offer.”
2. The person must confirm names, addresses, phone numbers, account numbers, signatures, and barcodes were removed.
3. The server rejects non-JPEG bytes, files under 12 KB, files over 4 MB, images under 400 pixels on a side, and extreme banner shapes.
4. The site does not claim to have read the picture.

### Corpus handoff

If `CORPUS_INGEST_URL` and `CORPUS_INGEST_TOKEN` are both set, the Worker or local server `POST`s this JSON. Image bytes are included only when `CORPUS_FORWARD_IMAGES=true`. Otherwise the handoff carries the image hash and size. If the variables are empty, the receipt is kept locally and `corpus_status` is `not_configured`. No corpus URL is invented.

```json
{
  "schema": "the-furnace-isnt-free.receipt.v1",
  "ingest_as_receipt": {
    "id": "tfi_…",
    "canonical_url": "https://furnaceisntfree.com/the-numbers/",
    "content_sha256": "…",
    "created_at": "2026-10-31T00:00:00.000Z"
  },
  "kind": "tool-usefulness",
  "tool": "free-meaning",
  "useful": true,
  "comment": "",
  "snapshot": {},
  "image": { "present": false },
  "publish_consent": false,
  "source": "https://furnaceisntfree.com"
}
```

## Environment

See [ENVIRONMENT.md](ENVIRONMENT.md). Owner choices that are not resolved in code are in [OWNER-DECISIONS.md](OWNER-DECISIONS.md). Tests and the checks that were run are in [TEST.md](TEST.md).

## Stack

Cloudflare Workers plus static HTML, CSS, and JavaScript. A Node server (`server/local.mjs`) implements the same API for local use so the site runs without a Cloudflare login. That is the path used for tests and for the local preview.
