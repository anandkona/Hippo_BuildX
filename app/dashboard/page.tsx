"use client";

import React from "react";
import { Row, Col, Card, Statistic, Table, Tag } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined, CreditCardOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Jan", revenue: 4000, subs: 2400 },
  { name: "Feb", revenue: 3000, subs: 1398 },
  { name: "Mar", revenue: 2000, subs: 9800 },
  { name: "Apr", revenue: 2780, subs: 3908 },
  { name: "May", revenue: 1890, subs: 4800 },
  { name: "Jun", revenue: 2390, subs: 3800 },
  { name: "Jul", revenue: 3490, subs: 4300 },
];

const columns = [
  { title: "Name", dataIndex: "name", key: "name" },
  { title: "Plan", dataIndex: "plan", key: "plan" },
  { title: "Status", dataIndex: "status", key: "status", render: (status: string) => (
      <Tag color={status === "Active" ? "green" : "red"}>{status}</Tag>
    ) 
  },
  { title: "Joined", dataIndex: "joined", key: "joined" },
];

const tableData = [
  { key: "1", name: "John Brown", plan: "Pro", status: "Active", joined: "2023-01-15" },
  { key: "2", name: "Jim Green", plan: "Starter", status: "Expired", joined: "2023-03-22" },
  { key: "3", name: "Joe Black", plan: "Enterprise", status: "Active", joined: "2023-06-12" },
  { key: "4", name: "Jim Red", plan: "Pro", status: "Active", joined: "2023-07-05" },
];

export default function Dashboard() {
  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Dashboard Overview</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Statistic
              title="Total Revenue"
              value={112893}
              precision={2}
              valueStyle={{ color: "#3f8600" }}
              prefix="₹"
              suffix={<ArrowUpOutlined style={{ fontSize: 14 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Statistic
              title="Active Clients"
              value={1234}
              valueStyle={{ color: "#1890ff" }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Statistic
              title="Active Subscriptions"
              value={893}
              valueStyle={{ color: "#faad14" }}
              prefix={<CreditCardOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Statistic
              title="Sales Today"
              value={93}
              valueStyle={{ color: "#cf1322" }}
              prefix={<ShoppingCartOutlined />}
              suffix={<ArrowDownOutlined style={{ fontSize: 14 }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="Revenue Growth" bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#1890ff" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Recent Activity" bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", height: "100%" }}>
            <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>🔵 <strong>John Brown</strong> upgraded to Pro plan</li>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>🔴 <strong>Jim Green</strong> subscription expired</li>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>🟢 New client <strong>Joe Black</strong> joined</li>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>⚙️ <strong>System</strong> monthly report generated</li>
              <li style={{ padding: "8px 0" }}>👤 <strong>Admin</strong> updated settings</li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="Latest Clients" bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Table columns={columns} dataSource={tableData} pagination={false} scroll={{ x: "max-content" }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
