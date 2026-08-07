"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Form, Input, InputNumber, Space, Typography, message, Spin, Tree, Divider, Row, Col, Badge, Tag } from "antd";
import { PlusOutlined, MinusCircleOutlined, ApartmentOutlined, BuildOutlined, BarsOutlined, HomeOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function ProjectHierarchyPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [form] = Form.useForm();

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${projectId}/tree`);
      if (res.ok) {
        const data = await res.json();
        // Convert flat hierarchy to Ant Design Tree structure if needed, or if API returns a tree
        // Assuming API returns an array of blocks with nested towers -> floors -> units
        setTreeData(formatTreeData(data.data || []));
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load project hierarchy");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Helper to convert backend tree structure to Antd TreeData
  const formatTreeData = (blocks: any[]) => {
    return blocks.map((block) => ({
      title: (
        <Space>
          <ApartmentOutlined style={{ color: "var(--ui-primary)" }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>{block.name}</span>
          <Badge count={`${block.towers?.length || 0} Towers`} style={{ backgroundColor: "#fafafa", color: "#8c8c8c", boxShadow: "inset 0 0 0 1px #d9d9d9" }} />
        </Space>
      ),
      key: `block-${block.id}`,
      children: (block.towers || []).map((tower: any) => {
        const totalUnits = (tower.floors || []).reduce((acc: number, f: any) => acc + (f.units?.length || 0), 0);
        return {
          title: (
            <Space>
              <BuildOutlined style={{ color: "var(--ui-primary)" }} />
              <span style={{ fontWeight: 500 }}>{tower.name}</span>
              <Badge count={`${tower.floors?.length || 0} Floors`} style={{ backgroundColor: "var(--ui-primary-soft)", color: "var(--ui-primary)", boxShadow: "inset 0 0 0 1px var(--ui-primary)" }} />
              <Badge count={`${totalUnits} Units`} style={{ backgroundColor: "#f6ffed", color: "#52c41a", boxShadow: "inset 0 0 0 1px #b7eb8f" }} />
            </Space>
          ),
          key: `tower-${tower.id}`,
          children: (tower.floors || []).map((floor: any) => ({
            title: (
              <Space>
                <BarsOutlined style={{ color: "#faad14" }} />
                <span>Floor {floor.level_number}</span>
                <Text type="secondary" style={{ fontSize: 12 }}>({floor.units?.length || 0} units)</Text>
              </Space>
            ),
            key: `floor-${floor.id}`,
            children: (floor.units || []).map((unit: any) => {
              let color = "default";
              if (unit.status === "available") color = "success";
              if (unit.status === "booked") color = "processing";
              if (unit.status === "reserved") color = "warning";
              return {
                title: (
                  <Space>
                    <HomeOutlined style={{ color: "#8c8c8c" }} />
                    <Text strong>{unit.code}</Text>
                    <Tag color={color} style={{ margin: 0, textTransform: "capitalize" }}>{unit.status.replace("_", " ")}</Tag>
                  </Space>
                ),
                key: `unit-${unit.id}`,
                isLeaf: true,
              };
            }),
          })),
        };
      }),
    }));
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setGenerating(true);
      
      const payload = {
        block: values.blockName || undefined,
        towers: values.towers.map((t: any) => ({
          name: t.name,
          floorCount: t.floorCount,
          unitsPerFloor: t.unitsPerFloor,
          unitPrefix: t.unitPrefix,
        })),
      };

      const res = await fetch(`/api/v1/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate structure");

      message.success("Structure generated successfully!");
      form.resetFields();
      fetchTree();
    } catch (error: any) {
      message.error(error.message || "Validation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Row gutter={[24, 24]}>
      {/* Left Column: Generator Form */}
      <Col xs={24} lg={10}>
        <Card title="Bulk Generate Structure" variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
            Use this tool to rapidly build out the project's spatial hierarchy (Blocks → Towers → Floors → Units).
          </Text>

          <Form form={form} layout="vertical" initialValues={{ towers: [{}] }}>
            <Form.Item 
              name="blockName" 
              label="Block Name (Optional)" 
              tooltip="If omitted, towers will be created directly under a default block."
            >
              <Input placeholder="e.g. Phase 1" />
            </Form.Item>

            <Divider orientation="left" style={{ margin: "16px 0" }}>Towers Configuration</Divider>

            <Form.List name="towers">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card size="small" key={key} style={{ marginBottom: 16, background: "#fafafa" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <Text strong>Tower #{name + 1}</Text>
                        {fields.length > 1 && (
                          <MinusCircleOutlined className="dynamic-delete-button" onClick={() => remove(name)} style={{ color: "red" }} />
                        )}
                      </div>
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item
                            {...restField}
                            name={[name, 'name']}
                            label="Tower Name"
                            rules={[{ required: true, message: 'Missing name' }]}
                          >
                            <Input placeholder="e.g. Tower A" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            {...restField}
                            name={[name, 'unitPrefix']}
                            label="Unit Prefix"
                          >
                            <Input placeholder="e.g. A-" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            {...restField}
                            name={[name, 'floorCount']}
                            label="Floors"
                            rules={[{ required: true, message: 'Missing count' }]}
                          >
                            <InputNumber min={1} max={150} style={{ width: '100%' }} placeholder="e.g. 10" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            {...restField}
                            name={[name, 'unitsPerFloor']}
                            label="Units / Floor"
                            rules={[{ required: true, message: 'Missing count' }]}
                          >
                            <InputNumber min={1} max={50} style={{ width: '100%' }} placeholder="e.g. 4" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Another Tower
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <Button type="primary" block size="large" onClick={handleGenerate} loading={generating}>
              Generate Structure
            </Button>
          </Form>
        </Card>
      </Col>

      {/* Right Column: Tree Viewer */}
      <Col xs={24} lg={14}>
        <Card title="Current Spatial Hierarchy" variant="borderless" style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", minHeight: 400 }}>
          <Spin spinning={loading}>
            {treeData.length > 0 ? (
              <Tree
                showLine
                switcherIcon={null}
                defaultExpandAll
                treeData={treeData}
                style={{ fontSize: 15 }}
              />
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Text type="secondary">No structure has been generated for this project yet.</Text>
              </div>
            )}
          </Spin>
        </Card>
      </Col>
    </Row>
  );
}
