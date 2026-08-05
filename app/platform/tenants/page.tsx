"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiServer, FiEye, FiPause, FiPlay, FiRefreshCw } from "react-icons/fi";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: string;
  planName?: string | null;
  planId?: string | null;
  userCount?: number;
  createdAt: string;
}

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", planId: "" });

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes] = await Promise.all([
        fetch("/api/v1/platform/tenants"),
        fetch("/api/v1/platform/plans"),
      ]);
      if (!tRes.ok) throw new Error("Failed to fetch tenants");
      const tData = await tRes.json();
      setTenants(tData.tenants ?? []);
      if (pRes.ok) {
        const pData = await pRes.json();
        setPlans((pData.plans ?? []).filter((p: any) => p.isActive !== false));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const q = search.toLowerCase();
      const okSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.domain || "").toLowerCase().includes(q);
      const okPlan = !planFilter || t.planName === planFilter;
      const okStatus = !statusFilter || t.status === statusFilter;
      return okSearch && okPlan && okStatus;
    });
  }, [tenants, search, planFilter, statusFilter]);

  const handleCreate = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/v1/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          planId: form.planId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setModalOpen(false);
      setForm({ name: "", slug: "", planId: "" });
      fetchTenants();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (tenant: Tenant) => {
    const action = tenant.status === "suspended" ? "resume" : "suspend";
    const res = await fetch(`/api/v1/platform/tenants/${tenant.id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) fetchTenants();
  };

  const planOptions = Array.from(new Set(tenants.map((t) => t.planName).filter(Boolean))) as string[];

  return (
    <div className="flex flex-col gap-6" data-testid="platform-tenants">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Tenant Control Plane</h1>
          <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>
            Platform Super Admin view. Provision isolated schemas and manage subscriptions.
          </p>
        </div>
        <button
          className="px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 shadow-md"
          style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
          onClick={() => setModalOpen(true)}
        >
          <FiPlus /> Provision Tenant
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tenants..."
          className="px-3 py-2 border rounded-md text-sm min-w-[240px]"
          style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface)" }}
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
          style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface)" }}
        >
          <option value="">Filter by Plan</option>
          {planOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
          style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface)" }}
        >
          <option value="">Filter by Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="provisioning">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <button
          onClick={fetchTenants}
          className="px-3 py-2 border rounded-md text-sm flex items-center gap-2"
          style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface)" }}
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {error && (
        <div className="text-sm px-3 py-2 rounded-md" style={{ background: "#FEE2E2", color: "var(--ui-danger)" }}>
          {error}
        </div>
      )}

      <div className="rounded-lg overflow-hidden border shadow-sm" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b bg-gray-50/50" style={{ borderColor: "var(--ui-border)" }}>
              <tr>
                <th className="px-5 py-4 font-semibold">Company Name</th>
                <th className="px-5 py-4 font-semibold">Subdomain</th>
                <th className="px-5 py-4 font-semibold">Plan</th>
                <th className="px-5 py-4 font-semibold">Users</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Created</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--ui-border)" }}>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center" style={{ color: "var(--ui-text-muted)" }}>No tenants found</td></tr>
              ) : (
                filtered.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-black/[0.02]">
                    <td className="px-5 py-4">
                      <button
                        className="font-semibold flex items-center gap-2"
                        style={{ color: "var(--ui-primary)" }}
                        onClick={() => router.push(`/platform/tenants/${tenant.id}`)}
                      >
                        <FiServer className="text-gray-400" />
                        {tenant.name}
                      </button>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {tenant.domain || `${tenant.slug}.hippobuildx.com`}
                    </td>
                    <td className="px-5 py-4">
                      {tenant.planName ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {tenant.planName}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4">{tenant.userCount ?? 0}</td>
                    <td className="px-5 py-4">
                      {tenant.status === "active" && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>}
                      {tenant.status === "provisioning" && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 animate-pulse">Provisioning DB...</span>}
                      {tenant.status === "suspended" && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Suspended</span>}
                      {tenant.status === "failed" && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Failed</span>}
                    </td>
                    <td className="px-5 py-4" style={{ color: "var(--ui-text-muted)" }}>
                      {new Date(tenant.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1.5 rounded-md hover:bg-gray-100"
                          title="View"
                          onClick={() => router.push(`/platform/tenants/${tenant.id}`)}
                        >
                          <FiEye size={16} />
                        </button>
                        {(tenant.status === "active" || tenant.status === "suspended") && (
                          <button
                            className="p-1.5 rounded-md hover:bg-gray-100"
                            title={tenant.status === "suspended" ? "Resume" : "Suspend"}
                            onClick={() => toggleStatus(tenant)}
                          >
                            {tenant.status === "suspended" ? <FiPlay size={16} className="text-green-600" /> : <FiPause size={16} className="text-orange-500" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="p-8 rounded-xl w-full max-w-lg shadow-2xl border" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
            <h2 className="text-2xl font-bold mb-1">Provision New Tenant</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ui-text-muted)" }}>
              Creates a new isolated database schema and seeds the initial tenant admin.
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Company Name</label>
                <input
                  className="w-full p-2.5 border rounded-lg outline-none"
                  style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" }}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Skyline Construction"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Subdomain</label>
                <div className="flex items-center">
                  <input
                    className="w-full p-2.5 border border-r-0 rounded-l-lg outline-none font-mono text-sm"
                    style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" }}
                    value={form.slug}
                    onChange={(e) =>
                      setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                    }
                    placeholder="skyline"
                  />
                  <div className="px-4 py-2.5 bg-gray-100 border border-l-0 rounded-r-lg text-gray-500 text-sm font-mono whitespace-nowrap" style={{ borderColor: "var(--ui-border)" }}>
                    .hippobuildx.com
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Initial Plan</label>
                <select
                  className="w-full p-2.5 border rounded-lg outline-none"
                  style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" }}
                  value={form.planId}
                  onChange={(e) => setForm({ ...form, planId: e.target.value })}
                >
                  <option value="">Optional</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} — {p.price === 0 ? "Custom" : `₹${p.price}/mo`}
                    </option>
                  ))}
                </select>
              </div>
              {error && (
                <div className="text-sm" style={{ color: "var(--ui-danger)" }}>{error}</div>
              )}
              <div className="flex justify-end gap-3 mt-2 pt-4 border-t" style={{ borderColor: "var(--ui-border)" }}>
                <button className="px-5 py-2.5 rounded-lg font-medium hover:bg-gray-100" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 rounded-lg font-semibold shadow-md disabled:opacity-50"
                  style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
                  onClick={handleCreate}
                  disabled={submitting || !form.name || !form.slug}
                >
                  {submitting ? "Provisioning..." : "Provision Schema"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
