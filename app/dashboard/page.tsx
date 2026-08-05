"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Empty, Typography, Spin, Button } from "antd";
import {
  TeamOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  AlertOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string[];
  created_at: string;
}

interface Role {
  id: string;
  name: string;
}

interface Channel {
  id: string;
  type: string;
  name: string;
  is_active: boolean;
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, roleRes, channelRes] = await Promise.allSettled([
        fetch("/api/v1/admin/users"),
        fetch("/api/v1/admin/roles"),
        fetch("/api/v1/admin/channels"),
      ]);

      if (userRes.status === "fulfilled" && userRes.value.ok) {
        const data = await userRes.value.json();
        setUsers(data.data ?? data);
      }
      if (roleRes.status === "fulfilled" && roleRes.value.ok) {
        const data = await roleRes.value.json();
        setRoles(data.data ?? data);
      }
      if (channelRes.status === "fulfilled" && channelRes.value.ok) {
        const data = await channelRes.value.json();
        setChannels(data.data ?? data);
      }
    } catch {
      console.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeUsers = users.filter((u) => u.status === "active").length;
  const activeRoles = roles.length;
  const activeChannels = channels.filter((c) => c.is_active).length;

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const userColumns = [
    {
      title: "User",
      key: "user",
      render: (_: unknown, record: User) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </div>
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
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "active" ? "success" : "error"}>
          {status === "active" ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Joined",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
          <Text type="secondary">Welcome to BuildX Construction ERP</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="Total Users"
              value={users.length}
              suffix={<span style={{ fontSize: 14, color: "#52c41a" }}>/ {activeUsers} active</span>}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="Active Roles"
              value={activeRoles}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="Channels"
              value={activeChannels}
              suffix={<span style={{ fontSize: 14, color: "#999" }}>/ {channels.length} total</span>}
              prefix={<AlertOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="System Status"
              value="Operational"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a", fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Recent Users"
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            {recentUsers.length > 0 ? (
              <Table
                columns={userColumns}
                dataSource={recentUsers}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No users yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Quick Actions"
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  padding: "12px 16px",
                  background: "#f6ffed",
                  borderRadius: 8,
                  border: "1px solid #b7eb8f",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 16 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>System Status</div>
                  <div style={{ color: "#666", fontSize: 12 }}>All systems operational</div>
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  background: "#e6f7ff",
                  borderRadius: 8,
                  border: "1px solid #91d5ff",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <ClockCircleOutlined style={{ color: "#1890ff", fontSize: 16 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>Users Registered</div>
                  <div style={{ color: "#666", fontSize: 12 }}>{users.length} total users</div>
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  background: "#fff7e6",
                  borderRadius: 8,
                  border: "1px solid #ffd591",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <SafetyCertificateOutlined style={{ color: "#faad14", fontSize: 16 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>Roles Configured</div>
                  <div style={{ color: "#666", fontSize: 12 }}>{roles.length} roles active</div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Spin>
  );
}
