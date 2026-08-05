"use client";

import React from "react";
import { useTheme } from "./ThemeProvider";

export default function ThemeSwitcher() {
  const { mounted, themeId, themes, setTheme } = useTheme();

  if (!mounted) {
    return <div className="h-9 w-40 bg-gray-200 animate-pulse rounded-md opacity-20" />;
  }

  return (
    <select
      value={themeId}
      onChange={(e) => setTheme(e.target.value)}
      className="rounded-md border px-3 py-1.5 text-sm font-medium outline-none transition-colors"
      style={{
        background: "var(--ui-surface)",
        color: "var(--ui-text)",
        borderColor: "var(--ui-border)",
      }}
    >
      {Object.values(themes).map((t: any) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
