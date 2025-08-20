"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import RecentAnswersWidget from "@/components/dashboard/RecentAnswersWidget";
import RecentSurveysWidget from "@/components/dashboard/RecentSurveysWidget";

const getRoleName = (role) => {
  switch (role) {
    case "ROLE_ADMIN":
      return "Administrador";
    case "SUPERVISOR":
      return "Supervisor";
    case "POLLSTER":
      return "Encuestador";
    default:
      return "";
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const userData = authService.getUser();
        setUser(userData);

        // Redirigir pollsters directamente a su página de encuestas
        if (userData?.role === "POLLSTER") {
          router.replace("/dashboard/encuestas");
          return;
        }
      } catch (error) {
        console.error("Error en useEffect:", error);
      }
    };

    initializeDashboard();
  }, []);

  return (
    <div className="p-4">
      {/* Vista Mobile */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Bienvenido {user?.name || user?.email}
          </h2>
        </div>
        <div className="mb-6">
          <span className="text-base text-[var(--text-secondary)]">
            {getRoleName(user?.role)}
          </span>
        </div>
        <h3 className="text-base font-medium text-[var(--text-primary)]">
          Panel de control de Guazú
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-2">
          Sistema de Encuestas
        </p>
      </div>

      {/* Vista Desktop */}
      <div className="hidden sm:block mb-8">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold leading-6 text-[var(--text-primary)] text-xl">
            Bienvenido {user?.name || user?.email}
          </h2>
          <span className="text-sm text-[var(--text-secondary)]">
            - {getRoleName(user?.role)}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Panel de control de Guazú - Sistema de Encuestas
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start">
        {/* Ventanita de Últimos Casos Recibidos */}
        <RecentAnswersWidget />

        {/* Ventanita de Últimas Encuestas Creadas */}
        <RecentSurveysWidget />
      </div>
    </div>
  );
}
