# Owner decisions

These items are not guessed into a “live” state. Each one needs the owner before it can change.

## Domain

Canonical host in code, sitemap, canonical tags, and receipt URLs: `https://furnaceisntfree.com`.

`www.furnaceisntfree.com` is the alias. The Worker responds to that host with a 301 to the apex. The routes in `wrangler.toml` stay commented until the Cloudflare zone is on the deploy account. `thefurnaceisntfree.com` is not a hostname this project uses.

## Hosting credentials

`npx wrangler deploy` was run on 31 October 2026 and failed before any upload. Wrangler’s message: “In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable for wrangler to work.” `wrangler whoami` also says it is not authenticated. There is no Wrangler OAuth file. `https://furnaceisntfree.com` is not live from this work.

Public DNS for `furnaceisntfree.com` already uses Cloudflare nameservers (`mustafa.ns.cloudflare.com` and `virginia.ns.cloudflare.com`). `www.furnaceisntfree.com` has no public address yet. The token must belong to the account that owns that zone. A connected Workers list can see other scripts in an account, and it cannot upload this script or edit DNS.

Needed before `npx wrangler deploy` can attach the real host:

- Cloudflare account permission for this zone
- DNS for `furnaceisntfree.com` (apex) and `www.furnaceisntfree.com` (alias) on the same Cloudflare account
- KV namespace id for `SITE_KV`
- Private R2 bucket for `UPLOADS`
- `RECEIPT_READ_TOKEN`

Until those exist, `npm start` is the working server and counts reset only when `data/` is deleted.

## Corpus write

`CORPUS_INGEST_URL` and `CORPUS_INGEST_TOKEN` are intentionally empty. The receipt format is implemented and documented in the README. This site will not POST to azielcorpuslibrary.net until the owner supplies an endpoint that accepts this payload. Image bytes stay on this site unless `CORPUS_FORWARD_IMAGES=true`.

## Analytics consent

The shipped counter is first-party, cookieless, and disclosed on the privacy page. It records a page path and a human/bot class. No third-party analytics script is included.

If a later tool such as a hosted analytics product is added, ask for consent before it runs. The current counter does not wait for a banner.

## Form backend

Offer notes, calculator receipts, and contact messages are stored by this site’s own API (local files, or KV/R2 on Cloudflare). They are private by default. There is no email mailbox wired up. Set `CONTACT_FORWARD_URL` only if a real inbox endpoint exists.

Checking “request review” does not publish anything. A public correction or case study still has to be written onto the site by hand.

## AZIEL links

Official cross-chain sister handles on `/aziel`. Checked on 5 November 2026. A link is not a live-status claim. This change did not deploy the site.

| Door | URL used | Result that day |
| --- | --- | --- |
| Aziel Eliab | https://www.azieleliab.com/ | HTTP 200. |
| Aziel Corpus Library | https://azielcorpuslibrary.net/ | HTTP 200. Apex answered; www was not required. |
| Godlock | https://godlock.uk/ | HTTP 200. |
| He Didn't Jump | https://hedidntjump.com/ | HTTP 200. Copy stays neutral and does not summarize that project. |
| Aziel Runtime source | https://github.com/AzielEliab/aziel-runtime | HTTP 200. |
| Aziel Runtime hosted page | https://aziel-runtime.vibelock.workers.dev/ | HTTP 200. Not a catalog and not a claim that this site runs it. |
| Time to Unseal the Book | https://timetounsealthebook.net/ | HTTP 200. Neutral description only. |
| This site | https://furnaceisntfree.com/ | Canonical in this repo. Not deployed from this change. |

Stance quotations on the page are still the text read on 31 October 2026 from `https://www.azieleliab.com/aziel` and `https://azielcorpuslibrary.net/`. They were not re-fetched on 5 November 2026.

Not on this door list: trades-runtime and the Glama directory. They were not already on the page, so they were not added. No other routes were invented. `cite.json` person `sameAs` stays the identity URLs only.

## Stance

The AZIEL page quotes the public stance from azieleliab.com/aziel and azielcorpuslibrary.net as read on 31 October 2026. It does not add a new personal essay. The HVAC purpose statement is separate and comes from the site specification.

## Photography, license, governing law

The visual spec mentioned HVAC photography. This build uses an HTML diagram so it does not ship an unlicensed photograph. Licensed photos can be added later.

`package.json` is `UNLICENSED` until the owner picks a license.

The terms page does not name a governing law. Add one only after the owner confirms the jurisdiction.

## What was not marked live

- Production DNS
- Search-engine indexing (files allow crawling; they do not prove an index)
- Corpus ingest
- OCR of uploaded invoices
- A dataset behind any “usual” labor or equipment price
