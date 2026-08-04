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
  message,
  Card,
  Spin,
  Empty,
  Typography,
  Tooltip,
  Popconfirm,
  Descriptions,
  Badge,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  CopyOutlined,
  LoginOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Text } = Typography;

interface Tenant {
  id: string;
  name: string;
  slug: string;
  schema_name: string;
  status: string;
  branding: any;
  feature_flags: any;
  created_at: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/platform/tenants");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      const data = await res.json();
      setTenants(data.tenants ?? []);
    } catch {
      message.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const res = await fetch("/api/v1/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create tenant");
      }

      message.success("Tenant provisioning started");
      setCreateModalOpen(false);
      form.resetFields();
      fetchTenants();
    } catch (error: any) {
      message.error(error.message || "Failed to create tenant");
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (tenant: Tenant) => {
    setViewingTenant(tenant);
    setViewModalOpen(true);
  };

  const handleLoginAsTenant = (tenant: Tenant) => {
    if (tenant.status !== "active") {
      message.warning("Tenant is not active yet");
      return;
    }
    // Navigate to tenant login with pre-filled slug
    router.push(`/login?tenantSlug=${tenant.slug}`);
  };

  const handleRetryProvisioning = async (tenant: Tenant) => {
    try {
      const res = await fetch(`/api/v1/platform/tenants/${tenant.id}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to retry");
      message.success("Retrying provisioning...");
      fetchTenants();
    } catch {
      message.error("Failed to retry provisioning");
    }
  };

  const handleSuspendResume = async (tenant: Tenant, action: "suspend" | "resume") => {
    try {
      const res = await fetch(`/api/v1/platform/tenants/${tenant.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update tenant");
      }
      message.success(`Tenant ${action === "suspend" ? "suspended" : "resumed"} successfully`);
      fetchTenants();
    } catch (error: any) {
      message.error(error.message || "Failed to update tenant");
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchText.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_: unknown, record: Tenant) => (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: record.status === "active" ? "#f6ffed" : record.status === "failed" ? "#fff2f0" : "#e6f7ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CloudServerOutlined
              style={{
                color: record.status === "active" ? "#52c41a" : record.status === "failed" ? "#ff4d4f" : "#1890ff",
                fontSize: 18,
              }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.slug}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Schema",
      dataIndex: "schema_name",
      key: "schema_name",
      render: (schema: string) => (
        <Text code copyable={{ text: schema }}>{schema}</Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config: Record<string, { color: string; icon: React.ReactNode }> = {
          active: { color: "success", icon: <CheckCircleOutlined /> },
          provisioning: { color: "processing", icon: <ClockCircleOutlined /> },
          failed: { color: "error", icon: <ExclamationCircleOutlined /> },
          suspended: { color: "warning", icon: <ExclamationCircleOutlined /> },
        };
        const c = config[status] || { color: "default", icon: null };
        return <Tag icon={c.icon} color={c.color}>{status}</Tag>;
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_: unknown, record: Tenant) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          </Tooltip>
          {record.status === "active" && (
            <>
              <Tooltip title="Login as Tenant">
                <Button
                  type="text"
                  icon={<LoginOutlined />}
                  style={{ color: "#52c41a" }}
                  onClick={() => handleLoginAsTenant(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Suspend this tenant?"
                description="All tenant users will be logged out"
                onConfirm={() => handleSuspendResume(record, "suspend")}
              >
                <Tooltip title="Suspend">
                  <Button type="text" icon={<PauseCircleOutlined />} style={{ color: "#faad14" }} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {record.status === "suspended" && (
            <Popconfirm
              title="Resume this tenant?"
              onConfirm={() => handleSuspendResume(record, "resume")}
            >
              <Tooltip title="Resume">
                <Button type="text" icon={<PlayCircleOutlined />} style={{ color: "#52c41a" }} />
              </Tooltip>
            </Popconfirm>
          )}
          {record.status === "failed" && (
            <Popconfirm
              title="Retry provisioning?"
              onConfirm={() => handleRetryProvisioning(record)}
            >
              <Tooltip title="Retry Provisioning">
                <Button type="text" icon={<ReloadOutlined />} style={{ color: "#faad14" }} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>Tenants</Typography.Title>
            <Text type="secondary">Manage all tenant organizations on the platform</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTenants}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              Create Tenant
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
            placeholder="Search by name or slug..."
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
            dataSource={filteredTenants}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (t) => `${t} tenant${t !== 1 ? "s" : ""}`,
            }}
            locale={{
              emptyText: (
                <Empty description="No tenants found">
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                    Create First Tenant
                  </Button>
                </Empty>
              ),
            }}
          />
        </Spin>
      </Card>

      {/* Create Tenant Modal */}
      <Modal
        title="Create New Tenant"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={submitting}
        width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tenant Name"
            rules={[{ required: true, message: "Please enter tenant name" }]}
          >
            <Input placeholder="e.g. Acme Construction Ltd" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: "Please enter a slug" },
              { pattern: /^[a-z0-9-]+$/, message: "Only lowercase letters, numbers, and hyphens" },
            ]}
          >
            <Input placeholder="e.g. acme-construction" />
          </Form.Item>
          <div style={{ padding: "12px 16px", background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              A PostgreSQL schema will be automatically created with all required tables.
              The slug will be used as the workspace identifier for login.
            </Text>
          </div>
        </Form>
      </Modal>

      {/* View Tenant Modal */}
      <Modal
        title="Tenant Details"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalOpen(false)}>
            Close
          </Button>,
          viewingTenant?.status === "active" && (
            <Button
              key="login"
              type="primary"
              icon={<LoginOutlined />}
              onClick={() => handleLoginAsTenant(viewingTenant)}
            >
              Login as Tenant
            </Button>
          ),
        ]}
        width={560}
      >
        {viewingTenant && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name">{viewingTenant.name}</Descriptions.Item>
            <Descriptions.Item label="Slug">
              <Text code>{viewingTenant.slug}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Schema">
              <Space>
                <Text code>{viewingTenant.schema_name}</Text>
                <Tooltip title="Copy">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(viewingTenant.schema_name);
                      message.success("Copied!");
                    }}
                  />
                </Tooltip>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge
                status={viewingTenant.status === "active" ? "success" : viewingTenant.status === "failed" ? "error" : "processing"}
                text={viewingTenant.status}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(viewingTenant.created_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Login URL">
              <Text code>{`/login?tenantSlug=${viewingTenant.slug}`}</Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
