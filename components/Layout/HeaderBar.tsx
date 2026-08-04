"use client";

import React from "react";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";
import { useRouter, usePathname } from "next/navigation";

export default function HeaderBar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboards", path: "/dashboard" },
    { label: "Customer Portal", path: "/portal" },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 shadow-sm" style={{ background: "var(--ui-surface)", borderBottom: "1px solid var(--ui-border)" }}>
      <div className="flex items-center gap-8">
        <div className="flex items-baseline gap-1 font-black italic tracking-tighter" style={{ fontFamily: '"Trebuchet MS", sans-serif' }}>
          <span className="text-xl md:text-2xl" style={{ color: "var(--ui-primary)" }}>Hippo</span>
          <span className="text-xl md:text-2xl text-red-500">build</span>
          <span className="text-2xl md:text-3xl text-red-500">X</span>
        </div>
        
        <nav className="hidden md:flex gap-6">
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`text-sm font-medium transition-colors hover:text-primary ${isActive ? '' : 'opacity-70'}`}
                style={{ color: isActive ? "var(--ui-primary)" : "var(--ui-text)" }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden border" style={{ borderColor: "var(--ui-border)" }}>
            <img src="https://ui-avatars.com/api/?name=Admin+User&background=random" alt="Avatar" />
          </div>
          <span className="hidden md:block text-sm font-medium" style={{ color: "var(--ui-text)" }}>Admin User</span>
        </div>
      </div>
    </header>
  );
}
