"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  Percent,
  FileSpreadsheet,
  Calendar,
  Clock,
  BarChart4,
  Map,
  Target,
  TrendingUp,
  Activity,
  Eye,
  Download,
  MapPin,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { QuotaProgress } from "@/components/QuotaProgress";
import { motion, AnimatePresence } from "framer-motion";
import ExportControls from "@/components/ExportControls/ExportControls";
import SurveyMap from "@/components/SurveyMap";
import CasesTable from "@/components/CasesTable";
import MapModal from "@/components/MapModal";
import CollapsingSection from "@/components/ui/CollapsingSection";
import StatCard from "@/components/ui/StatCard";
import ProgressBar from "@/components/ui/ProgressBar";
import VirtualizedList from "@/components/ui/VirtualizedList";

// Función auxiliar para formatear fechas considerando diferentes formatos
const formatSurveyDate = (dateValue) => {
  if (!dateValue) return null;

  try {
    // Si es un objeto Date, lo usamos directamente
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }

    // Si es un string ISO
    if (typeof dateValue === "string") {
      // Intentar parsear la fecha
      const date = new Date(dateValue);

      // Verificar si la fecha es válida
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      }

      // Si tiene formato MongoDB ISODate o similar (puede tener el formato: ISODate("2023-05-15T00:00:00.000Z"))
      const isoMatch = dateValue.match(/"([^"]+)"/);
      if (isoMatch && isoMatch[1]) {
        const extracted = isoMatch[1];
        const dateFromExtracted = new Date(extracted);
        if (!isNaN(dateFromExtracted.getTime())) {
          return dateFromExtracted.toLocaleDateString(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
        }
      }
    }

    // Si es un objeto con formato { $date: timestamp }
    if (typeof dateValue === "object" && dateValue !== null) {
      if (dateValue.$date) {
        // Puede ser timestamp en milisegundos o una cadena ISO
        const timestamp =
          typeof dateValue.$date === "number"
            ? dateValue.$date
            : Date.parse(dateValue.$date);

        if (!isNaN(timestamp)) {
          return new Date(timestamp).toLocaleDateString(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
        }
      }
    }

    // Si llegamos aquí, no pudimos formatear la fecha
    console.warn("No se pudo formatear la fecha:", dateValue);
    return null;
  } catch (error) {
    console.error("Error formateando la fecha:", error, dateValue);
    return null;
  }
};

// Función para normalizar las fechas de una encuesta
const normalizeSurveyDates = (surveyData) => {
  if (!surveyData) return surveyData;

  try {
    // Crear una copia para no mutar el objeto original
    const normalizedSurvey = JSON.parse(JSON.stringify(surveyData));

    // Verificar si existe surveyInfo y tiene fechas
    if (normalizedSurvey.surveyInfo) {
      // Normalizar startDate si existe
      if (normalizedSurvey.surveyInfo.startDate) {
        try {
          const parsedDate = new Date(normalizedSurvey.surveyInfo.startDate);
          // Solo reemplazar si es una fecha válida
          if (!isNaN(parsedDate.getTime())) {
            normalizedSurvey.surveyInfo.startDate = parsedDate;
          }
        } catch (e) {
          console.warn("Error parsing startDate:", e);
        }
      }

      // Normalizar endDate si existe
      if (normalizedSurvey.surveyInfo.endDate) {
        try {
          const parsedDate = new Date(normalizedSurvey.surveyInfo.endDate);
          // Solo reemplazar si es una fecha válida
          if (!isNaN(parsedDate.getTime())) {
            normalizedSurvey.surveyInfo.endDate = parsedDate;
          }
        } catch (e) {
          console.warn("Error parsing endDate:", e);
        }
      }
    }

    return normalizedSurvey;
  } catch (error) {
    console.error("Error normalizing survey dates:", error);
    return surveyData; // Devolver original en caso de error
  }
};

