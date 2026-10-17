import { createHash } from "node:crypto";

import { getSupabaseAdmin } from "~/supabase/admin.server";

export type ApiScope = "games:upload";

/** API tokens are opaque credentials; each endpoint requires its own scope. */
export async function authenticateApiToken(token: string, scope: ApiScope) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await getSupabaseAdmin()
    .from("api_tokens")
    .select("api_clients!inner(enabled)")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .contains("scopes", [scope])
    .maybeSingle();
  if (error) throw error;
  return data?.api_clients.enabled ? tokenHash : null;
}
