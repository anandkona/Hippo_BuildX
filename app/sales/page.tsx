"use client";

import React from "react";
import { Card, Table, Button, Input, DatePicker, Row, Col, Statistic, Space, Tag } from "antd";
import { SearchOutlined, DownloadOutlined, LineChartOutlined } from "@ant-design/icons";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const { RangePicker } = DatePicker;

const salesData = [
  { name: "Week 1", sales: 4000 },
  { name: "Week 2", sales: 3000 },
  { name: "Week 3", sales: 5000 },
  { name: "Week 4", sales: 4500 },
];

const columns = [
  { title: "Invoice ID", dataIndex: "id", key: "id" },
  { title: "Client", dataIndex: "client", key: "client" },
  { title: "Date", dataIndex: "date", key: "date" },
  { title: "Amount", dataIndex: "amount", key: "amount", render: (val: number) => `₹${val.toFixed(2)}` },
  { title: "Status", dataIndex: "status", key: "status", render: (status: string) => <Tag color={status === "Paid" ? "green" : "red"}>{status}</Tag> },
];

const tableData = [
  { key: "1", id: "INV-1001", client: "Acme Corp", date: "2026-08-01", amount: 1500, status: "Paid" },
  { key: "2", id: "INV-1002", client: "TechFlow", date: "2026-08-02", amount: 250, status: "Pending" },
  { key: "3", id: "INV-1003", client: "Globex", date: "2026-08-02", amount: 3200, status: "Paid" },
];

export default function SalesPage() {
  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Sales Dashboard</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Statistic title="Monthly Revenue" value={45600} prefix="₹" valueStyle={{ color: "#3f8600" }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
             <Statistic title="Pending Invoices" value={12} valueStyle={{ color: "#cf1322" }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
           <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
             <Statistic title="Avg Order Value" value={350} prefix="₹" valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card title="Sales History" bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                <Space wrap>
                  <Input placeholder="Search invoices..." prefix={<SearchOutlined />} style={{ width: 250 }} />
                  <RangePicker />
                </Space>
                <Button icon={<DownloadOutlined />}>Export CSV</Button>
             </div>
             <Table columns={columns} dataSource={tableData} pagination={{ pageSize: 5 }} scroll={{ x: "max-content" }} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Sales Trend" bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", height: "100%" }}>
             <div style={{ height: 300 }}>
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={salesData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" />
                   <YAxis />
                   <Tooltip />
                   <Line type="monotone" dataKey="sales" stroke="#1890ff" strokeWidth={3} dot={{ r: 6 }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
