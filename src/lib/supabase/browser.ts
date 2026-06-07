"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null | undefined;

export function createBrowserSupabaseClient() {
  if (browserClient !== undefined) return browserClient;

  const config = getSupabaseConfig();
  browserClient = config
    ? createBrowserClient(config.url, config.anonKey)
    : null;

  return browserClient;
}
