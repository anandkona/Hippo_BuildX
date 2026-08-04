"use client";

import React from "react";
import { Row, Col, Card, Form, Input, Button, Avatar, Upload, Tabs, Timeline, Switch, Divider } from "antd";
import { UserOutlined, UploadOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined } from "@ant-design/icons";

export default function ProfilePage() {
  const [form] = Form.useForm();

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>User Profile</h2>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", textAlign: "center" }}>
            <Avatar size={120} icon={<UserOutlined />} src="/avatar.png" style={{ marginBottom: 16 }} />
            <h3>Admin User</h3>
            <p style={{ color: "gray" }}>Super Administrator</p>
            <Upload showUploadList={false}>
              <Button icon={<UploadOutlined />}>Change Avatar</Button>
            </Upload>
            
            <Divider />
            <div style={{ textAlign: "left" }}>
              <h4>Contact Information</h4>
              <p><MailOutlined style={{ marginRight: 8 }} /> admin@buildex.com</p>
              <p><UserOutlined style={{ marginRight: 8 }} /> +1 234 567 8900</p>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={16}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Tabs defaultActiveKey="1" items={[
              {
                key: "1",
                label: "Edit Profile",
                children: (
                  <Form form={form} layout="vertical" initialValues={{ name: "Admin User", email: "admin@buildex.com", role: "Super Admin" }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Full Name" name="name">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Email Address" name="email">
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="Role" name="role">
                      <Input disabled />
                    </Form.Item>
                    <Form.Item label="Bio" name="bio">
                      <Input.TextArea rows={4} />
                    </Form.Item>
                    <Button type="primary">Save Changes</Button>
                  </Form>
                )
              },
              {
                key: "2",
                label: "Security",
                children: (
                  <div>
                    <h4>Change Password</h4>
                    <Form layout="vertical" style={{ maxWidth: 400 }}>
                      <Form.Item label="Current Password" name="currentPassword">
                        <Input.Password prefix={<LockOutlined />} />
                      </Form.Item>
                      <Form.Item label="New Password" name="newPassword">
                        <Input.Password prefix={<LockOutlined />} />
                      </Form.Item>
                      <Form.Item label="Confirm Password" name="confirmPassword">
                        <Input.Password prefix={<LockOutlined />} />
                      </Form.Item>
                      <Button type="primary">Update Password</Button>
                    </Form>
                    
                    <Divider />
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}><SafetyCertificateOutlined /> Two-Factor Authentication</h4>
                        <p style={{ color: "gray" }}>Add an extra layer of security to your account.</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                )
              },
              {
                key: "3",
                label: "Recent Activity",
                children: (
                  <Timeline items={[
                    { children: "Logged in from Chrome on Windows - Today 10:00 AM", color: "green" },
                    { children: "Updated profile information - Yesterday 2:30 PM", color: "blue" },
                    { children: "Changed password - Aug 1, 2026", color: "red" },
                    { children: "Created new client 'Acme Corp' - Jul 28, 2026", color: "gray" },
                  ]} />
                )
              }
            ]} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
