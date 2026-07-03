// RSS sources for the GSIP ingestion pipeline.
// Start narrow (domains that matter most) — add feeds as coverage needs grow.

export type FeedSource = {
  id: string;
  label: string;
  url: string;
  /** Max items taken from this feed per run (default 4). */
  maxItems?: number;
};

function googleNews(query: string, lang = "en-US", country = "US"): string {
  const ceid = `${country}:${lang.split("-")[0]}`;
  return (
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(query) +
    `&hl=${lang}&gl=${country}&ceid=${ceid}`
  );
}

export const FEEDS: FeedSource[] = [
  {
    id: "cpo-eudr",
    label: "CPO, sawit & EUDR",
    url: googleNews('("palm oil" OR CPO) (EUDR OR export OR price OR regulation) when:3d'),
  },
  {
    id: "chips-ai",
    label: "Semikonduktor & geopolitik AI",
    url: googleNews('semiconductor ("export controls" OR China OR NVIDIA OR TSMC) when:3d'),
  },
  {
    id: "indo-economy",
    label: "Ekonomi & kebijakan Indonesia",
    url: googleNews('Indonesia (economy OR "Bank Indonesia" OR fiscal OR investment OR tariff) when:3d'),
  },
  {
    id: "energy",
    label: "Energi & transisi",
    url: googleNews('("energy transition" OR LNG OR "crude oil" OR OPEC) (Indonesia OR Asia) when:3d'),
  },
  {
    id: "geopolitics",
    label: "Geopolitik & keamanan",
    url: googleNews('(sanctions OR "trade war" OR "South China Sea" OR BRICS) when:3d'),
  },
  {
    id: "bumn-perkebunan",
    label: "BUMN & perkebunan",
    url: googleNews('PTPN OR "Holding Perkebunan" OR "hilirisasi sawit"', "id", "ID"),
  },
];
