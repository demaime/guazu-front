"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  MessageSquare,
  User,
  X,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { surveyService } from "@/services/survey.service";
// Geocodificación cliente eliminada: usamos answer.location desde el backend

const RecentAnswersWidget = () => {
  const [allAnswers, setAllAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // Geocodificación local eliminada

  // Obtener los primeros 3 para mostrar en el widget
  const recentAnswers = allAnswers.slice(0, 3);

  useEffect(() => {
    const loadAllAnswers = async () => {
      try {
        setIsLoading(true);
        // Incluir finalizadas para que aparezcan también
        const answers = await surveyService.getRecentAnswersForUser(20, {
          includeFinished: true,
        });
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

  // Geocodificación eliminada

  const getCityForAnswer = (answer) => {
    // Sólo usamos la ciudad del backend
    const backendCity = answer?.location?.city;
    return backendCity && backendCity !== "Ubicación no disponible"
      ? backendCity
      : null;
  };

  const formatPollsterWithCity = (answer) => {
    // Dejamos solo el nombre; la ubicación se muestra a la derecha junto al reloj
    return answer.fullName || "Usuario anónimo";
  };

  const getLocationLabel = (answer) => {
    const state = answer?.location?.state || null;
    const city = answer?.location?.city || null;

    // Si no hay ubicación o es "Ubicación no disponible", devolver null
    if (!answer?.location || city === "Ubicación no disponible") {
      return null;
    }

    if (state === "CABA") {
      if (city && city.toLowerCase().includes("comuna")) {
        return `${city}, CABA`;
      }
      return "CABA";
    }

    if (city && state) {
      return `${city}, ${state}`;
    }

    return state || city || null;
  };

  const openModal = () => {
    // Ya no necesitamos fetch - usamos datos ya cargados
    setShowModal(true);
  };

  const formatDateTime = (dateString) => {
    try {
      const d = new Date(dateString);
      const dd = String(d.getDate()).padStart(2, "0");
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${dd}-${mo}-${yy} - ${hh}:${mi}`;
    } catch {
      return "--/--/-- - --:--";
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
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatePresence mode="popLayout">
              {recentAnswers.map((answer, index) => (
                <motion.div
                  key={answer._id || index}
                  className="relative p-4 bg-[var(--card-border)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-200 group/item overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.05,
                    ease: "linear",
                  }}
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r-full"></div>
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
                            {formatPollsterWithCity(answer)}
                          </span>
                          {getLocationLabel(answer) && (
                            <>
                              <span className="text-[var(--text-muted)]">
                                ·
                              </span>
                              <div className="p-1 bg-[var(--card-background)] rounded-full border border-[var(--card-border)]">
                                <MapPin className="w-3 h-3 text-primary" />
                              </div>
                              <span className="text-xs text-[var(--text-secondary)] truncate max-w-[160px]">
                                {getLocationLabel(answer)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-[var(--card-background)] rounded-full border border-[var(--card-border)]">
                          <Clock className="w-3 h-3" />
                        </div>
                        <span className="font-medium">
                          {formatDateTime(answer.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      <motion.div
        className="bg-primary px-6 py-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
      >
        <div className="text-sm flex items-center justify-center">
          <button
            onClick={openModal}
            className="font-medium text-white hover:text-primary-light transition-colors flex items-center gap-2 group/link cursor-pointer"
          >
            Ver más
            <ChevronRight className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>

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
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <AnimatePresence>
                  {allAnswers.map((answer, index) => (
                    <motion.div
                      key={answer._id || index}
                      className="relative p-4 bg-[var(--input-background)]/40 border border-[var(--card-border)] rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: "easeOut",
                      }}
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r-full"></div>
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
                                {formatPollsterWithCity(answer)}
                              </span>
                              {getCityForAnswer(answer) && (
                                <div className="ml-1 p-0.5 bg-primary/10 rounded-full">
                                  <MapPin className="w-2.5 h-2.5 text-primary" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <div className="p-1 bg-[var(--card-background)] rounded-full border border-[var(--card-border)]">
                                  <Clock className="w-3 h-3" />
                                </div>
                                <span className="font-medium">
                                  {formatDateTime(answer.createdAt)}
                                </span>
                              </div>
                              {getLocationLabel(answer) && (
                                <div className="flex items-center gap-1.5">
                                  <div className="p-1 bg-[var(--card-background)] rounded-full border border-[var(--card-border)]">
                                    <MapPin className="w-3 h-3 text-primary" />
                                  </div>
                                  <span className="font-medium">
                                    {getLocationLabel(answer)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
              {allAnswers.length === 0 && (
                <motion.div
                  className="text-center py-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <p className="text-[var(--text-secondary)]">
                    No hay respuestas para mostrar
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de JSON crudo eliminado */}
    </div>
  );
};

export default RecentAnswersWidget;
