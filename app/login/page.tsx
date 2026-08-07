"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";

/** Hardcoded colors so email/password stay visible before any theme JS runs */
const ui = {
  pageBg: "#082F49",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#D7E0EC",
  inputBg: "#F8FAFC",
  primary: "#1D4ED8",
  danger: "#B91C1C",
  dangerBg: "#FEE2E2",
  glow: "#1D4ED8",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const fromReset = searchParams.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
    color: ui.text,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${ui.border}`,
    background: ui.inputBg,
    color: ui.text,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
        position: "relative",
        overflow: "hidden",
        background: ui.pageBg,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -96,
          left: -96,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: ui.glow,
          opacity: 0.28,
          filter: "blur(64px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -96,
          right: -96,
          width: 384,
          height: 384,
          borderRadius: "50%",
          background: "#ef4444",
          opacity: 0.2,
          filter: "blur(64px)",
        }}
      />

      <div
        data-testid="central-login"
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
          padding: 32,
          position: "relative",
          zIndex: 10,
          background: ui.card,
          border: `1px solid ${ui.border}`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 4,
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "-0.04em",
              marginBottom: 12,
              fontFamily: '"Trebuchet MS", sans-serif',
            }}
          >
            <span style={{ fontSize: 30, color: ui.primary }}>Hippo</span>
            <span style={{ fontSize: 30, color: "#ef4444" }}>build</span>
            <span style={{ fontSize: 36, color: "#ef4444" }}>X</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: ui.text, margin: 0 }}>Sign in</h1>
          <p style={{ fontSize: 14, marginTop: 6, color: ui.muted, marginBottom: 0 }}>
            Enter your email and password to continue
          </p>
        </div>

        <form onSubmit={onSubmit} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="email" style={labelStyle}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <label htmlFor="password" style={{ ...labelStyle, marginBottom: 0 }}>
                Password
              </label>
              <a
                href="/forgot-password"
                style={{ fontSize: 13, fontWeight: 600, color: ui.primary, textDecoration: "none" }}
              >
                Forgot password?
              </a>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: ui.muted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                fontSize: 14,
                padding: "10px 12px",
                borderRadius: 8,
                background: ui.dangerBg,
                color: ui.danger,
              }}
            >
              {error}
            </div>
          )}

          {fromReset && (
            <div
              style={{
                fontSize: 14,
                padding: "10px 12px",
                borderRadius: 8,
                background: "#ECFDF5",
                color: "#15803D",
              }}
            >
              Password updated. Sign in with your new password.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              fontWeight: 600,
              fontSize: 15,
              color: "#FFFFFF",
              background: ui.primary,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.65 : 1,
              boxShadow: "0 4px 14px rgba(29, 78, 216, 0.35)",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 24,
          width: "100%",
          textAlign: "center",
          fontSize: 12,
          fontWeight: 600,
          color: ui.muted,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          zIndex: 10,
        }}
      >
        Powered by Hippoclouds
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: ui.pageBg }} />}>
      <LoginForm />
    </Suspense>
  );
}
