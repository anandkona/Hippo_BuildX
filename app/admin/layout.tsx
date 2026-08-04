"use client";

import React from "react";
import { Layout, Menu } from "antd";
import {
  UserOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  NotificationOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";

const { Sider, Content } = Layout;

const menuItems = [
  { key: "/admin/users", icon: <UserOutlined />, label: "Users" },
  { key: "/admin/roles", icon: <SafetyCertificateOutlined />, label: "Roles & Permissions" },
  { key: "/admin/settings", icon: <SettingOutlined />, label: "Settings" },
  { key: "/admin/channels", icon: <NotificationOutlined />, label: "Channels" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={240}
        breakpoint="lg"
        collapsedWidth={0}
        style={{
          background: "#fff",
          borderRight: "1px solid #f0f0f0",
          height: "100vh",
          position: "sticky",
          top: 0,
          left: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1890ff" }}>Admin Panel</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Content style={{ padding: 24, background: "#f5f5f5", overflow: "auto" }}>
        {children}
      </Content>
    </Layout>
  );
}
