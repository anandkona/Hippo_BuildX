"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FiPlus, FiRefreshCw } from "react-icons/fi";

function formatINR(n: number) {
  if (!n) return "Custom";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: "active" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, p] = await Promise.all([
        fetch("/api/v1/platform/subscriptions"),
        fetch("/api/v1/platform/tenants"),
        fetch("/api/v1/platform/plans"),
      ]);
      if (s.ok) setSubscriptions((await s.json()).subscriptions ?? []);
      if (t.ok) setTenants((await t.json()).tenants ?? []);
      if (p.ok) setPlans(((await p.json()).plans ?? []).filter((x: any) => x.isActive !== false));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const assign = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/v1/platform/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: form.tenantId,
          planId: form.planId,
          status: form.status || "active",
          expiresAt: form.expiresAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-testid="platform-subscriptions">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Subscriptions & Billing</h1>
          <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>Active subscriptions across all tenants</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 border rounded-md text-sm flex items-center gap-2 cursor-pointer transition-all hover:bg-gray-50 hover:shadow-sm active:scale-95" style={{ borderColor: "var(--ui-border)" }}><FiRefreshCw /> Refresh</button>
          <button onClick={() => { setForm({ status: "active" }); setModalOpen(true); }} className="px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 shadow-md cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] active:scale-95" style={{ background: "var(--ui-primary)", color: "#fff" }}>
            <FiPlus /> Assign Plan
          </button>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm overflow-hidden" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 border-b" style={{ borderColor: "var(--ui-border)" }}>
            <tr>
              <th className="px-5 py-4 font-semibold">Tenant</th>
              <th className="px-5 py-4 font-semibold">Plan</th>
              <th className="px-5 py-4 font-semibold">Amount</th>
              <th className="px-5 py-4 font-semibold">Billing Cycle</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Next Billing</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--ui-border)" }}>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading...</td></tr>
            ) : subscriptions.map((s) => (
              <tr key={s.id} className="hover:bg-black/[0.02]">
                <td className="px-5 py-4">
                  <div className="font-medium">{s.tenantName}</div>
                  <div className="text-xs" style={{ color: "var(--ui-text-muted)" }}>{s.tenantSlug}</div>
                </td>
                <td className="px-5 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{s.planName}</span></td>
                <td className="px-5 py-4">{formatINR(s.planPrice)}</td>
                <td className="px-5 py-4 capitalize">{s.billingCycle || "monthly"}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === "active" ? "bg-green-100 text-green-700" : s.status === "past_due" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>{s.status}</span>
                </td>
                <td className="px-5 py-4" style={{ color: "var(--ui-text-muted)" }}>{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString("en-IN") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border p-6 shadow-2xl" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
            <h2 className="text-xl font-bold mb-4">Assign Plan</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Tenant</label>
                <select className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)" }} value={form.tenantId || ""} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
                  <option value="">Select tenant</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Plan</label>
                <select className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)" }} value={form.planId || ""} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                  <option value="">Select plan</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Next Billing</label>
                <input type="date" className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)" }} value={form.expiresAt || ""} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
              {error && <div className="text-sm" style={{ color: "var(--ui-danger)" }}>{error}</div>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-all active:scale-95" onClick={() => setModalOpen(false)}>Cancel</button>
              <button disabled={submitting || !form.tenantId || !form.planId} className="px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] active:scale-95 disabled:hover:brightness-100 disabled:active:scale-100 disabled:cursor-not-allowed" style={{ background: "var(--ui-primary)", color: "#fff" }} onClick={assign}>
                {submitting ? "Saving..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
