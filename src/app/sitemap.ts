import type { MetadataRoute } from "next";

const baseUrl = "https://labolita.faysk.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/regras", "/privacidade", "/termos"].map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date("2026-06-07T00:00:00Z"),
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: path === "/" ? 1 : 0.7,
    }));
}
