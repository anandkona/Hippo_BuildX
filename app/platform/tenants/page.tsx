"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiServer, FiEye, FiEyeOff, FiPause, FiPlay, FiRefreshCw } from "react-icons/fi";
import { Table, Tag } from "antd";

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
  confirmPassword: "",
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
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pt-1">
      {children}
      <label 
        className="absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-2 pointer-events-none"
        style={{ color: "var(--ui-text-muted)" }}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    </div>
  );
}

const inputCls = "block px-3 pb-2.5 pt-4 w-full text-sm border rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 peer bg-transparent transition-all";
const inputStyle = { borderColor: "var(--ui-border)", color: "var(--ui-text)" } as const;

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      return okSearch;
    });
  }, [tenants, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSlugManual(false);
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
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
  const canSubmit = Boolean(form.name && form.slug && form.adminPassword === form.confirmPassword);

  const columns = [
    {
      title: "S.No",
      key: "sno",
      render: (_: any, __: any, index: number) => index + 1,
      width: 80,
    },
    {
      title: "Company Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Tenant) => (
        <button
          className="font-semibold text-left cursor-pointer transition-all hover:opacity-80"
          style={{ color: "var(--ui-primary)" }}
          onClick={() => router.push(`/platform/tenants/${record.id}`)}
        >
          {text}
        </button>
      ),
    },
    {
      title: "GSTIN",
      dataIndex: "gstin",
      key: "gstin",
      render: (text: string) => text ? <span className="font-mono text-sm" style={{ color: "var(--ui-text-muted)" }}>{text}</span> : "—",
    },
    {
      title: "Location",
      key: "location",
      render: (_: any, record: Tenant) => (
        <span style={{ color: "var(--ui-text-muted)" }}>
          {[record.city, record.state].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      title: "Contact Name",
      dataIndex: "contactName",
      key: "contactName",
      render: (text: string) => <span className="font-medium">{text || "—"}</span>,
    },
    {
      title: "Contact Email",
      dataIndex: "contactEmail",
      key: "contactEmail",
      render: (text: string, record: Tenant) => (
        <span style={{ color: "var(--ui-text-muted)" }}>
          {text || record.contactPhone || "—"}
        </span>
      ),
    },
    {
      title: "Plan",
      dataIndex: "planName",
      key: "planName",
      filters: planOptions.map(p => ({ text: p, value: p })),
      onFilter: (value: boolean | React.Key, record: Tenant) => record.planName === value,
      render: (text: string) => text ? (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
          {text}
        </span>
      ) : "—",
    },
    {
      title: "Users",
      dataIndex: "userCount",
      key: "userCount",
      render: (count: number) => count ?? 0,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "Active", value: "active" },
        { text: "Suspended", value: "suspended" },
        { text: "Pending", value: "provisioning" },
        { text: "Failed", value: "failed" },
      ],
      onFilter: (value: boolean | React.Key, record: Tenant) => record.status === value,
      render: (status: string) => {
        if (status === "active") return <Tag color="green">Active</Tag>;
        if (status === "provisioning") return <Tag color="orange" className="animate-pulse">Provisioning DB...</Tag>;
        if (status === "suspended") return <Tag color="red">Suspended</Tag>;
        if (status === "failed") return <Tag color="red">Failed</Tag>;
        return <Tag>{status}</Tag>;
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (
        <span style={{ color: "var(--ui-text-muted)" }}>
          {new Date(date).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      render: (_: any, record: Tenant) => (
        <div className="flex items-center justify-end gap-2">
          <button
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-all active:scale-95"
            title="View"
            onClick={() => router.push(`/platform/tenants/${record.id}`)}
          >
            <FiEye size={16} />
          </button>
          {(record.status === "active" || record.status === "suspended") && (
            <button
              className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-all active:scale-95"
              title={record.status === "suspended" ? "Resume" : "Suspend"}
              onClick={() => toggleStatus(record)}
            >
              {record.status === "suspended" ? <FiPlay size={16} className="text-green-600" /> : <FiPause size={16} className="text-orange-500" />}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6" data-testid="platform-tenants">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Tenant Control Panel</h1>
          <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>

          </p>
        </div>
        <button
          className="px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 shadow-md cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] active:scale-95"
          style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
          onClick={openCreate}
        >
          <FiPlus /> New Tenant
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
        <button
          onClick={fetchTenants}
          className="px-3 py-2 border rounded-md text-sm flex items-center gap-2 cursor-pointer transition-all hover:bg-gray-50 hover:shadow-sm active:scale-95"
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

      <div
        className="rounded-lg overflow-hidden border shadow-sm bg-white [&_.ant-table-body::-webkit-scrollbar]:hidden [&_.ant-table-body]:[-ms-overflow-style:none] [&_.ant-table-body]:[scrollbar-width:none]"
        style={{ borderColor: "var(--ui-border)" }}
      >
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{ defaultPageSize: 15 }}
          scroll={{ x: 'max-content', y: 'calc(60vh - 120px)' }}
          size="middle"
        />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
          <div
            className="rounded-xl w-full max-w-3xl shadow-2xl border flex flex-col max-h-[92vh]"
            style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}
          >
            <div className="px-8 pt-7 pb-4 border-b" style={{ borderColor: "var(--ui-border)" }}>
              <h2 className="text-2xl font-bold mb-1">New Tenant</h2>
            </div>

            <div className="px-8 py-5 overflow-y-auto flex-1 space-y-7">
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "var(--ui-text-muted)" }}>
                  Company
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Company / Trade Name" required>
                    <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder=" " />
                  </Field>
                  <Field label="Legal Entity Name">
                    <input className={inputCls} style={inputStyle} value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} placeholder=" " />
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
                  <Field label="GSTIN">
                    <input className={`${inputCls} font-mono uppercase`} style={inputStyle} value={form.gstin} onChange={(e) => setField("gstin", e.target.value.toUpperCase())} placeholder=" " maxLength={15} />
                  </Field>
                  <Field label="PAN">
                    <input className={`${inputCls} font-mono uppercase`} style={inputStyle} value={form.pan} onChange={(e) => setField("pan", e.target.value.toUpperCase())} placeholder=" " maxLength={10} />
                  </Field>
                  <Field label="CIN">
                    <input className={`${inputCls} font-mono uppercase`} style={inputStyle} value={form.cin} onChange={(e) => setField("cin", e.target.value.toUpperCase())} placeholder=" " />
                  </Field>
                  <Field label="Website">
                    <input className={inputCls} style={inputStyle} value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder=" " />
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
                      <input className={inputCls} style={inputStyle} value={form.addressLine1} onChange={(e) => setField("addressLine1", e.target.value)} placeholder=" " />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Address Line 2">
                      <input className={inputCls} style={inputStyle} value={form.addressLine2} onChange={(e) => setField("addressLine2", e.target.value)} placeholder=" " />
                    </Field>
                  </div>
                  <Field label="City">
                    <input className={inputCls} style={inputStyle} value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder=" " />
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
                    <input className={inputCls} style={inputStyle} value={form.pincode} onChange={(e) => setField("pincode", e.target.value)} placeholder=" " maxLength={10} />
                  </Field>
                  <Field label="Country">
                    <input className={inputCls} style={inputStyle} value={form.country} onChange={(e) => setField("country", e.target.value)} placeholder=" " />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "var(--ui-text-muted)" }}>
                  Primary Contact <span className="normal-case font-normal">(optional)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Contact Name">
                    <input className={inputCls} style={inputStyle} value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} placeholder=" " />
                  </Field>
                  <Field label="Designation">
                    <input className={inputCls} style={inputStyle} value={form.contactDesignation} onChange={(e) => setField("contactDesignation", e.target.value)} placeholder=" " />
                  </Field>
                  <Field label="Work Email">
                    <input type="email" className={inputCls} style={inputStyle} value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} placeholder=" " />
                  </Field>
                  <Field label="Mobile / Phone">
                    <input className={inputCls} style={inputStyle} value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} placeholder=" " />
                  </Field>
                  <Field label="Billing Email">
                    <input type="email" className={inputCls} style={inputStyle} value={form.billingEmail} onChange={(e) => setField("billingEmail", e.target.value)} placeholder=" " />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "var(--ui-text-muted)" }}>
                  Workspace & First Login
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Tenant Admin Name">
                    <input className={inputCls} style={inputStyle} value={form.adminName} onChange={(e) => setField("adminName", e.target.value)} placeholder=" " />
                  </Field>
                  <Field label="Tenant Admin Email">
                    <input type="email" className={inputCls} style={inputStyle} value={form.adminEmail} onChange={(e) => setField("adminEmail", e.target.value)} placeholder=" " />
                  </Field>
                  <Field label="Temp Password">
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} className={inputCls} style={inputStyle} value={form.adminPassword} onChange={(e) => setField("adminPassword", e.target.value)} placeholder=" " />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer transition-all active:scale-95">
                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm Temp Password">
                    <div className="relative">
                      <input type={showConfirmPassword ? "text" : "password"} className={inputCls} style={inputStyle} value={form.confirmPassword} onChange={(e) => setField("confirmPassword", e.target.value)} placeholder=" " />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer transition-all active:scale-95">
                        {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
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
              <button className="px-5 py-2.5 rounded-lg font-medium hover:bg-gray-100 cursor-pointer transition-all active:scale-95" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                className="px-5 py-2.5 rounded-lg font-semibold shadow-md disabled:opacity-50 cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] active:scale-95 disabled:hover:brightness-100 disabled:active:scale-100 disabled:cursor-not-allowed"
                style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
                onClick={handleCreate}
                disabled={submitting || !canSubmit}
              >
                {submitting ? "Adding..." : "Add"}
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
              Share these credentials once. Sign in at the central login with the workspace filled in.
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
                className="px-4 py-2 rounded-lg border text-sm cursor-pointer transition-all hover:bg-gray-50 active:scale-95"
                style={{ borderColor: "var(--ui-border)" }}
                onClick={() => window.open(`/login?workspace=${credentials.workspace}`, "_blank")}
              >
                Open login
              </button>
              <button
                className="px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] active:scale-95"
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
