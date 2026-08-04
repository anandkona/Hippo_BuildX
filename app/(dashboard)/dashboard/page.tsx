"use client";

import React, { useState } from "react";
import CeoDashboard from "@/components/Dashboards/CeoDashboard";
import SalesDashboard from "@/components/Dashboards/SalesDashboard";
import ProjectManagerDashboard from "@/components/Dashboards/ProjectManagerDashboard";
import FinanceDashboard from "@/components/Dashboards/FinanceDashboard";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("ceo");

  const tabs = [
    { key: "ceo", label: "CEO / Executive" },
    { key: "sales", label: "Sales Manager" },
    { key: "pm", label: "Project Manager" },
    { key: "finance", label: "Finance Head" },
  ];

  const renderDashboard = () => {
    switch (activeTab) {
      case "ceo": return <CeoDashboard />;
      case "sales": return <SalesDashboard />;
      case "pm": return <ProjectManagerDashboard />;
      case "finance": return <FinanceDashboard />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--ui-text)" }}>Role-Based Dashboards</h2>
          <span className="text-sm mt-1 block" style={{ color: "var(--ui-text-muted)" }}>Select a role tab below to view different dashboards</span>
        </div>
        
        <div className="flex rounded-md p-1 border overflow-x-auto max-w-full" style={{ background: "var(--ui-surface-muted)", borderColor: "var(--ui-border)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap`}
              style={{
                background: activeTab === tab.key ? "var(--ui-surface)" : "transparent",
                color: activeTab === tab.key ? "var(--ui-primary)" : "var(--ui-text-muted)",
                boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 mt-4">
        {renderDashboard()}
      </div>
    </div>
  );
}
