"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Typography, Tag, Switch, Segmented, Row, Col } from "antd";
import { PlusOutlined, ReloadOutlined, FilePdfOutlined, EyeOutlined, AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function ProjectDrawingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentOnly, setCurrentOnly] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState<any>(null);
  
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${projectId}/drawings?current=${currentOnly}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load drawings");
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
      
      const res = await fetch(`/api/v1/projects/${projectId}/drawings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload drawing");
      }

      message.success("Drawing uploaded successfully");
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.message || "Failed to upload");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Drawing No.",
      dataIndex: "drawing_no",
      key: "drawing_no",
      render: (text: string, record: any) => (
        <Space>
          <FilePdfOutlined style={{ color: "#ff4d4f" }} />
          <Text strong>{text}</Text>
          {record.is_current ? <Tag color="green">Current</Tag> : <Tag>Superseded</Tag>}
        </Space>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Discipline",
      dataIndex: "discipline",
      key: "discipline",
      render: (val: string) => val ? <Tag color="blue">{val}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Revision / Version",
      dataIndex: "version",
      key: "version",
      render: (val: number) => `Rev ${val}`,
    },
    {
      title: "Uploaded",
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
            setSelectedDrawing(record);
            setViewerModalOpen(true);
          }}>
            View
          </Button>
          <Button type="link" size="small" onClick={() => {
            form.setFieldsValue({ drawingNo: record.drawing_no, discipline: record.discipline, title: record.title });
            setModalOpen(true);
          }}>
            Upload New Revision
          </Button>
        </Space>
      ),
    },
  ];

  const renderGrid = () => (
    <Row gutter={[24, 24]}>
      {data.map(doc => (
        <Col xs={24} sm={12} md={8} lg={6} key={doc.id}>
          <Card 
            hoverable 
            style={{ borderRadius: 12, overflow: "hidden", transition: "all 0.3s", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            bodyStyle={{ padding: 16 }}
            cover={
              <div 
                style={{ height: 140, background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                onClick={() => { setSelectedDrawing(doc); setViewerModalOpen(true); }}
              >
                <FilePdfOutlined style={{ fontSize: 48, color: "#ff4d4f" }} />
              </div>
            }
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <Text strong style={{ fontSize: 16 }} ellipsis title={doc.drawing_no}>{doc.drawing_no}</Text>
              {doc.is_current ? <Tag color="green">Current</Tag> : <Tag>Superseded</Tag>}
            </div>
            <Text ellipsis title={doc.title} style={{ display: "block", marginBottom: 8 }}>{doc.title}</Text>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Rev {doc.version}</Text>
              {doc.discipline && <Tag color="blue" style={{ border: "none" }}>{doc.discipline}</Tag>}
            </div>
          </Card>
        </Col>
      ))}
      {data.length === 0 && (
        <Col span={24}>
          <div style={{ textAlign: "center", padding: 60 }}>
            <Text type="secondary">No drawings found.</Text>
          </div>
        </Col>
      )}
    </Row>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Drawings Register</Title>
          <Text type="secondary">Manage architectural, structural, and MEP drawings with version control.</Text>
        </div>
        <Space>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16 }}>
            <Switch checked={currentOnly} onChange={setCurrentOnly} size="small" />
            <Text type="secondary" style={{ fontSize: 13 }}>Show Current Only</Text>
          </div>
          <Segmented
            options={[
              { label: 'Grid', value: 'grid', icon: <AppstoreOutlined /> },
              { label: 'List', value: 'list', icon: <UnorderedListOutlined /> },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as "grid" | "list")}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Upload Drawing</Button>
        </Space>
      </div>

      {viewMode === "list" ? (
        <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 15 }}
          />
        </Card>
      ) : (
        <div style={{ minHeight: 400 }}>
          {renderGrid()}
        </div>
      )}

      {/* Viewer Modal */}
      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: "#ff4d4f" }} />
            <span>{selectedDrawing?.title || "Drawing Preview"}</span>
            <Tag color="blue">Rev {selectedDrawing?.version}</Tag>
          </Space>
        }
        open={viewerModalOpen}
        onCancel={() => setViewerModalOpen(false)}
        footer={null}
        width={1000}
        destroyOnClose
        styles={{ body: { padding: 0, height: "70vh" } }}
      >
        <iframe
          src="https://mozilla.github.io/pdf.js/web/viewer.html" // Placeholder viewer
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Document Viewer"
        />
      </Modal>

      <Modal
        title="Upload Drawing (or New Revision)"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            If you enter an existing Drawing No., this will automatically be saved as a new revision and supersede the previous one.
          </Text>
          <Form.Item name="drawingNo" label="Drawing Number" rules={[{ required: true }]}>
            <Input placeholder="e.g. ARC-001" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Ground Floor Plan" />
          </Form.Item>
          <Form.Item name="discipline" label="Discipline">
            <Select allowClear placeholder="Select Discipline">
              <Select.Option value="architectural">Architectural</Select.Option>
              <Select.Option value="structural">Structural</Select.Option>
              <Select.Option value="mep">MEP</Select.Option>
              <Select.Option value="civil">Civil</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes / Changes">
            <Input.TextArea rows={2} placeholder="Describe changes in this revision..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
