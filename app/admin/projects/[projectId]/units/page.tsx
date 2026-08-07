"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Table, Button, Space, Tag, Modal, Form, Select, Input, message, Typography } from "antd";
import { ReloadOutlined, EditOutlined, HomeOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function ProjectUnitsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [form] = Form.useForm();

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${projectId}/units`);
      if (res.ok) {
        const data = await res.json();
        setUnits(data.data || []);
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch units");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleUpdateStatus = (unit: any) => {
    setSelectedUnit(unit);
    form.setFieldsValue({ toStatus: unit.status, reason: "" });
    setStatusModalOpen(true);
  };

  const submitStatusChange = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      const res = await fetch(`/api/v1/projects/${projectId}/units/${selectedUnit.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      message.success("Unit status updated successfully");
      setStatusModalOpen(false);
      fetchUnits();
    } catch (err: any) {
      message.error(err.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "success";
      case "reserved": return "warning";
      case "booked": return "processing";
      case "cancelled": return "error";
      case "completed": return "cyan";
      case "delivered": return "magenta";
      default: return "default";
    }
  };

  const columns = [
    {
      title: "Unit",
      key: "unit",
      render: (_: any, record: any) => (
        <Space>
          <div style={{
            width: 32, height: 32, borderRadius: 6, background: "#f0f2f5", 
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <HomeOutlined style={{ color: "#8c8c8c" }} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{record.name || record.code}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.unit_type}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Block / Tower / Floor",
      key: "location",
      render: (_: any, record: any) => {
        // Since we might not have names joined in a simple list view, just show what we have
        // In a real app we might join these in the backend or have a materialized view
        return <Text type="secondary">Floor {record.floor_id ? "(Mapped)" : "—"}</Text>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={getStatusColor(status)} style={{ textTransform: "capitalize" }}>
          {status.replace("_", " ")}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Button 
          type="text" 
          icon={<EditOutlined />} 
          onClick={() => handleUpdateStatus(record)}
        >
          Change Status
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Text type="secondary">Manage inventory and lifecycle for all units in this project.</Text>
        <Button icon={<ReloadOutlined />} onClick={fetchUnits}>Refresh</Button>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <Table
          columns={columns}
          dataSource={units}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title={`Change Status: ${selectedUnit?.code}`}
        open={statusModalOpen}
        onOk={submitStatusChange}
        onCancel={() => setStatusModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="toStatus"
            label="New Status"
            rules={[{ required: true, message: "Please select a status" }]}
          >
            <Select>
              <Select.Option value="available">Available</Select.Option>
              <Select.Option value="reserved">Reserved</Select.Option>
              <Select.Option value="booked">Booked</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="delivered">Delivered</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason (Optional)"
          >
            <Input.TextArea rows={2} placeholder="Why is the status changing?" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
