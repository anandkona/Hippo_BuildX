"use client";

import React from "react";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";
import { useRouter, usePathname } from "next/navigation";

export default function PlatformHeaderBar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", path: "/platform" },
    { label: "Tenants", path: "/platform/tenants" },
    { label: "Plans", path: "/platform/plans" },
  ];

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 shadow-sm"
      style={{ background: "var(--ui-surface)", borderBottom: "1px solid var(--ui-border)" }}
    >
      <div className="flex items-center gap-8">
        <div
          className="flex items-baseline gap-1 font-black italic tracking-tighter cursor-pointer"
          style={{ fontFamily: '"Trebuchet MS", sans-serif' }}
          onClick={() => router.push("/platform")}
        >
          <span className="text-xl md:text-2xl" style={{ color: "var(--ui-primary)" }}>
            Hippo
          </span>
          <span className="text-xl md:text-2xl text-red-500">build</span>
          <span className="text-2xl md:text-3xl text-red-500">X</span>
        </div>

        <nav className="hidden md:flex gap-6">
          {navItems.map((item) => {
            const isActive =
              item.path === "/platform"
                ? pathname === "/platform"
                : pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`text-sm font-medium transition-colors ${isActive ? "" : "opacity-70"}`}
                style={{ color: isActive ? "var(--ui-primary)" : "var(--ui-text)" }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <span
          className="hidden lg:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "var(--ui-primary-soft)", color: "var(--ui-primary)" }}
        >
          Super Admin
        </span>
      </div>

      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full overflow-hidden border"
            style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ui-avatars.com/api/?name=Platform+Owner&background=1D4ED8&color=fff"
              alt="Avatar"
            />
          </div>
          <span className="hidden md:block text-sm font-medium" style={{ color: "var(--ui-text)" }}>
            Platform Owner
          </span>
        </div>
      </div>
    </header>
  );
}
