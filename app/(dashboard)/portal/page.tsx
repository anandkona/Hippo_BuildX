"use client";

import React, { useEffect, useState } from "react";
import { FiHome, FiCheckCircle, FiFileText, FiDownload, FiShield } from "react-icons/fi";

export default function CustomerPortal() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setTimeout(() => {
      setData({
        unit: { number: "A-101", project_name: "Hippo Heights", tower_name: "Tower A" },
        progress: {
          overallPercentage: 62,
          currentStage: "Superstructure (Floor 5)",
          lastUpdated: "2023-10-15"
        },
        demandLetters: [
          { id: "DL-101", amount: "₹ 5,00,000", status: "Paid", date: "2023-01-15" },
          { id: "DL-102", amount: "₹ 2,50,000", status: "Unpaid", date: "2023-06-20" }
        ],
        documents: [
          { id: "DOC-1", name: "Sale Agreement.pdf", type: "Agreement" },
          { id: "DOC-2", name: "Floor Plan.pdf", type: "Drawing" },
          { id: "DOC-3", name: "Receipt_DL-101.pdf", type: "Receipt" }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen" style={{ background: "var(--ui-background)" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "var(--ui-primary)" }}></div>
      </div>
    );
  }

  if (!data) return (
    <div className="flex justify-center items-center h-screen" style={{ background: "var(--ui-background)", color: "var(--ui-text-muted)" }}>
      No property found
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ui-background)", color: "var(--ui-text)" }}>
      <header className="sticky top-0 z-50 flex items-center px-6 py-4 shadow-sm" style={{ background: "var(--ui-surface)", borderBottom: "1px solid var(--ui-border)" }}>
        <FiHome className="text-2xl mr-3" style={{ color: "var(--ui-primary)" }} />
        <h1 className="text-lg font-bold">Customer Portal - {data.unit.project_name}</h1>
        <div className="flex-1" />
        <span className="font-semibold text-sm">Welcome, Anand Kona</span>
      </header>

      <main className="flex-1 p-4 md:p-6 mx-auto w-full max-w-7xl">
        <div className="grid gap-6 md:grid-cols-3">
          
          <article className="border p-6 md:col-span-2 flex flex-col justify-between" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
            <div className="flex items-center mb-8">
              <FiHome size={48} className="mr-6" style={{ color: "var(--ui-primary)" }} />
              <div>
                <h2 className="text-2xl font-bold mb-1">Unit {data.unit.number}</h2>
                <p className="text-sm font-medium" style={{ color: "var(--ui-text-muted)" }}>{data.unit.tower_name} &bull; {data.unit.project_name}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2 text-sm font-semibold">
                <span>Construction Progress</span>
                <span className="text-lg" style={{ color: "var(--ui-success)" }}>{data.progress.overallPercentage}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full w-full" style={{ background: "var(--ui-surface-muted)" }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${data.progress.overallPercentage}%`, background: "var(--ui-success)" }} />
              </div>
              <p className="mt-3 text-sm font-medium">
                <span style={{ color: "var(--ui-text-muted)" }}>Current Stage:</span> 
                <span className="ml-2 px-2 py-1 rounded-full text-xs" style={{ background: "var(--ui-primary-soft)", color: "var(--ui-primary)" }}>
                  {data.progress.currentStage}
                </span>
              </p>
            </div>
          </article>

          <article className="border p-6 text-center flex flex-col justify-center items-center" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
            <FiShield size={48} className="mb-4" style={{ color: "var(--ui-warning)" }} />
            <h3 className="font-bold text-lg mb-1">RERA Certified</h3>
            <p className="text-sm mb-6" style={{ color: "var(--ui-text-muted)" }}>Your investment is protected.</p>
            <button className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-colors" style={{ background: "var(--ui-primary)" }}>
              Contact Manager
            </button>
          </article>

          <article className="border overflow-hidden md:col-span-2" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
            <div className="p-5 border-b" style={{ borderColor: "var(--ui-border)" }}>
              <h2 className="font-semibold text-lg">Financials & Demand Letters</h2>
            </div>
            <div className="overflow-x-auto w-full p-5">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase" style={{ background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)" }}>
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-l-md">ID</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold rounded-r-md">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-t" style={{ borderColor: "var(--ui-border)" }}>
                  {data.demandLetters.map((dl: any, i: number) => (
                    <tr key={i} className="hover:bg-black/5">
                      <td className="px-4 py-3 font-medium">{dl.id}</td>
                      <td className="px-4 py-3">{dl.date}</td>
                      <td className="px-4 py-3 font-medium">{dl.amount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dl.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {dl.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="flex items-center gap-1 text-xs font-semibold transition-colors hover:underline" style={{ color: "var(--ui-primary)" }}>
                          <FiDownload /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="border" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)", borderRadius: "var(--ui-radius)" }}>
            <div className="p-5 border-b" style={{ borderColor: "var(--ui-border)" }}>
              <h2 className="font-semibold text-lg">My Documents</h2>
            </div>
            <ul className="p-0 m-0 list-none divide-y border-t" style={{ borderColor: "var(--ui-border)" }}>
              {data.documents.map((doc: any, i: number) => (
                <li key={i} className="flex items-center justify-between p-4 hover:bg-black/5">
                  <div className="flex items-center gap-3">
                    <FiFileText size={20} className="text-red-500" />
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>{doc.type}</p>
                    </div>
                  </div>
                  <button className="p-2 rounded hover:bg-black/10" style={{ color: "var(--ui-primary)" }}>
                    <FiDownload />
                  </button>
                </li>
              ))}
            </ul>
          </article>

        </div>
      </main>
    </div>
  );
}
