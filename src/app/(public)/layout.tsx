import type { ReactNode } from "react";
import { PublicShell } from "@/components/public-shell";

export default function PublicAreaLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
