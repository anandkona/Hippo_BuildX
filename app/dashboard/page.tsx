"use client";

import React from "react";
import { Row, Col, Card, Statistic, Table, Tag, Empty, Typography } from "antd";
import {
  TeamOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  AlertOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const recentActivity = [
  {
    key: "1",
    action: "User login",
    user: "John Smith",
    time: "2 minutes ago",
    type: "info",
  },
  {
    key: "2",
    action: "Settings updated",
    user: "Admin",
    time: "1 hour ago",
    type: "warning",
  },
  {
    key: "3",
    action: "New user added",
    user: "Sarah Johnson",
    time: "3 hours ago",
    type: "success",
  },
];

const activityColumns = [
  {
    title: "Action",
    dataIndex: "action",
    key: "action",
  },
  {
    title: "User",
    dataIndex: "user",
    key: "user",
  },
  {
    title: "Time",
    dataIndex: "time",
    key: "time",
  },
  {
    title: "Type",
    dataIndex: "type",
    key: "type",
    render: (type: string) => {
      const colorMap: Record<string, string> = {
        info: "blue",
        success: "green",
        warning: "orange",
        error: "red",
      };
      return <Tag color={colorMap[type] || "default"}>{type}</Tag>;
    },
  },
];

export default function Dashboard() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">Welcome to BuildX Construction ERP</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <Statistic
              title="Total Users"
              value={3}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <Statistic
              title="Active Roles"
              value={5}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <Statistic
              title="Feature Modules"
              value={5}
              prefix={<ToolOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <Statistic
              title="Notification Channels"
              value={3}
              prefix={<AlertOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Recent Activity"
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <Table
              columns={activityColumns}
              dataSource={recentActivity}
              pagination={false}
              size="small"
            />
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
                  <div style={{ fontWeight: 500 }}>Last Updated</div>
                  <div style={{ color: "#666", fontSize: 12 }}>Just now</div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
