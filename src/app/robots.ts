import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/boloes", "/regras", "/privacidade", "/termos"],
      disallow: ["/admin", "/api/", "/auth/", "/aceitar-termos", "/conta", "/conta-suspensa", "/entrar", "/palpites"],
    },
    sitemap: "https://labolita.faysk.dev/sitemap.xml",
  };
}
