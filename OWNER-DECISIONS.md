# Owner decisions

These items are not guessed into a “live” state. Each one needs the owner before it can change.

## Domain

Canonical host in code, sitemap, canonical tags, and receipt URLs: `https://furnaceisntfree.com`.

`www.furnaceisntfree.com` is the alias. For GET and HEAD, the Worker returns one 301 to the same apex path and query, and folds a known HTML alias such as `/aziel` into that same hop. `/stats` stays JSON. POST is not redirected. The routes in `wrangler.toml` stay commented. Binding `www.furnaceisntfree.com` as a custom domain is a Cloudflare zone action. Application code cannot attach it, and this change does not deploy or edit DNS. `thefurnaceisntfree.com` is not a hostname this project uses.

A 5 November 2026 public read saw `https://www.furnaceisntfree.com/` return 200 with this site's apex canonical. That matches static assets answering before the Worker. `run_worker_first` is now true so a later deploy of this script can emit the 301 when the hostname already reaches this Worker. If www is on a different route, the commented custom domain still has to be attached on the owning account before the public host will redirect.

On 19 November 2026 the public host `https://furnaceisntfree.com` was live. The footer, `/aziel/`, `llms.txt`, and `ai.txt` say that. Search-engine indexing stays unconfirmed. This change does not deploy and does not edit DNS. `thefurnaceisntfree.com` is still not a hostname this project uses.

## Hosting credentials

`npx wrangler deploy` was run on 31 October 2026 and failed before any upload. Wrangler’s message: “In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable for wrangler to work.” `wrangler whoami` also says it is not authenticated. There is no Wrangler OAuth file. That October attempt did not publish this tree. The public host was live by 19 November 2026. This change still does not deploy.

Public DNS for `furnaceisntfree.com` already uses Cloudflare nameservers (`mustafa.ns.cloudflare.com` and `virginia.ns.cloudflare.com`). The token must belong to the account that owns that zone. A connected Workers list can see other scripts in an account, and it cannot upload this script or edit DNS. This change does not submit Search Console, IndexNow, or DNS.

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

Ten public doors on `/aziel/`. `/doors` and `/doors/` 301 to `/aziel/`. Checked live on 19 November 2026. This change did not deploy the site.

| Door | Canonical URL | Note |
| --- | --- | --- |
| Aziel Eliab | https://www.azieleliab.com/ | Identity hub. |
| Aziel Corpus Library | https://www.azielcorpuslibrary.net/ | Canonical host is www, not the bare apex. |
| GodLock | https://godlock.uk/ | Separate project. Not used to score quotes. |
| He Didn't Jump | https://hedidntjump.com/ | Marion Zioncheck Archive. HVAC copy stays neutral. |
| The Furnace Isn't Free | https://furnaceisntfree.com/ | This site. Live. |
| Time to Unseal the Book | https://timetounsealthebook.net/ | Separate project. HVAC copy stays neutral. |
| Whitestone | https://whitestone.vibelock.workers.dev/ | Live pro se web app. Not legal advice from this HVAC guide. |
| Aziel Runtime | https://aziel-runtime.vibelock.workers.dev/ | MCP and Softwares runtime. Glama: https://glama.ai/mcp/servers/AzielEliab/aziel-runtime. Source: https://github.com/AzielEliab/aziel-runtime. |
| Trades Runtime | https://trades-runtime.vibelock.workers.dev/ | Public MCP runtime. Glama: https://glama.ai/mcp/servers/AzielEliab/trades-runtime. live_backends and pilot_started are not stated. |
| MirageGrid | https://miragegrid.vibelock.workers.dev/ | Cap-7 mesh DNS factory. Mesh-only. public_icann is false. Not an ICANN registrar. |

Softwares at `https://www.azieleliab.com/runtime/` stays on machine surfaces with the two GitHub accounts and `https://x.com/AzielEliab`. It is not an eleventh door.

Excluded: `thefurnaceisntfree.com`, private repos `lumen` and `ark-private`, and any `*-download-tracker` URL.

Stance quotations on the page are still the text read on 31 October 2026 from `https://www.azieleliab.com/aziel` and the corpus page. The corpus link now uses the www canonical host. The quotation was not re-fetched for this change.

## Stance

The AZIEL page quotes the public stance from azieleliab.com/aziel and azielcorpuslibrary.net as read on 31 October 2026. It does not add a new personal essay. The HVAC purpose statement is separate and comes from the site specification.

## Photography, license, governing law

The visual spec mentioned HVAC photography. This build uses an HTML diagram so it does not ship an unlicensed photograph. Licensed photos can be added later.

`package.json` is `UNLICENSED` until the owner picks a license.

The terms page does not name a governing law. Add one only after the owner confirms the jurisdiction.

## What stays unconfirmed

- Search-engine indexing (files allow crawling; they do not prove an index)
- Corpus ingest
- OCR of uploaded invoices
- A dataset behind any “usual” labor or equipment price
- Trades Runtime `live_backends` and `pilot_started`

`https://furnaceisntfree.com` is live. That is separate from the items above.
