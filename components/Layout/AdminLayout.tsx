"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import TenantSidebar from "./TenantSidebar";
import { applyTheme } from "@/components/theme/theme";

const FULLSCREEN_ROUTES = [
  "/login",
  "/platform/login",
  "/api-docs",
  "/invite",
  "/forgot-password",
  "/reset-password",
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlatform = pathname.startsWith("/platform");
  const isApiDocs = pathname === "/api-docs" || pathname.startsWith("/api-docs/");
  const isInvite = pathname === "/invite" || pathname.startsWith("/invite/");
  const isForgot = pathname === "/forgot-password" || pathname.startsWith("/forgot-password/");
  const isReset = pathname === "/reset-password" || pathname.startsWith("/reset-password/");
  const isFullscreen =
    FULLSCREEN_ROUTES.includes(pathname) || isPlatform || isApiDocs || isInvite || isForgot || isReset;



  useEffect(() => {
    if (!isFullscreen) {
      applyTheme("tenantPortal");
    }
  }, [isFullscreen]);

  if (isFullscreen) {
    return <>{children}</>;
  }

  // Tenant app: sidebar only — no top navbar
  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--ui-background)", color: "var(--ui-text)" }}
      data-testid="tenant-layout"
    >
      <TenantSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 md:p-6 pt-16 md:pt-6 mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
