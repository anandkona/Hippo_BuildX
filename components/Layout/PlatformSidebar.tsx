"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiHome,
  FiUsers,
  FiShield,
  FiLink,
  FiFlag,
  FiSettings,
  FiFileText,
  FiLogOut,
  FiCreditCard,
} from "react-icons/fi";

const modules = [
  { name: "Dashboard", path: "/platform", icon: <FiHome size={18} />, exact: true },
  { name: "Tenants", path: "/platform/tenants", icon: <FiShield size={18} /> },
  { name: "Plans", path: "/platform/plans", icon: <FiCreditCard size={18} /> },
  { name: "Users", path: "/platform/users", icon: <FiUsers size={18} /> },
  { name: "Subscriptions", path: "/platform/subscriptions", icon: <FiLink size={18} /> },
  { name: "Feature Flags", path: "/platform/feature-flags", icon: <FiFlag size={18} /> },
  { name: "Settings", path: "/platform/settings", icon: <FiSettings size={18} /> },
  { name: "Audit Logs", path: "/platform/audit", icon: <FiFileText size={18} /> },
];

export default function PlatformSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {}
    router.push("/platform/login");
  };

  return (
    <aside
      className="w-64 flex-shrink-0 border-r hidden md:block overflow-y-auto"
      style={{ background: "var(--ui-sidebar)", borderColor: "var(--ui-border)" }}
    >
      <div className="p-6 h-full flex flex-col gap-2">
        {modules.map((m) => {
          const isActive = m.exact
            ? pathname === m.path
            : pathname === m.path || pathname.startsWith(`${m.path}/`);
          return (
            <Link key={m.path} href={m.path}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium"
                style={{
                  background: isActive ? "var(--ui-primary-soft)" : "transparent",
                  color: isActive ? "var(--ui-primary)" : "var(--ui-sidebar-text)",
                  opacity: isActive ? 1 : 0.85,
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
    </aside>
  );
}
