"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Typography, Space, Button, Empty, Spin } from "antd";
import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
}

export default function PlatformDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/platform/tenants");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      const data = await res.json();
      setTenants(data.tenants ?? []);
    } catch {
      console.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const provisioningTenants = tenants.filter((t) => t.status === "provisioning").length;
  const failedTenants = tenants.filter((t) => t.status === "failed").length;

  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_: unknown, record: Tenant) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.slug}</Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: "success",
          provisioning: "processing",
          failed: "error",
          suspended: "warning",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Platform Dashboard</Title>
            <Text type="secondary">Overview of all tenants on the platform</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTenants}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push("/platform/tenants")}>
              Create Tenant
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="Total Tenants"
              value={tenants.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="Active"
              value={activeTenants}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="Provisioning / Failed"
              value={provisioningTenants}
              suffix={failedTenants > 0 && <span style={{ color: "#ff4d4f", fontSize: 14 }}>/ {failedTenants} failed</span>}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="All Tenants"
        bordered={false}
        style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginTop: 24 }}
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={tenants}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <Empty description="No tenants yet">
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push("/platform/tenants")}>
                    Create First Tenant
                  </Button>
                </Empty>
              ),
            }}
          />
        </Spin>
      </Card>
    </div>
  );
}
