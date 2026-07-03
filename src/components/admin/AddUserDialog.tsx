"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { createUserAction } from "@/app/admin/users/actions";

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  for (const n of arr) out += chars[n % chars.length];
  return out;
}

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const reset = () => {
    setEmail(""); setFullName(""); setPassword(""); setRole("viewer"); setError(null); setDone(null);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const res = await createUserAction({ email, password, fullName, role });
      if (!res.ok) {
        setError(res.error);
      } else {
        setDone(`User ${email} dibuat dengan role ${role}.`);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="group inline-flex items-center gap-2.5 rounded-full pl-5 pr-2 py-2 bg-gradient-to-r from-emerald-400 to-amber-400 text-black font-semibold text-sm active:scale-[0.98] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_10px_30px_-12px_rgba(52,211,153,0.6)] cursor-pointer"
      >
        Tambah User
        <span className="h-7 w-7 rounded-full bg-black/15 grid place-items-center">
          <Icon name="user-plus" size={15} strokeWidth={1.9} />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 backdrop-blur-sm p-4 sm:p-8"
        >
          <div className="relative w-full max-w-md my-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] animate-[float-in_0.28s_cubic-bezier(0.16,1,0.3,1)]">
            <button
              onClick={() => setOpen(false)}
              aria-label="Tutup"
              className="absolute right-3 top-3 h-9 w-9 rounded-xl grid place-items-center text-[var(--muted)] bg-[var(--surface)] border border-[var(--hairline)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors"
            >
              <Icon name="x" size={17} />
            </button>

            <div className="p-6 md:p-7">
              <h2 className="display text-xl font-semibold tracking-tight">Tambah User Baru</h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Akun langsung aktif (email terkonfirmasi). Bagikan kata sandi ke user secara aman.
              </p>

              {done ? (
                <div className="mt-6 flex flex-col gap-4">
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4 text-sm text-emerald-700 flex items-start gap-2">
                    <Icon name="check-circle-2" size={16} className="mt-0.5 shrink-0" /> {done}
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-mono break-all">
                    <div className="text-[11px] text-[var(--muted)] mb-1">Kredensial</div>
                    {email} · {password}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { reset(); }}
                      className="flex-1 rounded-full px-4 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-sm font-medium hover:border-emerald-400/40 cursor-pointer transition-colors"
                    >
                      Tambah lagi
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-full px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-amber-400 text-black text-sm font-semibold cursor-pointer"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                  <Field label="Nama lengkap" htmlFor="au-name">
                    <input id="au-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="gsip-input" placeholder="Nama user" />
                  </Field>
                  <Field label="Email" htmlFor="au-email">
                    <input id="au-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="gsip-input" placeholder="nama@instansi.go.id" />
                  </Field>
                  <Field label="Kata sandi" htmlFor="au-pass">
                    <div className="flex gap-2">
                      <input id="au-pass" type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="gsip-input font-mono" placeholder="min. 6 karakter" />
                      <button type="button" onClick={() => setPassword(randomPassword())} title="Buat acak" className="shrink-0 h-[42px] w-[42px] rounded-[0.85rem] border border-[var(--border)] bg-[var(--surface)] grid place-items-center text-[var(--muted)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors">
                        <Icon name="dice-5" size={16} />
                      </button>
                    </div>
                  </Field>
                  <Field label="Role" htmlFor="au-role">
                    <select id="au-role" value={role} onChange={(e) => setRole(e.target.value)} className="gsip-input cursor-pointer">
                      <option value="viewer">viewer — hanya membaca</option>
                      <option value="analyst">analyst — ingest, prediksi, brief</option>
                      <option value="admin">admin — akses penuh</option>
                    </select>
                  </Field>

                  {error && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-3 py-2.5 text-sm text-rose-600 flex items-start gap-2">
                      <Icon name="alert-triangle" size={15} className="mt-0.5 shrink-0" /> {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 bg-gradient-to-r from-emerald-400 to-amber-400 text-black font-semibold text-sm active:scale-[0.98] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-60 disabled:cursor-wait cursor-pointer mt-1"
                  >
                    {pending && <Icon name="loader-2" size={16} className="animate-spin" />}
                    Buat User
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
