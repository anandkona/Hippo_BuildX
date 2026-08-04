"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/Layout/AdminLayout";
import { FiShield, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

const PERMISSION_GROUPS: Record<string, string[]> = {
  "Project Management": ["project.read", "project.manage", "progress.read", "progress.approve", "progress.submit"],
  "CRM & Sales": ["crm.lead.create", "crm.lead.read", "crm.lead.update", "crm.pipeline.manage", "crm.booking.manage"],
  "Procurement": ["procurement.read", "procurement.vendor.manage", "procurement.rfq.manage", "procurement.po.manage"],
  "Inventory": ["inventory.read", "inventory.stock.manage", "inventory.grn.create", "inventory.issue.manage"],
  "Accounting": ["accounting.read", "accounting.invoice.manage", "accounting.receipt.manage", "payment.read", "payment.demand.create"],
  "HRMS": ["hrms.read", "hrms.employee.manage", "hrms.attendance.manage", "hrms.payroll.run"],
  "General / System": ["user.read", "audit.read", "custom.read", "custom.write"]
};

export default function RolesSettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<{ name: string, description: string, permissions: string[] }>({ name: "", description: "", permissions: [] });

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({ name: role.name, description: role.description, permissions: role.permissions });
    } else {
      setEditingRole(null);
      setFormData({ name: "", description: "", permissions: [] });
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this role?")) {
      setRoles(roles.filter(r => r.id !== id));
    }
  };

  const handleSave = () => {
    const perms = formData.permissions;
    if (editingRole) {
      setRoles(roles.map(r => r.id === editingRole.id ? { ...r, name: formData.name, description: formData.description, permissions: perms } : r));
    } else {
      const newRole: Role = {
        id: Math.random().toString(36).substring(7),
        name: formData.name,
        description: formData.description,
        permissions: perms,
        is_system: false,
        created_at: new Date().toISOString()
      };
      setRoles([...roles, newRole]);
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    // In a real implementation this would fetch from /api/v1/admin/roles
    // Since the API requires tenant headers and JWT auth which is hard to mock purely client-side without the auth flow, 
    // we will load the canonical PRD roles here for the UI demonstration, matching what we put in seed.sql.
    setRoles([
      { id: "1", name: "Tenant Admin", description: "Full access", permissions: ["*"], is_system: true, created_at: new Date().toISOString() },
      { id: "2", name: "Project Manager", description: "Project oversight and planning", permissions: ["user.read", "project.read", "project.manage", "progress.read", "progress.approve", "inventory.read", "procurement.read"], is_system: false, created_at: new Date().toISOString() },
      { id: "3", name: "Sales Manager", description: "Sales team and CRM pipeline", permissions: ["crm.lead.create", "crm.lead.read", "crm.lead.update", "crm.pipeline.manage", "crm.booking.manage", "project.read"], is_system: false, created_at: new Date().toISOString() },
      { id: "4", name: "Site Engineer", description: "Site operations and progress reporting", permissions: ["progress.read", "progress.submit", "inventory.read"], is_system: false, created_at: new Date().toISOString() },
      { id: "5", name: "Procurement", description: "RFQ, PO, vendor management", permissions: ["procurement.vendor.manage", "procurement.rfq.manage", "procurement.po.manage", "inventory.read"], is_system: false, created_at: new Date().toISOString() },
      { id: "6", name: "Inventory", description: "Warehouse and stock control", permissions: ["inventory.stock.manage", "inventory.grn.create", "inventory.issue.manage", "procurement.read"], is_system: false, created_at: new Date().toISOString() },
      { id: "7", name: "Finance", description: "Invoices, receipts, reconciliation", permissions: ["accounting.read", "accounting.invoice.manage", "accounting.receipt.manage", "payment.demand.create", "payment.read"], is_system: false, created_at: new Date().toISOString() },
      { id: "8", name: "HR", description: "Employees, attendance, payroll", permissions: ["hrms.employee.manage", "hrms.attendance.manage", "hrms.payroll.run", "hrms.read"], is_system: false, created_at: new Date().toISOString() },
      { id: "9", name: "Auditor", description: "Read-only access to records and trails", permissions: ["audit.read", "project.read", "accounting.read", "inventory.read", "hrms.read", "procurement.read", "payment.read"], is_system: false, created_at: new Date().toISOString() },
      { id: "10", name: "New Role", description: "Custom newly added role", permissions: ["custom.read", "custom.write"], is_system: false, created_at: new Date().toISOString() }
    ]);
    setLoading(false);
  }, []);

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: "var(--ui-background)", color: "var(--ui-text)" }}>
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <button
            className="px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
            style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
            onClick={() => handleOpenModal()}
          >
            <FiPlus /> New Role
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading roles...</div>
        ) : error ? (
          <div className="p-4 rounded-md text-red-500 bg-red-50 border border-red-200">{error}</div>
        ) : (
          <div className="rounded-lg overflow-hidden border max-h-[500px] flex flex-col" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 z-10 border-b" style={{ borderColor: "var(--ui-border)", background: "var(--ui-background)" }}>
                  <tr>
                    <th className="px-4 py-3 font-semibold">Role Name</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Permissions</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--ui-border)" }}>
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-black/5">
                      <td className="px-4 py-4">
                        <div className="font-medium flex items-center gap-2">
                          {role.name}
                          {role.is_system && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase tracking-wider">
                              System
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4" style={{ color: "var(--ui-text-muted)" }}>
                        {role.description}
                      </td>
                      <td className="px-4 py-4 whitespace-normal min-w-[300px]">
                        <div className="flex flex-wrap gap-1.5">
                          {role.permissions.map((perm, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 rounded-md"
                              style={{ background: "var(--ui-background)", color: "var(--ui-text-muted)", border: "1px solid var(--ui-border)" }}
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            className="p-1.5 rounded-md hover:bg-black/5"
                            style={{ color: "var(--ui-text-muted)" }}
                            onClick={() => handleOpenModal(role)}
                          >
                            <FiEdit2 size={16} />
                          </button>
                          {!role.is_system && (
                            <button
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                              onClick={() => handleDelete(role.id)}
                            >
                              <FiTrash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="p-6 rounded-lg w-full max-w-2xl shadow-xl" style={{ background: "var(--ui-surface)", color: "var(--ui-text)", border: "1px solid var(--ui-border)" }}>
            <h2 className="text-xl font-bold mb-4">{editingRole ? "Edit Role" : "New Role"}</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md bg-transparent"
                  style={{ borderColor: "var(--ui-border)" }}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Inspector"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md bg-transparent"
                  style={{ borderColor: "var(--ui-border)" }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Inspects site daily"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Permissions Matrix</label>
                <div className="border rounded-md p-4 h-72 overflow-y-auto flex flex-col gap-6 bg-black/[0.02] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ borderColor: "var(--ui-border)" }}>
                  {Object.entries(PERMISSION_GROUPS).map(([groupName, perms]) => (
                    <div key={groupName} className="flex flex-col gap-2">
                      <h4 className="font-semibold text-sm border-b pb-1" style={{ color: "var(--ui-text-muted)", borderColor: "var(--ui-border)" }}>
                        {groupName}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {perms.map(perm => {
                          const isChecked = formData.permissions.includes(perm);

                          // Format label: "project.read" -> "Read", "inventory.stock.manage" -> "Stock Manage"
                          const displayLabel = perm
                            .split('.')
                            .slice(1)
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');

                          return (
                            <label
                              key={perm}
                              className={`flex items-center gap-2 text-xs cursor-pointer p-2 rounded-md transition-all border ${isChecked ? "bg-[var(--ui-primary)]/10 border-[var(--ui-primary)]/30" : "bg-transparent border-transparent hover:bg-black/5"}`}
                            >
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded cursor-pointer accent-[var(--ui-primary)]"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, permissions: [...formData.permissions, perm] });
                                  } else {
                                    setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== perm) });
                                  }
                                }}
                              />
                              <span className={isChecked ? "font-semibold text-[var(--ui-primary)]" : "text-[var(--ui-text)]"}>
                                {displayLabel}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  className="px-4 py-2 rounded-md font-medium border transition-colors hover:bg-black/5"
                  style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-md font-medium transition-colors"
                  style={{ background: "var(--ui-primary)", color: "var(--ui-primary-foreground)" }}
                  onClick={handleSave}
                >
                  Save Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
