"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import RecentAnswersWidget from "@/components/dashboard/RecentAnswersWidget";
import RecentSurveysWidget from "@/components/dashboard/RecentSurveysWidget";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showAnswers, setShowAnswers] = useState(true);
  const [showSurveys, setShowSurveys] = useState(true);
  const [showCustomizer, setShowCustomizer] = useState(false);

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
      <div className="sm:hidden mb-6">
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Bienvenido{" "}
            <span className="text-[var(--primary)]">{user?.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--primary-dark)] text-[var(--disabled-bg)]">
            {getRoleName(user?.role)}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Panel de control de Guazú · Sistema de Encuestas
        </p>
      </div>

      {/* Vista Desktop */}
      <div className="hidden sm:block mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Bienvenido{" "}
              <span className="text-[var(--primary)] font-bold">
                {user?.name}
              </span>
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Panel de control de Guazú · Sistema de Encuestas
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--primary-dark)] text-[var(--disabled-bg)]">
            {getRoleName(user?.role)}
          </span>
        </div>
      </div>

      {/* Personalizar vista */}
      <motion.div layout className="mb-6">
        <button
          type="button"
          onClick={() => setShowCustomizer((v) => !v)}
          className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] hover:border-[var(--primary)] hover:shadow transition-colors"
          aria-expanded={showCustomizer}
          aria-controls="customizer-panel"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--primary)]" />
            Personalizar vista
          </span>
          {showCustomizer ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {showCustomizer && (
            <motion.div
              id="customizer-panel"
              initial={{ opacity: 0, scaleY: 0.95 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.95 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden", transformOrigin: "top" }}
              className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)] p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <fieldset>
                  <legend className="text-xs font-semibold text-[var(--text-secondary)] mb-3">
                    Seleccioná qué widgets ver
                  </legend>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--card-border)] bg-[var(--hover-bg)] hover:border-[var(--primary)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="accent-[var(--primary)]"
                        checked={showAnswers}
                        onChange={(e) => setShowAnswers(e.target.checked)}
                        aria-controls="widget-answers"
                      />
                      <span className="text-sm text-[var(--text-primary)]">
                        Últimos Casos
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--card-border)] bg-[var(--hover-bg)] hover:border-[var(--primary)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="accent-[var(--primary)]"
                        checked={showSurveys}
                        onChange={(e) => setShowSurveys(e.target.checked)}
                        aria-controls="widget-surveys"
                      />
                      <span className="text-sm text-[var(--text-primary)]">
                        Últimas Encuestas
                      </span>
                    </label>
                  </div>
                </fieldset>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        layout
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start"
      >
        {/* Ventanita de Últimos Casos Recibidos */}
        {showAnswers && (
          <motion.div
            layout
            id="widget-answers"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <RecentAnswersWidget />
          </motion.div>
        )}

        {/* Ventanita de Últimas Encuestas Creadas */}
        {showSurveys && (
          <motion.div
            layout
            id="widget-surveys"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <RecentSurveysWidget />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
