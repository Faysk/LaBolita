import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";
import { isAuthSessionMissingError } from "@supabase/supabase-js";

export async function getOptionalUser(
  supabase: SupabaseClient,
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && !isRecoverableAuthError(error)) throw error;
  return user;
}

export function isRecoverableAuthError(error: AuthError | Error): boolean {
  if (isAuthSessionMissingError(error)) return true;

  const message = error.message.toLowerCase();
  return (
    message.includes("refresh token") ||
    message.includes("invalid jwt") ||
    message.includes("jwt expired") ||
    message.includes("invalid token") ||
    message.includes("session not found") ||
    message.includes("user from sub claim in jwt does not exist")
  );
}
