import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://labolita.faysk.dev"),
  title: {
    default: "LaBolita",
    template: "%s | LaBolita",
  },
  description: "O bolão da Copa para jogar com quem importa.",
  openGraph: {
    title: "LaBolita",
    description: "O bolão da Copa para jogar com quem importa.",
    type: "website",
    locale: "pt_BR",
    siteName: "LaBolita",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
