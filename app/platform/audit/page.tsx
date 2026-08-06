"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FiRefreshCw, FiSearch } from "react-icons/fi";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const url = query ? `/api/v1/platform/audit?q=${encodeURIComponent(query)}` : "/api/v1/platform/audit";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      setLogs((await res.json()).auditLogs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6" data-testid="platform-audit">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Audit Logs</h1>

        </div>
        <button onClick={() => load(q)} className="px-3 py-2 border rounded-md text-sm flex items-center gap-2 cursor-pointer transition-all hover:bg-gray-50 hover:shadow-sm active:scale-95" style={{ borderColor: "var(--ui-border)" }}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder="Search actions, users, details..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
            style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface)" }}
          />
        </div>
        <button onClick={() => load(q)} className="px-4 py-2 rounded-md font-semibold text-sm cursor-pointer" style={{ background: "var(--ui-primary)", color: "#fff" }}>
          Search
        </button>
      </div>

      <div className="rounded-lg border shadow-sm overflow-hidden" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 border-b" style={{ borderColor: "var(--ui-border)" }}>
            <tr>
              <th className="px-5 py-4 font-semibold">Time</th>
              <th className="px-5 py-4 font-semibold">User</th>
              <th className="px-5 py-4 font-semibold">Action</th>
              <th className="px-5 py-4 font-semibold">Details</th>
              <th className="px-5 py-4 font-semibold">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--ui-border)" }}>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading...</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="hover:bg-black/[0.02]">
                <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--ui-text-muted)" }}>{new Date(l.createdAt).toLocaleString("en-IN")}</td>
                <td className="px-5 py-4 font-medium">{l.actorName || l.actorEmail || "System"}</td>
                <td className="px-5 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{l.action}</span></td>
                <td className="px-5 py-4 max-w-md truncate" style={{ color: "var(--ui-text-muted)" }}>{l.details || "—"}</td>
                <td className="px-5 py-4 font-mono text-xs">{l.ipAddress || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
