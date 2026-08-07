"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Row,
  Col,
  message,
  Spin,
  ColorPicker,
  Divider,
  Typography,
  Space,
  Tag,
} from "antd";
import { SaveOutlined, ReloadOutlined, GlobalOutlined, BulbOutlined, AppstoreOutlined, UploadOutlined } from "@ant-design/icons";

const { Option } = Select;
const { Text } = Typography;

interface TenantSettings {
  company_name: string;
  logo_url: string;
  timezone: string;
  language: string;
  primary_color: string;
  secondary_color: string;
  feature_flags: {
    crm: boolean;
    hrms: boolean;
    inventory: boolean;
    procurement: boolean;
    accounting: boolean;
  };
}

const defaultSettings: TenantSettings = {
  company_name: "",
  logo_url: "",
  timezone: "UTC",
  language: "en",
  primary_color: "#1890ff",
  secondary_color: "#52c41a",
  feature_flags: {
    crm: true,
    hrms: true,
    inventory: true,
    procurement: true,
    accounting: true,
  },
};

const FEATURE_LABELS: Record<string, string> = {
  crm: "Customer Relationship Management",
  hrms: "Human Resource Management",
  inventory: "Inventory Management",
  procurement: "Procurement Management",
  accounting: "Accounting & Finance",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<TenantSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [form] = Form.useForm();

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      const merged = { ...defaultSettings, ...data };
      setSettings(merged);
      setLogoPreview(merged.logo_url);
      form.setFieldsValue(merged);
    } catch {
      message.error("Failed to load settings");
      form.setFieldsValue(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        primary_color:
          typeof values.primary_color === "string"
            ? values.primary_color
            : values.primary_color?.toHexString?.() ?? settings.primary_color,
        secondary_color:
          typeof values.secondary_color === "string"
            ? values.secondary_color
            : values.secondary_color?.toHexString?.() ?? settings.secondary_color,
      };

      const res = await fetch("/api/v1/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      message.success("Settings saved successfully");
      setSettings(payload);
    } catch {
      message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = {
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    marginBottom: 24,
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Settings</Typography.Title>
          <Text type="secondary">Configure your tenant workspace</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchSettings}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            Save Settings
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Form form={form} layout="vertical" initialValues={settings}>
          <Row gutter={24}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <GlobalOutlined />
                    <span>General</span>
                  </Space>
                }
                variant="borderless"
                style={cardStyle}
              >
                <Form.Item
                  name="company_name"
                  label="Company Name"
                  rules={[{ required: true, message: "Company name is required" }]}
                >
                  <Input placeholder="Your company name" />
                </Form.Item>
                <Form.Item name="logo_url" label="Logo URL">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Input
                      placeholder="https://example.com/logo.png"
                      onChange={(e) => setLogoPreview(e.target.value)}
                    />
                    <Button icon={<UploadOutlined />}>Upload Icon</Button>
                  </div>
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="timezone" label="Timezone">
                      <Select>
                        <Option value="UTC">UTC (GMT+0)</Option>
                        <Option value="America/New_York">Eastern Time (GMT-5)</Option>
                        <Option value="America/Los_Angeles">Pacific Time (GMT-8)</Option>
                        <Option value="Europe/London">London (GMT+0)</Option>
                        <Option value="Asia/Kolkata">India (GMT+5:30)</Option>
                        <Option value="Asia/Dubai">Dubai (GMT+4)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="language" label="Language">
                      <Select>
                        <Option value="en">English</Option>
                        <Option value="es">Spanish</Option>
                        <Option value="fr">French</Option>
                        <Option value="ar">Arabic</Option>
                        <Option value="hi">Hindi</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card
                title={
                  <Space>
                    <BulbOutlined />
                    <span>Branding</span>
                  </Space>
                }
                variant="borderless"
                style={cardStyle}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="primary_color" label="Primary Color">
                      <ColorPicker format="hex" showText />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="secondary_color" label="Secondary Color">
                      <ColorPicker format="hex" showText />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Logo Preview">
                  <div
                    style={{
                      height: 80,
                      border: "1px dashed #d9d9d9",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fafafa",
                    }}
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        style={{ maxHeight: 60, maxWidth: 160, objectFit: "contain" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Text type="secondary">No logo set</Text>
                    )}
                  </div>
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <AppstoreOutlined />
                    <span>Feature Flags</span>
                  </Space>
                }
                variant="borderless"
                style={cardStyle}
              >
                <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                  Toggle modules on or off for this tenant.
                </Text>
                {Object.entries(settings.feature_flags).map(([key, value], index) => (
                  <React.Fragment key={key}>
                    <Form.Item name={["feature_flags", key]} valuePropName="checked" label={null}>
                      <div style={toggleRowStyle}>
                        <div>
                          <span style={toggleLabelStyle}>
                            {key.toUpperCase()}
                          </span>
                          <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                            {FEATURE_LABELS[key] || key}
                          </Text>
                        </div>
                        <Switch />
                      </div>
                    </Form.Item>
                    {index < Object.keys(settings.feature_flags).length - 1 && (
                      <Divider style={{ margin: "8px 0" }} />
                    )}
                  </React.Fragment>
                ))}
              </Card>
            </Col>
          </Row>
        </Form>
      </Spin>
    </div>
  );
}

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
};

const toggleLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
};

