"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Typography, Row, Col, Card, Space, Button, Tag, Avatar, Timeline, Input, Form, message, Spin, Divider, Select, Modal } from "antd";
import { UserOutlined, PhoneOutlined, MailOutlined, GlobalOutlined, SendOutlined, CheckCircleOutlined, InfoCircleOutlined, BookOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;

  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteForm] = Form.useForm();
  
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchLeadDetails = useCallback(async () => {
    try {
      setLoading(true);
      // In a real app we'd have a GET /api/v1/crm/leads/[id]
      // For this demo, let's fetch all leads and filter
      const res = await fetch("/api/v1/crm/leads");
      if (res.ok) {
        const json = await res.json();
        const found = json.data.find((l: any) => l.id === leadId);
        if (found) setLead(found);
      }
      
      const actRes = await fetch(`/api/v1/crm/leads/${leadId}/activities`);
      if (actRes.ok) {
        const actJson = await actRes.json();
        setActivities(actJson.data || []);
      }
    } catch (err) {
      message.error("Failed to load lead details");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  const handlePostNote = async () => {
    try {
      const values = await noteForm.validateFields();
      const res = await fetch(`/api/v1/crm/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "note", description: values.note }),
      });
      if (res.ok) {
        message.success("Note added");
        noteForm.resetFields();
        fetchLeadDetails();
      }
    } catch (err) {
      message.error("Failed to post note");
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    try {
      setStatusUpdating(true);
      const res = await fetch(`/api/v1/crm/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update status");
      }
      message.success("Status updated");
      fetchLeadDetails();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading && !lead) return <Spin style={{ display: "block", margin: "100px auto" }} />;
  if (!lead) return <div>Lead not found.</div>;

  return (
    <div style={{ padding: "0 0 24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Button type="link" onClick={() => router.push("/admin/crm")} style={{ padding: 0, marginBottom: 8 }}>
            &larr; Back to Pipeline
          </Button>
          <Title level={4} style={{ margin: 0 }}>{lead.name}</Title>
          <Space>
            <Tag color={lead.status === 'won' ? 'success' : lead.status === 'lost' ? 'error' : 'processing'} style={{ marginTop: 8, textTransform: 'uppercase' }}>
              {lead.status.replace("_", " ")}
            </Tag>
            {lead.source && <Tag icon={<GlobalOutlined />} style={{ marginTop: 8 }}>{lead.source}</Tag>}
          </Space>
        </div>
        <Space>
          {lead.status === 'won' ? (
             <Button type="primary" icon={<BookOutlined />}>Convert to Booking</Button>
          ) : (
            <Select 
              value={lead.status} 
              style={{ width: 160 }} 
              onChange={handleChangeStatus}
              loading={statusUpdating}
            >
              <Select.Option value="new">New</Select.Option>
              <Select.Option value="qualified">Qualified</Select.Option>
              <Select.Option value="site_visit">Site Visit</Select.Option>
              <Select.Option value="negotiation">Negotiation</Select.Option>
              <Select.Option value="won">Won (Booked)</Select.Option>
              <Select.Option value="lost">Lost</Select.Option>
            </Select>
          )}
        </Space>
      </div>

      <Row gutter={24}>
        {/* Left Col: Details */}
        <Col xs={24} md={8}>
          <Card title="Contact Information" variant="borderless" style={{ borderRadius: 12, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Avatar size={48} icon={<UserOutlined />} />
              <div>
                <Text strong style={{ display: "block" }}>{lead.name}</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>Added {dayjs(lead.created_at).format("MMM D, YYYY")}</Text>
              </div>
            </div>
            
            <Divider style={{ margin: "16px 0" }} />
            
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Phone</Text>
              <Space><PhoneOutlined /> <Text>{lead.phone || "—"}</Text></Space>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Email</Text>
              <Space><MailOutlined /> <Text>{lead.email || "—"}</Text></Space>
            </div>
            <div>
              <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Expected Revenue</Text>
              <Text strong>${Number(lead.expected_revenue || 0).toLocaleString()}</Text>
            </div>
          </Card>
          
          <Card title="Notes" variant="borderless" style={{ borderRadius: 12 }}>
            <Text style={{ whiteSpace: "pre-wrap" }}>{lead.notes || "No initial notes provided."}</Text>
          </Card>
        </Col>

        {/* Right Col: Activity Timeline */}
        <Col xs={24} md={16}>
          <Card title="Activity Timeline" variant="borderless" style={{ borderRadius: 12, minHeight: 600 }}>
            <Form form={noteForm} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Avatar icon={<UserOutlined />} />
                <Form.Item name="note" style={{ flex: 1, margin: 0 }} rules={[{ required: true, message: "Type a note first" }]}>
                  <Input.TextArea placeholder="Add a note or log a call..." autoSize={{ minRows: 2, maxRows: 6 }} />
                </Form.Item>
                <Button type="primary" icon={<SendOutlined />} onClick={handlePostNote}>Post</Button>
              </div>
            </Form>
            
            <Divider />

            <div style={{ padding: "0 16px" }}>
              <Timeline>
                {activities.map((act) => (
                  <Timeline.Item 
                    key={act.id} 
                    color={act.activity_type === "status_change" ? "blue" : "green"}
                    dot={act.activity_type === "status_change" ? <InfoCircleOutlined style={{ fontSize: 16 }} /> : undefined}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ textTransform: "capitalize" }}>{act.activity_type.replace("_", " ")}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        {dayjs(act.created_at).fromNow()} by {act.performed_by_name || "System"}
                      </Text>
                    </div>
                    <div style={{ 
                      backgroundColor: "#f9f9f9", 
                      padding: "12px 16px", 
                      borderRadius: 8,
                      border: "1px solid #f0f0f0"
                    }}>
                      <Text>{act.description}</Text>
                    </div>
                  </Timeline.Item>
                ))}
                {activities.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <Text type="secondary">No activities logged yet.</Text>
                  </div>
                )}
              </Timeline>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
