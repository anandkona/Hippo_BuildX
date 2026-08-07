"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  { name: "Projects", path: "/admin/projects", icon: <FiHome size={18} /> },
  { name: "CRM", path: "/admin/crm", icon: <FiUsers size={18} /> },
  { name: "Users", path: "/admin/users", icon: <FiUsers size={18} /> },
  { name: "Roles", path: "/admin/roles", icon: <FiKey size={18} /> },
  { name: "Settings", path: "/admin/settings", icon: <FiSettings size={18} /> },
  { name: "Channels", path: "/admin/channels", icon: <FiBell size={18} /> },
  { name: "Profile", path: "/profile", icon: <FiUser size={18} /> },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/v1/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data.logo_url) setLogoUrl(data.logo_url);
      })
      .catch(() => {});
  }, []);

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
    <div className="p-4 h-full flex flex-col justify-between">
      <div className="space-y-6">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3 px-2 py-1">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ maxHeight: 32, maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-indigo-50 font-bold text-sm">H</span>
            </div>
          )}
          <span className="font-semibold text-sm tracking-wide text-slate-900">HippoBuildX</span>
        </Link>

        <nav className="space-y-1">
          {modules.map((m) => {
            const isActive = m.exact
              ? pathname === m.path
              : pathname === m.path || pathname.startsWith(`${m.path}/`);
            return (
              <Link key={m.path} href={m.path} onClick={onNavigate}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: isActive ? "var(--ui-primary-soft)" : "transparent",
                    color: isActive ? "#1E293B" : "var(--ui-sidebar-text)",
                  }}
                >
                  <span style={{ color: isActive ? "var(--ui-primary)" : "inherit" }}>{m.icon}</span>
                  <span className={isActive ? "font-semibold" : ""}>{m.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t space-y-2" style={{ borderColor: "var(--ui-border)" }}>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-left hover:bg-slate-300/50 transition-colors"
          style={{ color: "var(--ui-sidebar-text)" }}
        >
          <FiSettings size={16} />
          <span>Sign Out</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-2 mt-2">
          <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-semibold text-slate-700 border border-slate-400/40">
            JD
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800">Jane Doe</span>
            <span className="text-[10px] text-slate-500">jane@aether.io</span>
          </div>
        </div>
      </div>

      {showLogoutConfirm && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center px-4" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-sm rounded-xl border p-6 shadow-2xl" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", color: "var(--ui-text)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">Sign Out</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ui-text-muted)" }}>Are you sure you want to sign out?</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg hover:bg-slate-100 transition-all font-medium text-slate-800" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-lg text-white font-semibold transition-all shadow-md" style={{ background: "var(--ui-primary)" }} onClick={handleLogout}>OK</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function TenantSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="w-64 flex-shrink-0 border-r hidden md:flex flex-col transition-all duration-300"
        style={{ 
          background: "var(--ui-sidebar)", 
          borderColor: "var(--ui-border)"
        }}
        data-testid="tenant-sidebar"
      >
        <NavLinks />
      </aside>

      {/* Mobile: menu button + drawer (not a navbar) */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 rounded-lg shadow-xs"
        style={{ background: "var(--ui-surface)", color: "var(--ui-text)", border: "1px solid var(--ui-border)" }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <FiMenu size={16} />
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
              className="absolute top-4 right-4 p-2 rounded-lg"
              style={{ color: "var(--ui-sidebar-text)" }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <FiX size={16} />
            </button>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
