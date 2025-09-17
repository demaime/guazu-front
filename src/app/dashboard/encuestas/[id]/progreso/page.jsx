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
} from "lucide-react";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { QuotaProgress } from "@/components/QuotaProgress";
import { motion } from "framer-motion";
import ExportControls from "@/components/ExportControls/ExportControls";
import SurveyMap from "@/components/SurveyMap";
import CasesTable from "@/components/CasesTable";
import MapModal from "@/components/MapModal";

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

        console.log("Normalized Survey:", normalizedSurvey);
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
    <div className="h-full overflow-y-auto py-4 px-4">
      <div className="flex flex-col h-full space-y-4">
        {/* Header y botón de volver */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              Análisis de Encuesta:{" "}
              {survey.survey?.title?.es || survey.survey?.title}
            </h1>
            <p className="text-[var(--text-secondary)]">
              {survey.survey?.description?.es ||
                survey.survey?.description ||
                "Sin descripción"}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-[var(--hover-bg)] transition-colors"
          >
            Volver
          </button>
        </div>

        {/* Top Stats Cards - Total Respuestas y Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-[var(--primary-light)] text-[var(--primary)] dark:bg-[rgba(128,145,245,0.2)] dark:text-[var(--primary-light)]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm text-[var(--text-secondary)]">
                Total Respuestas
              </h3>
              <p className="text-2xl font-semibold">{totalAnswers}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-[var(--secondary-light)] text-[var(--secondary)] dark:bg-[rgba(167,151,253,0.2)] dark:text-[var(--secondary-light)]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm text-[var(--text-secondary)]">Meta</h3>
              <p className="text-2xl font-semibold">{surveyInfo.target || 0}</p>
            </div>
          </div>
        </div>

        {/* Progreso general */}
        <div className="card p-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--card-border)]">
            <BarChart4 className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-xl font-semibold">Progreso Total</h2>
          </div>
          <div className="pt-3">
            <div className="flex items-center py-2">
              <div className="flex-1 flex items-center gap-3">
                <div className="w-full bg-[var(--input-background)] rounded-full h-3">
                  <div
                    className="bg-[var(--primary)] h-3 rounded-full"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
                <div className="flex items-center gap-2 text-sm min-w-24">
                  <span className="text-[var(--primary)]">
                    {completionRate}%
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    ({totalAnswers}/{surveyInfo.target || 0})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Avance de Cuotas - Segmentos en tarjetas separadas */}
        <div>
          <h2 className="text-xl font-bold mb-4">Avance de Cuotas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {survey.surveyInfo?.quotas &&
            survey.surveyInfo.quotas.length > 0 ? (
              survey.surveyInfo.quotas.map((quota, qIndex) => (
                <div key={qIndex} className="card p-4">
                  <h3 className="font-medium text-lg border-b border-[var(--card-border)] pb-2 mb-3">
                    {quota.category}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {quota.segments.map((segment, sIndex) => {
                      const segmentPercentage =
                        segment.target > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (segment.current / segment.target) * 100
                              )
                            )
                          : 0;
                      const remaining = Math.max(
                        0,
                        segment.target - segment.current
                      );

                      return (
                        <div key={sIndex} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{segment.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {segment.current}/{segment.target}
                              </span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  segmentPercentage >= 100
                                    ? "bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82]"
                                    : "bg-[rgba(63,81,181,0.2)] text-[var(--primary)] dark:bg-[rgba(128,145,245,0.3)] dark:text-[var(--primary-light)]"
                                }`}
                              >
                                {segmentPercentage}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-full bg-[var(--input-background)] rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  segmentPercentage >= 100
                                    ? "bg-[#00c853]"
                                    : "bg-[var(--primary)]"
                                }`}
                                style={{ width: `${segmentPercentage}%` }}
                              ></div>
                            </div>
                            {remaining > 0 && (
                              <span className="text-xs bg-[rgba(244,67,54,0.2)] text-[#f44336] dark:bg-[rgba(244,67,54,0.3)] dark:text-[#ff867c] px-1.5 py-0.5 rounded whitespace-nowrap">
                                Faltan: {remaining}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : quotaSummary.length > 0 ? (
              quotaSummary.map((quota, qIndex) => (
                <div key={qIndex} className="card p-4">
                  <h3 className="font-medium text-lg border-b border-[var(--card-border)] pb-2 mb-3">
                    {quota.category}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {quota.segments.map((segment, sIndex) => {
                      // Use target values from the defined segment target, not an estimate
                      const target = segment.target || 0;
                      const segmentPercentage =
                        target > 0
                          ? Math.min(
                              100,
                              Math.round((segment.current / target) * 100)
                            )
                          : 0;
                      const remaining = Math.max(0, target - segment.current);

                      return (
                        <div key={sIndex} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{segment.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {segment.current}/{target}
                              </span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  segmentPercentage >= 100
                                    ? "bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82]"
                                    : "bg-[rgba(63,81,181,0.2)] text-[var(--primary)] dark:bg-[rgba(128,145,245,0.3)] dark:text-[var(--primary-light)]"
                                }`}
                              >
                                {segmentPercentage}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-full bg-[var(--input-background)] rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  segmentPercentage >= 100
                                    ? "bg-[#00c853]"
                                    : "bg-[var(--primary)]"
                                }`}
                                style={{ width: `${segmentPercentage}%` }}
                              ></div>
                            </div>
                            {remaining > 0 && (
                              <span className="text-xs bg-[rgba(244,67,54,0.2)] text-[#f44336] dark:bg-[rgba(244,67,54,0.3)] dark:text-[#ff867c] px-1.5 py-0.5 rounded whitespace-nowrap">
                                Faltan: {remaining}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full card p-4 text-center">
                <p className="text-[var(--text-secondary)]">
                  No hay datos de cuotas disponibles
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progreso Individual por Pollster */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--primary)]" />
            Progreso Individual por Pollster
          </h2>

          {/* Resumen del progreso de pollsters */}
          {!pollsterProgressLoading && pollsterProgress.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="card p-3 text-center">
                <div className="text-sm text-[var(--text-secondary)]">
                  Total Pollsters
                </div>
                <div className="text-xl font-semibold text-[var(--primary)]">
                  {pollsterProgress.length}
                </div>
              </div>
              <div className="card p-3 text-center">
                <div className="text-sm text-[var(--text-secondary)]">
                  Completados
                </div>
                <div className="text-xl font-semibold text-[#00c853]">
                  {
                    pollsterProgress.filter(
                      (p) =>
                        p.assignedCases > 0 &&
                        p.completedAnswers >= p.assignedCases
                    ).length
                  }
                </div>
              </div>
              <div className="card p-3 text-center">
                <div className="text-sm text-[var(--text-secondary)]">
                  En Progreso
                </div>
                <div className="text-xl font-semibold text-[#ffc107]">
                  {
                    pollsterProgress.filter(
                      (p) =>
                        p.assignedCases > 0 &&
                        p.completedAnswers < p.assignedCases
                    ).length
                  }
                </div>
              </div>
            </div>
          )}

          {pollsterProgressLoading ? (
            <div className="card p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary)]"></div>
                <span className="text-[var(--text-secondary)]">
                  Cargando progreso individual...
                </span>
              </div>
            </div>
          ) : pollsterProgress.length > 0 ? (
            <div className="space-y-3">
              {/* Mostrar solo los primeros 5 pollsters */}
              {pollsterProgress.slice(0, 5).map((pollster, index) => {
                const progressPercentage =
                  pollster.assignedCases > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (pollster.completedAnswers / pollster.assignedCases) *
                            100
                        )
                      )
                    : 0;

                // Mantener visualización de progreso pero no como limitante
                const hasCompletedAssigned = progressPercentage >= 100;
                const remaining = Math.max(
                  0,
                  pollster.assignedCases - pollster.completedAnswers
                );

                return (
                  <div key={index} className="card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-base">
                        {pollster.pollsterName ||
                          `Pollster ${pollster.pollsterId}`}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {pollster.completedAnswers}/{pollster.assignedCases}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            hasCompletedAssigned
                              ? "bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82]"
                              : progressPercentage > 50
                              ? "bg-[rgba(255,193,7,0.2)] text-[#ffc107] dark:bg-[rgba(255,193,7,0.3)] dark:text-[#ffecb3]"
                              : "bg-[rgba(63,81,181,0.2)] text-[var(--primary)] dark:bg-[rgba(128,145,245,0.3)] dark:text-[var(--primary-light)]"
                          }`}
                        >
                          {progressPercentage}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[var(--input-background)] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            hasCompletedAssigned
                              ? "bg-[#00c853]"
                              : progressPercentage > 50
                              ? "bg-[#ffc107]"
                              : "bg-[var(--primary)]"
                          }`}
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>

                      {remaining > 0 && !hasCompletedAssigned && (
                        <span className="text-xs bg-[rgba(244,67,54,0.2)] text-[#f44336] dark:bg-[rgba(244,67,54,0.3)] dark:text-[#ff867c] px-2 py-1 rounded whitespace-nowrap">
                          Faltan: {remaining}
                        </span>
                      )}

                      {hasCompletedAssigned && (
                        <span className="text-xs bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82] px-2 py-1 rounded whitespace-nowrap">
                          ✓ Meta inicial alcanzada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Botón Ver Todos si hay más de 5 pollsters */}
              {pollsterProgress.length > 5 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setShowAllPollstersModal(true)}
                    className="text-[var(--primary)] hover:text-[var(--primary-dark)] text-sm font-medium hover:underline"
                  >
                    Ver todos ({pollsterProgress.length} encuestadores)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <Users className="w-8 h-8 text-[var(--text-secondary)]" />
                <p className="text-[var(--text-secondary)]">
                  No hay datos de progreso individual disponibles
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Los pollsters aparecerán aquí una vez que se les asignen casos
                </p>
              </div>
            </div>
          )}

          {/* Modal para ver todos los pollsters */}
          {showAllPollstersModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--card-background)] rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Progreso de Todos los Encuestadores (
                    {pollsterProgress.length})
                  </h2>
                  <button
                    onClick={() => setShowAllPollstersModal(false)}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pollsterProgress.map((pollster, index) => {
                      const progressPercentage =
                        pollster.assignedCases > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (pollster.completedAnswers /
                                  pollster.assignedCases) *
                                  100
                              )
                            )
                          : 0;

                      const hasCompletedAssigned = progressPercentage >= 100;
                      const remaining = Math.max(
                        0,
                        pollster.assignedCases - pollster.completedAnswers
                      );

                      return (
                        <div
                          key={index}
                          className="border border-[var(--card-border)] rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-base">
                              {pollster.pollsterName ||
                                `Pollster ${pollster.pollsterId}`}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {pollster.completedAnswers}/
                                {pollster.assignedCases}
                              </span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  hasCompletedAssigned
                                    ? "bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82]"
                                    : progressPercentage > 50
                                    ? "bg-[rgba(255,193,7,0.2)] text-[#ffc107] dark:bg-[rgba(255,193,7,0.3)] dark:text-[#ffecb3]"
                                    : "bg-[rgba(63,81,181,0.2)] text-[var(--primary)] dark:bg-[rgba(128,145,245,0.3)] dark:text-[var(--primary-light)]"
                                }`}
                              >
                                {progressPercentage}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[var(--input-background)] rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  hasCompletedAssigned
                                    ? "bg-[#00c853]"
                                    : progressPercentage > 50
                                    ? "bg-[#ffc107]"
                                    : "bg-[var(--primary)]"
                                }`}
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>

                            {remaining > 0 && !hasCompletedAssigned && (
                              <span className="text-xs bg-[rgba(244,67,54,0.2)] text-[#f44336] dark:bg-[rgba(244,67,54,0.3)] dark:text-[#ff867c] px-2 py-1 rounded whitespace-nowrap">
                                Faltan: {remaining}
                              </span>
                            )}

                            {hasCompletedAssigned && (
                              <span className="text-xs bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82] px-2 py-1 rounded whitespace-nowrap">
                                ✓ Meta inicial alcanzada
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Últimas respuestas */}
        <div className="card p-4 flex-1">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--card-border)]">
            <FileSpreadsheet className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-xl font-semibold">Últimas Respuestas</h2>
          </div>

          {latestAnswers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="px-2 py-3 text-left">Encuestador</th>
                    <th className="px-2 py-3 text-left">Fecha</th>
                    <th className="px-2 py-3 text-left">Cuotas</th>
                    <th className="px-2 py-3 text-left">Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {latestAnswers.map((answer) => (
                    <tr
                      key={answer._id}
                      className="border-b border-[var(--card-border)] hover:bg-[var(--hover-bg)]"
                    >
                      <td className="px-2 py-3">
                        {answer.fullName || "Anónimo"}
                      </td>
                      <td className="px-2 py-3">
                        {new Date(answer.createdAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-3">
                        {answer.quotaAnswers ? (
                          <div className="flex flex-col">
                            {Object.entries(answer.quotaAnswers).map(
                              ([key, value]) => (
                                <span key={key} className="text-xs">
                                  <span className="font-medium">{key}:</span>{" "}
                                  {value}
                                </span>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">
                            Sin cuotas
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        {answer.lat && answer.lng ? (
                          <button
                            onClick={() =>
                              openMapModal(
                                answer.lat,
                                answer.lng,
                                answer.fullName,
                                answer.createdAt
                              )
                            }
                            className="text-[var(--primary)] hover:underline cursor-pointer"
                          >
                            Ver mapa
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">
                            No disponible
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-4 text-[var(--text-secondary)]">
              <p>No hay respuestas registradas aún.</p>
            </div>
          )}
        </div>

        {/* Información de la encuesta */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold pb-3 border-b border-[var(--card-border)]">
            Información de la Encuesta
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-[var(--input-background)] text-[var(--text-secondary)]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Período</p>
                <p>
                  {(() => {
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
                      return "Fechas no disponibles";
                    }
                  })()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-[var(--input-background)] text-[var(--text-secondary)]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Actualizado
                </p>
                <p>{new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección del Mapa Completo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--card-border)]">
            <Map className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-xl font-semibold">Mapa de Casos</h2>
          </div>

          {/* Solo mostrar filtros si no es encuestador */}
          {user?.role !== "POLLSTER" && uniqueUsers.length > 0 && (
            <div className="mt-4 mb-6">
              <h3 className="text-lg font-semibold mb-4">
                Filtrar por encuestador
              </h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2">
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
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span>Mostrar todos</span>
                </label>

                {uniqueUsers.map((userItem) => (
                  <label
                    key={userItem.id}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(userItem.id)}
                      onChange={() => handleUserSelection(userItem.id)}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span>{userItem.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[var(--card-background)] rounded-lg shadow-lg p-6">
            <SurveyMap
              survey={survey}
              answers={answers}
              mostrarTodos={user?.role === "POLLSTER" ? true : mostrarTodos}
              selectedUsers={
                user?.role === "POLLSTER" ? [user._id] : selectedUsers
              }
            />
          </div>
        </motion.div>

        {/* Tabla de casos debajo del mapa */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="card p-0"
        >
          <CasesTable
            survey={survey}
            answers={answers}
            mostrarTodos={user?.role === "POLLSTER" ? true : mostrarTodos}
            selectedUsers={
              user?.role === "POLLSTER" ? [user._id] : selectedUsers
            }
          />
        </motion.div>

        {/* Sección de Exportar Datos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--card-border)]">
            <FileSpreadsheet className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-xl font-semibold">Exportar Datos</h2>
          </div>
          <div className="mt-4">
            <ExportControls answers={answers} titleSurvey={survey?.title} />
          </div>
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
