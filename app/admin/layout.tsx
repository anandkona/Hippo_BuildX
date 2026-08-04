"use client";

import React from "react";
import { Layout, Menu, Breadcrumb, theme } from "antd";
import {
  UserOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  NotificationOutlined,
  HomeOutlined,
  TeamOutlined,
  KeyOutlined,
  ToolOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const { Sider, Content } = Layout;

const menuItems = [
  { key: "/admin/users", icon: <TeamOutlined />, label: "Users" },
  { key: "/admin/roles", icon: <KeyOutlined />, label: "Roles & Permissions" },
  { key: "/admin/settings", icon: <ToolOutlined />, label: "Settings" },
  { key: "/admin/channels", icon: <AlertOutlined />, label: "Channels" },
];

const breadcrumbMap: Record<string, string> = {
  "/admin": "Administration",
  "/admin/users": "Users",
  "/admin/roles": "Roles & Permissions",
  "/admin/settings": "Settings",
  "/admin/channels": "Channels",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = theme.useToken();

  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbItems = [
    { title: <Link href="/dashboard"><HomeOutlined /></Link> },
    ...pathParts.map((part, index) => {
      const path = `/${pathParts.slice(0, index + 1).join("/")}`;
      const label = breadcrumbMap[path] || part;
      const isLast = index === pathParts.length - 1;
      return {
        title: isLast ? <span style={{ color: token.colorText }}>{label}</span> : label,
      };
    }),
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={240}
        breakpoint="lg"
        collapsedWidth={0}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          height: "100vh",
          position: "sticky",
          top: 0,
          left: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SettingOutlined style={{ color: "#fff", fontSize: 16 }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: token.colorText }}>
              Administration
            </span>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0, padding: "8px 0" }}
        />
      </Sider>
      <Content style={{ padding: "0 24px 24px", background: token.colorBgLayout, overflow: "auto" }}>
        <div style={{ padding: "16px 0 8px" }}>
          <Breadcrumb items={breadcrumbItems} />
        </div>
        {children}
      </Content>
    </Layout>
  );
}
