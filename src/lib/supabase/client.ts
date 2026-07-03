import { createBrowserClient } from "@supabase/ssr";

// Browser client — used by client components for auth (sign-in/out) and
// session-aware reads. Session persists in cookies (shared with the server).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
