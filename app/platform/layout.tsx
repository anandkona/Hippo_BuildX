"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import PlatformHeaderBar from "@/components/Layout/PlatformHeaderBar";
import PlatformSidebar from "@/components/Layout/PlatformSidebar";

function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--ui-background)", color: "var(--ui-text)" }}
      data-testid="platform-layout"
    >
      <PlatformHeaderBar />
      <div className="flex flex-1 overflow-hidden">
        <PlatformSidebar />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/platform/login";

  return (
    <ThemeProvider defaultTheme="corporateBlue">
      {isLoginPage ? <>{children}</> : <PlatformShell>{children}</PlatformShell>}
    </ThemeProvider>
  );
}
