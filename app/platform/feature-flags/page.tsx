"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FiPlus, FiRefreshCw } from "react-icons/fi";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ enabled: true });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/feature-flags");
      if (!res.ok) throw new Error("Failed");
      setFlags((await res.json()).featureFlags ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (flag: any, enabled: boolean) => {
    await fetch(`/api/v1/platform/feature-flags/${flag.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    load();
  };

  const create = async () => {
    setError("");
    const res = await fetch("/api/v1/platform/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setModalOpen(false);
    load();
  };

  return (
    <div className="flex flex-col gap-6" data-testid="platform-feature-flags">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Feature Flags</h1>
          <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>Enable or disable platform capabilities globally</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 border rounded-md text-sm flex items-center gap-2" style={{ borderColor: "var(--ui-border)" }}><FiRefreshCw /> Refresh</button>
          <button onClick={() => { setForm({ enabled: true, scope: "global" }); setModalOpen(true); }} className="px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 shadow-md" style={{ background: "var(--ui-primary)", color: "#fff" }}>
            <FiPlus /> Add Flag
          </button>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm overflow-hidden" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 border-b" style={{ borderColor: "var(--ui-border)" }}>
            <tr>
              <th className="px-5 py-4 font-semibold">Feature</th>
              <th className="px-5 py-4 font-semibold">Description</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Updated On</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--ui-border)" }}>
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading...</td></tr>
            ) : flags.map((f) => (
              <tr key={f.id} className="hover:bg-black/[0.02]">
                <td className="px-5 py-4">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs font-mono" style={{ color: "var(--ui-text-muted)" }}>{f.key}</div>
                </td>
                <td className="px-5 py-4" style={{ color: "var(--ui-text-muted)" }}>{f.description || "—"}</td>
                <td className="px-5 py-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={!!f.enabled} onChange={(e) => toggle(f, e.target.checked)} />
                    <span className={`w-10 h-6 rounded-full relative transition-colors ${f.enabled ? "bg-blue-600" : "bg-gray-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${f.enabled ? "translate-x-4" : ""}`} />
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${f.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {f.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </label>
                </td>
                <td className="px-5 py-4" style={{ color: "var(--ui-text-muted)" }}>{new Date(f.updatedAt).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border p-6 shadow-2xl" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
            <h2 className="text-xl font-bold mb-4">Add Feature Flag</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Key</label>
                <input className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)" }} value={form.key || ""} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="api_access" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Name</label>
                <input className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)" }} value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Description</label>
                <textarea className="w-full p-2.5 border rounded-lg" style={{ borderColor: "var(--ui-border)" }} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              {error && <div className="text-sm" style={{ color: "var(--ui-danger)" }}>{error}</div>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 rounded-lg hover:bg-gray-100" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-lg font-semibold" style={{ background: "var(--ui-primary)", color: "#fff" }} onClick={create}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
