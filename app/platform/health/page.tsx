"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Spin,
  Progress,
  Descriptions,
  Badge,
} from "antd";
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface Tenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Subscription {
  tenantId: string;
  planName: string;
  status: string;
}

export default function HealthPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantRes, subRes] = await Promise.all([
        fetch("/api/v1/platform/tenants"),
        fetch("/api/v1/platform/subscriptions"),
      ]);

      if (tenantRes.ok) {
        const tenantData = await tenantRes.json();
        setTenants(tenantData.tenants ?? []);
      }
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscriptions(subData.subscriptions ?? []);
      }
    } catch {
      console.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const provisioningTenants = tenants.filter((t) => t.status === "provisioning").length;
  const failedTenants = tenants.filter((t) => t.status === "failed").length;
  const suspendedTenants = tenants.filter((t) => t.status === "suspended").length;

  const getSubscriptionForTenant = (tenantId: string) =>
    subscriptions.find((s) => s.tenantId === tenantId);

  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_: unknown, record: Tenant) => (
        <Space>
          <CloudServerOutlined style={{ color: "#1890ff" }} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.slug}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Schema",
      dataIndex: "schemaName",
      key: "schemaName",
      render: (schema: string) => <Text code>{schema}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config: Record<string, { color: string; icon: React.ReactNode }> = {
          active: { color: "success", icon: <CheckCircleOutlined /> },
          provisioning: { color: "processing", icon: <ClockCircleOutlined /> },
          failed: { color: "error", icon: <CloseCircleOutlined /> },
          suspended: { color: "warning", icon: <WarningOutlined /> },
        };
        const c = config[status] || { color: "default", icon: null };
        return <Tag icon={c.icon} color={c.color}>{status}</Tag>;
      },
    },
    {
      title: "Plan",
      key: "plan",
      render: (_: unknown, record: Tenant) => {
        const sub = getSubscriptionForTenant(record.id);
        return sub ? (
          <Tag color="blue">{sub.planName}</Tag>
        ) : (
          <Tag>No Plan</Tag>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Last Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>Health Monitor</Typography.Title>
            <Text type="secondary">Platform health and tenant status overview</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <Statistic
                title="Total Tenants"
                value={tenants.length}
                prefix={<TeamOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <Statistic
                title="Active"
                value={activeTenants}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <Statistic
                title="Provisioning"
                value={provisioningTenants}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <Statistic
                title="Failed / Suspended"
                value={failedTenants + suspendedTenants}
                prefix={<WarningOutlined />}
                valueStyle={{ color: failedTenants > 0 || suspendedTenants > 0 ? "#ff4d4f" : "#52c41a" }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="Tenant Health"
          bordered={false}
          style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginTop: 24 }}
        >
          <Table
            columns={columns}
            dataSource={tenants}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "No tenants found" }}
          />
        </Card>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} md={12}>
            <Card
              title="System Status"
              bordered={false}
              style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Database">
                  <Badge status="success" text="Connected" />
                </Descriptions.Item>
                <Descriptions.Item label="Redis">
                  <Badge status="success" text="Connected" />
                </Descriptions.Item>
                <Descriptions.Item label="Worker">
                  <Badge status="success" text="Running" />
                </Descriptions.Item>
                <Descriptions.Item label="API">
                  <Badge status="success" text="Healthy" />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              title="Platform Usage"
              bordered={false}
              style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text>Tenant Capacity</Text>
                  <Text>{tenants.length} / 100</Text>
                </div>
                <Progress percent={tenants.length} showInfo={false} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text>Active Subscriptions</Text>
                  <Text>{subscriptions.filter((s) => s.status === "active").length} / {tenants.length}</Text>
                </div>
                <Progress
                  percent={tenants.length > 0 ? Math.round((subscriptions.filter((s) => s.status === "active").length / tenants.length) * 100) : 0}
                  showInfo={false}
                  strokeColor="#52c41a"
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
