// ISO 3166-1 alpha-2 → full country name (Indonesian), via Intl.DisplayNames.
// Falls back to the raw code if the runtime/locale can't resolve it.
let dn: Intl.DisplayNames | null = null;
try {
  dn = new Intl.DisplayNames(["id"], { type: "region" });
} catch {
  dn = null;
}

export function countryName(code?: string | null): string {
  if (!code) return "—";
  const c = code.trim().toUpperCase();
  if (c.length !== 2) return code;
  try {
    return dn?.of(c) ?? c;
  } catch {
    return c;
  }
}
