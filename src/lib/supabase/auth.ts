import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { cache } from "react";

export const getOptionalUser = cache(async function getOptionalUser(
  supabase: SupabaseClient,
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && !isAuthSessionMissingError(error)) throw error;
  return user;
});
