// Logo source chain from a company domain: Clearbit (nice) → Google favicon (reliable).
export function logoUrls(domain?: string | null): string[] {
  if (!domain) return [];
  return [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  ];
}
