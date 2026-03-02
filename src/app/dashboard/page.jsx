"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/encuestas");
  }, [router]);

  return <LoaderWrapper />;
}
