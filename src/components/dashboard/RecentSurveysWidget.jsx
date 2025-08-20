"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, Plus, Clock, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { surveyService } from "@/services/survey.service";

const RecentSurveysWidget = () => {
  const [recentSurveys, setRecentSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecentSurveys = async () => {
      try {
        setIsLoading(true);
        const { surveys } = await surveyService.getAllSurveys(1, 50);
        console.log("📊 Encuestas cargadas:", surveys);

        // Inspeccionar estructura de datos de la primera encuesta
        if (surveys.length > 0) {
          console.log("🔍 Estructura de primera encuesta:", {
            _id: surveys[0]._id,
            survey: surveys[0].survey,
            surveyInfo: surveys[0].surveyInfo,
            title: surveys[0].title,
            allFields: Object.keys(surveys[0]),
          });
        }

        // Ordenar por fecha de creación más reciente y tomar las primeras 3
        const sortedSurveys = surveys
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);

        console.log("📊 Top 3 encuestas más recientes:", sortedSurveys);
        setRecentSurveys(sortedSurveys);
      } catch (error) {
        console.error("Error loading recent surveys:", error);
        setRecentSurveys([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentSurveys();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
    } else if (diffHours > 0) {
      return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    } else {
      return "hace unos minutos";
    }
  };

  const truncateText = (text, maxLength = 30) => {
    if (!text) return "Sin título";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getSurveyStatus = (survey) => {
    const now = new Date();
    const startDate = survey.surveyInfo?.startDate
      ? new Date(survey.surveyInfo.startDate)
      : null;
    const endDate = survey.surveyInfo?.endDate
      ? new Date(survey.surveyInfo.endDate)
      : null;

    if (!startDate || !endDate) {
      return { status: "draft", label: "Borrador", color: "text-amber-600" };
    }

    if (now < startDate) {
      return { status: "pending", label: "Pendiente", color: "text-blue-600" };
    } else if (now > endDate) {
      return {
        status: "finished",
        label: "Finalizada",
        color: "text-gray-600",
      };
    } else {
      return { status: "active", label: "Activa", color: "text-green-600" };
    }
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl bg-[var(--card-background)] border border-[var(--card-border)] shadow-xl hover:shadow-2xl transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-secondary rounded-xl shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Últimas Encuestas Creadas
            </h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-[var(--input-background)] rounded-lg mb-2"></div>
                <div className="h-3 bg-[var(--input-background)] rounded-lg w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--card-background)] border border-[var(--card-border)] shadow-xl hover:shadow-2xl transition-all duration-300 group">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-secondary rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Últimas Encuestas Creadas
          </h3>
        </div>

        {recentSurveys.length === 0 ? (
          <div className="text-center py-6">
            <div className="p-4 bg-[var(--input-background)] rounded-2xl mx-auto w-fit mb-4">
              <FileText className="w-8 h-8 text-[var(--text-secondary)] opacity-50" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              No hay encuestas creadas
            </p>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Crea tu primera encuesta para comenzar
            </p>
            <motion.a
              href="/dashboard/encuestas/crear"
              className="inline-flex items-center gap-2 text-xs text-secondary hover:text-secondary-light font-medium hover:underline transition-colors"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-3 h-3" />
              Crear primera encuesta
            </motion.a>
          </div>
        ) : (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="popLayout">
              {recentSurveys.map((survey, index) => {
                const statusInfo = getSurveyStatus(survey);
                return (
                  <motion.div
                    key={survey._id || index}
                    className="relative p-4 bg-[var(--input-background)]/40 border border-[var(--card-border)] rounded-xl hover:shadow-md hover:border-secondary/30 transition-all duration-200 group/item"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.1,
                      ease: "easeOut",
                    }}
                    layout
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-secondary rounded-full"></div>
                    <div className="flex items-start justify-between gap-3 ml-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate mb-2">
                          {truncateText(
                            survey.survey?.title || survey.title,
                            25
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                statusInfo.status === "active"
                                  ? "bg-[var(--hover-bg)] text-primary"
                                  : statusInfo.status === "finished"
                                  ? "bg-[var(--disabled-bg)] text-[var(--disabled-text)]"
                                  : statusInfo.status === "pending"
                                  ? "bg-[var(--hover-bg)] text-secondary"
                                  : "bg-[var(--input-background)] text-[var(--text-secondary)]"
                              }`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] flex-shrink-0">
                        <div className="p-1 bg-[var(--card-background)] rounded-full border border-[var(--card-border)]">
                          <Clock className="w-3 h-3" />
                        </div>
                        <span className="font-medium">
                          {formatTimeAgo(survey.createdAt)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      <motion.div
        className="bg-secondary px-6 py-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
      >
        <div className="text-sm">
          <a
            href="/dashboard/encuestas"
            className="font-medium text-white hover:text-secondary-light transition-colors flex items-center gap-2 group/link w-full justify-center cursor-pointer"
          >
            Ver todas las encuestas
            <ChevronRight className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" />
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default RecentSurveysWidget;
