"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { FiAward, FiTrendingUp, FiGlobe, FiUsers } from "react-icons/fi";

export default function CeoDashboard() {
  const revenueData = [
    { name: "Jan", revenue: 4000000 },
    { name: "Feb", revenue: 3000000 },
    { name: "Mar", revenue: 5000000 },
    { name: "Apr", revenue: 4500000 },
    { name: "May", revenue: 6000000 },
    { name: "Jun", revenue: 8000000 },
  ];

  const salesData = [
    { name: "Tower A", sales: 45 },
    { name: "Tower B", sales: 30 },
    { name: "Villas", sales: 12 },
  ];

  const metrics = [
    { label: "Total Revenue (YTD)", value: "₹3.05 Cr", detail: "+12% this year", icon: <FiAward size={24} /> },
    { label: "Total Sales Volume", value: "87", detail: "+15.3% this month", icon: <FiTrendingUp size={24} /> },
    { label: "Active Projects", value: "3", detail: "All on track", icon: <FiGlobe size={24} /> },
    { label: "Total Workforce", value: "452", detail: "Across all sites", icon: <FiUsers size={24} /> }
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, i) => (
          <article key={i} className="border p-5 flex items-start justify-between" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--ui-text-muted)" }}>{m.label}</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "var(--ui-text)" }}>{m.value}</p>
              <p className="mt-1 text-sm font-medium" style={{ color: "var(--ui-success)" }}>{m.detail}</p>
            </div>
            <div className="p-3 rounded-full bg-opacity-20 flex items-center justify-center" style={{ background: "var(--ui-primary-soft)", color: "var(--ui-primary)" }}>
              {m.icon}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-2 grid gap-6 lg:grid-cols-3">
        <article className="border p-5 lg:col-span-2" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
          <h2 className="mb-5 font-semibold text-lg" style={{ color: "var(--ui-text)" }}>Revenue Growth</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ui-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--ui-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ui-border)" />
                <XAxis dataKey="name" stroke="var(--ui-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--ui-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000000}M`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--ui-surface)", borderColor: "var(--ui-border)", color: "var(--ui-text)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--ui-primary)" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--ui-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorRev2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="border p-5 flex flex-col gap-8" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
          <div>
            <h2 className="mb-4 font-semibold text-lg" style={{ color: "var(--ui-text)" }}>Construction Progress</h2>
            <div className="mb-2 flex justify-between text-sm font-medium">
              <span style={{ color: "var(--ui-text)" }}>Overall Completion</span>
              <strong style={{ color: "var(--ui-text)" }}>62%</strong>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full w-full" style={{ background: "var(--ui-surface-muted)" }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `62%`, background: "var(--ui-primary)" }} />
            </div>
          </div>
          
          <div className="flex-1 min-h-[200px]">
            <h2 className="mb-4 font-semibold text-lg" style={{ color: "var(--ui-text)" }}>Sales by Project</h2>
            <div className="h-48 w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--ui-border)" />
                  <XAxis type="number" stroke="var(--ui-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--ui-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--ui-surface)", borderColor: "var(--ui-border)", color: "var(--ui-text)", borderRadius: "8px" }}
                    cursor={{ fill: 'var(--ui-surface-muted)' }}
                  />
                  <Bar dataKey="sales" fill="var(--ui-primary)" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
