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
  city?: string | null;
  state?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  gstin?: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  name: "",
  legalName: "",
  slug: "",
  industry: "Construction",
  companySize: "",
  gstin: "",
  pan: "",
  cin: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactDesignation: "",
  billingEmail: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  planId: "",
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Chandigarh", "Puducherry",
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--ui-text-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

const inputCls = "w-full p-2.5 border rounded-lg outline-none text-sm";
const inputStyle = { borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" } as const;

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
  const [slugManual, setSlugManual] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [credentials, setCredentials] = useState<{
    workspace: string;
    adminEmail: string;
    adminPassword: string;
  } | null>(null);

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugManual) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  };

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
        (t.domain || "").toLowerCase().includes(q) ||
        (t.city || "").toLowerCase().includes(q) ||
        (t.contactEmail || "").toLowerCase().includes(q) ||
        (t.contactName || "").toLowerCase().includes(q);
      const okPlan = !planFilter || t.planName === planFilter;
      const okStatus = !statusFilter || t.status === statusFilter;
      return okSearch && okPlan && okStatus;
    });
  }, [tenants, search, planFilter, statusFilter]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSlugManual(false);
    setError("");
    setModalOpen(true);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/v1/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          planId: form.planId || undefined,
          billingEmail: form.billingEmail || form.contactEmail || undefined,
          adminName: form.adminName || form.contactName || undefined,
          adminEmail: form.adminEmail || form.contactEmail || undefined,
          adminPassword: form.adminPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      if (data.credentials) setCredentials(data.credentials);
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
  const canSubmit = Boolean(form.name && form.slug);

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
          onClick={openCreate}
        >
          <FiPlus /> Provision Tenant
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, city, contact..."
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

      {error && !modalOpen && (
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
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Primary Contact</th>
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
                <tr><td colSpan={9} className="px-5 py-10 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center" style={{ color: "var(--ui-text-muted)" }}>No tenants found</td></tr>
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
                      {tenant.gstin && (
                        <div className="text-xs mt-0.5 font-mono" style={{ color: "var(--ui-text-muted)" }}>
                          GSTIN {tenant.gstin}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4" style={{ color: "var(--ui-text-muted)" }}>
                      {[tenant.city, tenant.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium">{tenant.contactName || "—"}</div>
                      <div className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                        {tenant.contactEmail || tenant.contactPhone || ""}
                      </div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
          <div
            className="rounded-xl w-full max-w-3xl shadow-2xl border flex flex-col max-h-[92vh]"
            style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}
          >
            <div className="px-8 pt-7 pb-4 border-b" style={{ borderColor: "var(--ui-border)" }}>
              <h2 className="text-2xl font-bold mb-1">Provision New Tenant</h2>
              <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>
                Capture company details if available. Only company name and subdomain are required — contact and address are optional.
              </p>
            </div>

            <div className="px-8 py-5 overflow-y-auto flex-1 space-y-7">
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "var(--ui-text-muted)" }}>
                  Company
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Company / Trade Name" required>
                    <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Skyline Construction" />
                  </Field>
                  <Field label="Legal Entity Name" hint="Optional — as on GST / MCA">
                    <input className={inputCls} style={inputStyle} value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} placeholder="Skyline Construction Pvt Ltd" />
                  </Field>
                  <Field label="Industry">
                    <select className={inputCls} style={inputStyle} value={form.industry} onChange={(e) => setField("industry", e.target.value)}>
                      <option>Construction</option>
                      <option>Real Estate Development</option>
                      <option>Infrastructure</option>
                      <option>EPC Contractor</option>
                      <option>Interior / Fit-out</option>
                      <option>Other</option>
                    </select>
                  </Field>
                  <Field label="Company Size">
                    <select className={inputCls} style={inputStyle} value={form.companySize} onChange={(e) => setField("companySize", e.target.value)}>
                      <option value="">Select</option>
                      <option value="1-50">1–50 employees</option>
                      <option value="51-200">51–200 employees</option>
                      <option value="201-500">201–500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </Field>
                  <Field label="GSTIN" hint="15-character GST identification number">
                    <input className={`${inputCls} font-mono uppercase`} style={inputStyle} value={form.gstin} onChange={(e) => setField("gstin", e.target.value.toUpperCase())} placeholder="27AABCU9603R1ZM" maxLength={15} />
                  </Field>
                  <Field label="PAN">
                    <input className={`${inputCls} font-mono uppercase`} style={inputStyle} value={form.pan} onChange={(e) => setField("pan", e.target.value.toUpperCase())} placeholder="AABCU9603R" maxLength={10} />
                  </Field>
                  <Field label="CIN" hint="Optional MCA company identification">
                    <input className={`${inputCls} font-mono uppercase`} style={inputStyle} value={form.cin} onChange={(e) => setField("cin", e.target.value.toUpperCase())} placeholder="U45200MH2015PTC123456" />
                  </Field>
                  <Field label="Website">
                    <input className={inputCls} style={inputStyle} value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://skyline.example.com" />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "var(--ui-text-muted)" }}>
                  Registered Address <span className="normal-case font-normal">(optional)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Field label="Address Line 1">
                      <input className={inputCls} style={inputStyle} value={form.addressLine1} onChange={(e) => setField("addressLine1", e.target.value)} placeholder="Plot 12, Business Park" />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Address Line 2">
                      <input className={inputCls} style={inputStyle} value={form.addressLine2} onChange={(e) => setField("addressLine2", e.target.value)} placeholder="Andheri East" />
                    </Field>
                  </div>
                  <Field label="City">
                    <input className={inputCls} style={inputStyle} value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Mumbai" />
                  </Field>
                  <Field label="State">
                    <select className={inputCls} style={inputStyle} value={form.state} onChange={(e) => setField("state", e.target.value)}>
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="PIN Code">
                    <input className={inputCls} style={inputStyle} value={form.pincode} onChange={(e) => setField("pincode", e.target.value)} placeholder="400069" maxLength={10} />
                  </Field>
                  <Field label="Country">
                    <input className={inputCls} style={inputStyle} value={form.country} onChange={(e) => setField("country", e.target.value)} />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "var(--ui-text-muted)" }}>
                  Primary Contact <span className="normal-case font-normal">(optional)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Contact Name">
                    <input className={inputCls} style={inputStyle} value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} placeholder="Ravi Mehta" />
                  </Field>
                  <Field label="Designation">
                    <input className={inputCls} style={inputStyle} value={form.contactDesignation} onChange={(e) => setField("contactDesignation", e.target.value)} placeholder="Director / Admin Head" />
                  </Field>
                  <Field label="Work Email">
                    <input type="email" className={inputCls} style={inputStyle} value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} placeholder="ravi@skyline.example.com" />
                  </Field>
                  <Field label="Mobile / Phone">
                    <input className={inputCls} style={inputStyle} value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} placeholder="+91 98765 43210" />
                  </Field>
                  <Field label="Billing Email">
                    <input type="email" className={inputCls} style={inputStyle} value={form.billingEmail} onChange={(e) => setField("billingEmail", e.target.value)} placeholder="accounts@skyline.example.com" />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "var(--ui-text-muted)" }}>
                  Workspace & First Login
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Field label="Subdomain" required hint="Auto-filled from company name; edit if needed">
                      <div className="flex items-center">
                        <input
                          className="w-full p-2.5 border border-r-0 rounded-l-lg outline-none font-mono text-sm"
                          style={inputStyle}
                          value={form.slug}
                          onChange={(e) => {
                            setSlugManual(true);
                            setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                          }}
                          placeholder="skyline"
                        />
                        <div className="px-4 py-2.5 bg-gray-100 border border-l-0 rounded-r-lg text-gray-500 text-sm font-mono whitespace-nowrap" style={{ borderColor: "var(--ui-border)" }}>
                          .hippobuildx.com
                        </div>
                      </div>
                    </Field>
                  </div>
                  <Field label="Tenant Admin Name">
                    <input className={inputCls} style={inputStyle} value={form.adminName} onChange={(e) => setField("adminName", e.target.value)} placeholder="Defaults to contact / company admin" />
                  </Field>
                  <Field label="Tenant Admin Email" hint="Leave blank to use admin@{slug}.local">
                    <input type="email" className={inputCls} style={inputStyle} value={form.adminEmail} onChange={(e) => setField("adminEmail", e.target.value)} placeholder="admin@skyline.example.com" />
                  </Field>
                  <Field label="Temp Password" hint="Defaults to password123 — shown once after create">
                    <input className={inputCls} style={inputStyle} value={form.adminPassword} onChange={(e) => setField("adminPassword", e.target.value)} placeholder="password123" />
                  </Field>
                  <Field label="Initial Plan">
                    <select className={inputCls} style={inputStyle} value={form.planId} onChange={(e) => setField("planId", e.target.value)}>
                      <option value="">Optional — assign later</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName} — {p.price === 0 ? "Custom" : `₹${p.price}/mo`}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>

              {error && (
                <div className="text-sm px-3 py-2 rounded-md" style={{ background: "#FEE2E2", color: "var(--ui-danger)" }}>
                  {error}
                </div>
              )}
            </div>

            <div className="px-8 py-4 border-t flex justify-end gap-3" style={{ borderColor: "var(--ui-border)" }}>
              <button className="px-5 py-2.5 rounded-lg font-medium hover:bg-gray-100" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                className="px-5 py-2.5 rounded-lg font-semibold shadow-md disabled:opacity-50"
                style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
                onClick={handleCreate}
                disabled={submitting || !canSubmit}
              >
                {submitting ? "Provisioning..." : "Provision Schema"}
              </button>
            </div>
          </div>
        </div>
      )}

      {credentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div
            className="p-8 rounded-xl w-full max-w-md shadow-2xl border"
            style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}
            data-testid="tenant-credentials"
          >
            <h2 className="text-xl font-bold mb-1">Tenant ready</h2>
            <p className="text-sm mb-5" style={{ color: "var(--ui-text-muted)" }}>
              Share these credentials once. Sign in at /login with the admin email and temp password.
            </p>
            <dl className="space-y-3 text-sm mb-6">
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--ui-text-muted)" }}>Workspace</dt>
                <dd className="font-mono font-semibold">{credentials.workspace}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--ui-text-muted)" }}>Admin email</dt>
                <dd className="font-medium break-all">{credentials.adminEmail}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--ui-text-muted)" }}>Temp password</dt>
                <dd className="font-mono font-semibold">{credentials.adminPassword}</dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border text-sm"
                style={{ borderColor: "var(--ui-border)" }}
                onClick={() => window.open("/login", "_blank")}
              >
                Open login
              </button>
              <button
                className="px-4 py-2 rounded-lg font-semibold text-sm"
                style={{ background: "var(--ui-primary)", color: "#fff" }}
                onClick={() => setCredentials(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
