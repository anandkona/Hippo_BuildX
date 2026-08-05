"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiEdit2, FiLogIn, FiPause, FiPlay, FiCreditCard } from "react-icons/fi";

function formatINR(n: number) {
  if (!n) return "Custom";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function TenantDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`/api/v1/platform/tenants/${id}`),
        fetch("/api/v1/platform/plans"),
      ]);
      if (!tRes.ok) throw new Error("Tenant not found");
      const t = await tRes.json();
      setData(t);
      setName(t.tenant?.name || "");
      setPlanId(t.subscription?.planId || "");
      if (pRes.ok) {
        const p = await pRes.json();
        setPlans((p.plans ?? []).filter((x: any) => x.isActive !== false));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEdit = async () => {
    const res = await fetch(`/api/v1/platform/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setEditOpen(false);
      load();
    }
  };

  const saveSub = async () => {
    const res = await fetch("/api/v1/platform/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: id, planId, status: "active" }),
    });
    if (res.ok) {
      setSubOpen(false);
      load();
    }
  };

  const toggle = async (action: "suspend" | "resume") => {
    await fetch(`/api/v1/platform/tenants/${id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  };

  if (loading) return <div className="py-20 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading...</div>;
  if (error || !data) return <div className="py-20 text-center" style={{ color: "var(--ui-danger)" }}>{error || "Not found"}</div>;

  const { tenant, subscription, usage } = data;
  const usageItems = [
    { label: "Users", ...usage.users },
    { label: "Projects", ...usage.projects },
    { label: "Storage (GB)", ...usage.storage },
    { label: "API Calls", ...usage.apiCalls },
  ];

  return (
    <div className="flex flex-col gap-6" data-testid="platform-tenant-details">
      <button className="flex items-center gap-2 text-sm font-medium w-fit" style={{ color: "var(--ui-primary)" }} onClick={() => router.push("/platform/tenants")}>
        <FiArrowLeft /> Back to Tenants
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{tenant.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tenant.status === "active" ? "bg-green-100 text-green-700" : tenant.status === "suspended" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
              {tenant.status}
            </span>
            {subscription?.planName && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{subscription.planName}</span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--ui-text-muted)" }}>{tenant.domain}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 border rounded-md text-sm flex items-center gap-2" style={{ borderColor: "var(--ui-border)" }} onClick={() => window.open(`/login?workspace=${tenant.slug}`, "_blank")}>
            <FiLogIn /> Impersonate
          </button>
          <button className="px-3 py-2 border rounded-md text-sm flex items-center gap-2" style={{ borderColor: "var(--ui-border)" }} onClick={() => setEditOpen(true)}>
            <FiEdit2 /> Edit Details
          </button>
          <button className="px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2" style={{ background: "var(--ui-primary)", color: "#fff" }} onClick={() => setSubOpen(true)}>
            <FiCreditCard /> Manage Subscription
          </button>
          {tenant.status === "active" && (
            <button className="px-3 py-2 border rounded-md text-sm flex items-center gap-2 text-red-600 border-red-200" onClick={() => toggle("suspend")}>
              <FiPause /> Suspend
            </button>
          )}
          {tenant.status === "suspended" && (
            <button className="px-3 py-2 border rounded-md text-sm flex items-center gap-2 text-green-700" onClick={() => toggle("resume")}>
              <FiPlay /> Resume
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border p-5 shadow-sm" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
          <h3 className="font-semibold mb-4">Tenant Information</h3>
          <dl className="space-y-3 text-sm">
            {[
              ["Name", tenant.name],
              ["Slug", tenant.slug],
              ["Domain", tenant.domain],
              ["Schema", tenant.schemaName],
              ["Plan", subscription?.planName ? `${subscription.planName} (${formatINR(subscription.planPrice)}/${subscription.billingCycle || "month"})` : "—"],
              ["Created", new Date(tenant.createdAt).toLocaleString("en-IN")],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4">
                <dt style={{ color: "var(--ui-text-muted)" }}>{k}</dt>
                <dd className="font-medium text-right">{v as string}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-lg border p-5 shadow-sm" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
          <h3 className="font-semibold mb-4">Usage Overview</h3>
          <div className="flex flex-col gap-5">
            {usageItems.map((u) => {
              const pct = u.limit ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0;
              return (
                <div key={u.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{u.label}</span>
                    <span style={{ color: "var(--ui-text-muted)" }}>
                      {Number(u.used).toLocaleString("en-IN")}/{Number(u.limit).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? "var(--ui-danger)" : "var(--ui-primary)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editOpen && (
        <Modal title="Edit Tenant" onClose={() => setEditOpen(false)} onSave={saveEdit}>
          <label className="block text-sm font-semibold mb-1.5">Tenant Name</label>
          <input className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)" }} value={name} onChange={(e) => setName(e.target.value)} />
        </Modal>
      )}
      {subOpen && (
        <Modal title="Manage Subscription" onClose={() => setSubOpen(false)} onSave={saveSub}>
          <label className="block text-sm font-semibold mb-1.5">Plan</label>
          <select className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)" }} value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.displayName} — {formatINR(p.price)}</option>
            ))}
          </select>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, onSave }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border p-6 shadow-2xl" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
        <div className="flex justify-end gap-3 mt-6">
          <button className="px-4 py-2 rounded-lg hover:bg-gray-100" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded-lg font-semibold" style={{ background: "var(--ui-primary)", color: "#fff" }} onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
