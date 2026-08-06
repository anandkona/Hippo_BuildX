"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Redirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login");
  }, [router, params]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: "#64748b" }}>
      Redirecting to sign in...
    </div>
  );
}

/** Legacy platform login URL — central login is /login */
export default function PlatformLoginRedirect() {
  return (
    <Suspense>
      <Redirect />
    </Suspense>
  );
}
