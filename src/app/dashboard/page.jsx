"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/auth.service";
import { surveyService } from "@/services/survey.service";
import { userService } from "@/services/user.service";
import CountUp from "react-countup";
import { RefreshCw } from "lucide-react";

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

const isActiveSurvey = (survey) => {
  const now = new Date();
  const startDate = new Date(survey.surveyInfo.startDate);
  const endDate = new Date(survey.surveyInfo.endDate);
  return now >= startDate && now <= endDate;
};

const DotsLoader = () => (
  <div className="flex items-center">
    <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
      <span className="inline-block animate-bounce">.</span>
      <span
        className="inline-block animate-bounce"
        style={{ animationDelay: "0.2s" }}
      >
        .
      </span>
      <span
        className="inline-block animate-bounce"
        style={{ animationDelay: "0.4s" }}
      >
        .
      </span>
    </span>
  </div>
);

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [activeSurveys, setActiveSurveys] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (currentUser) => {
    try {
      setIsLoading(true);
      setShouldAnimate(false);

      console.log("=== Iniciando carga de datos del dashboard ===");
      console.log("Usuario actual:", {
        role: currentUser?.role,
        name: currentUser?.name,
      });

      // Cargar encuestas
      const surveyResponse = await surveyService.getAllSurveys();
      const { surveys } = surveyResponse;

      if (surveys) {
        const activeCount = surveys.filter(isActiveSurvey).length;
        setActiveSurveys(activeCount);

        const answersCount = surveys.reduce((total, survey) => {
          return total + (survey.totalAnswers || 0);
        }, 0);
        setTotalAnswers(answersCount);
      }

      // Cargar usuarios si el rol lo permite
      if (
        currentUser?.role === "ROLE_ADMIN" ||
        currentUser?.role === "SUPERVISOR"
      ) {
        console.log("Cargando usuarios para rol:", currentUser.role);
        try {
          const { users, totalCount } = await userService.getAllUsers();
          console.log("Usuarios cargados:", {
            totalCount,
            usersCount: users.length,
          });
          setTotalUsers(totalCount);
        } catch (error) {
          console.error("Error al cargar usuarios:", error);
          setTotalUsers(0);
        }
      } else {
        console.log("No se cargan usuarios para rol:", currentUser?.role);
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsLoading(false);
      setShouldAnimate(true);
    } catch (error) {
      console.error("Error general en loadData:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const userData = authService.getUser();
        console.log("=== Inicialización del dashboard ===");
        console.log("Datos de usuario:", {
          role: userData?.role,
          name: userData?.name,
          exists: !!userData,
        });

        setUser(userData);

        if (userData) {
          await loadData(userData);
        }
      } catch (error) {
        console.error("Error en useEffect:", error);
      }
    };

    initializeDashboard();
  }, []);

  const handleRefresh = () => {
    const currentUser = authService.getUser();
    loadData(currentUser);
  };

  const renderNumber = (value) => {
    if (isLoading) {
      return <DotsLoader />;
    }
    if (shouldAnimate) {
      return <CountUp end={value} duration={1.5} separator="." />;
    }
    return "0";
  };

  return (
    <div>
      <div className="rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] px-5 py-6 shadow-sm sm:px-6">
        {/* Vista Mobile */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Bienvenido {user?.name || user?.email}
            </h2>
            <button
              onClick={handleRefresh}
              className="btn-primary px-3 py-1.5 text-sm flex items-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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
            <button
              onClick={handleRefresh}
              className="btn-primary ml-4 px-3 py-1.5 text-sm flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="inline">Actualizar datos</span>
            </button>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Panel de control de Guazú - Sistema de Encuestas
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card de Encuestas */}
          <div className="overflow-hidden rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-[var(--text-secondary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75a.75.75 0 000-1.5h-.75a.75.75 0 01-.75-.75V6.108c0-.369.303-.678.67-.696.387-.02.774-.04 1.158-.06"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-[var(--text-secondary)]">
                      Encuestas Activas
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                      {renderNumber(activeSurveys)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-primary px-5 py-3">
              <div className="text-sm">
                <a
                  href="/dashboard/encuestas"
                  className="font-medium text-white hover:text-gray-100"
                >
                  Ver todas
                </a>
              </div>
            </div>
          </div>

          {/* Card de Usuarios - Solo visible para admin y supervisor */}
          {user?.role !== "POLLSTER" && (
            <div className="overflow-hidden rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-[var(--text-secondary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-[var(--text-secondary)]">
                        {user?.role === "SUPERVISOR"
                          ? "Encuestadores"
                          : "Usuarios Registrados"}
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                        {renderNumber(totalUsers)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-primary px-5 py-3">
                <div className="text-sm">
                  <a
                    href="/dashboard/usuarios"
                    className="font-medium text-white hover:text-gray-100"
                  >
                    Ver todos
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Card de Respuestas */}
          <div className="overflow-hidden rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-[var(--text-secondary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-[var(--text-secondary)]">
                      Total de Respuestas
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                      {renderNumber(totalAnswers)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-primary px-5 py-3">
              <div className="text-sm">
                <a
                  href="/dashboard/encuestas"
                  className="font-medium text-white hover:text-gray-100"
                >
                  Ver detalles
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
