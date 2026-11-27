/** RSS 2.0 for the public HTML pages. Item dates are page content dates. */

const ORIGIN = "https://furnaceisntfree.com";

export function rfc822Date(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`RSS content date must be YYYY-MM-DD: ${isoDate}`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) throw new Error(`RSS content date is not a real day: ${isoDate}`);
  return date.toUTCString();
}

export function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * @param {{ title: string, description: string, items: { path: string, title: string, description: string, date: string }[] }} input
 * items are already newest-first.
 */
export function renderRss({ title, description, items }) {
  if (!items.length) throw new Error("RSS feed has no items");
  const self = `${ORIGIN}/rss.xml`;
  const home = `${ORIGIN}/`;
  const lastBuild = rfc822Date(items[0].date);
  const entries = items.map((item) => {
    if (!item.title || !item.description || !item.date) {
      throw new Error(`RSS item is missing title, description, or date: ${item.path}`);
    }
    const link = item.path === "/" ? home : `${ORIGIN}${item.path}`;
    if (!link.startsWith(`${ORIGIN}/`) && link !== home) {
      throw new Error(`RSS item link left the apex: ${link}`);
    }
    return `  <item>
    <title>${xmlEscape(item.title)}</title>
    <link>${xmlEscape(link)}</link>
    <guid isPermaLink="true">${xmlEscape(link)}</guid>
    <description>${xmlEscape(item.description)}</description>
    <pubDate>${rfc822Date(item.date)}</pubDate>
    <dc:creator>Aziel Eliab</dc:creator>
  </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>${xmlEscape(title)}</title>
  <link>${xmlEscape(home)}</link>
  <atom:link href="${xmlEscape(self)}" rel="self" type="application/rss+xml"/>
  <description>${xmlEscape(description)}</description>
  <language>en</language>
  <lastBuildDate>${lastBuild}</lastBuildDate>
  <generator>the-furnace-isnt-free</generator>
  <docs>https://www.rssboard.org/rss-specification</docs>
${entries.join("\n")}
</channel>
</rss>
`;
}
