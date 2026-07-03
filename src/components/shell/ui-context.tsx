"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

type UICtx = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  theme: Theme;
  toggleTheme: () => void;
};

const Ctx = createContext<UICtx | null>(null);

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI must be used within UIProvider");
  return c;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  // restore persisted collapse + theme state after mount (avoids hydration mismatch)
  useEffect(() => {
    setCollapsed(localStorage.getItem("gsip:collapsed") === "1");
    setTheme((document.documentElement.dataset.theme as Theme) || "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("gsip:theme", next);
      return next;
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("gsip:collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  // global ⌘K / Ctrl+K to toggle command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider
      value={{ collapsed, toggleCollapsed, paletteOpen, setPaletteOpen, theme, toggleTheme }}
    >
      {children}
    </Ctx.Provider>
  );
}
