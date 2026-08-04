"use client";

import React from "react";
import { FiHome, FiAlertCircle, FiCalendar, FiShield } from "react-icons/fi";

export default function ProjectManagerDashboard() {
  const rfiData = [
    { key: "1", id: "RFI-104", subject: "Steel Grade Clarification for T1", status: "Open", raisedBy: "Site Engineer A" },
    { key: "2", id: "RFI-103", subject: "Plumbing Layout Update", status: "Answered", raisedBy: "Site Engineer B" },
  ];

  const metrics = [
    { label: "Active Projects", value: "3", icon: <FiHome size={24} /> },
    { label: "Pending Approvals", value: "14", icon: <FiShield size={24} /> },
    { label: "Open Issues", value: "5", icon: <FiAlertCircle size={24} /> },
    { label: "Tasks Overdue", value: "2", icon: <FiCalendar size={24} /> }
  ];

  const progressData = [
    { name: "Tower A - Superstructure", value: 45, color: "var(--ui-primary)" },
    { name: "Tower B - Foundation", value: 80, color: "var(--ui-success)" },
    { name: "Clubhouse - Finishing", value: 15, color: "var(--ui-warning)" }
  ];

  const getStatusStyle = (status: string) => {
    if (status === 'Answered') return { bg: 'bg-green-100', text: 'text-green-700' };
    if (status === 'Closed') return { bg: 'bg-gray-100', text: 'text-gray-700' };
    if (status === 'Open') return { bg: 'bg-orange-100', text: 'text-orange-700' };
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

      <section className="mt-2 grid gap-6 lg:grid-cols-2">
        <article className="border p-5 flex flex-col gap-6" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
          <h2 className="font-semibold text-lg" style={{ color: "var(--ui-text)" }}>Construction Progress</h2>
          <div className="flex flex-col gap-5">
            {progressData.map((item, i) => (
              <div key={i}>
                <div className="mb-2 flex justify-between text-sm font-medium">
                  <span style={{ color: "var(--ui-text)" }}>{item.name}</span>
                  <strong style={{ color: "var(--ui-text)" }}>{item.value}%</strong>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full w-full" style={{ background: "var(--ui-surface-muted)" }}>
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.value}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="border overflow-hidden" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
          <div className="p-5 border-b" style={{ borderColor: "var(--ui-border)" }}>
            <h2 className="font-semibold text-lg" style={{ color: "var(--ui-text)" }}>Recent RFIs</h2>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase" style={{ background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)" }}>
                <tr>
                  <th className="px-6 py-4 font-semibold">RFI ID</th>
                  <th className="px-6 py-4 font-semibold">Subject</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Raised By</th>
                </tr>
              </thead>
              <tbody>
                {rfiData.map((row, i) => {
                  const statusStyle = getStatusStyle(row.status);
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-black/5" style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}>
                      <td className="px-6 py-4 font-medium">{row.id}</td>
                      <td className="px-6 py-4">{row.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{row.raisedBy}</td>
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
