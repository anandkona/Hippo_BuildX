"use client";

import React from "react";
import { Card, Form, Input, Select, Switch, Button, Divider, Row, Col, Space } from "antd";

const { Option } = Select;

export default function SettingsPage() {
  const [form] = Form.useForm();

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Settings</h2>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="General Settings" bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: 24 }}>
            <Form form={form} layout="vertical" initialValues={{ 
              companyName: "BuildEx", 
              language: "en", 
              timezone: "UTC",
              notifications: true,
              marketing: false
            }}>
              <Form.Item label="Company Name" name="companyName">
                <Input />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Language" name="language">
                    <Select>
                      <Option value="en">English (US)</Option>
                      <Option value="es">Spanish</Option>
                      <Option value="fr">French</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Timezone" name="timezone">
                    <Select>
                      <Option value="UTC">UTC (GMT+0)</Option>
                      <Option value="EST">Eastern Time (GMT-5)</Option>
                      <Option value="PST">Pacific Time (GMT-8)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider />
              
              <h4>Notification Preferences</h4>
              <Form.Item name="notifications" valuePropName="checked">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Receive email notifications for important system updates</span>
                  <Switch defaultChecked />
                </div>
              </Form.Item>
              <Form.Item name="marketing" valuePropName="checked">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Receive marketing and promotional emails</span>
                  <Switch />
                </div>
              </Form.Item>

              <Divider />

              <Button type="primary" size="large">Save Changes</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Role Management" bordered={false} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <p>Manage default permissions for user roles.</p>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <strong>Admin</strong>
                <Button type="link" size="small">Edit</Button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <strong>Manager</strong>
                <Button type="link" size="small">Edit</Button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <strong>Staff</strong>
                <Button type="link" size="small">Edit</Button>
              </div>
            </div>
            
            <Button type="dashed" block>Add New Role</Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
