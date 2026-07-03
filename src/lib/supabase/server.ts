import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client — reads the session from cookies in RSC / route handlers /
// server actions. Writes are wrapped in try/catch because cookie mutation is
// only permitted in Server Actions and Route Handlers (not plain RSC render).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from an RSC render — middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

export type SessionUser = {
  id: string;
  email: string | null;
  role: "viewer" | "analyst" | "admin";
  full_name: string | null;
  status: "active" | "suspended";
};

// Resolve the current user + profile (role) for gating server components.
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, status")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    role: (profile?.role as SessionUser["role"]) ?? "viewer",
    full_name: profile?.full_name ?? null,
    status: (profile?.status as SessionUser["status"]) ?? "active",
  };
}
