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
      { href: "/", label: "Dashboard", icon: "layout-dashboard" },
      { href: "/insights", label: "Insights", icon: "sparkles" },
      { href: "/brief", label: "Intelligence Brief", icon: "newspaper", requires: "auth" },
    ],
  },
  {
    title: "Layer 1 · Domain",
    items: [{ href: "/domains", label: "Strategic Domains", icon: "globe", layer: "L1" }],
  },
  {
    title: "Layer 2 · Entity",
    items: [
      { href: "/taxonomy", label: "GICS Taxonomy", icon: "network", layer: "L2" },
      { href: "/graph", label: "Knowledge Graph", icon: "waypoints", layer: "L2" },
      { href: "/influence", label: "Global Influence", icon: "crown", layer: "L2" },
      { href: "/entities", label: "Entities", icon: "share-2", layer: "L2" },
    ],
  },
  {
    title: "Layer 3 · Event",
    items: [{ href: "/events", label: "Strategic Events", icon: "radar", layer: "L3" }],
  },
  {
    title: "National Strategic Intelligence",
    items: [{ href: "/nations", label: "National Excellence", icon: "landmark" }],
  },
  {
    title: "Geoekonomi",
    items: [
      { href: "/china-industry", label: "China Dominance", icon: "factory" },
      { href: "/dependency", label: "Strategic Dependency", icon: "git-compare-arrows" },
    ],
  },
  {
    title: "Markets",
    items: [{ href: "/markets", label: "Market Signals", icon: "candlestick-chart" }],
  },
  {
    title: "Foresight",
    items: [
      { href: "/predictions", label: "Prediction Ledger", icon: "target", requires: "auth" },
      { href: "/scenarios", label: "Value at Stake", icon: "git-fork" },
      { href: "/trajectory", label: "Trajectory", icon: "activity" },
    ],
  },
  {
    title: "Pipeline",
    items: [{ href: "/ingest", label: "Ingestion", icon: "rss", requires: "auth" }],
  },
  {
    title: "Admin",
    items: [{ href: "/admin/users", label: "User Management", icon: "users", requires: "admin" }],
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
