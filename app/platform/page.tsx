"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { FiUsers, FiCheckCircle, FiUser, FiDatabase, FiCloud, FiMail, FiHardDrive } from "react-icons/fi";

const PIE_COLORS = ["#1D4ED8", "#7C3AED", "#15803D", "#D97706", "#0369A1"];

const healthIcon: Record<string, React.ReactNode> = {
  Database: <FiDatabase />,
  Storage: <FiHardDrive />,
  "Redis Cache": <FiCloud />,
  "Email Service": <FiMail />,
  "File Storage": <FiHardDrive />,
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/platform/metrics");
        if (!res.ok) throw new Error("Failed to load metrics");
        setData(await res.json());
      } catch (e: any) {
        setError(e.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="py-20 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading dashboard...</div>;
  }
  if (error || !data) {
    return <div className="py-20 text-center" style={{ color: "var(--ui-danger)" }}>{error || "No data"}</div>;
  }

  const { metrics, tenantGrowth, revenueOverview, subscriptionDistribution, recentTenants, systemHealth } = data;

  const cards = [
    { label: "Total Tenants", value: metrics.totalTenants, icon: <FiUsers />, color: "var(--ui-primary)" },
    { label: "Active Tenants", value: metrics.activeTenants, icon: <FiCheckCircle />, color: "var(--ui-success)" },
    { label: "Total Users", value: metrics.totalUsers, icon: <FiUser />, color: "#7C3AED" },
    { label: "Monthly Revenue", value: formatINR(metrics.monthlyRevenue), icon: <span className="font-bold">₹</span>, color: "var(--ui-warning)" },
  ];

  return (
    <div className="flex flex-col gap-6" data-testid="platform-dashboard">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--ui-text)" }}>Platform Dashboard</h1>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border p-5 shadow-sm"
            style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: "var(--ui-text-muted)" }}>{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: "var(--ui-text)" }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <div className="lg:col-span-4 rounded-lg border p-5 shadow-sm" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
          <h3 className="font-semibold mb-4">Tenant Growth</h3>
          <div className="h-64" data-chart="tenant-growth">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tenantGrowth}>
                <defs>
                  <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#1D4ED8" fill="url(#tg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-3 rounded-lg border p-5 shadow-sm" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
          <h3 className="font-semibold mb-4">Revenue Overview</h3>
          <div className="h-64" data-chart="revenue">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueOverview}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: any) => formatINR(Number(v))} />
                <Bar dataKey="revenue" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-3 rounded-lg border p-5 shadow-sm" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
          <h3 className="font-semibold mb-4">Subscription Distribution</h3>
          <div className="h-64" data-chart="distribution">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subscriptionDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {subscriptionDistribution.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-lg border shadow-sm overflow-hidden" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
          <div className="px-5 py-4 border-b font-semibold" style={{ borderColor: "var(--ui-border)" }}>Recent Tenants</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/60 border-b" style={{ borderColor: "var(--ui-border)" }}>
                <tr>
                  <th className="px-5 py-3 font-semibold">Tenant</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--ui-border)" }}>
                {recentTenants.map((t: any) => (
                  <tr key={t.id} className="hover:bg-black/[0.02]">
                    <td className="px-5 py-3">
                      <button className="font-medium" style={{ color: "var(--ui-primary)" }} onClick={() => router.push(`/platform/tenants/${t.id}`)}>
                        {t.name}
                      </button>
                    </td>
                    <td className="px-5 py-3">{t.planName}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--ui-text-muted)" }}>
                      {new Date(t.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-2 rounded-lg border p-5 shadow-sm" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
          <h3 className="font-semibold mb-4">System Health</h3>
          <div className="flex flex-col gap-3">
            {systemHealth.map((h: any) => {
              const ok = h.status === "healthy";
              const degraded = h.status === "degraded";
              return (
                <div
                  key={h.name}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md"
                  style={{
                    background: ok ? "#F0FDF4" : degraded ? "#FFFBEB" : "#FEF2F2",
                  }}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span style={{ color: ok ? "var(--ui-success)" : degraded ? "var(--ui-warning)" : "var(--ui-danger)" }}>
                      {healthIcon[h.name] || <FiCloud />}
                    </span>
                    {h.name}
                  </div>
                  <StatusPill status={h.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    healthy: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
    provisioning: "bg-orange-100 text-orange-700",
    pending: "bg-orange-100 text-orange-700",
    degraded: "bg-amber-100 text-amber-700",
    down: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700";
  const label = status === "provisioning" ? "Pending" : status;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${cls}`}>{label}</span>;
}
