"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, message, Typography, Statistic, Tag } from "antd";
import { PlusOutlined, ReloadOutlined, DollarOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function ProjectBOQPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [data, setData] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${projectId}/boq`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
        setTotalAmount(json.meta?.totalAmount || 0);
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load BOQ data");
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
        code: values.code,
        description: values.description,
        unitOfMeasure: values.unitOfMeasure,
        quantity: values.quantity,
        unitRate: values.unitRate,
        category: values.category,
      };

      const res = await fetch(`/api/v1/projects/${projectId}/boq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save BOQ item");
      }

      message.success("BOQ Item saved");
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.message || "Failed to save item");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (cat: string) => cat ? <Tag color="blue">{cat}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "UoM",
      dataIndex: "unit_of_measure",
      key: "unit_of_measure",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      align: "right" as const,
      render: (val: number) => Number(val).toLocaleString(),
    },
    {
      title: "Unit Rate",
      dataIndex: "unit_rate",
      key: "unit_rate",
      align: "right" as const,
      render: (val: number) => `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (val: number) => <Text strong>$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Bill of Quantities (BOQ)</Title>
          <Text type="secondary">Manage estimated costs and resource quantities for this project.</Text>
        </div>
        <Space>
          <Card size="small" style={{ background: "#f6ffed", borderColor: "#b7eb8f", marginRight: 16 }}>
            <Statistic 
              title="Total BOQ Amount" 
              value={totalAmount} 
              precision={2} 
              prefix={<DollarOutlined />} 
              valueStyle={{ color: "#389e0d", fontSize: 20 }} 
            />
          </Card>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add Item</Button>
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
        title="Add BOQ Item"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item name="code" label="Item Code" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="e.g. CON-01" />
            </Form.Item>
            <Form.Item name="category" label="Category" style={{ flex: 1 }}>
              <Input placeholder="e.g. Concrete Work" />
            </Form.Item>
          </div>
          
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Item description" />
          </Form.Item>
          
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item name="unitOfMeasure" label="Unit of Measure (UoM)" initialValue="nos" style={{ flex: 1 }}>
              <Input placeholder="e.g. cu.m, sq.ft, nos" />
            </Form.Item>
            <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
            <Form.Item name="unitRate" label="Unit Rate ($)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
