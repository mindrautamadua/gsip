"use server";

import { revalidatePath } from "next/cache";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { generateBrief } from "@/lib/brief/generate";

type Result = { ok: true; id: string } | { ok: false; error: string };

// Generate + persist an Intelligence Brief. Analyst/admin only. Insert goes
// through the caller's session so the briefs RLS insert policy applies.
export async function generateBriefAction(period: "daily" | "weekly"): Promise<Result> {
  const user = await getSessionUser();
  if (!user || (user.role !== "analyst" && user.role !== "admin")) {
    return { ok: false, error: "Akses ditolak — hanya analyst/admin yang boleh membuat brief." };
  }
  try {
    const brief = await generateBrief(period);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("briefs")
      .insert({
        period: brief.period,
        period_start: brief.period_start,
        period_end: brief.period_end,
        title: brief.title,
        executive_summary: brief.executive_summary,
        sections: brief.sections,
        event_count: brief.event_count,
        model: brief.model,
        created_by: user.email ?? user.role,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/brief");
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
