import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/regras", "/privacidade", "/termos"],
      disallow: ["/admin", "/api/", "/auth/", "/boloes", "/entrar", "/palpites"],
    },
    sitemap: "https://labolita.faysk.dev/sitemap.xml",
  };
}
