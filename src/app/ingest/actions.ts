"use server";

import { runIngest, type IngestResult } from "@/lib/ingest/pipeline";
import { getSessionUser } from "@/lib/supabase/server";

// Runs server-side with the ingest token from env — nothing secret reaches the
// client. Requires an authenticated analyst or admin (route is also gated by
// middleware; this is defense in depth).
export async function runIngestAction(): Promise<IngestResult | { error: string }> {
  const user = await getSessionUser();
  if (!user || (user.role !== "analyst" && user.role !== "admin")) {
    return { error: "Akses ditolak — hanya analyst/admin yang boleh menjalankan ingesti." };
  }
  try {
    return await runIngest();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
