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
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

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
            {mod} ({perms.length})
          </Tag>
        ))}
      </Space>
    );
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: Role, b: Role) => a.name.localeCompare(b.name),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Permissions",
      dataIndex: "permissions",
      key: "permissions",
      render: (permissions: string[]) => (
        <span>{permissions?.length ?? 0}</span>
      ),
    },
    {
      title: "System",
      dataIndex: "is_system",
      key: "is_system",
      width: 100,
      render: (isSystem: boolean) =>
        isSystem ? <Tag color="orange">System</Tag> : <Tag>Custom</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Role) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
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
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={record.is_system}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>
        Roles & Permissions
      </h2>
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      >
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
            placeholder="Search roles..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Role
          </Button>
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredRoles}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} roles` }}
            scroll={{ x: "max-content" }}
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
            <Input.TextArea rows={2} placeholder="Role description" />
          </Form.Item>
          <Form.Item name="permissions" label="Permissions">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {PERMISSION_MODULES.map((mod) => (
                <div key={mod}>
                  <div style={{ fontWeight: 600, marginBottom: 4, textTransform: "capitalize" }}>
                    {mod}
                  </div>
                  <Checkbox.Group
                    options={PERMISSION_ACTIONS.map((action) => ({
                      label: action.charAt(0).toUpperCase() + action.slice(1),
                      value: `${mod}:${action}`,
                    }))}
                  />
                </div>
              ))}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
