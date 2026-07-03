import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginHero } from "@/components/auth/LoginHero";

export const metadata = { title: "Masuk · GSIP" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1.05fr_1fr]">
      <LoginHero />
      <div className="flex items-center justify-center px-6 py-12 sm:py-16">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
