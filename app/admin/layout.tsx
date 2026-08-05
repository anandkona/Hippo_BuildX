"use client";

import React from "react";

/** Admin pages use the root tenant sidebar shell — no nested navbar/sidebar here. */
export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
