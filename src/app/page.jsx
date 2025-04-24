"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { motion } from "framer-motion";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        if (authService.isAuthenticated()) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        router.replace("/login");
      }
    };

    setTimeout(checkAuth, 100);
  }, [router]);

  return <LoaderWrapper size="xl" fullScreen />;
}
