"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setNotice("Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bezel">
        <div className="core p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-300 via-green-400 to-emerald-600 grid place-items-center text-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
              <Icon name="satellite" size={22} strokeWidth={1.6} />
            </div>
            <div>
              <div className="display font-semibold tracking-tight text-lg leading-none">GSIP</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] mt-1.5">
                Strategic Intelligence
              </div>
            </div>
          </div>

          <h1 className="display text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Masuk ke platform" : "Buat akun analis"}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1.5">
            {mode === "signin"
              ? "Akses intelijen strategis terklasifikasi."
              : "Daftar untuk mengakses & mengelola intelijen."}
          </p>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
            {mode === "signup" && (
              <Field label="Nama lengkap" htmlFor="fullName">
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  className="gsip-input"
                  placeholder="Nama Anda"
                />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="gsip-input"
                placeholder="nama@instansi.go.id"
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-[var(--muted)]">Kata sandi</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="gsip-input pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-lg text-[var(--muted)] hover:text-foreground cursor-pointer transition-colors"
                >
                  <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 text-sm text-rose-600 bg-rose-500/[0.07] border border-rose-500/20 rounded-xl px-3 py-2.5">
                <Icon name="alert-triangle" size={15} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}
            {notice && (
              <div role="status" aria-live="polite" className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-500/[0.07] border border-emerald-500/20 rounded-xl px-3 py-2.5">
                <Icon name="mail-check" size={15} className="mt-0.5 shrink-0" /> {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex items-center justify-center gap-3 rounded-full px-6 py-3 bg-gradient-to-r from-emerald-400 to-amber-400 text-black font-semibold text-sm active:scale-[0.98] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_10px_30px_-12px_rgba(52,211,153,0.6)] disabled:opacity-60 disabled:cursor-wait cursor-pointer mt-1"
            >
              {loading && <Icon name="loader-2" size={16} className="animate-spin" />}
              {mode === "signin" ? "Masuk" : "Daftar"}
            </button>
          </form>

          <div className="mt-6 text-sm text-[var(--muted)] text-center">
            {mode === "signin" ? (
              <>
                Belum punya akun?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(null); }}
                  className="text-emerald-700 font-medium hover:underline cursor-pointer"
                >
                  Daftar
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <button
                  onClick={() => { setMode("signin"); setError(null); }}
                  className="text-emerald-700 font-medium hover:underline cursor-pointer"
                >
                  Masuk
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
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
