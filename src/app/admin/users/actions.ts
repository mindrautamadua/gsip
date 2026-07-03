"use server";

import { revalidatePath } from "next/cache";
import { createClient, getSessionUser } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

// Create a new user (auth account + profile) via the admin_create_user RPC,
// which enforces the admin role server-side. No service-role key required.
export async function createUserAction(input: {
  email: string;
  password: string;
  fullName: string;
  role: string;
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Akses ditolak." };
  if (!["viewer", "analyst", "admin"].includes(input.role)) {
    return { ok: false, error: "Role tidak valid." };
  }
  if (!input.email.trim()) return { ok: false, error: "Email wajib diisi." };
  if (input.password.length < 6) return { ok: false, error: "Kata sandi minimal 6 karakter." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_user", {
    p_email: input.email.trim(),
    p_password: input.password,
    p_full_name: input.fullName.trim(),
    p_role: input.role,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUserRole(userId: string, role: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Akses ditolak." };
  if (!["viewer", "analyst", "admin"].includes(role)) return { ok: false, error: "Role tidak valid." };
  if (userId === admin.id && role !== "admin") {
    return { ok: false, error: "Tidak bisa menurunkan role diri sendiri." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUserStatus(userId: string, status: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Akses ditolak." };
  if (!["active", "suspended"].includes(status)) return { ok: false, error: "Status tidak valid." };
  if (userId === admin.id && status === "suspended") {
    return { ok: false, error: "Tidak bisa menonaktifkan akun sendiri." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
