"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureUTMParams } from "@/lib/utmCapture";
import { Suspense } from "react";

function UTMWatcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureUTMParams();
  }, [pathname, searchParams]);

  return null;
}

export default function UTMCapture() {
  return (
    <Suspense fallback={null}>
      <UTMWatcher />
    </Suspense>
  );
}
