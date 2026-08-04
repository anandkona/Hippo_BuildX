"use client";

import React from "react";
import { Breadcrumb } from "antd";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HomeOutlined } from "@ant-design/icons";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const pathSnippets = pathname.split("/").filter((i) => i);

  const breadcrumbItems = [
    {
      title: (
        <Link href="/">
          <HomeOutlined />
        </Link>
      ),
      key: "home",
    },
  ].concat(
    pathSnippets.map((snippet, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join("/")}`;
      return {
        key: url,
        title: (
          <Link href={url}>
            <span style={{ textTransform: "capitalize" }}>{snippet}</span>
          </Link>
        ),
      };
    })
  );

  return <Breadcrumb items={breadcrumbItems} />;
}
