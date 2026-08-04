"use client";

import React, { useState } from "react";
import { Card, Form, Input, Button, Typography, Space, message, Tag } from "antd";
import { UserOutlined, LockOutlined, CloudServerOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function PlatformLoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "Login failed");
        return;
      }

      message.success("Login successful!");
      router.push("/platform");
    } catch {
      message.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0c1426 0%, #1a365d 50%, #2d3748 100%)",
      }}
    >
      <Card
        style={{ width: 420, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
        styles={{ body: { padding: "40px 32px" } }}
      >
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "linear-gradient(135deg, #1890ff, #722ed1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CloudServerOutlined style={{ color: "#fff", fontSize: 28 }} />
            </div>
            <div
              style={{
                fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", Arial, sans-serif',
                fontStyle: "italic",
                fontWeight: 900,
                letterSpacing: "-1px",
                marginBottom: 8,
              }}
            >
              <span style={{ color: "#1890ff", fontSize: 28 }}>Build</span>
              <span style={{ color: "#ff4d4f", fontSize: 36 }}>X</span>
            </div>
            <Title level={4} style={{ margin: 0 }}>Platform Administration</Title>
            <Text type="secondary">Super Admin Access</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} autoComplete="off" size="large">
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Enter your email" },
                { type: "email", message: "Invalid email" },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="super@buildx.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Enter your password" }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Enter password" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Sign In to Platform
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: "center" }}>
            <Tag color="warning">Super Admin Only</Tag>
          </div>
        </Space>
      </Card>
    </div>
  );
}
