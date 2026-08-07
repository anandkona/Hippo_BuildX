"use client";

import React, { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Spin, Typography, Menu, Space, Tag, Button } from "antd";
import {
  AppstoreOutlined,
  BlockOutlined,
  ScheduleOutlined,
  DollarOutlined,
  FileImageOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const TABS = [
  { key: "overview", label: "Overview", icon: <AppstoreOutlined />, path: "" },
  { key: "hierarchy", label: "Hierarchy", icon: <BlockOutlined />, path: "/hierarchy" },
  { key: "units", label: "Units", icon: <AppstoreOutlined />, path: "/units" },
  { key: "planning", label: "Planning", icon: <ScheduleOutlined />, path: "/planning" },
  { key: "boq", label: "BOQ", icon: <DollarOutlined />, path: "/boq" },
  { key: "drawings", label: "Drawings", icon: <FileImageOutlined />, path: "/drawings" },
  { key: "rfis", label: "RFIs", icon: <QuestionCircleOutlined />, path: "/rfis" },
  { key: "issues", label: "Issues", icon: <WarningOutlined />, path: "/issues" },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setProject(data.data || data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (projectId) fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 40 }}>
          <Title level={4}>Project not found</Title>
          <Button type="primary" onClick={() => router.push("/admin/projects")}>
            Back to Projects
          </Button>
        </div>
      </Card>
    );
  }

  const currentTab = TABS.find((tab) => 
    tab.path ? pathname.endsWith(tab.path) : pathname.endsWith(projectId)
  )?.key || "overview";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header section */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <Link href="/admin/projects" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ui-text-muted)", fontSize: 14 }}>
            <ArrowLeftOutlined /> Back to Projects
          </Link>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
              {project.name}
              <Tag color="blue" style={{ fontSize: 12, fontWeight: "normal", verticalAlign: "middle" }}>
                {project.code}
              </Tag>
            </Title>
            <Space style={{ marginTop: 8 }} size="large">
              <Text type="secondary">
                Location: {project.location_name || project.city || "Not specified"}
              </Text>
              <Text type="secondary">
                Status: <span style={{ textTransform: "capitalize" }}>{project.status.replace("_", " ")}</span>
              </Text>
            </Space>
          </div>
        </div>
      </div>

      {/* Tabs / Navigation */}
      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <Menu 
          mode="horizontal" 
          selectedKeys={[currentTab]} 
          style={{ borderBottom: "none", padding: "0 16px" }}
          items={TABS.map((tab) => ({
            key: tab.key,
            icon: tab.icon,
            label: (
              <Link href={`/admin/projects/${projectId}${tab.path}`}>
                {tab.label}
              </Link>
            ),
          }))}
        />
      </Card>

      {/* Main Content Area */}
      <div>
        {children}
      </div>
    </div>
  );
}
