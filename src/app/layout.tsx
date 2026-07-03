import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { getSessionUser } from "@/lib/supabase/server";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GSIP — Global Strategic Intelligence Platform",
  description:
    "Strategic Intelligence Operating System: Domain → Entity → Event → Analysis → Action",
};

// Set the theme before paint to avoid a flash of the wrong theme.
// Default is LIGHT (GSIP's primary theme); dark only when the user explicitly picks it.
const themeScript = `(function(){try{var t=localStorage.getItem('gsip:theme');if(t!=='dark'){t='light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await getSessionUser();
  const navUser = sessionUser
    ? { email: sessionUser.email, full_name: sessionUser.full_name, role: sessionUser.role }
    : null;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <div className="grain" aria-hidden />
        <AppShell user={navUser}>{children}</AppShell>
      </body>
    </html>
  );
}
