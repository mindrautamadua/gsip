import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GSIP reads public (RLS-protected) reference + intelligence data.
export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
