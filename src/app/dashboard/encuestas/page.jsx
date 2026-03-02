"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import AdminDashboard from "./AdminDashboard";
import PollsterDashboard from "./PollsterDashboard";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { useRouter } from "next/navigation";

export default function EncuestasPage() {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const user = authService.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserRole(user.role);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return <LoaderWrapper />;
  }

  if (userRole === "POLLSTER") {
    return <PollsterDashboard />;
  }

  // Admin and Supervisor see the new dashboard
  return <AdminDashboard />;
}
