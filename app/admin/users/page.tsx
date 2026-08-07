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
  Select,
  message,
  Card,
  Popconfirm,
  Spin,
  Empty,
  Typography,
  Avatar,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const { Option } = Select;
const { Text } = Typography;

interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  roles: string[];
  created_at: string;
}

interface Role {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.data ?? data);
    } catch {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setRoles(data.data ?? data);
    } catch {
      message.error("Failed to load roles");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      status: user.status,
      roles: user.roles,
    });
    setModalOpen(true);
  };

  const handleView = (user: User) => {
    setViewingUser(user);
    setViewModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      message.success("User deleted successfully");
      fetchUsers();
    } catch {
      message.error("Failed to delete user");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const url = editingUser
        ? `/api/v1/admin/users/${editingUser.id}`
        : "/api/v1/admin/users";
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to save user");
      message.success(editingUser ? "User updated successfully" : "User created successfully");
      setModalOpen(false);
      fetchUsers();
    } catch {
      message.error("Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchText.toLowerCase()) ||
      u.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: "User",
      key: "user",
      render: (_: unknown, record: User) => (
        <Space>
          <Avatar
            style={{ backgroundColor: "var(--ui-primary)" }}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "Active", value: "active" },
        { text: "Inactive", value: "inactive" },
      ],
      onFilter: (value: unknown, record: User) => record.status === value,
      render: (status: string) => (
        <Tag color={status === "active" ? "success" : "error"}>
          {status === "active" ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Roles",
      dataIndex: "roles",
      key: "roles",
      render: (roles: string[]) => (
        <Space size={[0, 4]} wrap>
          {roles?.length > 0 ? (
            roles.map((role) => (
              <Tag key={role} color="blue">
                {role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Tag>
            ))
          ) : (
            <Text type="secondary">No roles</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete user"
            description="Are you sure you want to delete this user?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
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
            <Typography.Title level={4} style={{ margin: 0 }}>Users</Typography.Title>
            <Text type="secondary">Manage user accounts and their roles</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add User
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
            placeholder="Search by name or email..."
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
            dataSource={filteredUsers}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (t) => `${t} user${t !== 1 ? "s" : ""}`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No users found"
                >
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Add User
                  </Button>
                </Empty>
              ),
            }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingUser ? "Edit User" : "Add User"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter a name" }]}
          >
            <Input placeholder="Enter full name" prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: "Please enter an email" },
              { type: "email", message: "Invalid email format" },
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please enter a password" },
                { min: 6, message: "Password must be at least 6 characters" },
              ]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}
          {editingUser && (
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select>
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item
            name="roles"
            label="Roles"
            rules={[{ required: true, message: "Please select at least one role" }]}
          >
            <Select mode="multiple" placeholder="Select roles">
              {roles.map((role) => (
                <Option key={role.id} value={role.name}>
                  {role.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="User Details"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={480}
      >
        {viewingUser && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
              <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: "#1890ff", marginBottom: 12 }} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>{viewingUser.name}</div>
              <Text type="secondary">{viewingUser.email}</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text type="secondary">Status</Text>
              <Tag color={viewingUser.status === "active" ? "success" : "error"}>
                {viewingUser.status === "active" ? "Active" : "Inactive"}
              </Tag>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text type="secondary">Roles</Text>
              <Space size={[0, 4]} wrap>
                {viewingUser.roles?.map((role) => (
                  <Tag key={role} color="blue">
                    {role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Tag>
                ))}
              </Space>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text type="secondary">Created</Text>
              <Text>{new Date(viewingUser.created_at).toLocaleDateString()}</Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

