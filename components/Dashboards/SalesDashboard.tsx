"use client";

import React from "react";
import { FiUserPlus, FiFileText, FiCheckCircle, FiDollarSign } from "react-icons/fi";

export default function SalesDashboard() {
  const data = [
    { key: "1", name: "Anand Kona", source: "Website", status: "Negotiation", followUp: "Tomorrow, 10 AM" },
    { key: "2", name: "Saikumar", source: "Referral", status: "New", followUp: "Today, 4 PM" },
    { key: "3", name: "Jane Doe", source: "Campaign", status: "Won", followUp: "N/A" },
  ];

  const metrics = [
    { label: "Total Leads (Month)", value: "145", icon: <FiUserPlus size={24} /> },
    { label: "Active Negotiations", value: "28", icon: <FiFileText size={24} /> },
    { label: "Bookings (Month)", value: "12", icon: <FiCheckCircle size={24} /> },
    { label: "Pipeline Value", value: "₹8.5 Cr", icon: <FiDollarSign size={24} /> }
  ];

  const getStatusStyle = (status: string) => {
    if (status === 'Won') return { bg: 'bg-green-100', text: 'text-green-700' };
    if (status === 'Lost') return { bg: 'bg-red-100', text: 'text-red-700' };
    if (status === 'Negotiation') return { bg: 'bg-blue-100', text: 'text-blue-700' };
    return { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, i) => (
          <article key={i} className="border p-5 flex items-start justify-between" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--ui-text-muted)" }}>{m.label}</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "var(--ui-text)" }}>{m.value}</p>
            </div>
            <div className="p-3 rounded-full bg-opacity-20 flex items-center justify-center" style={{ background: "var(--ui-primary-soft)", color: "var(--ui-primary)" }}>
              {m.icon}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-2">
        <article className="border overflow-hidden" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
          <div className="p-5 border-b" style={{ borderColor: "var(--ui-border)" }}>
            <h2 className="font-semibold text-lg" style={{ color: "var(--ui-text)" }}>Upcoming Follow-ups & Active Leads</h2>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase" style={{ background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)" }}>
                <tr>
                  <th className="px-6 py-4 font-semibold">Lead Name</th>
                  <th className="px-6 py-4 font-semibold">Source</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Follow Up</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const statusStyle = getStatusStyle(row.status);
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-black/5" style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}>
                      <td className="px-6 py-4 font-medium">{row.name}</td>
                      <td className="px-6 py-4">{row.source}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{row.followUp}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
