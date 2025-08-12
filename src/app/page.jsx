"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { motion } from "framer-motion";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Normal authentication check
        if (authService.isAuthenticated()) {
          router.replace("/dashboard/encuestas");
        } else {
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        router.replace("/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    setTimeout(checkAuth, 100);
  }, [router]);

  if (isCheckingAuth) {
    return <LoaderWrapper size="xl" fullScreen />;
  }

  return <LoaderWrapper size="xl" fullScreen />;
}
