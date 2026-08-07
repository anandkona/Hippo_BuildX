"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Table, Button, Space, Modal, Form, Input, DatePicker, message, Typography, Tag, Switch } from "antd";
import { PlusOutlined, ReloadOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function ProjectRFIsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentOnly, setCurrentOnly] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${projectId}/rfis?current=${currentOnly}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load RFIs");
    } finally {
      setLoading(false);
    }
  }, [projectId, currentOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      const payload = {
        rfiNo: values.rfiNo,
        subject: values.subject,
        question: values.question,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      };

      const res = await fetch(`/api/v1/projects/${projectId}/rfis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create RFI");
      }

      message.success("RFI submitted successfully");
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "RFI No.",
      dataIndex: "rfi_no",
      key: "rfi_no",
      render: (text: string, record: any) => (
        <Space>
          <QuestionCircleOutlined style={{ color: "#fa8c16" }} />
          <Text strong>{text}</Text>
          {record.is_current ? <Tag color="green">Current</Tag> : <Tag>Superseded</Tag>}
        </Space>
      ),
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
    },
    {
      title: "Revision",
      dataIndex: "version",
      key: "version",
      render: (val: number) => `Rev ${val}`,
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      key: "due_date",
      render: (date: string) => date ? dayjs(date).format("MMM D, YYYY") : <Text type="secondary">—</Text>,
    },
    {
      title: "Raised On",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => dayjs(date).format("MMM D, YYYY"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => {
            form.setFieldsValue({ rfiNo: record.rfi_no, subject: record.subject, question: record.question });
            setModalOpen(true);
          }}>
            Issue New Revision
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Requests for Information (RFIs)</Title>
          <Text type="secondary">Track queries and clarifications across the project lifecycle.</Text>
        </div>
        <Space>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16 }}>
            <Switch checked={currentOnly} onChange={setCurrentOnly} size="small" />
            <Text type="secondary" style={{ fontSize: 13 }}>Show Current Revisions Only</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Raise RFI</Button>
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
        title="Raise RFI (or New Revision)"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            Entering an existing RFI No. will automatically create a new revision tracking the conversation history.
          </Text>
          <Form.Item name="rfiNo" label="RFI Number" rules={[{ required: true }]}>
            <Input placeholder="e.g. RFI-001" />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="e.g. Discrepancy in structural column layout" />
          </Form.Item>
          <Form.Item name="question" label="Question / Clarification Needed" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="dueDate" label="Response Due Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
