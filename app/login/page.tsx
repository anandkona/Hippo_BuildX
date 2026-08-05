"use client";

import React, { useState, Suspense, useEffect } from "react";
import { Card, Form, Input, Button, Typography, Space, message, Spin } from "antd";
import { UserOutlined, LockOutlined, ApartmentOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";

const { Title, Text } = Typography;

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/dashboard";
  const tenantSlug = searchParams.get("tenantSlug") || "";
  const [form] = Form.useForm();

  useEffect(() => {
    form.resetFields();
    if (tenantSlug) {
      form.setFieldsValue({ tenantSlug });
    }
  }, [form, tenantSlug]);

  const onFinish = async (values: { tenantSlug: string; email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
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
      router.push(redirectTo);
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
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card
        style={{ width: 420, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
        styles={{ body: { padding: "40px 32px" } }}
      >
        <Space orientation="vertical" size={24} style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
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
            <Title level={4} style={{ margin: 0 }}>Tenant Login</Title>
            <Text type="secondary">Sign in to your workspace</Text>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off" size="large">
            <Form.Item
              name="tenantSlug"
              label="Workspace"
              rules={[{ required: true, message: "Enter your workspace slug" }]}
            >
              <Input prefix={<ApartmentOutlined />} placeholder="Enter workspace" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Enter your email" },
                { type: "email", message: "Invalid email" },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="Enter email" />
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
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}><Spin size="large" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
