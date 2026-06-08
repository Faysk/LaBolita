import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LaBolita",
    short_name: "LaBolita",
    description: "O bolão da Copa para jogar com quem importa.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f0",
    theme_color: "#0d6938",
    lang: "pt-BR",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
