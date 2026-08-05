"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiEdit2, FiLogIn, FiPause, FiPlay, FiCreditCard } from "react-icons/fi";

function formatINR(n: number) {
  if (!n) return "Custom";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Chandigarh", "Puducherry",
];

type EditForm = {
  name: string;
  legalName: string;
  industry: string;
  companySize: string;
  gstin: string;
  pan: string;
  cin: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactDesignation: string;
  billingEmail: string;
  adminName: string;
  adminEmail: string;
};

function emptyEdit(): EditForm {
  return {
    name: "",
    legalName: "",
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
  };
}

function fromTenant(t: any): EditForm {
  return {
    name: t.name || "",
    legalName: t.legalName || "",
    industry: t.industry || "Construction",
    companySize: t.companySize || "",
    gstin: t.gstin || "",
    pan: t.pan || "",
    cin: t.cin || "",
    website: t.website || "",
    addressLine1: t.addressLine1 || "",
    addressLine2: t.addressLine2 || "",
    city: t.city || "",
    state: t.state || "",
    pincode: t.pincode || "",
    country: t.country || "India",
    contactName: t.contactName || "",
    contactEmail: t.contactEmail || "",
    contactPhone: t.contactPhone || "",
    contactDesignation: t.contactDesignation || "",
    billingEmail: t.billingEmail || "",
    adminName: t.adminName || "",
    adminEmail: t.adminEmail || "",
  };
}

export default function TenantDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [edit, setEdit] = useState<EditForm>(emptyEdit());
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      setEdit(fromTenant(t.tenant || {}));
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
    setSaving(true);
    const res = await fetch(`/api/v1/platform/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    setSaving(false);
    if (res.ok) {
      setEditOpen(false);
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to save");
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
  if (error && !data) return <div className="py-20 text-center" style={{ color: "var(--ui-danger)" }}>{error}</div>;
  if (!data) return <div className="py-20 text-center" style={{ color: "var(--ui-danger)" }}>Not found</div>;

  const { tenant, subscription, usage } = data;
  const usageItems = [
    { label: "Users", ...usage.users },
    { label: "Projects", ...usage.projects },
    { label: "Storage (GB)", ...usage.storage },
    { label: "API Calls", ...usage.apiCalls },
  ];

  const address = [
    tenant.addressLine1,
    tenant.addressLine2,
    [tenant.city, tenant.state, tenant.pincode].filter(Boolean).join(", "),
    tenant.country,
  ]
    .filter(Boolean)
    .join(" · ");

  const inputCls = "w-full p-2.5 border rounded-lg text-sm";
  const inputStyle = { borderColor: "var(--ui-border)" };

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
          {(tenant.city || tenant.contactName) && (
            <p className="text-sm mt-1" style={{ color: "var(--ui-text-muted)" }}>
              {[tenant.city && tenant.state ? `${tenant.city}, ${tenant.state}` : tenant.city, tenant.contactName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 border rounded-md text-sm flex items-center gap-2" style={{ borderColor: "var(--ui-border)" }} onClick={() => window.open(`/login?workspace=${tenant.slug}`, "_blank")}>
            <FiLogIn /> Impersonate
          </button>
          <button className="px-3 py-2 border rounded-md text-sm flex items-center gap-2" style={{ borderColor: "var(--ui-border)" }} onClick={() => { setEdit(fromTenant(tenant)); setEditOpen(true); }}>
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
          <h3 className="font-semibold mb-4">Company Profile</h3>
          <dl className="space-y-3 text-sm">
            {[
              ["Trade Name", tenant.name],
              ["Legal Name", tenant.legalName || "—"],
              ["Industry", tenant.industry || "—"],
              ["Company Size", tenant.companySize || "—"],
              ["GSTIN", tenant.gstin || "—"],
              ["PAN", tenant.pan || "—"],
              ["CIN", tenant.cin || "—"],
              ["Website", tenant.website || "—"],
              ["Address", address || "—"],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4">
                <dt style={{ color: "var(--ui-text-muted)" }}>{k}</dt>
                <dd className="font-medium text-right max-w-[60%] break-words">{v as string}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-lg border p-5 shadow-sm" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
          <h3 className="font-semibold mb-4">Contacts & Workspace</h3>
          <dl className="space-y-3 text-sm">
            {[
              ["Primary Contact", tenant.contactName || "—"],
              ["Designation", tenant.contactDesignation || "—"],
              ["Work Email", tenant.contactEmail || "—"],
              ["Phone", tenant.contactPhone || "—"],
              ["Billing Email", tenant.billingEmail || "—"],
              ["Tenant Admin", tenant.adminName || "—"],
              ["Admin Email", tenant.adminEmail || "—"],
              ["Slug", tenant.slug],
              ["Domain", tenant.domain],
              ["Schema", tenant.schemaName],
              ["Plan", subscription?.planName ? `${subscription.planName} (${formatINR(subscription.planPrice)}/${subscription.billingCycle || "month"})` : "—"],
              ["Created", new Date(tenant.createdAt).toLocaleString("en-IN")],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4">
                <dt style={{ color: "var(--ui-text-muted)" }}>{k}</dt>
                <dd className="font-medium text-right max-w-[60%] break-words">{v as string}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-lg border p-5 shadow-sm lg:col-span-2" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
          <h3 className="font-semibold mb-4">Usage Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-3xl rounded-xl border shadow-2xl flex flex-col max-h-[92vh]" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
            <div className="px-6 pt-5 pb-3 border-b" style={{ borderColor: "var(--ui-border)" }}>
              <h2 className="text-xl font-bold">Edit Tenant Details</h2>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(
                  [
                    ["name", "Trade Name"],
                    ["legalName", "Legal Name"],
                    ["industry", "Industry"],
                    ["companySize", "Company Size"],
                    ["gstin", "GSTIN"],
                    ["pan", "PAN"],
                    ["cin", "CIN"],
                    ["website", "Website"],
                    ["addressLine1", "Address Line 1"],
                    ["addressLine2", "Address Line 2"],
                    ["city", "City"],
                    ["pincode", "PIN Code"],
                    ["country", "Country"],
                    ["contactName", "Contact Name"],
                    ["contactDesignation", "Designation"],
                    ["contactEmail", "Work Email"],
                    ["contactPhone", "Phone"],
                    ["billingEmail", "Billing Email"],
                    ["adminName", "Admin Name"],
                    ["adminEmail", "Admin Email"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold mb-1">{label}</label>
                    <input
                      className={inputCls}
                      style={inputStyle}
                      value={edit[key]}
                      onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-semibold mb-1">State</label>
                  <select
                    className={inputCls}
                    style={inputStyle}
                    value={edit.state}
                    onChange={(e) => setEdit({ ...edit, state: e.target.value })}
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              {error && <div className="text-sm" style={{ color: "var(--ui-danger)" }}>{error}</div>}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: "var(--ui-border)" }}>
              <button className="px-4 py-2 rounded-lg hover:bg-gray-100" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-lg font-semibold disabled:opacity-50" style={{ background: "var(--ui-primary)", color: "#fff" }} onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
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
