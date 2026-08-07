"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Table, Button, Space, Modal, Form, Input, DatePicker, Select, message, Typography, Tag } from "antd";
import { PlusOutlined, ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function ProjectIssuesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${projectId}/issues`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load Issues");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      const payload = {
        title: values.title,
        description: values.description,
        severity: values.severity,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      };

      const res = await fetch(`/api/v1/projects/${projectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create issue");
      }

      message.success("Issue created successfully");
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.message || "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case "high": return "error";
      case "medium": return "warning";
      case "low": return "success";
      default: return "default";
    }
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string) => (
        <Space>
          <WarningOutlined style={{ color: "#f5222d" }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      render: (sev: string) => <Tag color={getSeverityColor(sev)} style={{ textTransform: "capitalize" }}>{sev || "Medium"}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <Tag color={status === "open" ? "processing" : "default"} style={{ textTransform: "capitalize" }}>{status || "Open"}</Tag>,
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      key: "due_date",
      render: (date: string) => date ? dayjs(date).format("MMM D, YYYY") : <Text type="secondary">—</Text>,
    },
    {
      title: "Logged On",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => dayjs(date).format("MMM D, YYYY"),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Issues Log</Title>
          <Text type="secondary">Track defects, safety observations, and site issues.</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button type="primary" danger icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Log Issue</Button>
        </Space>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title="Log New Issue"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Issue Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Water logging in basement" />
          </Form.Item>
          
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item name="severity" label="Severity" initialValue="medium" style={{ flex: 1 }}>
              <Select>
                <Select.Option value="high">High</Select.Option>
                <Select.Option value="medium">Medium</Select.Option>
                <Select.Option value="low">Low</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="dueDate" label="Due Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} placeholder="Detailed description of the issue..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
