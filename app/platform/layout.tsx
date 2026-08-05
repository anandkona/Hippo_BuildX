"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import PlatformHeaderBar from "@/components/Layout/PlatformHeaderBar";

function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      style={{ background: "var(--ui-background)", color: "var(--ui-text)" }}
      data-testid="platform-layout"
    >
      <PlatformHeaderBar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="mx-auto w-full max-w-[90rem]">{children}</div>
      </main>
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
