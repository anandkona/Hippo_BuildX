"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiHome,
  FiUsers,
  FiKey,
  FiSettings,
  FiBell,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
} from "react-icons/fi";

const modules = [
  { name: "Dashboard", path: "/dashboard", icon: <FiHome size={18} />, exact: true },
  { name: "Users", path: "/admin/users", icon: <FiUsers size={18} /> },
  { name: "Roles", path: "/admin/roles", icon: <FiKey size={18} /> },
  { name: "Settings", path: "/admin/settings", icon: <FiSettings size={18} /> },
  { name: "Channels", path: "/admin/channels", icon: <FiBell size={18} /> },
  { name: "Profile", path: "/profile", icon: <FiUser size={18} /> },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    onNavigate?.();
    router.push("/login");
  };

  return (
    <div className="p-5 h-full flex flex-col gap-1.5">
      <Link href="/dashboard" onClick={onNavigate} className="mb-5 px-2">
        <div
          className="flex items-baseline gap-1 font-black italic tracking-tighter"
          style={{ fontFamily: '"Trebuchet MS", sans-serif' }}
        >
          <span className="text-xl" style={{ color: "var(--ui-primary)" }}>
            Hippo
          </span>
          <span className="text-xl text-red-500">build</span>
          <span className="text-2xl text-red-500">X</span>
        </div>
        <div className="text-[11px] font-semibold mt-1 tracking-wide uppercase" style={{ color: "var(--ui-sidebar-text)", opacity: 0.65 }}>
          Tenant Workspace
        </div>
      </Link>

      {modules.map((m) => {
        const isActive = m.exact
          ? pathname === m.path
          : pathname === m.path || pathname.startsWith(`${m.path}/`);
        return (
          <Link key={m.path} href={m.path} onClick={onNavigate}>
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium"
              style={{
                background: isActive ? "var(--ui-primary-soft)" : "transparent",
                color: isActive ? "var(--ui-primary)" : "var(--ui-sidebar-text)",
                opacity: isActive ? 1 : 0.88,
              }}
            >
              {m.icon}
              <span>{m.name}</span>
            </div>
          </Link>
        );
      })}

      <div className="mt-auto pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium text-left"
          style={{ color: "var(--ui-sidebar-text)", opacity: 0.85 }}
        >
          <FiLogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function TenantSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="w-64 flex-shrink-0 border-r hidden md:block overflow-y-auto sticky top-0 h-screen"
        style={{ background: "var(--ui-sidebar)", borderColor: "var(--ui-border)" }}
        data-testid="tenant-sidebar"
      >
        <NavLinks />
      </aside>

      {/* Mobile: menu button + drawer (not a navbar) */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 rounded-lg shadow-md"
        style={{ background: "var(--ui-surface)", color: "var(--ui-text)", border: "1px solid var(--ui-border)" }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <FiMenu size={20} />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative w-72 max-w-[85vw] h-full overflow-y-auto shadow-2xl"
            style={{ background: "var(--ui-sidebar)" }}
          >
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-md"
              style={{ color: "var(--ui-sidebar-text)" }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <FiX size={20} />
            </button>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
