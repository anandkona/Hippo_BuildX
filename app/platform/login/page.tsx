"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/platform/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push("/platform");
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
      >
        <div className="text-center mb-8">
          <div
            className="inline-flex items-baseline gap-1 font-black italic tracking-tighter mb-3"
            style={{ fontFamily: '"Trebuchet MS", sans-serif' }}
          >
            <span className="text-3xl" style={{ color: "var(--ui-primary)" }}>
              Hippo
            </span>
            <span className="text-3xl text-red-500">build</span>
            <span className="text-4xl text-red-500">X</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--ui-text)" }}>
            Platform Administration
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ui-text-muted)" }}>
            Super Admin Access
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" autoComplete="off">
          <div>
            <label htmlFor="platform-email" className="block text-sm font-semibold mb-1.5">Email</label>
            <input
              id="platform-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="super@buildx.com"
              className="w-full p-2.5 border rounded-lg outline-none transition-all"
              style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" }}
            />
          </div>
          <div>
            <label htmlFor="platform-password" className="block text-sm font-semibold mb-1.5">Password</label>
            <input
              id="platform-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-2.5 border rounded-lg outline-none transition-all"
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
            className="w-full py-2.5 rounded-lg font-semibold shadow-md transition-opacity disabled:opacity-60"
            style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
          >
            {loading ? "Signing in..." : "Sign In to Platform"}
          </button>
        </form>

        <div className="text-center mt-6">
          <span
            className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "#FEF3C7", color: "#B45309" }}
          >
            Super Admin Only
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PlatformLoginPage() {
  return (
    <ThemeProvider defaultTheme="corporateBlue">
      <LoginForm />
    </ThemeProvider>
  );
}
