import type { Metadata, Viewport } from "next";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://labolita.faysk.dev"),
  applicationName: "LaBolita",
  manifest: "/manifest.webmanifest",
  title: {
    default: "LaBolita",
    template: "%s | LaBolita",
  },
  description: "O bolão da Copa para jogar com quem importa.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "LaBolita",
    description: "O bolão da Copa para jogar com quem importa.",
    type: "website",
    locale: "pt_BR",
    siteName: "LaBolita",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "LaBolita",
    description: "O bolão da Copa para jogar com quem importa.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#08140e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
