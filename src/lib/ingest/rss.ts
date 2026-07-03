// Minimal RSS parsing — Google News feeds are simple <item> lists,
// so a tag scanner avoids pulling in an XML dependency.

import type { FeedSource } from "./sources";

export type FeedItem = {
  sourceId: string;
  title: string;
  link: string;
  pubDate: string | null;
  snippet: string | null;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return null;
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities((cdata ? cdata[1] : raw).trim());
}

export async function fetchFeed(source: FeedSource): Promise<FeedItem[]> {
  const res = await fetch(source.url, {
    headers: { "user-agent": "GSIP/0.1 (strategic intelligence ingest)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`feed ${source.id}: HTTP ${res.status}`);
  const xml = await res.text();

  const items: FeedItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const chunk = m[1];
    const title = tag(chunk, "title");
    const link = tag(chunk, "link");
    if (!title || !link) continue;
    const description = tag(chunk, "description");
    items.push({
      sourceId: source.id,
      title: stripTags(title),
      link,
      pubDate: tag(chunk, "pubDate"),
      snippet: description ? stripTags(description).slice(0, 500) : null,
    });
    if (items.length >= (source.maxItems ?? 4)) break;
  }
  return items;
}
