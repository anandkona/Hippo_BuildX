"use client";

import React, { useState } from "react";
import { FiPlus, FiServer, FiSettings, FiTrash2, FiPlay, FiPause } from "react-icons/fi";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  adminEmail: string;
  plan: string;
  status: "Active" | "Provisioning" | "Suspended";
  created_at: string;
}

const INITIAL_TENANTS: Tenant[] = [
  { id: "1", name: "Hippo Construction (Default)", subdomain: "hippo", adminEmail: "admin@hippobuild.com", plan: "Enterprise", status: "Active", created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "2", name: "Apex Builders Inc.", subdomain: "apex", adminEmail: "ceo@apexbuilders.com", plan: "Pro", status: "Active", created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: "3", name: "Stellar Real Estate", subdomain: "stellar", adminEmail: "it@stellar.re", plan: "Growth", status: "Provisioning", created_at: new Date().toISOString() }
];

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", subdomain: "", adminEmail: "", plan: "Pro" });

  const handleSave = () => {
    const newTenant: Tenant = {
      id: Math.random().toString(36).substring(7),
      name: formData.name,
      subdomain: formData.subdomain,
      adminEmail: formData.adminEmail,
      plan: formData.plan,
      status: "Provisioning", // According to PRD, creating enqueues a provisioning job
      created_at: new Date().toISOString()
    };
    setTenants([newTenant, ...tenants]);
    setIsModalOpen(false);
    setFormData({ name: "", subdomain: "", adminEmail: "", plan: "Pro" });
    
    // Simulate async provisioning resolving after 4 seconds
    setTimeout(() => {
      setTenants(prev => prev.map(t => t.id === newTenant.id ? { ...t, status: "Active" } : t));
    }, 4000);
  };

  const handleToggleStatus = (id: string) => {
    setTenants(tenants.map(t => {
      if (t.id === id) {
        if (t.status === "Active") return { ...t, status: "Suspended" };
        if (t.status === "Suspended") return { ...t, status: "Active" };
      }
      return t;
    }));
  };

  return (
    <div className="p-6 md:p-8 min-h-screen [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex flex-col gap-6">
        
        {/* Header Area */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--ui-text)" }}>Tenant Control Plane</h1>
            <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>Platform Super Admin view. Provision isolated schemas and manage subscriptions.</p>
          </div>
          <button 
            className="px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
            style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
            onClick={() => setIsModalOpen(true)}
          >
            <FiPlus /> Provision Tenant
          </button>
        </div>
        
        {/* Tenants Table */}
        <div className="rounded-lg overflow-hidden border shadow-sm bg-white" style={{ borderColor: "var(--ui-border)" }}>
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="border-b bg-gray-50/50" style={{ borderColor: "var(--ui-border)" }}>
                <tr>
                  <th className="px-5 py-4 font-semibold text-gray-700">Company Name</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Subdomain</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Admin Email</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Plan</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Status</th>
                  <th className="px-5 py-4 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--ui-border)" }}>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-base flex items-center gap-2">
                        <FiServer className="text-gray-400" />
                        {tenant.name}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {tenant.subdomain}.hippobuild.com
                    </td>
                    <td className="px-5 py-4" style={{ color: "var(--ui-text-muted)" }}>
                      {tenant.adminEmail}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {tenant.status === "Active" && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>}
                      {tenant.status === "Provisioning" && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 animate-pulse">Provisioning DB...</span>}
                      {tenant.status === "Suspended" && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Suspended</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" 
                          style={{ color: "var(--ui-text-muted)" }}
                          title={tenant.status === "Suspended" ? "Resume Tenant" : "Suspend Tenant"}
                          onClick={() => handleToggleStatus(tenant.id)}
                          disabled={tenant.status === "Provisioning"}
                        >
                          {tenant.status === "Suspended" ? <FiPlay size={16} className="text-green-600" /> : <FiPause size={16} className="text-orange-500" />}
                        </button>
                        <button 
                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" 
                          style={{ color: "var(--ui-text-muted)" }}
                          title="Tenant Settings"
                        >
                          <FiSettings size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Provision Tenant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="p-8 rounded-xl w-full max-w-lg shadow-2xl bg-white border" style={{ borderColor: "var(--ui-border)" }}>
            <h2 className="text-2xl font-bold mb-1">Provision New Tenant</h2>
            <p className="text-sm mb-6 text-gray-500">This will create a new isolated database schema and seed the initial tenant admin user.</p>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Company Name</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 outline-none transition-all"
                  style={{ borderColor: "var(--ui-border)", focusRing: "var(--ui-primary-soft)" }}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Skyline Construction"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Subdomain</label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    className="w-full p-2.5 border border-r-0 rounded-l-lg bg-gray-50 focus:bg-white focus:ring-2 outline-none transition-all font-mono text-sm"
                    style={{ borderColor: "var(--ui-border)", focusRing: "var(--ui-primary-soft)" }}
                    value={formData.subdomain}
                    onChange={(e) => setFormData({...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                    placeholder="skyline"
                  />
                  <div className="px-4 py-2.5 bg-gray-100 border border-l-0 rounded-r-lg text-gray-500 text-sm font-mono whitespace-nowrap">
                    .hippobuild.com
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Tenant Admin Email</label>
                <input 
                  type="email" 
                  className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 outline-none transition-all"
                  style={{ borderColor: "var(--ui-border)", focusRing: "var(--ui-primary-soft)" }}
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                  placeholder="admin@skyline.com"
                />
                <p className="text-xs text-gray-500 mt-1">Temporary password will be emailed to this address.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Subscription Plan</label>
                <select 
                  className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white outline-none"
                  style={{ borderColor: "var(--ui-border)" }}
                  value={formData.plan}
                  onChange={(e) => setFormData({...formData, plan: e.target.value})}
                >
                  <option value="Starter">Starter (1 Project)</option>
                  <option value="Pro">Pro (10 Projects)</option>
                  <option value="Growth">Growth (25 Projects)</option>
                  <option value="Enterprise">Enterprise (Unlimited)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--ui-border)" }}>
                <button 
                  className="px-5 py-2.5 rounded-lg font-medium transition-colors hover:bg-gray-100"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-5 py-2.5 rounded-lg font-semibold shadow-md hover:opacity-90 transition-opacity"
                  style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
                  onClick={handleSave}
                  disabled={!formData.name || !formData.subdomain || !formData.adminEmail}
                >
                  Provision Schema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
