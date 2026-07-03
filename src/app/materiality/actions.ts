"use server";

import { revalidatePath } from "next/cache";
import { createClient, getSessionUser } from "@/lib/supabase/server";

// Manually capture a materiality + GSIP metric snapshot. Both RPCs are
// SECURITY DEFINER and enforce the admin role internally (current_user_role),
// so no service-role key is needed — the session-authenticated client is enough.
export async function captureSnapshotsAction(): Promise<
  { ok: true; materiality: number; gsip: number } | { ok: false; error: string }
> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Akses ditolak (perlu admin)." };

  const supabase = await createClient();
  const [mat, gsip] = await Promise.all([
    supabase.rpc("capture_materiality_snapshot"),
    supabase.rpc("capture_gsip_snapshot"),
  ]);

  if (mat.error) return { ok: false, error: mat.error.message };
  if (gsip.error) return { ok: false, error: gsip.error.message };

  revalidatePath("/materiality");
  revalidatePath("/trajectory");
  return { ok: true, materiality: Number(mat.data ?? 0), gsip: Number(gsip.data ?? 0) };
}
