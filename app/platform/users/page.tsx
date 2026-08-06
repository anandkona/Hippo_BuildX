"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FiPlus, FiRefreshCw, FiEdit2 } from "react-icons/fi";

const ROLE_LABELS: Record<string, string> = {
  platform_owner: "Platform Owner",
  platform_admin: "Platform Admin",
  support_manager: "Support Manager",
  billing_manager: "Billing Manager",
  read_only: "Read Only",
};

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ role: "platform_admin" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/users");
      if (!res.ok) throw new Error("Failed");
      setUsers((await res.json()).users ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        const res = await fetch(`/api/v1/platform/users/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
      } else {
        const res = await fetch("/api/v1/platform/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-testid="platform-users">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Users Management</h1>

        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 border rounded-md text-sm flex items-center gap-2 cursor-pointer transition-all hover:bg-gray-50 hover:shadow-sm active:scale-95" style={{ borderColor: "var(--ui-border)" }}><FiRefreshCw /> Refresh</button>
          <button
            onClick={() => { setEditing(null); setForm({ role: "platform_admin", isActive: true }); setModalOpen(true); }}
            className="px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 shadow-md cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] active:scale-95"
            style={{ background: "var(--ui-primary)", color: "#fff" }}
          >
            <FiPlus /> Add User
          </button>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm overflow-hidden" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 border-b" style={{ borderColor: "var(--ui-border)" }}>
            <tr>
              <th className="px-5 py-4 font-semibold">Name</th>
              <th className="px-5 py-4 font-semibold">Email</th>
              <th className="px-5 py-4 font-semibold">Role</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Last Login</th>
              <th className="px-5 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--ui-border)" }}>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-black/[0.02]">
                <td className="px-5 py-4 font-medium">{u.name}</td>
                <td className="px-5 py-4">{u.email}</td>
                <td className="px-5 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{ROLE_LABELS[u.role] || u.role}</span></td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4" style={{ color: "var(--ui-text-muted)" }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : "—"}</td>
                <td className="px-5 py-4 text-right">
                  <button className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-all active:scale-95" onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive }); setModalOpen(true); }}>
                    <FiEdit2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border p-6 shadow-2xl" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
            <h2 className="text-xl font-bold mb-4">{editing ? "Edit User" : "Add User"}</h2>
            <div className="flex flex-col gap-3">
              <Input label="Name" value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} />
              <Input label="Email" value={form.email || ""} onChange={(v) => setForm({ ...form, email: v })} />
              <div>
                <label className="block text-sm font-semibold mb-1.5">Role</label>
                <select className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)" }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <Input label={editing ? "New Password (optional)" : "Password"} type="password" value={form.password || ""} onChange={(v) => setForm({ ...form, password: v })} />
              {error && <div className="text-sm" style={{ color: "var(--ui-danger)" }}>{error}</div>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-all active:scale-95" onClick={() => setModalOpen(false)}>Cancel</button>
              <button disabled={submitting} className="px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] active:scale-95 disabled:hover:brightness-100 disabled:active:scale-100 disabled:cursor-not-allowed" style={{ background: "var(--ui-primary)", color: "#fff" }} onClick={save}>
                {submitting ? "Saving..." : editing ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-muted)" }} />
    </div>
  );
}
