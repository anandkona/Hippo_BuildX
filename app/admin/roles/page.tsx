"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Checkbox,
  message,
  Card,
  Popconfirm,
  Spin,
  Empty,
  Typography,
  Tooltip,
  Collapse,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const { Panel } = Collapse;

const PERMISSION_MODULES = [
  "users",
  "roles",
  "projects",
  "crm",
  "inventory",
  "procurement",
  "accounting",
  "hrms",
  "settings",
  "channels",
];

const PERMISSION_ACTIONS = ["create", "read", "update", "delete", "approve", "export"];

const MODULE_LABELS: Record<string, string> = {
  users: "User Management",
  roles: "Role Management",
  projects: "Projects",
  crm: "CRM",
  inventory: "Inventory",
  procurement: "Procurement",
  accounting: "Accounting",
  hrms: "HRMS",
  settings: "Settings",
  channels: "Notification Channels",
};

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

function PermissionsEditor({ value = [], onChange }: { value?: string[], onChange?: (val: string[]) => void }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredModules = PERMISSION_MODULES.filter(mod => 
    (MODULE_LABELS[mod] || mod).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheckboxChange = (mod: string, action: string, checked: boolean) => {
    const next = new Set(value);
    const key = `${mod}:${action}`;
    if (checked) {
      next.add(key);
      if (action !== 'read') {
        next.add(`${mod}:read`);
      }
    } else {
      next.delete(key);
      if (action === 'read') {
        PERMISSION_ACTIONS.forEach(a => next.delete(`${mod}:${a}`));
      }
    }
    onChange?.(Array.from(next));
  };

  const allPossibleCount = filteredModules.length * PERMISSION_ACTIONS.length;
  const currentFilteredCount = filteredModules.reduce((acc, mod) => {
    return acc + PERMISSION_ACTIONS.filter(a => value.includes(`${mod}:${a}`)).length;
  }, 0);
  
  const isAllSelected = currentFilteredCount === allPossibleCount && allPossibleCount > 0;
  const isIndeterminate = currentFilteredCount > 0 && currentFilteredCount < allPossibleCount;

  const handleSelectAll = (e: any) => {
    const checked = e.target.checked;
    const next = new Set(value);
    filteredModules.forEach(mod => {
      PERMISSION_ACTIONS.forEach(a => {
        if (checked) next.add(`${mod}:${a}`);
        else next.delete(`${mod}:${a}`);
      });
    });
    onChange?.(Array.from(next));
  };

  const handleRowSelectAll = (mod: string, checked: boolean) => {
    const next = new Set(value);
    if (checked) {
      PERMISSION_ACTIONS.forEach(a => next.add(`${mod}:${a}`));
    } else {
      PERMISSION_ACTIONS.forEach(a => next.delete(`${mod}:${a}`));
    }
    onChange?.(Array.from(next));
  };

  const isRowAllChecked = (mod: string) => PERMISSION_ACTIONS.every(a => value.includes(`${mod}:${a}`));
  const isRowIndeterminate = (mod: string) => {
    const count = PERMISSION_ACTIONS.filter(a => value.includes(`${mod}:${a}`)).length;
    return count > 0 && count < PERMISSION_ACTIONS.length;
  };

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16, background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Checkbox 
          indeterminate={isIndeterminate} 
          checked={isAllSelected} 
          onChange={handleSelectAll}
          style={{ fontWeight: 500 }}
        >
          Select All Modules
        </Checkbox>
        <Input 
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
          placeholder="Search modules..." 
          style={{ width: 220, borderRadius: 6 }} 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          allowClear
        />
      </div>
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 14 }}>
          <thead style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid #f0f0f0', color: '#262626' }}>Module</th>
              {PERMISSION_ACTIONS.map(action => (
                <th key={action} style={{ padding: '12px 8px', fontWeight: 600, textTransform: 'capitalize', color: '#262626' }}>
                  {action}
                </th>
              ))}
              <th style={{ padding: '12px 16px', fontWeight: 600, borderLeft: '1px solid #f0f0f0', color: '#1890ff', background: '#e6f7ff' }}>Check All</th>
            </tr>
          </thead>
          <tbody>
            {filteredModules.length > 0 ? filteredModules.map((mod, index) => (
              <tr key={mod} style={{ borderBottom: index < filteredModules.length - 1 ? '1px solid #f0f0f0' : 'none', transition: 'background 0.3s' }} className="hover:bg-gray-50">
                <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, background: '#fafafa', borderRight: '1px solid #f0f0f0', color: '#595959' }}>
                  {MODULE_LABELS[mod] || mod}
                </td>
                {PERMISSION_ACTIONS.map(action => (
                  <td key={action} style={{ padding: '12px 8px' }}>
                    <Checkbox 
                      checked={value.includes(`${mod}:${action}`)}
                      onChange={(e) => handleCheckboxChange(mod, action, e.target.checked)}
                    />
                  </td>
                ))}
                <td style={{ padding: '12px 16px', borderLeft: '1px solid #f0f0f0', background: '#fafafa' }}>
                  <Checkbox 
                    checked={isRowAllChecked(mod)} 
                    indeterminate={isRowIndeterminate(mod)} 
                    onChange={e => handleRowSelectAll(mod, e.target.checked)} 
                  />
                </td>
              </tr>
            )) : (
              <tr><td colSpan={PERMISSION_ACTIONS.length + 2} style={{ padding: 32 }}><Empty description="No modules found" image={Empty.PRESENTED_IMAGE_SIMPLE} /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [viewingRole, setViewingRole] = useState<Role | null>(null);
  const [viewPermsModalOpen, setViewPermsModalOpen] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setRoles(data.data ?? data);
    } catch {
      message.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({ permissions: [] });
    setModalOpen(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      permissions: role.permissions ?? [],
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/roles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete role");
      message.success("Role deleted successfully");
      fetchRoles();
    } catch {
      message.error("Failed to delete role");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const url = editingRole
        ? `/api/v1/admin/roles/${editingRole.id}`
        : "/api/v1/admin/roles";
      const method = editingRole ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to save role");
      message.success(editingRole ? "Role updated successfully" : "Role created successfully");
      setModalOpen(false);
      fetchRoles();
    } catch {
      message.error("Failed to save role");
    } finally {
      setSubmitting(false);
    }
  };

  const groupedPermissions = PERMISSION_MODULES.reduce<Record<string, string[]>>((acc, mod) => {
    acc[mod] = PERMISSION_ACTIONS.map((action) => `${mod}:${action}`);
    return acc;
  }, {});

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(searchText.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderPermissionTags = (permissions: string[]) => {
    const grouped: Record<string, string[]> = {};
    permissions.forEach((p) => {
      const [mod] = p.split(":");
      if (!grouped[mod]) grouped[mod] = [];
      grouped[mod].push(p);
    });

    return (
      <Space size={[0, 4]} wrap>
        {Object.entries(grouped).map(([mod, perms]) => (
          <Tag key={mod} color="blue">
            {MODULE_LABELS[mod] || mod} ({perms.length})
          </Tag>
        ))}
      </Space>
    );
  };

  const columns = [
    {
      title: "Role",
      key: "role",
      render: (_: unknown, record: Role) => (
        <Space>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: record.is_system ? "#fff7e6" : "#e6f7ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {record.is_system ? (
              <LockOutlined style={{ color: "#faad14" }} />
            ) : (
              <SafetyCertificateOutlined style={{ color: "#1890ff" }} />
            )}
          </div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
        </Space>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>{text || "—"}</Text>
      ),
    },
    {
      title: "Permissions",
      dataIndex: "permissions",
      key: "permissions",
      render: (_: unknown, record: Role) => (
        <Tooltip title="View Permissions">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setViewingRole(record);
              setViewPermsModalOpen(true);
            }}
          />
        </Tooltip>
      ),
    },
    {
      title: "Type",
      dataIndex: "is_system",
      key: "is_system",
      width: 100,
      render: (isSystem: boolean) =>
        isSystem ? (
          <Tag icon={<LockOutlined />} color="warning">System</Tag>
        ) : (
          <Tag color="default">Custom</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Role) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete role"
            description={
              record.is_system
                ? "System roles cannot be deleted"
                : "Are you sure you want to delete this role?"
            }
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={record.is_system}
          >
            <Tooltip title={record.is_system ? "Cannot delete system role" : "Delete"}>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={record.is_system}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>Roles & Permissions</Typography.Title>
            <Text type="secondary">Manage roles and their associated permissions</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchRoles}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Role
            </Button>
          </Space>
        </div>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <Input
            placeholder="Search by name or description..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredRoles}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (t) => `${t} role${t !== 1 ? "s" : ""}`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No roles found"
                >
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Add Role
                  </Button>
                </Empty>
              ),
            }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingRole ? "Edit Role" : "Add Role"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 500 }}>Role Name</span>}
            rules={[{ required: true, message: "Please enter a role name" }]}
          >
            <Input placeholder="e.g. Project Manager" style={{ borderRadius: 6, padding: '8px 12px' }} />
          </Form.Item>
          <Form.Item name="description" label={<span style={{ fontWeight: 500 }}>Description</span>}>
            <Input.TextArea rows={2} placeholder="Brief description of this role" style={{ borderRadius: 6, padding: '8px 12px' }} />
          </Form.Item>
          <Form.Item name="permissions" label={<span style={{ fontWeight: 500 }}>Permissions</span>}>
            <PermissionsEditor />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Permissions - ${viewingRole?.name}`}
        open={viewPermsModalOpen}
        onCancel={() => setViewPermsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setViewPermsModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        <div style={{ marginTop: 16 }}>
          {viewingRole?.permissions && viewingRole.permissions.length > 0 ? (
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 14 }}>
                <thead style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid #f0f0f0' }}>Module</th>
                    {PERMISSION_ACTIONS.map(action => (
                      <th key={action} style={{ padding: '12px 8px', fontWeight: 600, textTransform: 'capitalize' }}>
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((mod, index) => (
                    <tr key={mod} style={{ borderBottom: index < PERMISSION_MODULES.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, background: '#fafafa', borderRight: '1px solid #f0f0f0' }}>
                        {MODULE_LABELS[mod] || mod}
                      </td>
                      {PERMISSION_ACTIONS.map(action => (
                        <td key={action} style={{ padding: '12px 8px' }}>
                          <Checkbox 
                            checked={viewingRole.permissions.includes(`${mod}:${action}`)} 
                            style={{ pointerEvents: 'none' }} 
                            tabIndex={-1}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty description="No permissions mapped" />
          )}
        </div>
      </Modal>
    </div>
  );
}

