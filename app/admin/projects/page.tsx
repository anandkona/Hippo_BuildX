"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Card,
  Spin,
  Empty,
  Typography,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";

const { Text } = Typography;

interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  location_name: string;
  city: string;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();

  const fetchProjects = useCallback(async (search = "") => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data.data ?? []);
    } catch {
      message.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProjects(searchText);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchText, fetchProjects]);

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({ status: "draft" });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      
      message.success("Project created successfully");
      setModalOpen(false);
      router.push(`/admin/projects/${data.data.id}`);
    } catch (error: any) {
      message.error(error.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Project",
      key: "project",
      render: (_: any, record: Project) => (
        <Space>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#e6f7ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FolderOpenOutlined style={{ color: "#1890ff" }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "var(--ui-text)" }}>
              <Link href={`/admin/projects/${record.id}`} className="hover:underline text-inherit">
                {record.name}
              </Link>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.code}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Location",
      key: "location",
      render: (_: any, record: Project) => (
        <Space>
          <EnvironmentOutlined style={{ color: "#bfbfbf" }} />
          <Text type="secondary">
            {[record.location_name, record.city].filter(Boolean).join(", ") || "—"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "default";
        if (status === "active" || status === "in_progress") color = "success";
        if (status === "planning") color = "processing";
        return <Tag color={color} style={{ textTransform: "capitalize" }}>{status.replace('_', ' ')}</Tag>;
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => <Text type="secondary">{dayjs(date).format("MMM D, YYYY")}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      render: (_: any, record: Project) => (
        <Link href={`/admin/projects/${record.id}`}>
          <Button type="primary" size="small">
            Manage
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>Projects</Typography.Title>
            <Text type="secondary">Manage your construction and development projects</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchProjects(searchText)}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              New Project
            </Button>
          </Space>
        </div>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search projects by name or code..."
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 320, borderRadius: 6 }}
            allowClear
          />
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <Empty description="No projects found" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                  <Button type="primary" onClick={handleAdd}>
                    Create your first project
                  </Button>
                </Empty>
              ),
            }}
          />
        </Spin>
      </Card>

      <Modal
        title="Create New Project"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item
              name="code"
              label={<span style={{ fontWeight: 500 }}>Project Code</span>}
              rules={[{ required: true, message: "Code is required" }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="e.g. PRJ-001" style={{ borderRadius: 6 }} />
            </Form.Item>
            <Form.Item
              name="name"
              label={<span style={{ fontWeight: 500 }}>Project Name</span>}
              rules={[{ required: true, message: "Name is required" }]}
              style={{ flex: 2 }}
            >
              <Input placeholder="e.g. Skyline Towers" style={{ borderRadius: 6 }} />
            </Form.Item>
          </div>

          <Form.Item name="description" label={<span style={{ fontWeight: 500 }}>Description</span>}>
            <Input.TextArea rows={2} placeholder="Brief description..." style={{ borderRadius: 6 }} />
          </Form.Item>

          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item name="locationName" label={<span style={{ fontWeight: 500 }}>Location Name</span>} style={{ flex: 1 }}>
              <Input placeholder="e.g. Downtown" style={{ borderRadius: 6 }} />
            </Form.Item>
            <Form.Item name="city" label={<span style={{ fontWeight: 500 }}>City</span>} style={{ flex: 1 }}>
              <Input placeholder="e.g. New York" style={{ borderRadius: 6 }} />
            </Form.Item>
          </div>
          
          <Form.Item name="status" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

