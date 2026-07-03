import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { UsersTable, type UserRow } from "@/components/admin/UsersTable";
import { AddUserDialog } from "@/components/admin/AddUserDialog";

export const revalidate = 0;
export const metadata = { title: "User Management · GSIP" };

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/users");
  if (user.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,status,last_sign_in_at,created_at")
    .order("created_at", { ascending: true })
    .returns<UserRow[]>();

  const users = data ?? [];
  const byRole = (r: string) => users.filter((u) => u.role === r).length;

  const stats = [
    { label: "Total user", value: users.length, icon: "users" },
    { label: "Admin", value: byRole("admin"), icon: "shield" },
    { label: "Analyst", value: byRole("analyst"), icon: "pen-tool" },
    { label: "Suspended", value: users.filter((u) => u.status === "suspended").length, icon: "user-x" },
  ];

  return (
    <div>
      <PageHeader
        layer="Admin · Identity & Access"
        icon="users"
        title="User Management"
        subtitle="Kelola akun, role (viewer / analyst / admin), dan status akses. Perubahan role langsung berlaku pada izin RLS di seluruh platform."
      />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-sm font-mono uppercase tracking-[0.18em] text-[var(--muted)]">
            Daftar User
          </h2>
          <AddUserDialog />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5 flex items-center gap-3">
              <span className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600">
                <Icon name={s.icon} size={18} />
              </span>
              <div>
                <div className="display text-2xl font-semibold tabular-nums">{s.value}</div>
                <div className="text-[11px] text-[var(--muted)]">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <UsersTable users={users} selfId={user.id} />

        <div className="card p-4 flex items-start gap-3 text-sm text-[var(--muted)]">
          <Icon name="info" size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <p>
            User baru dibuat via halaman <span className="font-mono">/login</span> (sign-up) dan
            otomatis mendapat role <span className="font-mono">viewer</span>. Promosikan ke{" "}
            <span className="font-mono">analyst</span> agar dapat menjalankan pipeline ingesti &amp;
            menyelesaikan prediksi.
          </p>
        </div>
      </div>
    </div>
  );
}
