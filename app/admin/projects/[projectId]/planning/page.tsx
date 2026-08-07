"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Table, Button, Space, Tag, Modal, Form, Input, DatePicker, Select, InputNumber, message, Typography, Row, Col, Progress, Segmented } from "antd";
import { PlusOutlined, ReloadOutlined, FlagOutlined, CheckSquareOutlined, UnorderedListOutlined, BarChartOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import GanttTimeline from "@/components/Projects/GanttTimeline";

const { Text, Title } = Typography;

export default function ProjectPlanningPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [data, setData] = useState<{ milestones: any[], tasks: any[], dependencies: any[] }>({
    milestones: [], tasks: [], dependencies: []
  });
  const [loading, setLoading] = useState(true);
  
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"gantt" | "list">("gantt");
  
  const [milestoneForm] = Form.useForm();
  const [taskForm] = Form.useForm();

  const fetchGanttData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${projectId}/gantt`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || { milestones: [], tasks: [], dependencies: [] });
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load planning data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGanttData();
  }, [fetchGanttData]);

  const handleCreateMilestone = async () => {
    try {
      const values = await milestoneForm.validateFields();
      setSubmitting(true);
      
      const payload = {
        name: values.name,
        description: values.description,
        plannedStart: values.dates?.[0]?.toISOString(),
        plannedEnd: values.dates?.[1]?.toISOString(),
      };

      const res = await fetch(`/api/v1/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create milestone");

      message.success("Milestone created");
      setMilestoneModalOpen(false);
      milestoneForm.resetFields();
      fetchGanttData();
    } catch (err: any) {
      message.error(err.message || "Failed to create milestone");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      const values = await taskForm.validateFields();
      setSubmitting(true);
      
      const payload = {
        name: values.name,
        milestoneId: values.milestoneId,
        priority: values.priority,
        plannedStart: values.dates?.[0]?.toISOString(),
        plannedEnd: values.dates?.[1]?.toISOString(),
        progressPct: values.progressPct || 0,
      };

      const res = await fetch(`/api/v1/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create task");

      message.success("Task created");
      setTaskModalOpen(false);
      taskForm.resetFields();
      fetchGanttData();
    } catch (err: any) {
      message.error(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  // Group tasks by milestone for display
  const tableData = [
    // Unassigned tasks (milestoneId is null)
    ...data.tasks.filter(t => !t.milestone_id).map(t => ({ ...t, key: `task-${t.id}`, isMilestone: false })),
    // Milestones and their tasks
    ...data.milestones.map(m => ({
      ...m,
      key: `milestone-${m.id}`,
      isMilestone: true,
      children: data.tasks.filter(t => t.milestone_id === m.id).map(t => ({
        ...t,
        key: `task-${t.id}`,
        isMilestone: false
      }))
    }))
  ];

  const columns = [
    {
      title: "Name",
      key: "name",
      render: (_: any, record: any) => (
        <Space>
          {record.isMilestone ? (
            <FlagOutlined style={{ color: "#faad14" }} />
          ) : (
            <CheckSquareOutlined style={{ color: "#1890ff", marginLeft: 16 }} />
          )}
          <Text strong={record.isMilestone}>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: "Status / Priority",
      key: "status",
      width: 150,
      render: (_: any, record: any) => {
        if (record.isMilestone) {
          return <Tag color="blue" style={{ textTransform: "capitalize" }}>{record.status?.replace("_", " ") || "Pending"}</Tag>;
        }
        let pColor = "default";
        if (record.priority === "high") pColor = "error";
        if (record.priority === "medium") pColor = "warning";
        if (record.priority === "low") pColor = "success";
        return <Tag color={pColor} style={{ textTransform: "capitalize" }}>{record.priority}</Tag>;
      },
    },
    {
      title: "Progress",
      key: "progress",
      width: 200,
      render: (_: any, record: any) => {
        if (record.isMilestone) return null;
        return <Progress percent={record.progress_pct || 0} size="small" />;
      },
    },
    {
      title: "Timeline",
      key: "timeline",
      render: (_: any, record: any) => {
        if (!record.planned_start && !record.planned_end) return <Text type="secondary">Not scheduled</Text>;
        const start = record.planned_start ? dayjs(record.planned_start).format("MMM D") : "?";
        const end = record.planned_end ? dayjs(record.planned_end).format("MMM D") : "?";
        return <Text>{start} - {end}</Text>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Project Schedule</Title>
          <Text type="secondary">Define milestones and tasks to track project progress.</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchGanttData}>Refresh</Button>
          <Button icon={<FlagOutlined />} onClick={() => setMilestoneModalOpen(true)}>Add Milestone</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setTaskModalOpen(true)}>Add Task</Button>
        </Space>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
          <Segmented
            options={[
              { label: 'Gantt', value: 'gantt', icon: <BarChartOutlined /> },
              { label: 'List', value: 'list', icon: <UnorderedListOutlined /> },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as "gantt" | "list")}
          />
        </div>
        {viewMode === "list" ? (
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="key"
            loading={loading}
            pagination={false}
            expandable={{ defaultExpandAllRows: true }}
          />
        ) : (
          <GanttTimeline data={tableData} />
        )}
      </Card>

      {/* Milestone Modal */}
      <Modal
        title="Create Milestone"
        open={milestoneModalOpen}
        onOk={handleCreateMilestone}
        onCancel={() => setMilestoneModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={milestoneForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Milestone Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Foundation Complete" />
          </Form.Item>
          <Form.Item name="dates" label="Planned Timeline">
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Task Modal */}
      <Modal
        title="Create Task"
        open={taskModalOpen}
        onOk={handleCreateTask}
        onCancel={() => setTaskModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={taskForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Task Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Pour Concrete" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="milestoneId" label="Milestone">
                <Select placeholder="Select Milestone" allowClear>
                  {data.milestones.map(m => (
                    <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select>
                  <Select.Option value="high">High</Select.Option>
                  <Select.Option value="medium">Medium</Select.Option>
                  <Select.Option value="low">Low</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dates" label="Planned Timeline">
                <DatePicker.RangePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="progressPct" label="Progress (%)" initialValue={0}>
                <InputNumber min={0} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
