// Server-only: resolve a portrait/logo thumbnail from Wikipedia by page title.
// Falls back to null (UI shows initials). Cached 1 day.

async function one(title: string): Promise<string | null> {
  if (!title) return null;
  try {
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { "User-Agent": "GSIP/1.0 (intelligence platform)" }, next: { revalidate: 86400 } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j?.thumbnail?.source ?? j?.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

export type GalleryItem = { url: string; caption: string | null };

// Multiple location photos (+ captions) from a Wikipedia page's media list.
// Skips SVG icons/logos. Cached 1 day.
export async function getGallery(title: string | null | undefined, max = 6): Promise<GalleryItem[]> {
  if (!title) return [];
  try {
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`,
      { headers: { "User-Agent": "GSIP/1.0 (intelligence platform)" }, next: { revalidate: 86400 } }
    );
    if (!r.ok) return [];
    const j = await r.json();
    const items: unknown[] = Array.isArray(j?.items) ? j.items : [];
    const out: GalleryItem[] = [];
    for (const raw of items) {
      const it = raw as { type?: string; title?: string; srcset?: { src?: string }[]; caption?: { text?: string } };
      if (it?.type !== "image") continue;
      const title = it.title ?? "";
      // skip non-photo assets (logos, flags, icons, seals, maps, diagrams)
      if (/\.svg/i.test(title) || /logo|flag|icon|seal|coat.of.arms|emblem|map|locator|diagram/i.test(title)) continue;
      let src = it.srcset?.[0]?.src;
      if (!src) continue;
      if (src.startsWith("//")) src = "https:" + src;
      if (/\.svg/i.test(src)) continue;
      out.push({ url: src, caption: it.caption?.text ? String(it.caption.text).trim() : null });
      if (out.length >= max) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function getPhotos(titles: (string | null | undefined)[]): Promise<Record<string, string>> {
  const uniq = [...new Set(titles.filter((t): t is string => !!t))];
  const out: Record<string, string> = {};
  const CHUNK = 6;
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const part = uniq.slice(i, i + CHUNK);
    const res = await Promise.all(part.map(one));
    part.forEach((t, idx) => {
      if (res[idx]) out[t] = res[idx]!;
    });
  }
  return out;
}
