"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiHome, FiUsers, FiBriefcase, FiTool,
  FiDollarSign, FiBox, FiClipboard, FiSettings, FiShield, FiLogOut
} from "react-icons/fi";

const modules = [
  { name: "Dashboards", path: "/dashboard", icon: <FiHome size={18} /> },
  { name: "Tenants", path: "/tenants", icon: <FiShield size={18} /> },
  { name: "CRM & Sales", path: "/crm", icon: <FiUsers size={18} /> },
  { name: "Projects & Construction", path: "/projects", icon: <FiBriefcase size={18} /> },
  { name: "Procurement", path: "/procurement", icon: <FiTool size={18} /> },
  { name: "Inventory", path: "/inventory", icon: <FiBox size={18} /> },
  { name: "Accounting & Finance", path: "/finance", icon: <FiDollarSign size={18} /> },
  { name: "HRMS & Payroll", path: "/hrms", icon: <FiClipboard size={18} /> },
  { name: "Roles & Permissions", path: "/roles", icon: <FiSettings size={18} /> },
  { name: "Settings", path: "/settings", icon: <FiSettings size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r hidden md:block overflow-y-auto" style={{ background: "var(--ui-sidebar)", borderColor: "var(--ui-border)" }}>
      <div className="p-6 h-full flex flex-col gap-2">
        {modules.map((m) => {
          const isActive = pathname.startsWith(m.path);
          return (
            <Link key={m.path} href={m.path}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium"
                style={{
                  background: isActive ? "var(--ui-primary-soft)" : "transparent",
                  color: isActive ? "var(--ui-primary)" : "var(--ui-sidebar-text)",
                  opacity: isActive ? 1 : 0.85
                }}
              >
                {m.icon}
                <span>{m.name}</span>
              </div>
            </Link>
          );
        })}
        <div className="mt-auto pt-6 border-t" style={{ borderColor: "var(--ui-border)" }}>
          <Link 
            href="/login"
            onClick={() => {
              document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
            }}
          >
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium hover:bg-red-50 hover:text-red-600"
              style={{ color: "var(--ui-sidebar-text)", opacity: 0.85 }}
            >
              <FiLogOut size={18} />
              <span>Sign Out</span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
