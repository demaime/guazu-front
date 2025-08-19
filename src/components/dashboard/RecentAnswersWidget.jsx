"use client";

import { useState, useEffect } from "react";
import { Clock, MessageSquare, User, X, ChevronRight } from "lucide-react";
import { surveyService } from "@/services/survey.service";

const RecentAnswersWidget = () => {
  const [allAnswers, setAllAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Obtener los primeros 3 para mostrar en el widget
  const recentAnswers = allAnswers.slice(0, 3);

  useEffect(() => {
    const loadAllAnswers = async () => {
      try {
        setIsLoading(true);
        // Traer 20 de una vez para evitar fetch posterior
        const answers = await surveyService.getRecentAnswersForUser(20);
        console.log("🔍 Todas las respuestas cargadas:", answers.length);
        setAllAnswers(answers);
      } catch (error) {
        console.error("Error loading answers:", error);
        setAllAnswers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllAnswers();
  }, []);

  const openModal = () => {
    // Ya no necesitamos fetch - usamos datos ya cargados
    setShowModal(true);
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
    if (!text) return "Sin respuesta";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl bg-[var(--card-background)] border border-[var(--card-border)] shadow-xl hover:shadow-2xl transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Últimos Casos Recibidos
            </h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-[var(--input-background)] rounded-lg mb-2"></div>
                <div className="h-3 bg-[var(--input-background)] rounded-lg w-3/4"></div>
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
          <div className="p-2 bg-primary rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Últimos Casos Recibidos
          </h3>
        </div>

        {recentAnswers.length === 0 ? (
          <div className="text-center py-6">
            <div className="p-4 bg-[var(--input-background)] rounded-2xl mx-auto w-fit mb-4">
              <MessageSquare className="w-8 h-8 text-[var(--text-secondary)] opacity-50" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              No hay respuestas recientes
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Las respuestas de pollsters aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentAnswers.map((answer, index) => (
              <div
                key={answer._id || index}
                className="relative p-4 bg-[var(--input-background)]/40 border border-[var(--card-border)] rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-200 group/item"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-full"></div>
                <div className="flex items-start justify-between gap-3 ml-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate mb-2">
                      {truncateText(answer.surveyTitle, 25)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-[var(--card-background)] rounded-full border border-[var(--card-border)]">
                          <User className="w-3 h-3 text-[var(--text-secondary)]" />
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] truncate font-medium">
                          {answer.fullName || "Usuario anónimo"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] flex-shrink-0">
                    <div className="p-1 bg-[var(--card-background)] rounded-full border border-[var(--card-border)]">
                      <Clock className="w-3 h-3" />
                    </div>
                    <span className="font-medium">
                      {formatTimeAgo(answer.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-primary px-6 py-4">
        <div className="text-sm">
          <button
            onClick={openModal}
            className="font-medium text-white hover:text-primary-light transition-colors flex items-center gap-2 group/link w-full justify-center"
          >
            Ver más
            <ChevronRight className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Modal con todas las respuestas */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-background)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-xl">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Todas las Respuestas Recientes
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[var(--hover-bg)] rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {allAnswers.map((answer, index) => (
                  <div
                    key={answer._id || index}
                    className="relative p-4 bg-[var(--input-background)]/40 border border-[var(--card-border)] rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-full"></div>
                    <div className="flex items-start justify-between gap-3 ml-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                          {answer.surveyTitle}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-[var(--card-background)] rounded-full border border-[var(--card-border)]">
                              <User className="w-3 h-3" />
                            </div>
                            <span className="font-medium">
                              {answer.fullName || "Usuario anónimo"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-[var(--card-background)] rounded-full border border-[var(--card-border)]">
                              <Clock className="w-3 h-3" />
                            </div>
                            <span className="font-medium">
                              {formatTimeAgo(answer.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {allAnswers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[var(--text-secondary)]">
                    No hay respuestas para mostrar
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentAnswersWidget;
