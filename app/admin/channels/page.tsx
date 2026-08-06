"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Switch,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tabs,
  message,
  Spin,
  Space,
  Tag,
  Typography,
  Empty,
  Tooltip,
  Badge,
} from "antd";
import {
  WhatsAppOutlined,
  MailOutlined,
  MessageOutlined,
  SettingOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

const { Option } = Select;
const { Text } = Typography;

interface ChannelConfig {
  whatsapp?: {
    api_key: string;
    sender_number: string;
    webhook_url: string;
  };
  email?: {
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_password: string;
    from_address: string;
  };
  sms?: {
    provider: "twilio" | "2factor";
    api_key: string;
    sender_id: string;
  };
}

interface Channel {
  id: string;
  type: "whatsapp" | "email" | "sms";
  name: string;
  is_active: boolean;
  config: ChannelConfig;
}

const channelMeta: Record<string, { icon: React.ReactNode; color: string; description: string }> = {
  whatsapp: {
    icon: <WhatsAppOutlined style={{ fontSize: 24 }} />,
    color: "#25d366",
    description: "Send notifications via WhatsApp Business API",
  },
  email: {
    icon: <MailOutlined style={{ fontSize: 24 }} />,
    color: "#1890ff",
    description: "Send email notifications via SMTP",
  },
  sms: {
    icon: <MessageOutlined style={{ fontSize: 24 }} />,
    color: "#faad14",
    description: "Send SMS notifications via provider",
  },
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configuringChannel, setConfiguringChannel] = useState<Channel | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("whatsapp");

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/channels");
      if (!res.ok) throw new Error("Failed to fetch channels");
      const data = await res.json();
      setChannels(data.data ?? data);
    } catch {
      message.error("Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const getChannel = (type: string) =>
    channels.find((c) => c.type === type);

  const handleToggle = async (channel: Channel, checked: boolean) => {
    try {
      const res = await fetch(`/api/v1/admin/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...channel, is_active: checked }),
      });
      if (!res.ok) throw new Error("Failed to update channel");
      setChannels((prev) =>
        prev.map((c) => (c.type === channel.type ? { ...c, is_active: checked } : c))
      );
      message.success(`${channel.name} ${checked ? "enabled" : "disabled"}`);
    } catch {
      message.error("Failed to update channel status");
    }
  };

  const handleConfigure = (channel: Channel) => {
    setConfiguringChannel(channel);
    setActiveTab(channel.type);
    form.setFieldsValue({
      ...(channel.config?.[channel.type] ?? {}),
    });
    setConfigModalOpen(true);
  };

  const handleSaveConfig = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...configuringChannel,
        config: {
          [activeTab]: values,
        },
      };

      const res = await fetch("/api/v1/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save channel config");
      message.success("Channel configuration saved");
      setConfigModalOpen(false);
      fetchChannels();
    } catch {
      message.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const renderChannelCard = (type: "whatsapp" | "email" | "sms") => {
    const channel = getChannel(type);
    const meta = channelMeta[type];
    const isConfigured = channel && Object.keys(channel.config?.[type] ?? {}).length > 0;

    return (
      <Card
        key={type}
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          height: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Space size={12}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${meta.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: meta.color,
                }}
              >
                {meta.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{channel?.name ?? type}</div>
                <Space size={4}>
                  <Tag color={channel?.is_active ? "success" : "default"}>
                    {channel?.is_active ? "Active" : "Inactive"}
                  </Tag>
                  {isConfigured ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">Configured</Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="warning">Not Configured</Tag>
                  )}
                </Space>
              </div>
            </Space>
            <Switch
              checked={channel?.is_active ?? false}
              onChange={(checked) => channel && handleToggle(channel, checked)}
              loading={!channel}
            />
          </div>

          <Text type="secondary" style={{ fontSize: 13 }}>
            {meta.description}
          </Text>

          <Button
            icon={<SettingOutlined />}
            onClick={() => channel && handleConfigure(channel)}
            disabled={!channel}
            block
          >
            Configure
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>Notification Channels</Typography.Title>
            <Text type="secondary">Configure WhatsApp, Email, and SMS notification channels</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchChannels}>
            Refresh
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        {channels.length === 0 && !loading ? (
          <Empty description="No channels configured" />
        ) : (
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>{renderChannelCard("whatsapp")}</Col>
            <Col xs={24} md={8}>{renderChannelCard("email")}</Col>
            <Col xs={24} md={8}>{renderChannelCard("sms")}</Col>
          </Row>
        )}
      </Spin>

      <Modal
        title="Configure Channel"
        open={configModalOpen}
        onOk={handleSaveConfig}
        onCancel={() => setConfigModalOpen(false)}
        confirmLoading={saving}
        width={520}
        destroyOnClose
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            const ch = getChannel(key);
            form.setFieldsValue(ch?.config?.[key as keyof ChannelConfig] ?? {});
          }}
          items={[
            {
              key: "whatsapp",
              label: (
                <Space>
                  <WhatsAppOutlined /> WhatsApp
                </Space>
              ),
              children: (
                <Form form={form} layout="vertical" preserve={false}>
                  <Form.Item
                    name="api_key"
                    label="API Key"
                    rules={[{ required: true, message: "API key is required" }]}
                  >
                    <Input.Password placeholder="Enter WhatsApp API key" />
                  </Form.Item>
                  <Form.Item
                    name="sender_number"
                    label="Sender Number"
                    rules={[{ required: true, message: "Sender number is required" }]}
                  >
                    <Input placeholder="+1234567890" />
                  </Form.Item>
                  <Form.Item name="webhook_url" label="Webhook URL">
                    <Input placeholder="https://example.com/webhook" />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "email",
              label: (
                <Space>
                  <MailOutlined /> Email
                </Space>
              ),
              children: (
                <Form form={form} layout="vertical" preserve={false}>
                  <Row gutter={16}>
                    <Col span={16}>
                      <Form.Item
                        name="smtp_host"
                        label="SMTP Host"
                        rules={[{ required: true, message: "SMTP host is required" }]}
                      >
                        <Input placeholder="smtp.gmail.com" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="smtp_port"
                        label="Port"
                        rules={[{ required: true, message: "Port is required" }]}
                      >
                        <Input placeholder="587" type="number" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name="smtp_username"
                    label="Username"
                    rules={[{ required: true, message: "Username is required" }]}
                  >
                    <Input placeholder="SMTP username" />
                  </Form.Item>
                  <Form.Item
                    name="smtp_password"
                    label="Password"
                    rules={[{ required: true, message: "Password is required" }]}
                  >
                    <Input.Password placeholder="SMTP password" />
                  </Form.Item>
                  <Form.Item
                    name="from_address"
                    label="From Address"
                    rules={[
                      { required: true, message: "From address is required" },
                      { type: "email", message: "Invalid email" },
                    ]}
                  >
                    <Input placeholder="noreply@yourcompany.com" />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "sms",
              label: (
                <Space>
                  <MessageOutlined /> SMS
                </Space>
              ),
              children: (
                <Form form={form} layout="vertical" preserve={false}>
                  <Form.Item
                    name="provider"
                    label="Provider"
                    rules={[{ required: true, message: "Provider is required" }]}
                  >
                    <Select placeholder="Select SMS provider">
                      <Option value="twilio">Twilio</Option>
                      <Option value="2factor">2Factor</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="api_key"
                    label="API Key"
                    rules={[{ required: true, message: "API key is required" }]}
                  >
                    <Input.Password placeholder="Enter API key" />
                  </Form.Item>
                  <Form.Item
                    name="sender_id"
                    label="Sender ID"
                    rules={[{ required: true, message: "Sender ID is required" }]}
                  >
                    <Input placeholder="e.g. BUILDX" />
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
