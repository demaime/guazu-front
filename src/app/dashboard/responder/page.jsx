"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

export default function ResponderFallback() {
  const router = useRouter();

  useEffect(() => {
    try {
      const key = "responder:surveyId";
      const fromSession =
        typeof window !== "undefined" && window.sessionStorage
          ? window.sessionStorage.getItem(key)
          : null;
      const fromLocal =
        !fromSession && typeof window !== "undefined" && window.localStorage
          ? window.localStorage.getItem(key)
          : null;
      const id = fromSession || fromLocal || null;

      if (id) {
        router.replace("/dashboard/encuestas/responder");
      } else {
        router.replace("/dashboard/encuestas");
      }
    } catch {
      router.replace("/dashboard/encuestas");
    }
  }, [router]);

  return (
    <LoaderWrapper
      size="lg"
      fullScreen
      text="Redirigiendo…"
      className="text-primary"
    />
  );
}
