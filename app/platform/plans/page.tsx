"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FiCheck, FiEdit2, FiPlus, FiRefreshCw } from "react-icons/fi";

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  billingCycle: string;
  maxUsers: number;
  maxProjects: number;
  maxStorageGb: number;
  maxApiCalls: number;
  supportLevel: string;
  isActive: boolean;
}

function formatINR(n: number) {
  if (n === 0) return "Custom";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>({});

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/plans");
      if (!res.ok) throw new Error("Failed to load plans");
      const data = await res.json();
      setPlans((data.plans ?? []).filter((p: Plan) => p.isActive !== false));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      displayName: "",
      description: "",
      price: 999,
      billingCycle: "monthly",
      maxUsers: 10,
      maxProjects: 5,
      maxStorageGb: 5,
      maxApiCalls: 10000,
      supportLevel: "Email",
    });
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({ ...plan });
    setModalOpen(true);
  };

  const save = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        const res = await fetch(`/api/v1/platform/plans/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
      } else {
        const res = await fetch("/api/v1/platform/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
      }
      setModalOpen(false);
      fetchPlans();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-testid="platform-plans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Subscription Management</h1>

        </div>
        <div className="flex gap-2">
          <button onClick={fetchPlans} className="px-3 py-2 border rounded-md text-sm flex items-center gap-2 cursor-pointer transition-all hover:bg-gray-50 hover:shadow-sm active:scale-95" style={{ borderColor: "var(--ui-border)" }}>
            <FiRefreshCw /> Refresh
          </button>
          <button onClick={openCreate} className="px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 shadow-md cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] active:scale-95" style={{ background: "var(--ui-primary)", color: "#fff" }}>
            <FiPlus /> Add New Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const popular = plan.name === "professional";
            const features = [
              `${plan.maxUsers >= 9999 ? "Unlimited" : plan.maxUsers} Users`,
              `${plan.maxProjects >= 9999 ? "Unlimited" : plan.maxProjects} Projects`,
              `${plan.maxStorageGb} GB Storage`,
              `${plan.maxApiCalls.toLocaleString("en-IN")} API Calls`,
              `${plan.supportLevel} Support`,
            ];
            return (
              <div
                key={plan.id}
                className="rounded-xl border p-6 shadow-sm flex flex-col relative"
                style={{
                  background: "var(--ui-surface)",
                  borderColor: popular ? "var(--ui-primary)" : "var(--ui-border)",
                  borderWidth: popular ? 2 : 1,
                }}
              >
                {popular && (
                  <span className="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--ui-primary-soft)", color: "var(--ui-primary)" }}>
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.displayName}</h3>
                <p className="text-sm mb-4 min-h-[40px]" style={{ color: "var(--ui-text-muted)" }}>{plan.description || "—"}</p>
                <div className="mb-5">
                  <span className="text-3xl font-bold" style={{ color: "var(--ui-primary)" }}>{formatINR(plan.price)}</span>
                  {plan.price > 0 && <span className="text-sm ml-1" style={{ color: "var(--ui-text-muted)" }}>/ {plan.billingCycle === "yearly" ? "year" : "month"}</span>}
                </div>
                <ul className="flex flex-col gap-2 mb-6 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <FiCheck className="text-green-600" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => openEdit(plan)} className="w-full py-2.5 border rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 cursor-pointer transition-all active:scale-95" style={{ borderColor: "var(--ui-border)" }}>
                  <FiEdit2 /> Edit Plan
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-xl border p-8 shadow-2xl" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
            <h2 className="text-xl font-bold mb-4">{editing ? "Edit Plan" : "Add New Plan"}</h2>
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {!editing && (
                <Field label="Plan Key" value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} placeholder="professional" />
              )}
              <Field label="Display Name" value={form.displayName || ""} onChange={(v) => setForm({ ...form, displayName: v })} />
              <Field label="Description" value={form.description || ""} onChange={(v) => setForm({ ...form, description: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (INR)" type="number" value={String(form.price ?? 0)} onChange={(v) => setForm({ ...form, price: Number(v) })} />
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Billing Cycle</label>
                  <select className="w-full p-2.5 border rounded-lg outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-transparent" style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }} value={form.billingCycle || "monthly"} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max Users" type="number" value={String(form.maxUsers ?? 0)} onChange={(v) => setForm({ ...form, maxUsers: Number(v) })} />
                <Field label="Max Projects" type="number" value={String(form.maxProjects ?? 0)} onChange={(v) => setForm({ ...form, maxProjects: Number(v) })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max Storage GB" type="number" value={String(form.maxStorageGb ?? 0)} onChange={(v) => setForm({ ...form, maxStorageGb: Number(v) })} />
                <Field label="Max API Calls" type="number" value={String(form.maxApiCalls ?? 0)} onChange={(v) => setForm({ ...form, maxApiCalls: Number(v) })} />
              </div>
              <Field label="Support Level" value={form.supportLevel || ""} onChange={(v) => setForm({ ...form, supportLevel: v })} />
            </div>
            {error && <div className="text-sm mt-3" style={{ color: "var(--ui-danger)" }}>{error}</div>}
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-all active:scale-95" onClick={() => setModalOpen(false)}>Cancel</button>
              <button disabled={submitting} className="px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] active:scale-95 disabled:hover:brightness-100 disabled:active:scale-100 disabled:cursor-not-allowed" style={{ background: "var(--ui-primary)", color: "#fff" }} onClick={save}>
                {submitting ? "Saving..." : editing ? "Save Changes" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 border rounded-lg outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-transparent"
        style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}
      />
    </div>
  );
}
