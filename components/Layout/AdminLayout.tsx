"use client";

import React from "react";
import { Layout, Grid } from "antd";
import HeaderBar from "./HeaderBar";
import Breadcrumbs from "./Breadcrumbs";
const { Content } = Layout;
const { useBreakpoint } = Grid;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout>
        <HeaderBar />
        <Content style={{ margin: isMobile ? "16px 8px 0" : "24px 16px 0", overflow: "initial" }}>
          <div style={{ marginBottom: 16 }}>
            <Breadcrumbs />
          </div>
          <div
            style={{
              padding: isMobile ? 12 : 24,
              background: "var(--background)",
              borderRadius: 8,
              minHeight: 360,
              overflowX: "hidden"
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
