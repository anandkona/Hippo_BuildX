"use client";

import React, { useState } from "react";
import { Layout, Button, Input, Dropdown, Avatar, Badge, theme, Switch, Menu, Grid, Drawer } from "antd";
import {
  SearchOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useTheme } from "../Providers/ThemeProvider";
import { useRouter, usePathname } from "next/navigation";

const { Header } = Layout;
const { useBreakpoint } = Grid;

export default function HeaderBar() {
  const { mode, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
    },
  ];

  const handleUserMenuClick = async (e: { key: string }) => {
    if (e.key === "logout") {
      try {
        await fetch("/api/v1/auth/logout", { method: "POST" });
      } catch {}
      router.push("/login");
    } else {
      router.push(`/${e.key}`);
    }
  };

  const topMenuItems = [
    { key: "/dashboard", label: "Dashboard" },
    { key: "/admin/users", label: "Administration" },
  ];

  const handleTopMenuClick = (e: { key: string }) => {
    setDrawerOpen(false);
    router.push(e.key);
  };

  return (
    <Header
      style={{
        padding: isMobile ? "0 12px" : "0 24px",
        background: colorBgContainer,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 4px rgba(0,21,41,.08)",
        zIndex: 9,
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {isMobile && (
          <>
            <Button type="text" icon={<MenuOutlined style={{ fontSize: 18 }} />} style={{ marginRight: 8 }} onClick={() => setDrawerOpen(true)} />
            <Drawer
              title="Menu"
              placement="left"
              onClose={() => setDrawerOpen(false)}
              open={drawerOpen}
              styles={{ body: { padding: 0 } }}
              width={250}
            >
              <Menu
                mode="inline"
                selectedKeys={[pathname === "/" ? "/dashboard" : pathname]}
                onClick={handleTopMenuClick}
                items={topMenuItems}
                style={{ borderRight: "none" }}
              />
            </Drawer>
          </>
        )}
        <div style={{
          fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", "Lucida Sans", Arial, sans-serif',
          fontStyle: "italic",
          fontWeight: "900",
          marginRight: isMobile ? 8 : 24,
          letterSpacing: "-1px",
          display: "flex",
          alignItems: "baseline"
        }}>
          <span style={{ color: "#1890ff", fontSize: isMobile ? 18 : 22 }}>Build</span>
          <span style={{ color: "#ff4d4f", fontSize: isMobile ? 22 : 28 }}>X</span>
        </div>
      </div>

      {!isMobile ? (
        <div style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 0, padding: "0 24px" }}>
          <Menu
            mode="horizontal"
            selectedKeys={[pathname === "/" ? "/dashboard" : pathname]}
            onClick={handleTopMenuClick}
            items={topMenuItems}
            style={{ borderBottom: "none", width: "100%", justifyContent: "center", background: "transparent" }}
          />
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 24 }}>
        <Switch
          checkedChildren="🌙"
          unCheckedChildren="☀️"
          checked={mode === "dark"}
          onChange={toggleTheme}
          size={isMobile ? "small" : "default"}
        />

        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              gap: 8,
            }}
          >
            <Avatar icon={<UserOutlined />} src="/avatar.png" size={isMobile ? "small" : "default"} />
            {!isMobile && <span style={{ fontWeight: 500 }}>Admin User</span>}
          </div>
        </Dropdown>
      </div>
    </Header>
  );
}
