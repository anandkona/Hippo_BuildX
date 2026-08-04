"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FiMail, FiLock, FiArrowRight } from "react-icons/fi";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate real auth by setting a cookie that the middleware checks
    document.cookie = "auth=true; path=/; max-age=86400"; // 24 hours
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "var(--ui-sidebar)" }}>
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--ui-primary)]/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[var(--ui-info)]/20 blur-[100px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="p-8 md:p-10">
            
            {/* Logo / Branding */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl font-bold" style={{ background: "var(--ui-primary)" }}>
                  HB
                </div>
                <span className="text-2xl font-bold" style={{ color: "var(--ui-text)" }}>Hippo Build X</span>
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-xl font-bold mb-2" style={{ color: "var(--ui-text)" }}>Welcome back</h1>
              <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>Enter your credentials to access your workspace.</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--ui-text)" }}>Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiMail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-gray-50/50"
                    style={{ borderColor: "var(--ui-border)", focusRing: "var(--ui-primary-soft)" }}
                    placeholder="admin@hippobuild.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium" style={{ color: "var(--ui-text)" }}>Password</label>
                  <a href="#" className="text-xs font-medium hover:underline" style={{ color: "var(--ui-primary)" }}>Forgot Password?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiLock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-gray-50/50"
                    style={{ borderColor: "var(--ui-border)", focusRing: "var(--ui-primary-soft)" }}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" id="remember" className="rounded accent-[var(--ui-primary)] w-4 h-4" />
                <label htmlFor="remember" className="text-sm" style={{ color: "var(--ui-text-muted)" }}>Remember me for 30 days</label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg mt-2"
                style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
              >
                Sign In
                <FiArrowRight size={18} />
              </button>
            </form>
          </div>
          
          <div className="px-8 py-5 text-center text-xs border-t bg-gray-50" style={{ borderColor: "var(--ui-border)", color: "var(--ui-text-muted)" }}>
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
}
