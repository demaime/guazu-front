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
  FileInput,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { surveyService } from "@/services/survey.service";
import { useTutorial } from "@/contexts/TutorialContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Loader } from "@/components/ui/Loader";

// ID fijo de la encuesta universal visible para todos los pollsters
const UNIVERSAL_SURVEY_ID = "db7aa030-81f6-11f0-b66d-053a86e645bd";

export function PollsterSurveyList({
  surveys,
  isFinished = false,
  currentUser,
  refreshToken = 0,
  downloadStatus = {},
}) {
  const router = useRouter();
  const { shouldStartTutorial } = useTutorial();
  const [loadingStates, setLoadingStates] = useState({});
  const [progressData, setProgressData] = useState({}); // { surveyId: { assignedCases, completedAnswers, ... } }
  const [progressLoading, setProgressLoading] = useState({});
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [answersBySurvey, setAnswersBySurvey] = useState({});
  const [quotasLoading, setQuotasLoading] = useState({});

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

  const loadAnswersForSurvey = useCallback(async (surveyId) => {
    setQuotasLoading((prev) => ({ ...prev, [surveyId]: true }));
    try {
      const data = await surveyService.getSurveyWithAnswers(surveyId);
      const answers = data?.answers || [];
      setAnswersBySurvey((prev) => ({ ...prev, [surveyId]: answers }));
    } catch {
      setAnswersBySurvey((prev) => ({ ...prev, [surveyId]: [] }));
    } finally {
      setQuotasLoading((prev) => ({ ...prev, [surveyId]: false }));
    }
  }, []);

  const toggleQuotas = useCallback(
    (surveyId) => {
      setExpandedQuotas((prev) => {
        const next = !prev[surveyId];
        if (next && !answersBySurvey[surveyId]) {
          loadAnswersForSurvey(surveyId);
        }
        return { ...prev, [surveyId]: next };
      });
    },
    [answersBySurvey, loadAnswersForSurvey],
  );

  // Estado para el modal de prueba
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [surveyToTest, setSurveyToTest] = useState(null);

  const handleTestClick = (survey) => {
    setSurveyToTest(survey);
    setTestModalOpen(true);
  };

  const confirmTest = () => {
    if (!surveyToTest) return;
    try {
      const buttonKey = surveyToTest._id;
      setLoadingStates((prev) => ({ ...prev, [buttonKey]: true }));

      const key = "responder:surveyId";
      if (typeof window !== "undefined") {
        window.sessionStorage?.setItem(key, String(surveyToTest._id));
        window.localStorage?.setItem(key, String(surveyToTest._id));
      }
      router.push(`/dashboard/encuestas/responder?mode=test`);
    } catch {}
    setTestModalOpen(false);
  };

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
        "📚 [PollsterSurveyList] Tutorial activado - expandiendo encuesta de prueba",
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
          "🔄 Progress data already loaded for these surveys, skipping...",
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
        (survey) => survey._id !== UNIVERSAL_SURVEY_ID,
      );

      const progressPromises = surveysNeedingProgress.map(async (survey) => {
        try {
          const progressResponse = await surveyService.getPollsterProgress(
            survey._id,
            currentUser._id,
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
              error,
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
        (assignment) => assignment.pollsterId === currentUser._id,
      );
      if (assignment && assignment.assignedCases > 0) {
        return assignment.assignedCases;
      }
    }

    // Buscar en surveyInfo.pollsterAssignments
    if (survey.surveyInfo?.pollsterAssignments) {
      const assignment = survey.surveyInfo.pollsterAssignments.find(
        (assignment) => assignment.pollsterId === currentUser._id,
      );
      if (assignment && assignment.assignedCases > 0) {
        return assignment.assignedCases;
      }
    }

    // Fallback: Intentar en participants (para compatibilidad)
    if (survey.participants?.pollsterAssignments) {
      const assignment = survey.participants.pollsterAssignments.find(
        (assignment) => assignment.pollsterId === currentUser._id,
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
    [router],
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

  const getPollsterQuotas = (survey) => {
    if (!currentUser?._id) {
      return null;
    }

    const quotaAssignments =
      survey?.participants?.quotaAssignments ||
      survey?.surveyInfo?.quotaAssignments ||
      [];



    if (!quotaAssignments || quotaAssignments.length === 0) {
      return null;
    }

    const assignment = quotaAssignments.find(
      (qa) => String(qa.pollsterId) === String(currentUser._id),
    );



    if (!assignment || !assignment.quotas || assignment.quotas.length === 0) {
      return null;
    }

    const quotaMetadata = survey?.surveyInfo?.quotaMetadata;
    let dimensions = quotaMetadata?.dimensions || [];

    if (dimensions.length === 0 && survey?.surveyDefinition?.modulos) {
      const detected = [];
      survey.surveyDefinition.modulos.forEach((modulo) => {
        modulo.preguntas?.forEach((pregunta) => {
          if (pregunta.tipo === "cuota-genero") {
            detected.push({
              category: "género",
              questionId: pregunta.value || pregunta.id,
              options: (pregunta.opciones || []).map(
                (opt) => opt.value || opt.text,
              ),
            });
          } else if (pregunta.tipo === "cuota-edad") {
            detected.push({
              category: "edad",
              questionId: pregunta.value || pregunta.id,
              options: (pregunta.opciones || []).map(
                (opt) => opt.value || opt.text,
              ),
            });
          }
        });
      });
      dimensions = detected;
    }

    const genderDimension = dimensions.find((d) => d.category === "género");
    const ageDimension = dimensions.find((d) => d.category === "edad");
    const isCrossTable = !!genderDimension && !!ageDimension;
    const genderQuestionId = genderDimension?.questionId;
    const ageQuestionId = ageDimension?.questionId;

    const progress = {};
    const allAnswers = answersBySurvey[survey._id] || [];
    const pollsterAnswers =
      allAnswers.filter(
        (answer) => String(answer.userId) === String(currentUser._id),
      ) || [];

    pollsterAnswers.forEach((answer) => {
      const answerData = answer.answer || {};
      const genderValue = genderQuestionId
        ? answerData[genderQuestionId]
        : null;
      const ageValue = ageQuestionId ? answerData[ageQuestionId] : null;

      if (isCrossTable) {
        if (genderValue && ageValue) {
          const key = `${genderValue} - ${ageValue}`;
          progress[key] = (progress[key] || 0) + 1;
        }
      } else {
        if (genderValue) {
          progress[genderValue] = (progress[genderValue] || 0) + 1;
        } else if (ageValue) {
          progress[ageValue] = (progress[ageValue] || 0) + 1;
        }
      }
    });

    const genderOptionsSet = new Set();
    const ageOptionsSet = new Set();
    assignment.quotas?.forEach((quota) => {
      quota.segments?.forEach((segment) => {
        const parts = segment.name.split(" - ");
        if (parts.length === 2) {
          genderOptionsSet.add(parts[0].trim());
          ageOptionsSet.add(parts[1].trim());
        } else if (parts.length === 1) {
          if (quota.category === "Género") {
            genderOptionsSet.add(parts[0].trim());
          } else if (quota.category === "Edad") {
            ageOptionsSet.add(parts[0].trim());
          }
        }
      });
    });
    const normalize = (s) =>
      typeof s === "string"
        ? s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
        : "";
    const genderNormSet = new Set(Array.from(genderOptionsSet).map(normalize));
    const ageNormSet = new Set(Array.from(ageOptionsSet).map(normalize));
    const progressSum = Object.values(progress).reduce((a, b) => a + b, 0);
    if (progressSum === 0 && pollsterAnswers.length > 0) {
      pollsterAnswers.forEach((answer) => {
        const vals = Object.values(answer.answer || {}).map((v) =>
          typeof v === "string" ? v : String(v),
        );
        let g = null;
        let a = null;
        for (const v of vals) {
          const nv = normalize(v);
          if (!g && genderNormSet.has(nv)) g = v;
          if (!a && ageNormSet.has(nv)) a = v;
          if (g && a) break;
        }
        if (isCrossTable) {
          if (g && a) {
            const key = `${g} - ${a}`;
            progress[key] = (progress[key] || 0) + 1;
          }
        } else {
          const single = g || a;
          if (single) {
            progress[single] = (progress[single] || 0) + 1;
          }
        }
      });

    }

    // Extraer todos los segmentos y agregar el progreso calculado
    const allSegments = [];
    assignment.quotas.forEach((quota) => {
      if (quota.segments && Array.isArray(quota.segments)) {
        quota.segments.forEach((segment) => {
          // Calcular el progreso real desde las respuestas
          const calculatedCurrent = Math.floor(progress[segment.name] || 0);



          // Detectar género y edad del nombre del segmento
          const nameParts = segment.name.split(" - ");

          if (nameParts.length === 2) {
            // Tabla cruzada: "Masculino - 18-35"
            allSegments.push({
              ...segment,
              current: calculatedCurrent, // Usar el progreso calculado en lugar del almacenado
              gender: nameParts[0],
              age: nameParts[1],
            });
          } else {
            // Tabla simple: solo género o edad
            // Determinar si es género o edad basándose en la categoría
            if (quota.category === "Género") {
              allSegments.push({
                ...segment,
                current: calculatedCurrent,
                gender: segment.name,
              });
            } else if (quota.category === "Edad") {
              allSegments.push({
                ...segment,
                current: calculatedCurrent,
                age: segment.name,
              });
            } else {
              // Categoría desconocida, agregar sin modificar
              allSegments.push({
                ...segment,
                current: calculatedCurrent,
              });
            }
          }
        });
      }
    });


    return allSegments.length > 0 ? allSegments : null;
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
      borderColor: "border-[var(--primary-light)]",
      status: "incomplete",
    };
  };

  // Analizar estructura de cuotas para determinar layout
  const analyzeQuotaStructure = (segments) => {
    if (!segments || segments.length === 0) {
      return { type: 'empty', segments: [] };
    }

    const hasGender = segments.some(s => s.gender);
    const hasAge = segments.some(s => s.age);
    const isCrossTable = hasGender && hasAge;

    if (isCrossTable) {
      // Extraer géneros y edades únicas, preservando el orden
      const genders = [...new Set(segments.map(s => s.gender).filter(Boolean))];
      const ages = [...new Set(segments.map(s => s.age).filter(Boolean))];
      return { type: 'cross', genders, ages, segments };
    }

    return { type: 'simple', segments };
  };

  // Renderizar una card individual de cuota
  const renderQuotaCard = (segment, idx, totalSegments = 0) => {
    const currentCount = segment.current || 0;
    const status = getQuotaStatus(currentCount, segment.target);

    // Determinar el símbolo de género
    const genderSymbol = segment.gender
      ? segment.gender.toLowerCase().includes("masc") ||
        segment.gender.toLowerCase().includes("homb") ||
        segment.gender.toLowerCase() === "m" ||
        segment.gender.toLowerCase() === "h"
        ? "♂"
        : "♀"
      : null;

    // Ajustar tamaño de texto de edad según número de columnas
    const ageTextSize = totalSegments === 4 ? "text-[9px]" : "text-[10px]";

    return (
      <button
        key={idx}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedQuotaSegment({
            ...segment,
            status,
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
          <span className={`${ageTextSize} text-[var(--text-muted)] truncate w-full leading-tight`}>
            {segment.age || segment.name}
          </span>
        </div>
        <div className={`text-xs font-bold ${status.textColor}`}>
          {currentCount}/{segment.target}
        </div>
      </button>
    );
  };

  // Renderizar cuotas simples con grid adaptativo
  const renderSimpleQuotas = (segments) => {
    // Determinar número de columnas basado en cantidad de segmentos
    const getGridCols = (count) => {
      if (count <= 4) return `grid-cols-${count}`;
      // Para 5+, usar 4 columnas y dejar que fluya en múltiples filas
      return 'grid-cols-4';
    };

    return (
      <div className={`grid ${getGridCols(segments.length)} gap-2`}>
        {segments.map((segment, idx) => renderQuotaCard(segment, idx, segments.length))}
      </div>
    );
  };

  // Renderizar cuotas dobles (género × edad) agrupadas por género
  const renderCrossTableQuotas = (structure) => {
    const { genders, ages } = structure;

    // Determinar columnas por fila de edad
    const getAgeGridCols = (ageCount) => {
      if (ageCount <= 4) return `grid-cols-${ageCount}`;
      // Para 5+ edades, usar 4 columnas y permitir wrap
      return 'grid-cols-4';
    };

    return (
      <div className="space-y-3">
        {genders.map(gender => {
          const genderSegments = structure.segments.filter(s => s.gender === gender);
          return (
            <div key={gender}>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 px-1">
                {gender}
              </div>
              <div className={`grid ${getAgeGridCols(ages.length)} gap-2`}>
                {genderSegments.map((segment, idx) => renderQuotaCard(segment, `${gender}-${idx}`, ages.length))}
              </div>
            </div>
          );
        })}
      </div>
    );
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
            {
              /* Header - Removed colored banner, now integrated into card body */
              isUniversal && (
                <div
                  onClick={() => toggleUniversalSurvey()}
                  className="bg-slate-700/10 p-2 px-4 cursor-pointer select-none border-b border-[var(--card-border)]"
                >
                  <div className="flex justify-between items-center">
                    <div className="text-[var(--text-primary)] text-xs font-medium flex items-center gap-2">
                      <TestTube2 className="w-4 h-4" />
                      <span>Encuesta de Prueba</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUniversalSurvey();
                        }}
                        className="text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] p-1 rounded transition-colors"
                        title={isUniversalMinimized ? "Expandir" : "Minimizar"}
                      >
                        {isUniversalMinimized ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

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
                    {/* Orange header block for styling match if needed, but going for clean look first as per instructions to remove banner */}

                    {!isUniversal && (
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                            {getLocalizedText(survey.survey?.title) ||
                              "Sin título"}
                          </h3>
                          {survey.survey?.description && (
                            <p className="text-xs text-[var(--text-secondary)]">
                              {getLocalizedText(survey.survey?.description)}
                            </p>
                          )}
                        </div>
                        {/* Optional: Add status badge here if needed in future */}
                      </div>
                    )}

                    {isUniversal && (
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <p className="text-xs text-[var(--text-secondary)]">
                            Para probar funcionalidades de la app
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contenido principal */}
                  <div className="px-4 pb-4">
                    {!isUniversal && downloadStatus[survey._id] === "pending" && (
                      <div className="mb-3">
                        <div className="h-1 bg-[var(--card-border)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--primary)] animate-pulse w-1/2" />
                        </div>
                      </div>
                    )}
                    {/* Stats Grid - Estilo mockup */}
                    {!isUniversal && (
                      <div className="space-y-6 mb-6">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Tiempo restante */}
                          {(() => {
                            const timeStr = timeRemaining || "Sin fecha";
                            // Basic parsing to match the mockup style "3 dias restantes"
                            const parts = timeStr.split(" ");
                            const value = parts[0];
                            const unit = parts[1] || "";

                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[var(--text-secondary)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Clock className="w-4 h-4 text-[var(--text-secondary-light)]" />
                                </div>
                                <div>
                                  <div className="text-xs text-[var(--text-secondary)]">
                                    Tiempo restante
                                  </div>
                                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                                    {value} {unit}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Casos completados */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[var(--primary)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-[var(--primary)]" />
                            </div>
                            <div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                Casos
                              </div>
                              <div className="text-sm font-semibold text-[var(--text-primary)]">
                                {isProgressLoading ? "..." : completedAnswers}
                                <span className="text-[var(--text-muted)] font-normal">
                                  {" "}
                                  / {assignedCases}
                                </span>
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
                                  : isUniversal
                                    ? "bg-indigo-500"
                                    : "bg-[var(--primary)]"
                              } rounded-full transition-all duration-500`}
                              style={{
                                width: isProgressLoading
                                  ? "30%"
                                  : `${Math.min(progressValue, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="absolute right-0 -top-5 text-xs font-semibold text-[var(--text-secondary)]">
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
                          className="w-full flex items-center justify-between p-2 hover:bg-[var(--hover-bg)] transition-colors text-left border-b border-[var(--card-border)] focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-[var(--primary)]/10 rounded-lg">
                              <Target className="w-3.5 h-3.5 text-[var(--primary)] text-opacity-80" />
                            </div>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                              Cuotas
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {quotasLoading[survey._id] && (
                              <Loader size="sm" className="scale-90" />
                            )}
                            {expandedQuotas[survey._id] ? (
                              <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                            )}
                          </div>
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
                              <div className="p-3 pt-2">
                                {quotasLoading[survey._id] ? (
                                  <div className="text-xs py-8 text-center text-[var(--text-muted)] italic">
                                    cargando cuotas...
                                  </div>
                                ) : (() => {
                                  const quotaSegments = getPollsterQuotas(survey) || [];
                                  
                                  if (!quotaSegments.length) {
                                    return (
                                      <div className="py-8 text-center text-[var(--text-muted)] italic text-xs">
                                        No hay cuotas definidas para esta encuesta
                                      </div>
                                    );
                                  }

                                  const structure = analyzeQuotaStructure(quotaSegments);

                                  return structure.type === 'cross'
                                    ? renderCrossTableQuotas(structure)
                                    : renderSimpleQuotas(quotaSegments);
                                })()}
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
                                  Cuota
                                </h3>
                                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                                  {selectedQuotaSegment.gender &&
                                  selectedQuotaSegment.age
                                    ? `${selectedQuotaSegment.gender} - ${selectedQuotaSegment.age}`
                                    : selectedQuotaSegment.name}
                                </h2>
                              </div>

                              <div className="flex flex-col items-center justify-center mb-8">
                                <div
                                  className={`text-4xl font-bold mb-2 ${selectedQuotaSegment.status.textColor}`}
                                >
                                  {selectedQuotaSegment.current || 0}
                                  <span className="text-2xl text-[var(--text-muted)] font-normal">
                                    /{selectedQuotaSegment.target}
                                  </span>
                                </div>
                                <div className="w-full h-3 bg-[var(--card-border)] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${selectedQuotaSegment.status.textColor.replace("text-", "bg-")}`}
                                    style={{
                                      width: `${Math.min(
                                        ((selectedQuotaSegment.current || 0) /
                                          selectedQuotaSegment.target) *
                                          100,
                                        100,
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
                    {/* Botones de acción - 3 columnas */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Botón Probar - No mostrar en universal */}
                      {!isUniversal && (
                        <button
                          onClick={() => handleTestClick(survey)}
                          className="bg-[var(--input-background)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] text-[var(--text-current)] font-semibold py-3.5 rounded-xl transition-colors flex flex-col items-center justify-center gap-1"
                        >
                          <div className="flex items-center justify-center">
                            <Eye className="w-4 h-4" />
                          </div>
                          <span className="text-xs">Probar</span>
                        </button>
                      )}

                      {/* Botón Enviados */}
                      {!isUniversal && (
                        <button
                          onClick={() => {
                            try {
                              const key = "cases:surveyId";
                              if (typeof window !== "undefined") {
                                window.sessionStorage?.setItem(
                                  key,
                                  String(survey._id),
                                );
                                window.localStorage?.setItem(
                                  key,
                                  String(survey._id),
                                );
                              }
                            } catch {}
                            router.push(
                              `/dashboard/encuestas/${survey._id}/mis-casos`,
                            );
                          }}
                          className="bg-[var(--input-background)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] text-[var(--text-current)] font-semibold py-3.5 rounded-xl transition-colors flex flex-col items-center justify-center gap-1"
                        >
                          <FileInput className="w-4 h-4" />
                          <span className="text-xs">Enviados</span>
                        </button>
                      )}

                      {/* Botón Responder */}
                      <button
                        onClick={() => handleResponder(survey)}
                        disabled={isLoading || isFinished}
                        data-tutorial={
                          isUniversal ? "respond-button" : undefined
                        }
                        className={`${isUniversal ? "col-span-3" : ""} bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg flex flex-col items-center justify-center gap-1 ${
                          isFinished
                            ? "bg-[var(--disabled-bg)] text-[var(--disabled-text)] cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <div className="flex items-center justify-center">
                              {isUniversal ? (
                                <TestTube2 className="w-4 h-4" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </div>
                            <span className="text-xs">
                              {isUniversal
                                ? "Probar App"
                                : isFinished
                                  ? "Finalizada"
                                  : "Responder"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        );
      })}

      <ConfirmModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        onConfirm={confirmTest}
        title="Modo Prueba"
        confirmText="Comenzar Prueba"
        cancelText="Cancelar"
        variant="primary"
        alertMessage="Esta herramienta es solo para verificar el correcto funcionamiento del formulario."
      >
        <p className="font-medium mb-2">¿Querés probar esta encuesta?</p>
        <p className="text-sm">
          Estás a punto de ingresar al modo de prueba. Las respuestas que envíes
          <span className="font-bold text-blue-500"> NO se guardarán </span>
          como casos reales ni afectarán las cuotas.
        </p>
      </ConfirmModal>
    </div>
  );
}
