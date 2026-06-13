type RpcError = {
  code?: string;
  message?: string;
};

type SupabaseRpcClient = {
  rpc(name: string): unknown;
};

export async function ensureOfficialPoolMembership(supabase: SupabaseRpcClient) {
  const { error } = (await supabase.rpc("ensure_official_pool_membership")) as {
    error?: RpcError | null;
  };
  if (!error) return;

  if (isMissingOfficialPoolRpc(error)) return;

  console.error("Official pool membership synchronization failed", {
    code: error.code,
    message: error.message,
  });
}

function isMissingOfficialPoolRpc(error: RpcError) {
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.message?.includes("ensure_official_pool_membership") === true
  );
}
