export type NavItem = {
  href: string;
  label: string;
  icon: string;
  layer?: string;
  requires?: "auth" | "admin";
};

export const NAV_GROUPS: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { href: "/", label: "Cockpit", icon: "layout-dashboard" },
      { href: "/pulse", label: "Global Pulse", icon: "orbit" },
      { href: "/overview", label: "Ringkasan Strategis", icon: "layout-panel-top" },
      { href: "/insights", label: "Insight", icon: "sparkles" },
      { href: "/brief", label: "Intelligence Brief", icon: "newspaper", requires: "auth" },
      { href: "/guide", label: "Panduan", icon: "book-open" },
    ],
  },
  {
    title: "Peristiwa, Risiko & Peluang",
    items: [
      { href: "/events", label: "Peristiwa Strategis", icon: "radar" },
      { href: "/materiality", label: "Yang Paling Penting", icon: "scan-search" },
      { href: "/posture", label: "Register Risiko & Peluang", icon: "shield-alert" },
      { href: "/heatmap", label: "Heatmap Risiko & Peluang", icon: "grid-3x3" },
    ],
  },
  {
    title: "Entitas & Jaringan",
    items: [
      { href: "/graph", label: "Knowledge Graph", icon: "waypoints" },
      { href: "/entities", label: "Entitas", icon: "share-2" },
      { href: "/influence", label: "Pengaruh Global", icon: "crown" },
      { href: "/domains", label: "Domain Strategis", icon: "globe" },
      { href: "/taxonomy", label: "Taksonomi GICS", icon: "network" },
    ],
  },
  {
    title: "Benchmark & Posisi",
    items: [
      { href: "/benchmark", label: "Benchmark Kompetitif", icon: "swords" },
      { href: "/nations", label: "Keunggulan Nasional", icon: "landmark" },
      { href: "/fortune-global-500", label: "Fortune Global 500", icon: "award" },
    ],
  },
  {
    title: "Geoekonomi",
    items: [
      { href: "/china-industry", label: "Dominasi China", icon: "factory" },
      { href: "/dependency", label: "Ketergantungan Strategis", icon: "git-compare-arrows" },
      { href: "/substitution", label: "Substitusi & Pemenang", icon: "split" },
    ],
  },
  {
    title: "Foresight",
    items: [
      { href: "/scenarios", label: "Skenario & Nilai", icon: "git-fork" },
      { href: "/predictions", label: "Buku Prediksi", icon: "target", requires: "auth" },
      { href: "/trajectory", label: "Trajektori", icon: "activity" },
    ],
  },
  {
    title: "Pasar & Sistem",
    items: [
      { href: "/markets", label: "Sinyal Pasar", icon: "candlestick-chart" },
      { href: "/landscape", label: "Lanskap Kompetitor", icon: "map" },
      { href: "/ingest", label: "Ingestion", icon: "rss", requires: "auth" },
      { href: "/admin/users", label: "Manajemen User", icon: "users", requires: "admin" },
    ],
  },
];

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

// Filter groups by the viewer's role (null = signed out).
export function visibleGroups(role: "viewer" | "analyst" | "admin" | null) {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => {
      if (!i.requires) return true;
      if (i.requires === "auth") return role !== null;
      if (i.requires === "admin") return role === "admin";
      return true;
    }),
  })).filter((g) => g.items.length > 0);
}

const LABELS: Record<string, string> = Object.fromEntries(NAV.map((n) => [n.href, n.label]));

// Build breadcrumb trail from a pathname.
export function breadcrumbs(path: string): { label: string; href: string }[] {
  if (path === "/") return [{ label: "Dashboard", href: "/" }];
  const segs = path.split("/").filter(Boolean);
  const trail: { label: string; href: string }[] = [{ label: "Dashboard", href: "/" }];
  let acc = "";
  segs.forEach((seg, i) => {
    acc += `/${seg}`;
    const known = LABELS[acc];
    const isId = /[0-9a-f]{8}-/.test(seg) || seg.length > 24;
    trail.push({ label: known ?? (isId ? "Detail" : seg.replace(/-/g, " ")), href: acc });
    void i;
  });
  return trail;
}