export default function AnalisisEncuesta() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollsterProgress, setPollsterProgress] = useState([]);
  const [pollsterProgressLoading, setPollsterProgressLoading] = useState(false);
  const [showAllPollstersModal, setShowAllPollstersModal] = useState(false);

  // Estados para el mapa
  const [mostrarTodos, setMostrarTodos] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [user, setUser] = useState(null);

  // Estados para el modal del mapa individual
  const [showMapModal, setShowMapModal] = useState(false);
  const [modalMapData, setModalMapData] = useState({
    lat: null,
    lng: null,
    pollsterName: "",
    date: null,
  });
  const [expandedAnswer, setExpandedAnswer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    // Comprobar permisos - solo admin y supervisor pueden ver análisis
    const checkPermissions = () => {
      const user = authService.getUser();
      if (!user) {
        router.replace("/login");
        return false;
      }

      // Pollsters no pueden acceder a esta página
      if (user.role === "POLLSTER") {
        router.replace("/dashboard/encuestas");
        return false;
      }

      return true;
    };

    const fetchSurveyData = async () => {
      try {
        // Verificar permisos primero
        if (!checkPermissions()) return;

        setIsLoading(true);
        const surveyId = params.id;

        // Obtener información del usuario
        const userData = authService.getUser();
        setUser(userData);

        // Fetch survey data with answers in one call
        const surveyData = await surveyService.getSurveyWithAnswers(surveyId);

        // Normalizar las fechas antes de establecer el estado
        const normalizedSurvey = normalizeSurveyDates(surveyData.survey);

        setSurvey(normalizedSurvey);
        setAnswers(surveyData.answers || []);

        setIsLoading(false);
      } catch (err) {
        console.error("Error loading survey analysis data:", err);
        setError("No se pudo cargar los datos de análisis de la encuesta.");
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchSurveyData();
    }
  }, [params.id, router]);

  // Efecto para cargar progreso individual de pollsters
  useEffect(() => {
    const fetchPollsterProgress = async () => {
      if (!survey || !params.id) return;

      try {
        setPollsterProgressLoading(true);
        const progressData = await surveyService.getAllPollsterProgress(
          params.id
        );

        // El backend devuelve un objeto con pollsterProgress array
        setPollsterProgress(progressData.pollsterProgress || []);
      } catch (error) {
        // En caso de error, establecer array vacío
        setPollsterProgress([]);
      } finally {
        setPollsterProgressLoading(false);
      }
    };

    if (survey) {
      fetchPollsterProgress();
    }
  }, [survey, params.id]);

  if (isLoading) {
    return <LoaderWrapper text="Preparando análisis" />;
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2 text-red-500">Error</h2>
          <p className="text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Encuesta no encontrada</h2>
          <p className="text-[var(--text-secondary)]">
            No se pudo encontrar la encuesta solicitada.
          </p>
          <button
            onClick={() => router.push("/dashboard/encuestas")}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Volver a encuestas
          </button>
        </div>
      </div>
    );
  }

  const surveyInfo = survey.surveyInfo || {};
  const totalAnswers = answers.length;
  const completionRate =
    surveyInfo.target && surveyInfo.target > 0
      ? Math.round((totalAnswers / surveyInfo.target) * 100)
      : 0;
  // Ya no calculamos remainingRate basado en completionRate porque puede ser > 100%

  // Ordenar las respuestas por fecha (más recientes primero)
  const sortedAnswers = [...answers].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Tomar solo las 5 respuestas más recientes para mostrar
  const latestAnswers = sortedAnswers.slice(0, 5);

  // Preparar resumen de cuotas - Workaround due to missing survey.surveyInfo.quotas
  const quotaSummary = [];
  const dynamicQuotas = {}; // Structure: { "Category": Set("Segment1", "Segment2") }
  const answerCounts = {}; // Structure: { "Category": { "Segment": count } }

  // 1. Calculate counts and discover categories/segments from answers
  answers.forEach((answer) => {
    if (answer.quotaAnswers) {
      Object.entries(answer.quotaAnswers).forEach(([category, segmentName]) => {
        // Discover structure
        if (!dynamicQuotas[category]) {
          dynamicQuotas[category] = new Set();
        }
        dynamicQuotas[category].add(segmentName);

        // Count occurrences
        if (!answerCounts[category]) {
          answerCounts[category] = {};
        }
        if (!answerCounts[category][segmentName]) {
          answerCounts[category][segmentName] = 0;
        }
        answerCounts[category][segmentName]++;
      });
    }
  });

  // 2. Build quotaSummary based on discovered structure and counts
  Object.entries(dynamicQuotas).forEach(([category, segmentSet]) => {
    const segmentsData = [];
    segmentSet.forEach((segmentName) => {
      segmentsData.push({
        name: segmentName,
        current: answerCounts[category]?.[segmentName] || 0,
        // target: undefined - Target info is missing
      });
    });

    // Sort segments alphabetically for consistent order
    segmentsData.sort((a, b) => a.name.localeCompare(b.name));

    // Add to summary if the category has counts
    if (segmentsData.some((s) => s.current > 0)) {
      quotaSummary.push({
        category: category,
        // totalCurrent/totalTarget/progressPercent cannot be accurately calculated without targets
        segments: segmentsData,
      });
    }
  });

  // Sort categories alphabetically
  quotaSummary.sort((a, b) => a.category.localeCompare(b.category));

  // Funciones para el manejo del mapa
  const handleUserSelection = (userId) => {
    setSelectedUsers((prev) => {
      const newSelection = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      return newSelection;
    });
    setMostrarTodos(false);
  };

  const openMapModal = (lat, lng, pollsterName, date) => {
    setModalMapData({
      lat,
      lng,
      pollsterName,
      date,
    });
    setShowMapModal(true);
  };

  const closeMapModal = () => {
    setShowMapModal(false);
    setModalMapData({
      lat: null,
      lng: null,
      pollsterName: "",
      date: null,
    });
  };

  // Obtener encuestadores únicos para los filtros del mapa
  const uniqueUsers = answers.reduce((acc, answer) => {
    if (!acc.find((u) => u.id === answer.userId)) {
      acc.push({
        id: answer.userId,
        name: answer.fullName || `Encuestador ${answer.userId}`,
      });
    }
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Modern Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-primary rounded-2xl p-6 border border-[var(--card-border)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
            <Activity className="w-8 h-8 text-[var(--primary)]" />
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              Análisis
            </h1>
          </div>
        </motion.div>

        {/* Survey Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CollapsingSection
            title="Información de la Encuesta"
            icon={Calendar}
            variant="default"
            defaultExpanded={true}
          >
            <div className="space-y-6">
              {/* Encuesta Details */}
              <div className="bg-[var(--input-background)] rounded-xl p-6">
                <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
                  {survey?.survey?.title || "Título no disponible"}
                </h1>
                {survey?.survey?.description && (
                  <div>
                    <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                        Descripción
                      </h3>
                      <p className="text-[var(--text-secondary)] text-base leading-relaxed">
                        {survey.survey.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Survey Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Período de Ejecución"
                  value={(() => {
                    const startDateFormatted = formatSurveyDate(
                      surveyInfo?.startDate
                    );
                    const endDateFormatted = formatSurveyDate(
                      surveyInfo?.endDate
                    );

                    if (startDateFormatted && endDateFormatted) {
                      return `${startDateFormatted} - ${endDateFormatted}`;
                    } else if (startDateFormatted) {
                      return `Desde: ${startDateFormatted}`;
                    } else if (endDateFormatted) {
                      return `Hasta: ${endDateFormatted}`;
                    } else {
                      return "No definido";
                    }
                  })()}
                  icon={Calendar}
                  variant="glass"
                />

                <StatCard
                  title="Meta Objetivo"
                  value={(surveyInfo.target || 0).toLocaleString()}
                  icon={Target}
                  variant="glass"
                  subtitle={
                    surveyInfo.target
                      ? "respuestas objetivo"
                      : "Sin límite definido"
                  }
                />

                <StatCard
                  title="Última Actualización"
                  value={new Date().toLocaleDateString()}
                  subtitle={new Date().toLocaleTimeString()}
                  icon={Clock}
                  variant="glass"
                />
              </div>
            </div>
          </CollapsingSection>
        </motion.div>

        {/* Modern Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            title="Total Respuestas"
            value={totalAnswers.toLocaleString()}
            icon={FileSpreadsheet}
            variant="primary"
            subtitle={`${Math.round(
              (totalAnswers / Math.max(surveyInfo.target || 1, 1)) * 100
            )}% del objetivo`}
          />

          <StatCard
            title="Meta Objetivo"
            value={(surveyInfo.target || 0).toLocaleString()}
            icon={Target}
            variant="secondary"
            subtitle={`${Math.max(
              0,
              (surveyInfo.target || 0) - totalAnswers
            ).toLocaleString()} restantes`}
          />

          <StatCard
            title="Encuestadores Activos"
            value={pollsterProgress.length}
            icon={Users}
            variant="success"
            subtitle={`${
              pollsterProgress.filter((p) => p.completedAnswers > 0).length
            } con respuestas`}
          />

          <StatCard
            title="Tasa de Finalización"
            value={`${completionRate}%`}
            icon={TrendingUp}
            variant={
              completionRate >= 100
                ? "success"
                : completionRate >= 75
                ? "warning"
                : "glass"
            }
            subtitle={
              completionRate >= 100 ? "¡Objetivo alcanzado!" : "En progreso"
            }
          />
        </motion.div>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CollapsingSection
            title="Progreso General"
            icon={BarChart4}
            variant="glass"
            defaultExpanded={true}
          >
            <div className="space-y-6">
              <ProgressBar
                current={totalAnswers}
                target={surveyInfo.target || 0}
                label="Progreso hacia el objetivo"
                animated={true}
              />

              {/* Additional progress metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-[var(--input-background)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {totalAnswers > 0 && surveyInfo.target
                      ? Math.round(
                          (totalAnswers /
                            Math.max(
                              1,
                              Math.ceil(
                                (new Date() -
                                  new Date(
                                    surveyInfo.startDate || Date.now()
                                  )) /
                                  (1000 * 60 * 60 * 24)
                              )
                            )) *
                            100
                        ) / 100
                      : "0"}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    Respuestas por día promedio
                  </div>
                </div>

                <div className="text-center p-4 bg-[var(--input-background)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {
                      pollsterProgress.filter(
                        (p) =>
                          p.assignedCases > 0 &&
                          p.completedAnswers >= p.assignedCases
                      ).length
                    }
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    Encuestadores que completaron su meta
                  </div>
                </div>

                <div className="text-center p-4 bg-[var(--input-background)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {pollsterProgress.reduce(
                      (total, p) =>
                        total +
                        Math.max(0, p.assignedCases - p.completedAnswers),
                      0
                    )}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    Respuestas pendientes asignadas
                  </div>
                </div>
              </div>
            </div>
          </CollapsingSection>
        </motion.div>

        {/* Quota Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <CollapsingSection
            title="Avance de Cuotas"
            icon={Percent}
            variant="default"
            defaultExpanded={true}
            headerContent={
              (survey.surveyInfo?.quotas?.length ||
                quotaSummary.length > 0) && (
                <div className="text-sm text-[var(--text-secondary)]">
                  {survey.surveyInfo?.quotas?.length || quotaSummary.length}{" "}
                  categorías
                </div>
              )
            }
          >
            {survey.surveyInfo?.quotas &&
            survey.surveyInfo.quotas.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {survey.surveyInfo.quotas.map((quota, qIndex) => (
                  <motion.div
                    key={qIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * qIndex }}
                    className="glass-primary rounded-xl p-6 border border-[var(--card-border)]"
                  >
                    <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[var(--primary)]"></div>
                      {quota.category}
                    </h3>
                    <div className="space-y-4">
                      {quota.segments.map((segment, sIndex) => (
                        <ProgressBar
                          key={sIndex}
                          current={segment.current}
                          target={segment.target}
                          label={segment.name}
                          animated={true}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : quotaSummary.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {quotaSummary.map((quota, qIndex) => (
                  <motion.div
                    key={qIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * qIndex }}
                    className="glass-primary rounded-xl p-6 border border-[var(--card-border)]"
                  >
                    <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[var(--primary)]"></div>
                      {quota.category}
                    </h3>
                    <div className="space-y-4">
                      {quota.segments.map((segment, sIndex) => (
                        <ProgressBar
                          key={sIndex}
                          current={segment.current}
                          target={segment.target || 0}
                          label={segment.name}
                          animated={true}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--input-background)] rounded-full flex items-center justify-center">
                  <Percent className="w-8 h-8 text-[var(--text-secondary)]" />
                </div>
                <p className="text-[var(--text-secondary)] text-lg">
                  No hay datos de cuotas disponibles
                </p>
                <p className="text-[var(--text-secondary)] text-sm mt-2">
                  Las cuotas aparecerán aquí una vez configuradas
                </p>
              </div>
            )}
          </CollapsingSection>
        </motion.div>

        {/* Individual Pollster Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <CollapsingSection
            title="Progreso Individual por Encuestador"
            icon={Users}
            variant="default"
            defaultExpanded={true}
            headerContent={
              pollsterProgress.length > 0 && (
                <div className="text-sm text-[var(--text-secondary)]">
                  {pollsterProgress.length} encuestadores
                </div>
              )
            }
          >
            {pollsterProgressLoading ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="loader" style={{ "--size": "32px" }}></div>
                  <span className="text-[var(--text-secondary)]">
                    Cargando progreso individual...
                  </span>
                </div>
              </div>
            ) : pollsterProgress.length > 0 ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    title="Total Encuestadores"
                    value={pollsterProgress.length}
                    icon={Users}
                    variant="glass"
                  />
                  <StatCard
                    title="Completados"
                    value={
                      pollsterProgress.filter(
                        (p) =>
                          p.assignedCases > 0 &&
                          p.completedAnswers >= p.assignedCases
                      ).length
                    }
                    icon={Target}
                    variant="success"
                  />
                  <StatCard
                    title="En Progreso"
                    value={
                      pollsterProgress.filter(
                        (p) =>
                          p.assignedCases > 0 &&
                          p.completedAnswers < p.assignedCases
                      ).length
                    }
                    icon={Activity}
                    variant="warning"
                  />
                </div>

                {/* Virtualized Pollster List */}
                {console.log("Datos actuales del progreso:", pollsterProgress)}
                <VirtualizedList
                  items={pollsterProgress.map((pollster, index) => ({
                    id: pollster.pollsterId || index,
                    pollsterName: pollster.pollsterName,
                    completedAnswers: pollster.completedAnswers,
                    assignedCases: pollster.assignedCases,
                    progressPercentage:
                      pollster.assignedCases > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (pollster.completedAnswers /
                                pollster.assignedCases) *
                                100
                            )
                          )
                        : 0,
                  }))}
                  renderItem={(pollster) => (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="glass-primary p-4 rounded-xl border border-[var(--card-border)]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                          <h3 className="font-semibold text-lg text-[var(--text-primary)]">
                            {pollster.pollsterName?.startsWith("Pollster ")
                              ? "Usuario eliminado"
                              : pollster.pollsterName}
                          </h3>
                          {pollster.pollsterName?.startsWith("Pollster ") && (
                            <span className="text-sm text-[var(--text-secondary)] italic">
                              Id: {pollster.id}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {pollster.completedAnswers}/{pollster.assignedCases}
                          </span>
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              pollster.progressPercentage >= 100
                                ? "bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82]"
                                : pollster.progressPercentage >= 75
                                ? "bg-[rgba(255,193,7,0.2)] text-[#ffc107] dark:bg-[rgba(255,193,7,0.3)] dark:text-[#ffecb3]"
                                : "bg-[rgba(63,81,181,0.2)] text-[var(--primary)] dark:bg-[rgba(128,145,245,0.3)] dark:text-[var(--primary-light)]"
                            }`}
                          >
                            {pollster.progressPercentage}%
                          </span>
                        </div>
                      </div>
                      <ProgressBar
                        current={pollster.completedAnswers}
                        target={pollster.assignedCases}
                        showNumbers={false}
                        animated={true}
                      />
                    </motion.div>
                  )}
                  searchable={true}
                  searchPlaceholder="Buscar encuestador..."
                  searchKeys={["pollsterName"]}
                  filterable={true}
                  filters={[
                    {
                      key: "progressPercentage",
                      placeholder: "Filtrar por estado",
                      options: [
                        { value: "completed", label: "Completados (100%)" },
                        { value: "inProgress", label: "En progreso (1-99%)" },
                        { value: "notStarted", label: "Sin comenzar (0%)" },
                      ],
                    },
                  ]}
                  pageSize={8}
                  itemHeight={120}
                  emptyState={
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-[var(--text-secondary)]" />
                      <p className="text-[var(--text-secondary)] text-lg">
                        No se encontraron encuestadores
                      </p>
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--input-background)] rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-[var(--text-secondary)]" />
                </div>
                <p className="text-[var(--text-secondary)] text-lg">
                  No hay datos de progreso individual disponibles
                </p>
                <p className="text-[var(--text-secondary)] text-sm mt-2">
                  Los encuestadores aparecerán aquí una vez asignados
                </p>
              </div>
            )}
          </CollapsingSection>
        </motion.div>

        {/* Recent Answers Section - Combined with Cases Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <CollapsingSection
            title="Respuestas y Casos Detallados"
            icon={Eye}
            variant="default"
            defaultExpanded={true}
            headerContent={
              totalAnswers > 0 && (
                <div className="flex items-center gap-4">
                  <div className="text-sm text-[var(--text-secondary)]">
                    {totalAnswers} respuestas totales
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    Hacer clic para ver detalles
                  </div>
                </div>
              )
            }
          >
            {sortedAnswers.length > 0 ? (
              <div>
                <div className="space-y-4">
                  {sortedAnswers
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((answer) => (
                      <div
                        key={answer._id}
                        className={`glass-primary p-4 rounded-xl border border-[var(--card-border)] cursor-pointer transition-colors duration-200 ${
                          expandedAnswer === answer._id
                            ? "ring-2 ring-[var(--primary)]"
                            : "hover:bg-[var(--hover-bg)]"
                        }`}
                        onClick={() =>
                          setExpandedAnswer(
                            expandedAnswer === answer._id ? null : answer._id
                          )
                        }
                      >
                        {/* Contenido del caso que ya tienes */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white font-semibold">
                                {(answer.fullName || "A")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-[var(--text-primary)]">
                                  {answer.fullName || "Anónimo"}
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {new Date(answer.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {answer.quotaAnswers &&
                              Object.keys(answer.quotaAnswers).length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.entries(answer.quotaAnswers).map(
                                    ([key, value]) => (
                                      <span
                                        key={key}
                                        className="text-xs px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full"
                                      >
                                        <span className="font-medium">
                                          {key}:
                                        </span>{" "}
                                        {value}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                          </div>

                          <div className="flex items-center gap-2">
                            {answer.lat && answer.lng ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMapModal(
                                    answer.lat,
                                    answer.lng,
                                    answer.fullName,
                                    answer.createdAt
                                  );
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors text-sm"
                              >
                                <MapPin className="w-4 h-4" />
                                Ver ubicación
                              </button>
                            ) : (
                              <span className="text-xs text-[var(--text-secondary)] px-3 py-1.5 bg-[var(--input-background)] rounded-lg">
                                Sin ubicación
                              </span>
                            )}
                            <button className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                              {expandedAnswer === answer._id ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {expandedAnswer === answer._id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                                <div className="space-y-4">
                                  <h4 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-[var(--primary)]" />
                                    Respuestas Detalladas
                                  </h4>

                                  {answer.answer &&
                                  Object.keys(answer.answer).length > 0 ? (
                                    <div className="bg-[var(--input-background)] rounded-lg p-4 max-h-96 overflow-y-auto border-2 border-solid border-[var(--primary-light)]">
                                      <div className="grid gap-3">
                                        {Object.entries(answer.answer).map(
                                          (
                                            [questionKey, answerValue],
                                            index
                                          ) => (
                                            <div
                                              key={index}
                                              className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start p-3 bg-[var(--card-background)] rounded-lg border border-[var(--card-border)]"
                                            >
                                              <div>
                                                <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                                  Pregunta {index + 1}
                                                </div>
                                                <div className="text-base text-[var(--text-primary)] font-semibold p-3 bg-[var(--input-background)] rounded-md">
                                                  {questionKey}
                                                </div>
                                              </div>
                                              <div>
                                                <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                                  Respuesta
                                                </div>
                                                <div className="text-base text-[var(--text-primary)] p-3 bg-[var(--primary)]/10 rounded-md border-l-4 border-[var(--primary)]">
                                                  {typeof answerValue ===
                                                  "object"
                                                    ? Array.isArray(answerValue)
                                                      ? answerValue.join(", ")
                                                      : JSON.stringify(
                                                          answerValue,
                                                          null,
                                                          2
                                                        )
                                                    : answerValue ||
                                                      "Sin respuesta"}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 bg-[var(--input-background)] rounded-lg">
                                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-[var(--text-secondary)]" />
                                      <p className="text-[var(--text-secondary)]">
                                        No hay respuestas detalladas
                                      </p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className="bg-[var(--input-background)] rounded-lg p-3">
                                      <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                                        ID del Caso
                                      </div>
                                      <div className="text-sm font-mono text-[var(--text-primary)]">
                                        {answer._id}
                                      </div>
                                    </div>
                                    <div className="bg-[var(--input-background)] rounded-lg p-3">
                                      <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                                        Usuario ID
                                      </div>
                                      <div className="text-sm font-mono text-[var(--text-primary)]">
                                        {answer.userId}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-6">
                  <span className="text-sm text-[var(--text-secondary)]">
                    Mostrando {(currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, sortedAnswers.length)} de{" "}
                    {sortedAnswers.length} elementos
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-md bg-[var(--input-background)] hover:bg-[var(--hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      &lt;
                    </button>
                    <span className="text-sm text-[var(--text-secondary)]">
                      Página {currentPage} de{" "}
                      {Math.ceil(sortedAnswers.length / pageSize)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(
                            Math.ceil(sortedAnswers.length / pageSize),
                            p + 1
                          )
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(sortedAnswers.length / pageSize)
                      }
                      className="px-3 py-1 rounded-md bg-[var(--input-background)] hover:bg-[var(--hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--input-background)] rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-[var(--text-secondary)]" />
                </div>
                <p className="text-[var(--text-secondary)] text-lg">
                  No hay respuestas registradas aún
                </p>
                <p className="text-[var(--text-secondary)] text-sm mt-2">
                  Las respuestas aparecerán aquí conforme se completen las
                  encuestas
                </p>
              </div>
            )}
          </CollapsingSection>
        </motion.div>

        {/* Interactive Map Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <CollapsingSection
            title="Mapa Interactivo de Casos"
            icon={Map}
            variant="default"
            defaultExpanded={false}
            headerContent={
              <div className="text-sm text-[var(--text-secondary)]">
                {answers.filter((a) => a.lat && a.lng).length} ubicaciones
                registradas
              </div>
            }
          >
            <div className="space-y-6">
              {/* Map Filters */}
              {user?.role !== "POLLSTER" && uniqueUsers.length > 0 && (
                <div className="bg-[var(--input-background)] rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                    Filtros de visualización
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center space-x-2 px-3 py-2 bg-[var(--card-background)] rounded-lg border border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mostrarTodos}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          setMostrarTodos(newValue);
                          if (newValue) {
                            setSelectedUsers([]);
                          }
                        }}
                        className="w-4 h-4 text-[var(--primary)] bg-[var(--input-background)] border-[var(--card-border)] rounded focus:ring-[var(--primary)]"
                      />
                      <span className="text-sm font-medium">Mostrar todos</span>
                    </label>

                    {uniqueUsers.map((userItem) => (
                      <label
                        key={userItem.id}
                        className="flex items-center space-x-2 px-3 py-2 bg-[var(--card-background)] rounded-lg border border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(userItem.id)}
                          onChange={() => handleUserSelection(userItem.id)}
                          className="w-4 h-4 text-[var(--primary)] bg-[var(--input-background)] border-[var(--card-border)] rounded focus:ring-[var(--primary)]"
                        />
                        <span className="text-sm font-medium">
                          {userItem.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Map Container */}
              <div className="glass-primary rounded-xl overflow-hidden border border-[var(--card-border)]">
                <SurveyMap
                  survey={survey}
                  answers={answers}
                  mostrarTodos={user?.role === "POLLSTER" ? true : mostrarTodos}
                  selectedUsers={
                    user?.role === "POLLSTER" ? [user._id] : selectedUsers
                  }
                />
              </div>
            </div>
          </CollapsingSection>
        </motion.div>

        {/* Export Data Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <CollapsingSection
            title="Exportar Datos"
            icon={Download}
            variant="gradient"
            defaultExpanded={false}
            headerContent={
              <div className="text-sm text-white/80">
                Múltiples formatos disponibles
              </div>
            }
          >
            <div className="space-y-4">
              <div className="p-4 bg-[var(--input-background)] rounded-xl">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                  Opciones de exportación disponibles
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Descarga los datos de la encuesta en diferentes formatos para
                  análisis posterior.
                </p>
                <ExportControls
                  answers={answers}
                  titleSurvey={survey?.survey?.title}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                  title="Total de Respuestas"
                  value={answers.length.toLocaleString()}
                  icon={FileSpreadsheet}
                  variant="glass"
                  subtitle="Registros para exportar"
                />
                <StatCard
                  title="Última Exportación"
                  value="Nunca"
                  icon={Clock}
                  variant="glass"
                  subtitle="Historial no disponible"
                />
              </div>
            </div>
          </CollapsingSection>
        </motion.div>
      </div>

      {/* Modal para mapa individual */}
      <MapModal
        isOpen={showMapModal}
        onClose={closeMapModal}
        lat={modalMapData.lat}
        lng={modalMapData.lng}
        pollsterName={modalMapData.pollsterName}
        date={modalMapData.date}
      />
    </div>
  );
}
