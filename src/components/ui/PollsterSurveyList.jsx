import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Play,
  Users,
  Target, // Re-added
  Clock,
  TestTube2,
  ChevronUp,
  ChevronDown,
  FileText,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { surveyService } from "@/services/survey.service";
import { useTutorial } from "@/contexts/TutorialContext";

// ID fijo de la encuesta universal visible para todos los pollsters
const UNIVERSAL_SURVEY_ID = "db7aa030-81f6-11f0-b66d-053a86e645bd";

export function PollsterSurveyList({
  surveys,
  isFinished = false,
  currentUser,
  refreshToken = 0,
}) {
  const router = useRouter();
  const { shouldStartTutorial } = useTutorial();
  const [loadingStates, setLoadingStates] = useState({});
  const [progressData, setProgressData] = useState({}); // { surveyId: { assignedCases, completedAnswers, ... } }
  const [progressLoading, setProgressLoading] = useState({});
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  // Encuesta universal: permitir minimizar/expandir (persistente)
  const [isUniversalMinimized, setIsUniversalMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("universalSurveyMinimized");
      return stored !== null ? stored === "true" : true; // Por defecto: cerrada
    }
    return true;
  });
  const toggleUniversalSurvey = useCallback(() => {
    const next = !isUniversalMinimized;
    setIsUniversalMinimized(next);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("universalSurveyMinimized", String(next));
      }
    } catch {}
  }, [isUniversalMinimized]);

  // Estado para controlar qué encuestas tienen las cuotas expandidas
  const [expandedQuotas, setExpandedQuotas] = useState({});

  // Estado para el modal de detalle de cuota
  const [selectedQuotaSegment, setSelectedQuotaSegment] = useState(null);

  const toggleQuotas = useCallback((surveyId) => {
    setExpandedQuotas((prev) => ({
      ...prev,
      [surveyId]: !prev[surveyId],
    }));
  }, []);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  // Expandir encuesta de prueba cuando se activa el tutorial
  useEffect(() => {
    if (shouldStartTutorial) {
      console.log(
        "📚 [PollsterSurveyList] Tutorial activado - expandiendo encuesta de prueba"
      );
      setIsUniversalMinimized(false);
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("universalSurveyMinimized", "false");
        }
      } catch (error) {
        console.warn("No se pudo actualizar localStorage:", error);
      }
    }
  }, [shouldStartTutorial]);

  // Cargar el progreso del pollster para cada encuesta
  useEffect(() => {
    const loadProgressForSurveys = async () => {
      if (!currentUser?._id || !surveys?.length) return;

      // Crear un Set de IDs para comparación rápida
      const surveyIds = surveys.map((s) => s._id);
      const surveyIdsString = surveyIds.sort().join(","); // String estable para comparación

      // Evitar cargar si ya tenemos datos para exactamente estas encuestas
      const currentDataIds = Object.keys(progressData).sort().join(",");
      if (
        currentDataIds === surveyIdsString &&
        Object.keys(progressData).length > 0
      ) {
        console.log(
          "🔄 Progress data already loaded for these surveys, skipping..."
        );
        return;
      }

      // Preparar loading states solo para encuestas nuevas
      const newLoadingStates = {};

      surveys.forEach((survey) => {
        // La encuesta universal no necesita loading de progreso
        newLoadingStates[survey._id] =
          survey._id === UNIVERSAL_SURVEY_ID ? false : true;
      });
      setProgressLoading(newLoadingStates);

      // Cargar progreso sólo para encuestas que no sean universales
      const surveysNeedingProgress = surveys.filter(
        (survey) => survey._id !== UNIVERSAL_SURVEY_ID
      );

      const progressPromises = surveysNeedingProgress.map(async (survey) => {
        try {
          const progressResponse = await surveyService.getPollsterProgress(
            survey._id,
            currentUser._id
          );
          return {
            surveyId: survey._id,
            data: progressResponse,
          };
        } catch (error) {
          // Para la encuesta universal, no mostrar errores en consola
          if (survey._id !== UNIVERSAL_SURVEY_ID) {
            console.error(
              `❌ Error loading progress for survey ${survey._id}:`,
              error
            );
          }

          // Fallback especial para encuesta universal
          if (survey._id === UNIVERSAL_SURVEY_ID) {
            return {
              surveyId: survey._id,
              data: {
                assignedCases: 999, // Casos ilimitados para prueba
                completedAnswers: 0,
                progressPercentage: 0,
                isCompleted: false,
              },
            };
          }

          // Fallback normal para otras encuestas
          const userIds = survey.userIds || [];
          const totalTarget = survey.surveyInfo?.target || 0;
          const fallbackCases =
            userIds.includes(currentUser._id) && userIds.length > 0
              ? Math.floor(totalTarget / userIds.length)
              : 0;

          return {
            surveyId: survey._id,
            data: {
              assignedCases: fallbackCases,
              completedAnswers: 0,
              progressPercentage: 0,
              isCompleted: false,
            },
          };
        }
      });

      try {
        const results = await Promise.all(progressPromises);
        const newProgressData = {};
        const finalLoadingStates = {};

        results.forEach(({ surveyId, data }) => {
          newProgressData[surveyId] = data;
          finalLoadingStates[surveyId] = false;
        });

        // Asegurar que la encuesta universal esté marcada como no-loading
        surveys.forEach((survey) => {
          if (survey._id === UNIVERSAL_SURVEY_ID) {
            finalLoadingStates[survey._id] = false;
          }
        });

        setProgressData(newProgressData);
        setProgressLoading(finalLoadingStates);
      } catch (error) {
        console.error("❌ Error loading progress data:", error);
        // Reset loading states
        const resetLoadingStates = {};
        surveys.forEach((survey) => {
          resetLoadingStates[survey._id] = false;
        });
        setProgressLoading(resetLoadingStates);
      }
    };

    loadProgressForSurveys();
  }, [
    surveys?.length, // Solo el número de encuestas
    surveys
      ?.map((s) => s._id)
      .sort()
      .join(","), // IDs como string estable
    currentUser?._id,
    refreshToken,
  ]);

  // Helper para identificar encuesta universal
  const isUniversalSurvey = (survey) => survey?._id === UNIVERSAL_SURVEY_ID;

  const getLocalizedText = (textObj, defaultText = "Sin definir") => {
    if (!textObj) return defaultText;
    if (typeof textObj === "string") return textObj;
    return textObj.es || textObj.en || defaultText;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No definida";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "Fecha inválida";
    }
  };

  // Función fallback silenciosa para obtener casos asignados cuando falla la API
  const getAssignedCasesFallback = (survey) => {
    if (!currentUser?._id) return 0;

    // Buscar en survey.pollsterAssignments (nivel raíz) primero
    if (survey.pollsterAssignments) {
      const assignment = survey.pollsterAssignments.find(
        (assignment) => assignment.pollsterId === currentUser._id
      );
      if (assignment && assignment.assignedCases > 0) {
        return assignment.assignedCases;
      }
    }

    // Buscar en surveyInfo.pollsterAssignments
    if (survey.surveyInfo?.pollsterAssignments) {
      const assignment = survey.surveyInfo.pollsterAssignments.find(
        (assignment) => assignment.pollsterId === currentUser._id
      );
      if (assignment && assignment.assignedCases > 0) {
        return assignment.assignedCases;
      }
    }

    // Fallback: Intentar en participants (para compatibilidad)
    if (survey.participants?.pollsterAssignments) {
      const assignment = survey.participants.pollsterAssignments.find(
        (assignment) => assignment.pollsterId === currentUser._id
      );
      if (assignment && assignment.assignedCases > 0) {
        return assignment.assignedCases;
      }
    }

    // Fallback final: Si el pollster está en userIds, dividir equitativamente
    const userIds = survey.participants?.userIds || survey.userIds || [];
    if (userIds.includes(currentUser._id)) {
      const totalPollsters = userIds.length;
      const totalTarget = survey.surveyInfo?.target || 0;
      if (totalPollsters > 0) {
        return Math.floor(totalTarget / totalPollsters);
      }
    }

    return 0; // No tiene casos asignados
  };

  // Funciones que usan los datos reales del backend
  const getAssignedCases = (survey) => {
    const progress = progressData[survey._id];
    if (progress) {
      return progress.assignedCases || 0;
    }
    // Fallback en caso de que no tengamos datos aún
    return getAssignedCasesFallback(survey);
  };

  const getCompletedAnswers = (survey) => {
    const progress = progressData[survey._id];
    if (progress) {
      return progress.completedAnswers || 0;
    }
    // Fallback: return 0 si no tenemos datos del backend
    return 0;
  };

  const calculateProgress = (survey) => {
    const assignedCases = getAssignedCases(survey);
    const completedAnswers = getCompletedAnswers(survey);

    if (!assignedCases || assignedCases === 0) return "0%";
    const percentage = Math.min((completedAnswers / assignedCases) * 100, 100);
    return `${Math.round(percentage)}%`;
  };

  const getTimeRemaining = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end - now;

    if (diffTime <= 0) return "Finalizada";

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "1 día restante";
    if (diffDays <= 7) return `${diffDays} días restantes`;
    return `${diffDays} días restantes`;
  };

  const handleResponder = useCallback(
    async (surveyData) => {
      const buttonKey = surveyData._id;
      setLoadingStates((prev) => ({ ...prev, [buttonKey]: true }));

      try {
        try {
          if (typeof window !== "undefined") {
            // Usar sessionStorage por pestaña; fallback a localStorage
            const key = "responder:surveyId";
            if (window.sessionStorage) {
              window.sessionStorage.setItem(key, String(surveyData._id));
            } else if (window.localStorage) {
              window.localStorage.setItem(key, String(surveyData._id));
            }
          }
        } catch {}
        router.push(`/dashboard/encuestas/responder`);
      } catch (error) {
        console.error("Error al navegar:", error);
      } finally {
        // Remove loading state after navigation
        setTimeout(() => {
          setLoadingStates((prev) => ({ ...prev, [buttonKey]: false }));
        }, 1000);
      }
    },
    [router]
  );

  const getStatusColor = (survey) => {
    if (isFinished) return "from-gray-500 to-gray-600";

    const now = new Date();
    const endDate = new Date(survey.surveyInfo?.endDate);
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return "from-red-500 to-red-600";
    if (diffDays <= 3) return "from-orange-500 to-orange-600";
    return "from-[var(--primary)] to-[var(--primary-dark)]";
  };

  const getProgressColor = (survey) => {
    const assignedCases = getAssignedCases(survey);
    const completedAnswers = getCompletedAnswers(survey);

    if (!assignedCases) return "bg-gray-400";
    const percentage = (completedAnswers / assignedCases) * 100;
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Obtener cuotas asignadas al pollster actual (SOLO las suyas)
  const getPollsterQuotas = (survey) => {
    if (!currentUser?._id) {
      return null;
    }

    // quotaAssignments vive en surveyInfo según el modelo
    const quotaAssignments = survey?.surveyInfo?.quotaAssignments || [];

    if (!quotaAssignments || quotaAssignments.length === 0) {
      return null;
    }

    const assignment = quotaAssignments.find(
      (qa) => qa.pollsterId === currentUser._id
    );

    if (!assignment || !assignment.quotas || assignment.quotas.length === 0) {
      return null;
    }

    return assignment.quotas;
  };

  // Verificar si la encuesta tiene cuotas
  const hasQuotas = (survey) => {
    const quotas = getPollsterQuotas(survey);
    return quotas && quotas.length > 0;
  };

  // Obtener el estado de una cuota (completa o incompleta)
  const getQuotaStatus = (current, target) => {
    if (current >= target) {
      return {
        bgColor: "bg-green-500/20 dark:bg-green-500/20",
        textColor: "text-green-600 dark:text-green-400",
        borderColor: "border-green-500/30",
        status: "complete",
      };
    }
    return {
      bgColor: "bg-[var(--input-background)]",
      textColor: "text-[var(--text-primary)]",
      borderColor: "border-[var(--card-border)]",
      status: "incomplete",
    };
  };

  if (!surveys || surveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-[var(--card-border)] rounded-full flex items-center justify-center mb-4">
          <Play className="w-8 h-8 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          {isFinished
            ? "No hay encuestas finalizadas"
            : "No hay encuestas disponibles"}
        </h3>
        <p className="text-[var(--text-secondary)] max-w-sm">
          {isFinished
            ? "Aquí aparecerán las encuestas que hayas completado."
            : "Cuando tengas encuestas asignadas, aparecerán aquí para que puedas responderlas."}
        </p>
      </div>
    );
  }

  // Ordenar encuestas colocando la universal primero, luego el resto
  const pinnedSurveys = useMemo(() => {
    if (!Array.isArray(surveys)) return [];
    const universal = surveys.find((s) => isUniversalSurvey(s));
    const others = surveys.filter((s) => !isUniversalSurvey(s));
    return universal ? [universal, ...others] : others;
  }, [
    surveys
      ?.map((s) => s._id)
      .sort()
      .join(","),
  ]);

  // Eliminados componentes especializados para la encuesta universal

  return (
    <div className="space-y-4">
      {pinnedSurveys.map((survey, index) => {
        const isUniversal = isUniversalSurvey(survey);
        const surveyInfo = survey.surveyInfo || {};
        const timeRemaining = getTimeRemaining(surveyInfo.endDate);
        const assignedCases = isUniversal ? 0 : getAssignedCases(survey);
        const completedAnswers = isUniversal ? 0 : getCompletedAnswers(survey);
        const progress = isUniversal ? null : calculateProgress(survey);
        const progressValue = isUniversal
          ? 0
          : assignedCases > 0
          ? (completedAnswers / assignedCases) * 100
          : 0;
        const isLoading = loadingStates[survey._id];
        const isProgressLoading = isUniversal
          ? false
          : progressLoading[survey._id];

        return (
          <motion.div
            key={survey._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-[var(--card-background)] rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow duration-200 ${
              isUniversal ? "border-blue-300" : "border-[var(--card-border)]"
            }`}
            data-tutorial={
              isUniversal
                ? "test-survey"
                : index === 1
                ? "survey-card"
                : undefined
            }
          >
            {/* Header - universal con control de minimizar */}
            {!isFinished && (
              <div
                onClick={() => isUniversal && toggleUniversalSurvey()}
                className={`bg-gradient-to-r ${
                  isUniversal
                    ? "from-blue-500 to-purple-600"
                    : getStatusColor(survey)
                } p-2 px-4 ${isUniversal ? "cursor-pointer select-none" : ""}`}
              >
                <div className="flex justify-between items-center">
                  {isUniversal ? (
                    <div className="text-white text-xs font-medium flex items-center gap-2">
                      <TestTube2 className="w-4 h-4" />
                      <span>Encuesta de Prueba</span>
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2">
                    {!isUniversal && (
                      <div className="text-white text-xs font-medium">
                        {timeRemaining}
                      </div>
                    )}
                    {isUniversal && (
                      <button
                        onClick={toggleUniversalSurvey}
                        className="text-white hover:bg-white/20 p-1 rounded transition-colors"
                        title={isUniversalMinimized ? "Expandir" : "Minimizar"}
                      >
                        {isUniversalMinimized ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(!isUniversal || !isUniversalMinimized) && (
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Contenido del header - título y descripción */}
                  <div className="p-4 pb-2">
                    {!isUniversal && (
                      <h3 className="text-base font-semibold leading-tight mb-2 text-[var(--text-primary)] line-clamp-2">
                        {getLocalizedText(survey.survey?.title) || "Sin título"}
                      </h3>
                    )}
                    <p className="text-[var(--text-secondary)] text-sm line-clamp-1 mb-3">
                      {isUniversal
                        ? "Para probar funcionalidades de la app"
                        : getLocalizedText(
                            survey.survey?.description,
                            "Sin descripción"
                          )}
                    </p>
                  </div>

                  {/* Contenido principal */}
                  <div className="px-4 pb-4">
                    {/* Stats Grid - Estilo mockup */}
                    {!isUniversal && (
                      <div className="space-y-6 mb-6">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Tiempo restante */}
                          {(() => {
                            const timeStr = timeRemaining || "Sin fecha";
                            const parts = timeStr.split(" ");
                            const value = parts[0];
                            const label1 = parts[1] || "";
                            const label2 = parts.slice(2).join(" ") || "";

                            return (
                              <div className="flex items-center gap-2 p-2 px-3 bg-[var(--inner-card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
                                <div className="p-1.5 bg-orange-500/10 rounded-lg flex-shrink-0">
                                  <Clock className="w-4 h-4 text-orange-500" />
                                </div>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <span className="text-2xl font-bold text-[var(--text-primary)] leading-none">
                                    {value}
                                  </span>
                                  <div className="flex flex-col text-[10px] leading-[0.85] text-[var(--text-secondary)] font-medium">
                                    <span className="truncate">{label1}</span>
                                    <span className="truncate">{label2}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Casos completados */}
                          <div className="flex items-center gap-2 p-2 px-3 bg-[var(--inner-card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
                            <div className="p-1.5 bg-[var(--primary)]/10 rounded-lg flex-shrink-0">
                              <Users className="w-4 h-4 text-[var(--primary)]" />
                            </div>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <span className="text-2xl font-bold text-[var(--text-primary)] leading-none">
                                {isProgressLoading ? (
                                  "..."
                                ) : (
                                  completedAnswers
                                )}
                              </span>
                              <div className="flex flex-col text-[10px] leading-[0.85] text-[var(--text-secondary)] font-medium">
                                <span className="truncate">/ {assignedCases}</span>
                                <span className="truncate">casos</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="relative">
                          <div className="h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                isProgressLoading
                                  ? "bg-gray-300 animate-pulse"
                                  : getProgressColor(survey)
                              } rounded-full transition-all duration-500`}
                              style={{
                                width: isProgressLoading
                                  ? "30%"
                                  : `${Math.min(progressValue, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="absolute right-0 -top-5 text-xs font-semibold text-[var(--text-muted)]">
                            {isProgressLoading ? "..." : progress}
                          </span>
                        </div>
                      </div>
                    )}


                    {/* Sección de Cuotas - Expandible */}
                    {!isUniversal && hasQuotas(survey) && (
                      <div className="bg-[var(--inner-card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden transition-all duration-300 mb-4">
                        {/* Cabecera Clickeable */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleQuotas(survey._id);
                          }}
                          className="w-full flex items-center justify-between p-2 hover:bg-[var(--hover-bg)] transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-[var(--primary)]/10 rounded-lg">
                              <Target className="w-3.5 h-3.5 text-[var(--primary)] text-opacity-80" />
                            </div>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                              Cuotas
                            </span>
                          </div>
                          {expandedQuotas[survey._id] ? (
                            <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                          )}
                        </button>

                        {/* Contenido Expandible */}
                        <AnimatePresence>
                          {expandedQuotas[survey._id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="p-3 pt-0 border-t border-[var(--card-border)] border-dashed mt-1">
                                <div className="space-y-3 pt-3">
                                  {getPollsterQuotas(survey).map((quota, idx) => (
                                    <div key={idx}>
                                      <div className="grid grid-cols-4 gap-2">
                                        {quota.segments.map((segment, segIdx) => {
                                          const currentCount = segment.current || 0;
                                          const status = getQuotaStatus(
                                            currentCount,
                                            segment.target
                                          );
                                          const genderSymbol =
                                            quota.category.toLowerCase().includes('género') ||
                                            quota.category.toLowerCase().includes('sexo')
                                              ? segment.name.toLowerCase().includes("homs") ||
                                                segment.name.toLowerCase().includes("masc") ||
                                                segment.name.toLowerCase() === "h" ||
                                                segment.name.toLowerCase() === "m"
                                                ? "♂"
                                                : "♀"
                                              : null;

                                          return (
                                            <button
                                              key={`${idx}-${segIdx}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedQuotaSegment({
                                                  category: quota.category,
                                                  ...segment,
                                                  status, // Pasamos el status calculado para usar sus colores
                                                });
                                              }}
                                              className={`${status.bgColor} rounded-lg p-2 text-center border ${status.borderColor} flex flex-col justify-center items-center h-full min-h-[60px] shadow-sm hover:brightness-95 transition-all cursor-pointer`}
                                            >
                                              <div className="flex items-center justify-center gap-1 mb-1 w-full">
                                                {genderSymbol && (
                                                  <span className="text-sm font-bold text-[var(--text-secondary)]">
                                                    {genderSymbol}
                                                  </span>
                                                )}
                                                <span className="text-[10px] text-[var(--text-muted)] truncate w-full leading-tight">
                                                  {segment.name}
                                                </span>
                                              </div>
                                              <div
                                                className={`text-xs font-bold ${status.textColor}`}
                                              >
                                                {currentCount}/{segment.target}
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    
  {/* Modal de Detalle de Cuota */}
  <AnimatePresence>
    {selectedQuotaSegment && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--card-background)] w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-[var(--card-border)]"
        >
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-[var(--text-secondary)] text-sm font-medium uppercase tracking-wider mb-2">
                {selectedQuotaSegment.category}
              </h3>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {selectedQuotaSegment.name}
              </h2>
            </div>

            <div className="flex flex-col items-center justify-center mb-8">
              <div className={`text-4xl font-bold mb-2 ${selectedQuotaSegment.status.textColor}`}>
                {selectedQuotaSegment.current || 0}
                <span className="text-2xl text-[var(--text-muted)] font-normal">
                  /{selectedQuotaSegment.target}
                </span>
              </div>
              <div className="w-full h-3 bg-[var(--card-border)] rounded-full overflow-hidden">
                <div
                  className={`h-full ${selectedQuotaSegment.status.textColor.replace('text-', 'bg-')}`}
                  style={{
                    width: `${Math.min(
                      ((selectedQuotaSegment.current || 0) /
                        selectedQuotaSegment.target) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setSelectedQuotaSegment(null)}
              className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[var(--primary-dark)] transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

                    {/* Botones de acción - Enviados 1/3, Responder 2/3 */}
                    {/* Botones de acción - Enviados ~40%, Responder ~60% */}
                    <div className="grid grid-cols-5 gap-2">
                      {/* Botón Enviados (no mostrar para universal) - 2/5 */}
                      {!isUniversal && (
                        <motion.button
                          onClick={() => {
                            try {
                              const key = "cases:surveyId";
                              if (typeof window !== "undefined") {
                                window.sessionStorage?.setItem(key, String(survey._id));
                                window.localStorage?.setItem(key, String(survey._id));
                              }
                            } catch {}
                            router.push(`/dashboard/encuestas/${survey._id}/mis-casos`);
                          }}
                          className="col-span-2 bg-[var(--input-background)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] text-[var(--text-primary)] font-semibold py-2.5 rounded-xl transition-colors flex flex-col items-center justify-center gap-0.5"
                          whileTap={{ scale: 0.98 }}
                        >
                          <Send className="w-4 h-4 mb-0.5" />
                          <span className="text-xs">Enviados</span>
                        </motion.button>
                      )}
                      
                      {/* Botón Responder - 3/5 (o full si es universal) */}
                      <motion.button
                        onClick={() => handleResponder(survey)}
                        disabled={isLoading || isFinished}
                        data-tutorial={isUniversal ? "respond-button" : undefined}
                        className={`${isUniversal ? 'col-span-5' : 'col-span-3'} font-semibold py-2.5 rounded-xl transition-colors shadow-lg flex flex-col items-center justify-center gap-0.5 ${
                          isFinished
                            ? "bg-[var(--disabled-bg)] text-[var(--disabled-text)] cursor-not-allowed"
                            : "bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white"
                        }`}
                        whileTap={!isFinished && !isLoading ? { scale: 0.98 } : {}}
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            {isUniversal ? (
                              <TestTube2 className="w-4 h-4 mb-0.5" />
                            ) : (
                              <Play className="w-4 h-4 mb-0.5" />
                            )}
                            <span className="text-xs">
                              {isUniversal ? "Probar App" : isFinished ? "Finalizada" : "Responder"}
                            </span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
