"use client";

import React from "react";
import { FiBriefcase, FiFileText, FiShoppingBag, FiCreditCard } from "react-icons/fi";

export default function FinanceDashboard() {
  const arData = [
    { key: "1", dl: "DL-2023-001", unit: "A-101", amount: "₹ 5,00,000", status: "Unpaid" },
    { key: "2", dl: "DL-2023-002", unit: "B-205", amount: "₹ 2,50,000", status: "Partial" },
  ];

  const metrics = [
    { label: "Cash in Bank", value: "₹1.45 Cr", icon: <FiBriefcase size={24} /> },
    { label: "Total AR (Unpaid DLs)", value: "₹7.5 L", icon: <FiFileText size={24} /> },
    { label: "Total AP (Pending POs)", value: "₹12.5 L", icon: <FiShoppingBag size={24} /> },
    { label: "Monthly Expenses", value: "₹3.4 L", icon: <FiCreditCard size={24} /> }
  ];

  const getStatusStyle = (status: string) => {
    if (status === 'Paid') return { bg: 'bg-green-100', text: 'text-green-700' };
    if (status === 'Partial') return { bg: 'bg-orange-100', text: 'text-orange-700' };
    if (status === 'Unpaid') return { bg: 'bg-red-100', text: 'text-red-700' };
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
            <h2 className="font-semibold text-lg" style={{ color: "var(--ui-text)" }}>Accounts Receivable (Pending Demand Letters)</h2>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase" style={{ background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)" }}>
                <tr>
                  <th className="px-6 py-4 font-semibold">Demand Letter</th>
                  <th className="px-6 py-4 font-semibold">Unit</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {arData.map((row, i) => {
                  const statusStyle = getStatusStyle(row.status);
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-black/5" style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}>
                      <td className="px-6 py-4 font-medium">{row.dl}</td>
                      <td className="px-6 py-4">{row.unit}</td>
                      <td className="px-6 py-4 font-medium">{row.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          {row.status}
                        </span>
                      </td>
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
