"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, Row, Col, Statistic, Typography, Spin, Button } from "antd";
import {
  ProjectOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data.data || data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [projectId]);

  if (loading) {
    return <Spin />;
  }

  if (!project) return null;

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <Statistic 
              title="Project Status" 
              value={project.status.replace("_", " ")} 
              valueStyle={{ textTransform: "capitalize", fontSize: 24, fontWeight: 600, color: "var(--ui-primary)" }}
              prefix={<ProjectOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <Statistic 
              title="Start Date" 
              value={project.start_date ? dayjs(project.start_date).format("MMM D, YYYY") : "Not Set"} 
              valueStyle={{ fontSize: 24, fontWeight: 600 }}
              prefix={<CalendarOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <Statistic 
              title="End Date" 
              value={project.end_date ? dayjs(project.end_date).format("MMM D, YYYY") : "Not Set"} 
              valueStyle={{ fontSize: 24, fontWeight: 600 }}
              prefix={<CalendarOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <Statistic 
              title="Open Issues" 
              value={0} 
              valueStyle={{ fontSize: 24, fontWeight: 600 }}
              prefix={<WarningOutlined />} 
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} md={16}>
          <Card title="About this Project" variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", minHeight: 300 }}>
            {project.description ? (
              <Text style={{ fontSize: 15, lineHeight: 1.6 }}>{project.description}</Text>
            ) : (
              <Text type="secondary">No description provided for this project.</Text>
            )}
            
            <div style={{ marginTop: 32 }}>
              <Title level={5}>Location Details</Title>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <div><Text type="secondary">Name:</Text> <Text strong>{project.location_name || "—"}</Text></div>
                <div><Text type="secondary">Address:</Text> <Text strong>{project.address || "—"}</Text></div>
                <div><Text type="secondary">City:</Text> <Text strong>{project.city || "—"}</Text></div>
                <div><Text type="secondary">State:</Text> <Text strong>{project.state || "—"}</Text></div>
                <div><Text type="secondary">Pincode:</Text> <Text strong>{project.pincode || "—"}</Text></div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Quick Actions" variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", minHeight: 300 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link href={`/admin/projects/${projectId}/hierarchy`}>
                <Button type="dashed" block icon={<AppstoreOutlined />} style={{ textAlign: "left", padding: "8px 16px", height: "auto" }}>
                  Generate Hierarchy
                </Button>
              </Link>
              <Link href={`/admin/projects/${projectId}/planning`}>
                <Button type="dashed" block icon={<CalendarOutlined />} style={{ textAlign: "left", padding: "8px 16px", height: "auto" }}>
                  Plan Milestones
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
