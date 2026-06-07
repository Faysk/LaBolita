import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Configure as variáveis Supabase antes do smoke test remoto.");
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const password = `${randomUUID()}Aa1!`;
const email = `labolita-audit-${Date.now()}@faysk.dev`;
let userId;
let poolId;

try {
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Auditoria LaBolita" },
  });
  if (createError) throw createError;
  userId = created.user.id;

  const session = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await session.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const { data: pool, error: poolError } = await session.rpc("create_pool", {
    p_name: "Auditoria automática",
    p_is_public: false,
  });
  if (poolError) throw poolError;

  const value = Array.isArray(pool) ? pool[0] : pool;
  poolId = value.id;
  assert.match(value.invite_code, /^[A-F0-9]{8}$/);

  const { count, error: memberError } = await service
    .from("pool_members")
    .select("*", { count: "exact", head: true })
    .eq("pool_id", poolId)
    .eq("user_id", userId);
  if (memberError) throw memberError;
  assert.equal(count, 1);

  console.log("Remote database smoke test passed");
} finally {
  if (poolId) await service.from("pools").delete().eq("id", poolId);
  if (userId) await service.auth.admin.deleteUser(userId);
}
