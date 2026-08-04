"use client";

import React from "react";
import { Layout, Menu, Breadcrumb, theme, Tag } from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  DashboardOutlined,
  CloudServerOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const { Sider, Content } = Layout;

const menuItems = [
  { key: "/platform", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/platform/tenants", icon: <TeamOutlined />, label: "Tenants" },
];

const breadcrumbMap: Record<string, string> = {
  "/platform": "Dashboard",
  "/platform/tenants": "Tenants",
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = theme.useToken();

  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbItems = [
    { title: <Link href="/platform"><HomeOutlined /></Link> },
    ...pathParts.slice(1).map((part, index) => {
      const path = `/${pathParts.slice(0, index + 2).join("/")}`;
      const label = breadcrumbMap[path] || part;
      const isLast = index === pathParts.length - 2;
      return {
        title: isLast ? <span style={{ color: token.colorText }}>{label}</span> : label,
      };
    }),
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {}
    router.push("/platform/login");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={240}
        breakpoint="lg"
        collapsedWidth={0}
        style={{
          background: "#0c1426",
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
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #1890ff, #722ed1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CloudServerOutlined style={{ color: "#fff", fontSize: 16 }} />
            </div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Platform</span>
              <Tag color="error" style={{ marginLeft: 6, fontSize: 10 }}>Super Admin</Tag>
            </div>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname === "/platform" ? "/platform" : pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{
            borderRight: 0,
            padding: "8px 0",
            background: "#0c1426",
          }}
          theme="dark"
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Menu
            mode="inline"
            items={[
              { key: "logout", icon: <LogoutOutlined />, label: "Logout" },
            ]}
            onClick={handleLogout}
            style={{ background: "transparent" }}
            theme="dark"
          />
        </div>
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
