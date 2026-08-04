"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  message,
  Card,
  Spin,
  Empty,
  Typography,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Divider,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const { Option } = Select;

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers: number;
  maxProjects: number;
  featureFlags: Record<string, boolean>;
  isActive: boolean;
  createdAt: string;
}

const FEATURE_LABELS: Record<string, string> = {
  crm: "CRM",
  hrms: "HRMS",
  inventory: "Inventory",
  procurement: "Procurement",
  accounting: "Accounting",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/platform/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      setPlans(data.plans ?? []);
    } catch {
      message.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleAdd = () => {
    setEditingPlan(null);
    form.resetFields();
    form.setFieldsValue({
      billingCycle: "monthly",
      maxUsers: 5,
      maxProjects: 1,
      featureFlags: { crm: true, hrms: true, inventory: true, procurement: false, accounting: false },
    });
    setModalOpen(true);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    form.setFieldsValue({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      price: plan.price,
      billingCycle: plan.billingCycle,
      maxUsers: plan.maxUsers,
      maxProjects: plan.maxProjects,
      featureFlags: plan.featureFlags,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/platform/plans/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete plan");
      message.success("Plan deactivated");
      fetchPlans();
    } catch {
      message.error("Failed to delete plan");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const url = editingPlan
        ? `/api/v1/platform/plans/${editingPlan.id}`
        : "/api/v1/platform/plans";
      const method = editingPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save plan");
      }

      message.success(editingPlan ? "Plan updated" : "Plan created");
      setModalOpen(false);
      fetchPlans();
    } catch (error: any) {
      message.error(error.message || "Failed to save plan");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Plan",
      key: "plan",
      render: (_: unknown, record: Plan) => (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: record.isActive ? "#f6ffed" : "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CrownOutlined
              style={{ color: record.isActive ? "#faad14" : "#d9d9d9", fontSize: 18 }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.displayName}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.name}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Price",
      key: "price",
      render: (_: unknown, record: Plan) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {record.price === 0 ? "Free" : `₹${record.price.toLocaleString()}`}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            / {record.billingCycle}
          </Text>
        </div>
      ),
    },
    {
      title: "Limits",
      key: "limits",
      render: (_: unknown, record: Plan) => (
        <Space direction="vertical" size={0}>
          <Text>Users: {record.maxUsers === -1 ? "Unlimited" : record.maxUsers}</Text>
          <Text>Projects: {record.maxProjects === -1 ? "Unlimited" : record.maxProjects}</Text>
        </Space>
      ),
    },
    {
      title: "Features",
      key: "features",
      render: (_: unknown, record: Plan) => (
        <Space size={[0, 4]} wrap>
          {Object.entries(record.featureFlags || {}).map(([key, value]) => (
            <Tag key={key} color={value ? "success" : "default"}>
              {value ? <CheckCircleOutlined /> : <CloseCircleOutlined />} {FEATURE_LABELS[key] || key}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "default"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Plan) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Deactivate plan?"
            description="This will hide the plan from new subscriptions"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Deactivate">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>Plans</Typography.Title>
            <Text type="secondary">Manage subscription plans for tenants</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchPlans}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Plan</Button>
          </Space>
        </div>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={plans}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <Empty description="No plans found">
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Plan</Button>
                </Empty>
              ),
            }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingPlan ? "Edit Plan" : "Add Plan"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={640}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Plan ID" rules={[{ required: true }]}>
                <Input placeholder="e.g. starter" disabled={!!editingPlan} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Starter Plan" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Plan description" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="price" label="Price (₹)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="billingCycle" label="Billing Cycle" rules={[{ required: true }]}>
                <Select>
                  <Option value="monthly">Monthly</Option>
                  <Option value="yearly">Yearly</Option>
                  <Option value="one-time">One-time</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maxUsers" label="Max Users (-1 = Unlimited)">
                <InputNumber min={-1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxProjects" label="Max Projects (-1 = Unlimited)">
                <InputNumber min={-1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Feature Flags</Divider>
          <Form.Item name="featureFlags" label={null}>
            <Row gutter={16}>
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <Col span={8} key={key}>
                  <Form.Item name={["featureFlags", key]} valuePropName="checked" noStyle>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                      <span>{label}</span>
                      <Switch />
                    </div>
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
