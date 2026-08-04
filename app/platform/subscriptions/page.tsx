"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Card,
  Spin,
  Empty,
  Typography,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const { Option } = Select;

interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
  tenantName: string;
  tenantSlug: string;
  planName: string;
  planPrice: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  isActive?: boolean;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [subRes, tenantRes, planRes] = await Promise.all([
        fetch("/api/v1/platform/subscriptions"),
        fetch("/api/v1/platform/tenants"),
        fetch("/api/v1/platform/plans"),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscriptions(subData.subscriptions ?? []);
      }
      if (tenantRes.ok) {
        const tenantData = await tenantRes.json();
        setTenants(tenantData.tenants ?? []);
      }
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlans(planData.plans ?? []);
      }
    } catch {
      message.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const res = await fetch("/api/v1/platform/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign plan");
      }

      message.success("Plan assigned successfully");
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.message || "Failed to assign plan");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_: unknown, record: Subscription) => (
        <Space>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#e6f7ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LinkOutlined style={{ color: "#1890ff" }} />
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.tenantName}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.tenantSlug}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Plan",
      key: "plan",
      render: (_: unknown, record: Subscription) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.planName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ₹{record.planPrice?.toLocaleString()}/month
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config: Record<string, { color: string; icon: React.ReactNode }> = {
          active: { color: "success", icon: <CheckCircleOutlined /> },
          trial: { color: "processing", icon: <ClockCircleOutlined /> },
          past_due: { color: "warning", icon: <ClockCircleOutlined /> },
          cancelled: { color: "error", icon: <CheckCircleOutlined /> },
        };
        const c = config[status] || { color: "default", icon: null };
        return <Tag icon={c.icon} color={c.color}>{status}</Tag>;
      },
    },
    {
      title: "Start Date",
      dataIndex: "startsAt",
      key: "startsAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Expires",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : "Never",
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>Subscriptions</Typography.Title>
            <Text type="secondary">Manage tenant subscriptions and plan assignments</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              Assign Plan
            </Button>
          </Space>
        </div>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={subscriptions}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <Empty description="No subscriptions found">
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                    Assign First Plan
                  </Button>
                </Empty>
              ),
            }}
          />
        </Spin>
      </Card>

      <Modal
        title="Assign Plan to Tenant"
        open={modalOpen}
        onOk={handleAssign}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="tenantId"
            label="Tenant"
            rules={[{ required: true, message: "Please select a tenant" }]}
          >
            <Select placeholder="Select tenant" showSearch optionFilterProp="children">
              {tenants.filter((t) => t.status === "active").map((tenant) => (
                <Option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="planId"
            label="Plan"
            rules={[{ required: true, message: "Please select a plan" }]}
          >
            <Select placeholder="Select plan" showSearch optionFilterProp="children">
              {plans.filter((p) => p.isActive).map((plan) => (
                <Option key={plan.id} value={plan.id}>
                  {plan.displayName} - ₹{plan.price.toLocaleString()}/month
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
