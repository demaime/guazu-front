"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ServiceWorkerInit = dynamic(
  () => import("@/components/ServiceWorkerInit"),
  {
    ssr: false,
  }
);

export default function ServiceWorkerLoader() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isClient && process.env.NODE_ENV === "production") {
    return <ServiceWorkerInit />;
  }

  return null;
}
