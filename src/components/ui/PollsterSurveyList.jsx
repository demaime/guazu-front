import { useState, useEffect } from "react";
import {
  Play,
  Calendar,
  Users,
  Target,
  Clock,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { OfflineDownloadButton } from "./OfflineIndicator";
import { surveyService } from "@/services/survey.service";

export function PollsterSurveyList({
  surveys,
  isFinished = false,
  currentUser,
}) {
  const router = useRouter();
  const [loadingStates, setLoadingStates] = useState({});
  const [progressData, setProgressData] = useState({}); // { surveyId: { assignedCases, completedAnswers, ... } }
  const [progressLoading, setProgressLoading] = useState({});

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

      console.log(`📊 Loading progress for ${surveys.length} surveys`);

      // Preparar loading states solo para encuestas nuevas
      const newLoadingStates = {};
      surveys.forEach((survey) => {
        newLoadingStates[survey._id] = true;
      });
      setProgressLoading(newLoadingStates);

      // Cargar progreso para cada encuesta
      const progressPromises = surveys.map(async (survey) => {
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
          console.error(
            `❌ Error loading progress for survey ${survey._id}:`,
            error
          );

          // Fallback simple sin logging excesivo
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

        console.log(`✅ Progress loaded for ${results.length} surveys`);
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
  }, [JSON.stringify(surveys?.map((s) => s._id)?.sort()), currentUser?._id]); // Dependencia estable

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

  const handleResponder = async (surveyData) => {
    const buttonKey = surveyData._id;
    setLoadingStates((prev) => ({ ...prev, [buttonKey]: true }));

    try {
      router.push(`/dashboard/encuestas/${surveyData._id}/responder`);
    } catch (error) {
      console.error("Error al navegar:", error);
    } finally {
      // Remove loading state after navigation
      setTimeout(() => {
        setLoadingStates((prev) => ({ ...prev, [buttonKey]: false }));
      }, 1000);
    }
  };

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

  return (
    <div className="space-y-4">
      {surveys.map((survey, index) => {
        const surveyInfo = survey.surveyInfo || {};
        const timeRemaining = getTimeRemaining(surveyInfo.endDate);
        const assignedCases = getAssignedCases(survey);
        const completedAnswers = getCompletedAnswers(survey);
        const progress = calculateProgress(survey);
        const progressValue =
          assignedCases > 0 ? (completedAnswers / assignedCases) * 100 : 0;
        const isLoading = loadingStates[survey._id];
        const isProgressLoading = progressLoading[survey._id];

        return (
          <motion.div
            key={survey._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[var(--card-background)] rounded-xl shadow-sm border border-[var(--card-border)] overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            {/* Header con gradiente de estado */}
            <div
              className={`bg-gradient-to-r ${getStatusColor(
                survey
              )} p-4 text-white`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-3">
                  <h3 className="text-lg font-semibold leading-tight mb-1">
                    {getLocalizedText(survey.survey?.title) || "Sin título"}
                  </h3>
                  <p className="text-white/90 text-sm line-clamp-2">
                    {getLocalizedText(
                      survey.survey?.description,
                      "Sin descripción"
                    )}
                  </p>
                </div>
                {!isFinished && (
                  <div className="flex flex-col items-end text-right">
                    <div className="text-xs font-medium opacity-90">
                      {timeRemaining}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contenido principal */}
            <div className="p-4">
              {/* Información de fechas */}
              <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] mb-3">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
                  <span>{formatDate(surveyInfo.startDate)}</span>
                </div>
                <div className="flex items-center">
                  <span>hasta {formatDate(surveyInfo.endDate)}</span>
                </div>
              </div>

              {/* Progreso */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--text-secondary)] flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    Progreso
                  </span>
                  <span className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                    {isProgressLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-[var(--primary)] rounded-full animate-spin" />
                        <span className="text-[var(--text-muted)]">
                          Cargando...
                        </span>
                      </>
                    ) : (
                      <>
                        {completedAnswers} / {assignedCases} casos asignados
                      </>
                    )}
                  </span>
                </div>
                <div className="w-full bg-[var(--card-border)] rounded-full h-2">
                  <div
                    className={`${
                      isProgressLoading
                        ? "bg-gray-300 animate-pulse"
                        : getProgressColor(survey)
                    } h-2 rounded-full transition-all duration-500`}
                    style={{
                      width: isProgressLoading
                        ? "30%"
                        : `${Math.min(progressValue, 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {isProgressLoading
                    ? "Calculando progreso..."
                    : `${progress} completado`}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                {/* Botón principal - Responder */}
                <motion.button
                  onClick={() => handleResponder(survey)}
                  disabled={isLoading || isFinished || progressValue >= 100}
                  className={`
                    flex-1 flex items-center justify-center gap-2 h-12 px-4 rounded-lg font-medium text-sm transition-all duration-200
                    ${
                      isFinished || progressValue >= 100
                        ? "bg-[var(--disabled-bg)] text-[var(--disabled-text)] cursor-not-allowed"
                        : "bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white shadow-sm hover:shadow-md active:scale-[0.98]"
                    }
                  `}
                  whileTap={
                    !isFinished && !isLoading && progressValue < 100
                      ? { scale: 0.98 }
                      : {}
                  }
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      {progressValue >= 100
                        ? "Completada"
                        : isFinished
                        ? "Finalizada"
                        : "Responder"}
                    </>
                  )}
                </motion.button>

                {/* Botón de mapa */}
                <motion.button
                  onClick={() =>
                    router.push(`/dashboard/encuestas/${survey._id}/progreso`)
                  }
                  className="flex items-center justify-center w-12 h-12 bg-[var(--input-background)] hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] rounded-lg transition-all duration-200"
                  whileTap={{ scale: 0.98 }}
                  title="Ver análisis"
                >
                  <MapPin className="w-5 h-5" />
                </motion.button>

                {/* Botón offline */}
                <div className="flex items-center h-12">
                  <OfflineDownloadButton
                    surveyId={survey._id}
                    surveyData={survey}
                    size="sm"
                    variant="outline"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
