"use client";

import { Sidebar, type NavUser } from "@/components/Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { UIProvider } from "./ui-context";

export function AppShell({ children, user }: { children: React.ReactNode; user: NavUser }) {
  // Signed out → the only reachable route is /login (proxy redirects the rest),
  // so render it bare, without the app chrome.
  if (!user) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <UIProvider>
      <div className="flex min-h-screen">
        <Sidebar user={user} />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar user={user} />
          <main className="flex-1 min-w-0 overflow-x-hidden pt-24 md:pt-0">{children}</main>
        </div>
      </div>
      <CommandPalette />
    </UIProvider>
  );
}
