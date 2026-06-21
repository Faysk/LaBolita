import type { Metadata } from "next";
import { PlayersDirectory } from "@/components/players-directory";

export const metadata: Metadata = {
  title: "Jogadores da Copa",
  description: "Elencos oficiais, destaques e dados das seleções da Copa 2026.",
};

export default function CompetitionPlayersPage() {
  return <PlayersDirectory />;
}
