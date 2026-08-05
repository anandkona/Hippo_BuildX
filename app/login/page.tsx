"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const presetWorkspace = searchParams.get("workspace") || searchParams.get("tenantSlug") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState(presetWorkspace);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setWorkspace(presetWorkspace);
  }, [presetWorkspace]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          workspace: workspace.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const target =
        from && !from.startsWith("/login") && !(data.scope === "platform" && from.startsWith("/admin"))
          ? from
          : data.redirectTo || (data.scope === "platform" ? "/platform" : "/dashboard");

      // Prevent tenant users landing on platform routes and vice versa
      if (data.scope === "platform" && target.startsWith("/admin")) {
        router.push("/platform");
      } else if (data.scope === "tenant" && target.startsWith("/platform")) {
        router.push("/dashboard");
      } else {
        router.push(target);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--ui-sidebar)" }}
    >
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-30 blur-3xl" style={{ background: "var(--ui-primary)" }} />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "#ef4444" }} />

      <div
        className="w-full max-w-md rounded-xl shadow-2xl p-8 relative z-10"
        style={{ background: "var(--ui-surface)", border: "1px solid var(--ui-border)" }}
        data-testid="central-login"
      >
        <div className="text-center mb-8">
          <div
            className="inline-flex items-baseline gap-1 font-black italic tracking-tighter mb-3"
            style={{ fontFamily: '"Trebuchet MS", sans-serif' }}
          >
            <span className="text-3xl" style={{ color: "var(--ui-primary)" }}>Hippo</span>
            <span className="text-3xl text-red-500">build</span>
            <span className="text-4xl text-red-500">X</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--ui-text)" }}>Sign in</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ui-text-muted)" }}>
            Use your work email. Add a workspace for tenant accounts.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" autoComplete="off">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full p-2.5 border rounded-lg outline-none"
              style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-2.5 border rounded-lg outline-none"
              style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" }}
            />
          </div>

          <div>
            <label htmlFor="workspace" className="block text-sm font-semibold mb-1.5">
              Workspace <span className="font-normal" style={{ color: "var(--ui-text-muted)" }}>(optional)</span>
            </label>
            <input
              id="workspace"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. demo — leave blank for platform staff"
              className="w-full p-2.5 border rounded-lg outline-none font-mono text-sm"
              style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" }}
            />
          </div>

          {error && (
            <div className="text-sm px-3 py-2 rounded-md" style={{ background: "#FEE2E2", color: "var(--ui-danger)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold shadow-md disabled:opacity-60"
            style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ThemeProvider defaultTheme="corporateBlue">
      <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--ui-sidebar)" }} />}>
        <LoginForm />
      </Suspense>
    </ThemeProvider>
  );
}
