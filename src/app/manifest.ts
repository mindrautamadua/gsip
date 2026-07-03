import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GSIP — Global Strategic Intelligence Platform",
    short_name: "GSIP",
    description:
      "Strategic Intelligence Operating System: Domain → Entity → Event → Foresight. Benchmark negara, graph pengaruh, ketergantungan geoekonomi, dan risk & opportunity dalam satu platform.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#05080a",
    theme_color: "#05080a",
    categories: ["business", "productivity", "news"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
