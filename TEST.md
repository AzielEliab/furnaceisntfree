# Tests

## Automated

```bash
npm test
```

That command renders `public/` and runs `node --test test/*.test.mjs`.

Last run during this build: 15 tests, 15 passed. The run also checks that public URLs use `https://furnaceisntfree.com` and that `www.furnaceisntfree.com` redirects to that apex.

Covered:

- Fictional calculator example: equipment $1,500, allowance $1,500, labor $4,800, materials $900, other charges an explicit $0 → incremental installed cost $5,700, labor ratio 3.2×, package gap unknown.
- Blank inputs stay unknown. Explicit $0 stays zero.
- Allowance above the equipment price is reported as excess credit and is not folded into labor.
- Labor ratio is “not defined” when the equipment price is $0.
- Package difference uses only the package total and the AC-only price.
- Quote comparison flags mismatched models and missing totals and sets winner and ranking to null.
- Discount check returns a numeric gap and no deception verdict.
- Repair questions do not declare the unit safe or unsafe, including when the note mentions rust and safety.
- Comments over 256 characters, emails, and phone numbers are refused.
- JPEG gate accepts a large page-shaped JPEG and rejects PNG bytes, tiny files, small dimensions, and banner aspect ratios.
- `POST /api/feedback` stores server-side math, forces publication off, returns `corpus_status: not_configured` when no corpus URL is set, rejects a non-JPEG, rejects contact details, stores an attested JPEG privately, and keeps `GET /api/receipts` and the image URL at 401.
- `POST /count` counts a human and a bot separately and rejects an unknown path.
- Every HTML page contains “Part of the Aziel Eliab ecosystem”, an `h1`, and only internal links that resolve to a file or a known API path.
- `robots.txt` allows crawlers including GPTBot and sets `Content-Signal: search=yes, ai-input=yes, ai-train=yes`.
- `cite.json` Person `@id` and `sameAs` include `https://www.azieleliab.com/#aziel`.
- `sitemap.xml` lists every public route. `llms.txt` and `ai.txt` match and include the calculator formula.

## Manual checks in this build

Browser pass (desktop and a narrow viewport) against the local server:

- Home hero, primary calculator link, checklist download.
- Calculator: blank result stays “unknown”; fictional example shows $5,700 and the fictional label; editing labor recalculates.
- Quote comparison: missing scope is named; no winner control exists.
- Repair builder: safety banner stays; generated questions do not say the unit is safe or unsafe.
- Mobile menu opens, closes with Escape, and returns focus to Menu.
- Footer line is present.

Keyboard: skip link, form labels, and visible focus outlines are in the CSS. Buttons and nav links use at least 44px of target height. Comparison cards stack in one column under 860px.

Not claimed: a production Lighthouse score, a screen-reader product pass beyond semantic headings and labels, or search-engine indexing.

## Deploy attempt

`npx wrangler@4.40.0 deploy` was run after the site tests passed. It exited with an error that `CLOUDFLARE_API_TOKEN` is required in this non-interactive environment. Nothing was uploaded. `furnaceisntfree.com` is not live. A dry run only bundled the Worker (about 73 KiB) and did not publish it.

## Link check

Internal links are asserted by the HTML test. External doors were requested on 31 October 2026 and are recorded in `OWNER-DECISIONS.md`. Re-check them before a DNS launch if that date is stale.
