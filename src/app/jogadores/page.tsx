import type { Metadata } from "next";
import { PlayersDirectory } from "@/components/players-directory";

export const metadata: Metadata = {
  title: "Jogadores",
  description: "Dados dos jogadores, elencos, figurinhas e destaques da Copa 2026.",
};

export default function PlayersPage() {
  return <PlayersDirectory backHref="/jogos" backLabel="Ver jogos" />;
}
