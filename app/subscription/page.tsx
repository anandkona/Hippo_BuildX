"use client";

import React, { useState } from "react";
import { Row, Col, Card, Button, Modal, Form, Input, Space, Divider, AutoComplete } from "antd";
import { CheckCircleOutlined, PlusOutlined, CrownOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined } from "@ant-design/icons";


interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  color: string;
  duration: string;
}

const initialPlans: Plan[] = [
  { id: "1", name: "Starter", price: "29", duration: "Monthly", features: ["Up to 5 users", "Basic analytics", "24/7 Email support"], color: "#faad14" },
  { id: "2", name: "Pro", price: "99", duration: "Monthly", features: ["Unlimited users", "Advanced analytics", "Priority support"], color: "#1890ff" },
  { id: "3", name: "Enterprise", price: "Custom", duration: "Yearly", features: ["Custom integrations", "Dedicated success manager", "SLA guarantee"], color: "#722ed1" },
];

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form] = Form.useForm();

  const handleAddPlan = () => {
    setEditingPlan(null);
    form.resetFields();
    form.setFieldsValue({ features: [""] });
    setIsModalOpen(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    form.setFieldsValue(plan);
    setIsModalOpen(true);
  };

  const handleDeletePlan = (id: string) => {
    Modal.confirm({
      title: "Delete Plan",
      content: "Are you sure you want to delete this subscription plan?",
      onOk: () => setPlans(plans.filter((p) => p.id !== id)),
    });
  };

  const onFinish = (values: any) => {
    if (editingPlan) {
      setPlans(plans.map((p) => (p.id === editingPlan.id ? { ...p, ...values } : p)));
    } else {
      const newPlan: Plan = {
        ...values,
        id: Date.now().toString(),
        color: ["#faad14", "#1890ff", "#722ed1", "#52c41a", "#eb2f96"][plans.length % 5],
      };
      setPlans([...plans, newPlan]);
    }
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Subscription Management</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPlan}>
          Add New Plan
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        {plans.map((plan) => (
          <Col xs={24} md={8} key={plan.id}>
            <Card
              title={<><CrownOutlined style={{ color: plan.color }} /> {plan.name}</>}
              bordered={false}
              style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
              actions={[
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => handleEditPlan(plan)}>Edit</Button>,
                <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeletePlan(plan.id)}>Delete</Button>
              ]}
            >
              <div style={{ textAlign: "center", margin: "24px 0" }}>
                <span style={{ fontSize: 36, fontWeight: "bold" }}>
                  {isNaN(Number(plan.price)) ? plan.price : `₹${plan.price}`}
                </span>
                {plan.duration && <span style={{ color: "gray", fontSize: 16, marginLeft: 4 }}>/ {plan.duration}</span>}
              </div>
              <Button type="primary" block size="large" style={{ marginBottom: 24, borderRadius: 8 }}>
                Subscribe to {plan.name}
              </Button>
              <ul style={{ listStyle: "none", padding: 0, lineHeight: "32px", minHeight: 120 }}>
                {plan.features.map((feature, idx) => (
                  <li key={idx}><CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} /> {feature}</li>
                ))}
              </ul>
            </Card>
          </Col>
        ))}
      </Row>


      <Modal
        title={editingPlan ? "Edit Plan" : "Add New Plan"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Plan Name" rules={[{ required: true, message: "Please enter or select a plan name" }]}>
            <AutoComplete
              placeholder="Select or type a plan name"
              options={[
                { value: "Starter" },
                { value: "Pro" },
                { value: "Enterprise" },
                { value: "Custom" },
              ]}
              filterOption={(inputValue, option) =>
                (option?.value as string).toLowerCase().includes(inputValue.toLowerCase())
              }
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label="Price (e.g. 99 or Custom)" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="duration" label="Duration" rules={[{ required: true, message: "Enter or select duration" }]}>
                <AutoComplete
                  options={[
                    { value: "Monthly" },
                    { value: "Yearly" },
                    { value: "Lifetime" },
                  ]}
                  placeholder="e.g. Monthly, 6 Months, etc."
                />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">Features</Divider>
          <Form.List name="features">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name]}
                      rules={[{ required: true, message: "Missing feature" }]}
                    >
                      <Input placeholder="Feature description" style={{ width: 300 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add feature
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
