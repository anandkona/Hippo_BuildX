"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Typography, Row, Col, Card, Space, Button, Tag, Avatar, Modal, Form, Input, Select, message, Spin, Tooltip } from "antd";
import { PlusOutlined, ReloadOutlined, UserOutlined, PhoneOutlined, MailOutlined, GlobalOutlined, FacebookOutlined, WhatsAppOutlined, ArrowRightOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "next/navigation";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const STAGES = [
  { id: "new", label: "New Leads", color: "#1890ff", bgColor: "#e6f7ff" },
  { id: "qualified", label: "Qualified", color: "#722ed1", bgColor: "#f9f0ff" },
  { id: "site_visit", label: "Site Visit", color: "#eb2f96", bgColor: "#fff0f6" },
  { id: "negotiation", label: "Negotiation", color: "#fa8c16", bgColor: "#fff2e8" },
  { id: "won", label: "Won (Booked)", color: "#52c41a", bgColor: "#f6ffed" },
  { id: "lost", label: "Lost / Closed", color: "#f5222d", bgColor: "#fff1f0" },
];

export default function CRMDashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/crm/leads");
      if (res.ok) {
        const json = await res.json();
        setLeads(json.data || []);
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreateLead = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      const res = await fetch("/api/v1/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to create lead");

      message.success("Lead created successfully");
      setModalOpen(false);
      form.resetFields();
      fetchLeads();
    } catch (err: any) {
      message.error(err.message || "Failed to create lead");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveStatus = async (e: React.MouseEvent, leadId: string, newStatus: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/crm/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update status");
      }
      message.success("Lead updated");
      fetchLeads();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const getSourceIcon = (source: string) => {
    const s = (source || "").toLowerCase();
    if (s.includes("facebook") || s.includes("meta")) return <FacebookOutlined style={{ color: "#1877F2" }} />;
    if (s.includes("whatsapp")) return <WhatsAppOutlined style={{ color: "#25D366" }} />;
    return <GlobalOutlined style={{ color: "#8c8c8c" }} />;
  };

  const renderKanbanColumn = (stage: typeof STAGES[0]) => {
    const columnLeads = leads.filter((l) => l.status === stage.id);
    const stageIndex = STAGES.findIndex(s => s.id === stage.id);
    const nextStage = STAGES[stageIndex + 1];
    const prevStage = STAGES[stageIndex - 1];

    return (
      <Col key={stage.id} style={{ width: 320, flexShrink: 0, paddingRight: 16 }}>
        <div style={{
          backgroundColor: stage.bgColor,
          borderTop: `3px solid ${stage.color}`,
          padding: "12px 16px",
          borderRadius: "8px 8px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <Text strong style={{ color: stage.color, fontSize: 15 }}>{stage.label}</Text>
          <Tag style={{ margin: 0, color: stage.color, borderColor: stage.color, background: "transparent" }}>
            {columnLeads.length}
          </Tag>
        </div>
        
        <div style={{ 
          backgroundColor: "#f5f5f5", 
          padding: "16px 8px", 
          minHeight: "calc(100vh - 280px)",
          borderRadius: "0 0 8px 8px",
          border: "1px solid #e8e8e8",
          borderTop: "none"
        }}>
          <Spin spinning={loading}>
            {columnLeads.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#bfbfbf" }}>
                No leads in this stage
              </div>
            )}
            {columnLeads.map((lead) => (
              <Card
                key={lead.id}
                hoverable
                onClick={() => router.push(`/admin/crm/${lead.id}`)}
                style={{ marginBottom: 12, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                bodyStyle={{ padding: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text strong ellipsis style={{ maxWidth: 200, fontSize: 14 }}>{lead.name}</Text>
                  <Tooltip title={lead.source || "Website"}>
                    {getSourceIcon(lead.source)}
                  </Tooltip>
                </div>
                
                {lead.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: "#8c8c8c", fontSize: 13 }}>
                    <PhoneOutlined /> <Text type="secondary" ellipsis>{lead.phone}</Text>
                  </div>
                )}
                {lead.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "#8c8c8c", fontSize: 13 }}>
                    <MailOutlined /> <Text type="secondary" ellipsis>{lead.email}</Text>
                  </div>
                )}
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(lead.created_at).fromNow()}</Text>
                  <Space size={4}>
                    {prevStage && stage.id !== "lost" && stage.id !== "won" && (
                      <Button size="small" type="text" icon={<ArrowLeftOutlined />} onClick={(e) => handleMoveStatus(e, lead.id, prevStage.id)} />
                    )}
                    {nextStage && stage.id !== "lost" && (
                      <Button size="small" type="primary" ghost icon={<ArrowRightOutlined />} onClick={(e) => handleMoveStatus(e, lead.id, nextStage.id)} />
                    )}
                  </Space>
                </div>
              </Card>
            ))}
          </Spin>
        </div>
      </Col>
    );
  };

  return (
    <div style={{ padding: "0 0 24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Leads Pipeline</Title>
          <Text type="secondary">Manage incoming inquiries and move them toward booking.</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchLeads}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add Lead</Button>
        </Space>
      </div>

      <div style={{ display: "flex", overflowX: "auto", paddingBottom: 16 }}>
        {STAGES.map(renderKanbanColumn)}
      </div>

      <Modal
        title="Add New Lead"
        open={modalOpen}
        onOk={handleCreateLead}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="e.g. John Doe" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone Number">
                <Input prefix={<PhoneOutlined />} placeholder="+1 555-0199" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email Address">
                <Input prefix={<MailOutlined />} placeholder="john@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="source" label="Source" initialValue="website">
                <Select>
                  <Select.Option value="website">Website Form</Select.Option>
                  <Select.Option value="meta">Meta Ads</Select.Option>
                  <Select.Option value="whatsapp">WhatsApp</Select.Option>
                  <Select.Option value="referral">Referral / Broker</Select.Option>
                  <Select.Option value="walk-in">Walk-in</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expectedRevenue" label="Expected Revenue">
                <Input type="number" placeholder="e.g. 500000" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Initial Notes">
            <Input.TextArea rows={3} placeholder="Any specific requirements or comments..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
