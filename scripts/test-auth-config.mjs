import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Configure as variáveis Supabase antes do diagnóstico de autenticação.");
}

const anon = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const settingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
  headers: { apikey: anonKey },
});
assert.equal(settingsResponse.status, 200, "Supabase Auth settings must be reachable");
const settings = await settingsResponse.json();
assert.equal(settings.external?.google, true, "Google provider must be enabled");
assert.equal(settings.external?.anonymous_users, false, "anonymous users must stay disabled");

const { error: termsFunctionError } = await anon.rpc("accept_terms", {
  p_version: "2026-06-07",
});
assert.notEqual(
  termsFunctionError?.code,
  "PGRST202",
  "accept_terms is missing; apply the latest database migration before deploying the frontend",
);

const { error: profileColumnsError } = await service
  .from("profiles")
  .select("id, is_master_admin, terms_accepted_at, terms_version, disabled_at")
  .limit(1);
if (profileColumnsError) throw profileColumnsError;

const { count: masterCount, error: masterCountError } = await service
  .from("profiles")
  .select("*", { count: "exact", head: true })
  .eq("is_master_admin", true);
if (masterCountError) throw masterCountError;
assert.equal(masterCount, 1, "there must be exactly one master administrator");

const { data: masterSettings, error: masterSettingsError } =
  await service.rpc("get_master_settings");
if (masterSettingsError) throw masterSettingsError;

console.log("Authentication configuration smoke test passed", {
  google: true,
  masterAdministrators: masterCount,
  termsEnforcementEnabled: Boolean(masterSettings?.[0]?.terms_enforcement_enabled),
});
