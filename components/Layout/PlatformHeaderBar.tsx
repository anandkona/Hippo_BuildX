"use client";

import React from "react";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";
import { useRouter, usePathname } from "next/navigation";
import { Dropdown } from "antd";
import { LogoutOutlined } from "@ant-design/icons";

export default function PlatformHeaderBar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", path: "/platform" },
    { label: "Tenants", path: "/platform/tenants" },
    { label: "Plans", path: "/platform/plans" },
    { label: "Users", path: "/platform/users" },
    { label: "Settings", path: "/platform/settings" },
    { label: "Audit Logs", path: "/platform/audit" },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {}
    router.push("/platform/login");
  };

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 shadow-sm"
      style={{ background: "var(--ui-surface)", borderBottom: "1px solid var(--ui-border)" }}
    >
      {/* Left side: Logo */}
      <div className="flex-1 flex justify-start">
        <div
          className="flex items-baseline gap-1 font-black italic tracking-tighter cursor-pointer"
          style={{ fontFamily: '"Trebuchet MS", sans-serif' }}
          onClick={() => router.push("/platform")}
        >
          <span className="text-xl md:text-2xl" style={{ color: "var(--ui-primary)" }}>
            Hippo
          </span>
          <span className="text-xl md:text-2xl text-red-500">Build</span>
          <span className="text-2xl md:text-3xl text-red-500">X</span>
        </div>
      </div>

      {/* Center: Navigation */}
      <nav className="hidden md:flex gap-6 flex-1 justify-center">
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

      {/* Right side: Actions */}
      <div className="flex-1 flex justify-end items-center gap-4">
        <ThemeSwitcher />
        <Dropdown
          menu={{
            items: [
              {
                key: "logout",
                label: "Sign Out",
                icon: <LogoutOutlined />,
                onClick: handleLogout,
              },
            ],
          }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="hidden md:block text-sm font-medium" style={{ color: "var(--ui-text)" }}>
              Platform Owner
            </span>
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
          </div>
        </Dropdown>
      </div>
    </header>
  );
}
