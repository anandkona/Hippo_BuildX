"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

export default function HealthRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/platform");
  }, [router]);
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
      <Spin tip="Redirecting to Dashboard..." />
    </div>
  );
}
