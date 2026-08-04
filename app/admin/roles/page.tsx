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

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

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
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            {record.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: "Permissions",
      dataIndex: "permissions",
      key: "permissions",
      render: (permissions: string[]) => (
        <Space>
          <Tag>{permissions?.length ?? 0} permissions</Tag>
          {permissions?.length > 0 && renderPermissionTags(permissions)}
        </Space>
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

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
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
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: "Please enter a role name" }]}
          >
            <Input placeholder="e.g. Project Manager" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Brief description of this role" />
          </Form.Item>
          <Form.Item name="permissions" label="Permissions">
            <Collapse ghost>
              {PERMISSION_MODULES.map((mod) => (
                <Panel
                  key={mod}
                  header={
                    <Space>
                      <span style={{ fontWeight: 500, textTransform: "capitalize" }}>
                        {MODULE_LABELS[mod] || mod}
                      </span>
                      <Tag>{PERMISSION_ACTIONS.length} permissions</Tag>
                    </Space>
                  }
                >
                  <Checkbox.Group
                    options={PERMISSION_ACTIONS.map((action) => ({
                      label: action.charAt(0).toUpperCase() + action.slice(1),
                      value: `${mod}:${action}`,
                    }))}
                  />
                </Panel>
              ))}
            </Collapse>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
