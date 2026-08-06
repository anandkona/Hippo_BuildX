"use client";

import React from "react";
import { Dropdown, Button } from "antd";
import { BgColorsOutlined } from "@ant-design/icons";
import { useTheme } from "./ThemeProvider";

export default function ThemeSwitcher() {
  const { mounted, themes, setTheme } = useTheme();

  if (!mounted) {
    return <div className="h-8 w-24 bg-gray-200 animate-pulse rounded-md opacity-20" />;
  }

  const items = Object.values(themes).map((t: any) => ({
    key: t.id,
    label: t.name,
    onClick: () => setTheme(t.id),
  }));

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Button icon={<BgColorsOutlined />} type="default" style={{ background: "var(--ui-surface)", color: "var(--ui-text)", borderColor: "var(--ui-border)" }}>
        Theme
      </Button>
    </Dropdown>
  );
}
