"use server";

import { revalidatePath } from "next/cache";
import { createClient, getSessionUser } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

// Resolve a prediction (true/false) → records outcome + Brier score via RPC.
// Restricted to analyst/admin.
export async function resolvePredictionAction(
  id: string,
  outcome: boolean,
  note?: string
): Promise<Result> {
  const user = await getSessionUser();
  if (!user || (user.role !== "analyst" && user.role !== "admin")) {
    return { ok: false, error: "Akses ditolak — hanya analyst/admin." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_prediction", {
    p_id: id,
    p_outcome: outcome,
    p_note: note ?? null,
    p_resolver: user.email ?? user.role,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/predictions");
  return { ok: true };
}
