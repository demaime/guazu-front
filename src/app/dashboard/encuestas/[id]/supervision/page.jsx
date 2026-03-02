"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Download,
  X,
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from "lucide-react";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import SurveyMap from "@/components/SurveyMap";
import SupervisionStats from "@/components/dashboard/SupervisionStats";
import PollsterFilter from "@/components/dashboard/PollsterFilter";
import DailyResponsesChart from "@/components/dashboard/DailyResponsesChart";
import PollsterAverageTime from "@/components/dashboard/PollsterAverageTime";
import QuotaProgressTable from "@/components/dashboard/QuotaProgressTable";
import ExportControls from "@/components/ExportControls/ExportControls";

// Colores para los encuestadores - Paleta ampliada con colores bien distinguibles
const markerColors = [
  "#FF0000", // Rojo brillante
  "#0066FF", // Azul royal
  "#00CC00", // Verde brillante
  "#FF6600", // Naranja
  "#9900FF", // Púrpura
  "#FF0099", // Rosa fucsia
  "#00CCCC", // Cian
  "#FFCC00", // Amarillo oro
  "#FF3366", // Rosa rojizo
  "#0099FF", // Azul cielo
  "#66FF00", // Verde lima
  "#FF9900", // Naranja dorado
  "#CC00FF", // Magenta
  "#00FF99", // Verde agua
  "#FF0066", // Rosa intenso
  "#3366FF", // Azul medio
  "#CCFF00", // Amarillo lima
  "#FF6699", // Rosa claro
  "#0033CC", // Azul oscuro
  "#CC6600", // Naranja oscuro
];

// Función auxiliar para formatear fechas
const formatSurveyDate = (dateValue) => {
  if (!dateValue) return null;

  try {
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }

    if (typeof dateValue === "string") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      }
    }

    if (typeof dateValue === "object" && dateValue !== null) {
      if (dateValue.$date) {
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
    const normalizedSurvey = JSON.parse(JSON.stringify(surveyData));

    if (normalizedSurvey.surveyInfo) {
      if (normalizedSurvey.surveyInfo.startDate) {
        try {
          const parsedDate = new Date(normalizedSurvey.surveyInfo.startDate);
          if (!isNaN(parsedDate.getTime())) {
            normalizedSurvey.surveyInfo.startDate = parsedDate;
          }
        } catch (e) {
          console.warn("Error parsing startDate:", e);
        }
      }

      if (normalizedSurvey.surveyInfo.endDate) {
        try {
          const parsedDate = new Date(normalizedSurvey.surveyInfo.endDate);
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
    return surveyData;
  }
};

export default function PanelDeSupervision() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para filtros
  const [selectedPollsters, setSelectedPollsters] = useState(["all"]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState("sec-casos-mapeados");
  const [navOpen, setNavOpen] = useState(false);
  const [pollsterProgressData, setPollsterProgressData] = useState(null);
  const [expandedPollsters, setExpandedPollsters] = useState({});
  const lastScrollY = useRef(0);
  const isClickScrolling = useRef(false);
  const sectionItems = useMemo(
    () => [
      { id: "sec-casos-mapeados", label: "Casos mapeados" },
      { id: "sec-encuestas-por-dia", label: "Encuestas por día" },
      { id: "sec-tiempo-promedio", label: "Tiempo promedio" },
      { id: "sec-progreso-cuotas", label: "Progreso de cuotas" },
    ],
    [],
  );

  useEffect(() => {
    const checkPermissions = () => {
      const user = authService.getUser();
      if (!user) {
        router.replace("/login");
        return false;
      }

      if (user.role === "POLLSTER") {
        router.replace("/dashboard/encuestas");
        return false;
      }

      return true;
    };

    const fetchSurveyData = async () => {
      try {
        if (!checkPermissions()) return;

        setIsLoading(true);
        const surveyId = params.id;

        const surveyData = await surveyService.getSurveyWithAnswers(surveyId);
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

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        if (!params.id) return;
        const data = await surveyService.getAllPollsterProgress(params.id);
        setPollsterProgressData(data);
      } catch (e) {}
    };
    fetchProgress();
  }, [params.id]);

  useEffect(() => {
    const updateActiveSection = () => {
      const scrollContainer = document.querySelector(".main-content");
      if (!scrollContainer) return;

      const scrollY = scrollContainer.scrollTop;

      // Skip if this is a programmatic scroll from clicking navbar
      if (isClickScrolling.current) {
        console.log("SCROLL_DEBUG: Skipping - programmatic scroll from click");
        lastScrollY.current = scrollY;
        return;
      }

      // Only update if user actually scrolled (not just a tiny browser adjustment)
      if (Math.abs(scrollY - lastScrollY.current) < 5) {
        return;
      }

      console.log("SCROLL_DEBUG: updateActiveSection, scrollY:", scrollY);
      lastScrollY.current = scrollY;

      const ids = sectionItems.map((s) => s.id);
      let current = ids[0];

      // Find which section we've scrolled past
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (!el) continue;

        if (scrollY >= el.offsetTop - 150) {
          current = ids[i];
          console.log(
            `SCROLL_DEBUG: Active section: ${current} (offsetTop: ${el.offsetTop})`,
          );
          break;
        }
      }

      setActiveSection(current);
    };

    const scrollContainer = document.querySelector(".main-content");
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", updateActiveSection, {
        passive: true,
      });
    }
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", updateActiveSection);
      }
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sectionItems]);

  const scrollToSection = (id) => {
    console.log("SCROLL_DEBUG: scrollToSection called with id:", id);

    const el = document.getElementById(id);
    if (!el) {
      console.log("SCROLL_DEBUG: Element not found:", id);
      return;
    }

    const scrollContainer = document.querySelector(".main-content");
    if (!scrollContainer) {
      console.log("SCROLL_DEBUG: Scroll container not found!");
      return;
    }

    // Mark that we're doing a programmatic scroll
    isClickScrolling.current = true;

    // Set active section immediately
    setActiveSection(id);
    console.log("SCROLL_DEBUG: Active section set to:", id);

    // Scroll to position
    const targetY = el.offsetTop - 150;
    console.log("SCROLL_DEBUG: Scrolling to:", targetY);
    scrollContainer.scrollTo({ top: targetY, behavior: "smooth" });

    // Re-enable scroll detection after animation completes
    setTimeout(() => {
      isClickScrolling.current = false;
      lastScrollY.current = scrollContainer.scrollTop;
      console.log("SCROLL_DEBUG: Re-enabled scroll detection");
    }, 1000);

    setNavOpen(false);
  };

  const togglePollsterExpand = (pollsterId) => {
    setExpandedPollsters((prev) => ({
      ...prev,
      [pollsterId]: !prev[pollsterId],
    }));
  };

  // Calcular métricas y datos procesados
  const processedData = useMemo(() => {
    console.log("🔄 useMemo processedData - EXECUTING");
    console.log("📊 Total answers:", answers?.length || 0);
    console.log("👥 Selected pollsters:", selectedPollsters);
    console.log("📅 Selected date:", selectedDate);

    if (!survey || !answers) {
      return {
        pollsters: [],
        dailyData: [],
        filteredAnswers: [],
        quotas: {},
        stats: {
          encuestadoresAsignados: 0,
          respuestasCompletadas: 0,
          diasRestantes: 0,
          meta: 0,
        },
        pollsterColors: {},
      };
    }

    const surveyInfo = survey.surveyInfo || {};

    // 1. Calcular encuestadores únicos y sus respuestas
    const pollsterMap = {};
    answers.forEach((answer) => {
      const userId = answer.userId;
      const userName = answer.fullName || `Encuestador ${userId}`;

      if (!pollsterMap[userId]) {
        pollsterMap[userId] = {
          id: userId,
          name: userName,
          responses: 0,
        };
      }
      pollsterMap[userId].responses++;
    });

    // Crear mapa de respuestas por encuestador para verificar coordenadas
    const pollsterAnswers = {};
    answers.forEach((answer) => {
      if (!pollsterAnswers[answer.userId]) {
        pollsterAnswers[answer.userId] = [];
      }
      pollsterAnswers[answer.userId].push(answer);
    });

    const pollstersArray = [
      {
        id: "all",
        name: "Todos",
        responses: answers.length,
        hasCoordinates: true,
      },
      ...Object.values(pollsterMap)
        .map((p) => ({
          ...p,
          hasCoordinates:
            pollsterAnswers[p.id]?.some(
              (ans) => ans.lat !== null && ans.lng !== null,
            ) || false,
        }))
        .sort((a, b) => b.responses - a.responses), // Ordenar de mayor a menor
    ];

    // Asignar colores a encuestadores
    const pollsterColors = {};
    pollstersArray.forEach((pollster, index) => {
      pollsterColors[pollster.id] = markerColors[index % markerColors.length];
    });

    // 2. Filtrar respuestas según filtros activos
    let filteredAnswers = answers;
    console.log("🔍 Initial answers:", filteredAnswers.length);

    if (!selectedPollsters.includes("all")) {
      filteredAnswers = filteredAnswers.filter((answer) =>
        selectedPollsters.includes(answer.userId),
      );
      console.log("👤 After pollster filter:", filteredAnswers.length);
    }

    if (selectedDate) {
      filteredAnswers = filteredAnswers.filter((answer) => {
        const date = new Date(answer.createdAt);
        const dateKey = date.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        });
        return dateKey === selectedDate;
      });
      console.log("📅 After date filter:", filteredAnswers.length);
    }

    console.log("✅ Final filtered answers:", filteredAnswers.length);
    console.log("📊 Selected pollsters:", selectedPollsters);

    // 3. Calcular respuestas por día (usando respuestas filtradas)
    const dailyMap = {};
    filteredAnswers.forEach((answer) => {
      const date = new Date(answer.createdAt);
      const dateKey = date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      });

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          responses: 0,
          fullDate: date,
        };
      }
      dailyMap[dateKey].responses++;
    });

    const dailyData = Object.values(dailyMap).sort(
      (a, b) => a.fullDate - b.fullDate,
    );

    // 4. Calcular progreso de cuotas desde las respuestas filtradas
    const quotaCounts = {};
    const quotaTargets = {};

    // Obtener targets de la encuesta
    if (surveyInfo.quotas && Array.isArray(surveyInfo.quotas)) {
      surveyInfo.quotas.forEach((quota) => {
        if (quota.segments && Array.isArray(quota.segments)) {
          quota.segments.forEach((segment) => {
            const key = `${quota.category}-${segment.name}`;
            quotaTargets[key] = segment.target || 0;
            quotaCounts[key] = 0;
          });
        }
      });
    }

    // Contar respuestas por cuota
    filteredAnswers.forEach((answer) => {
      if (answer.quotaAnswers) {
        Object.entries(answer.quotaAnswers).forEach(
          ([category, segmentName]) => {
            const key = `${category}-${segmentName}`;
            if (quotaCounts[key] !== undefined) {
              quotaCounts[key]++;
            } else {
              quotaCounts[key] = 1;
            }
          },
        );
      }
    });

    // Estructurar cuotas por categoría
    const quotasByCategory = {};
    Object.entries(quotaCounts).forEach(([key, current]) => {
      const [category, segmentName] = key.split("-");
      if (!quotasByCategory[category]) {
        quotasByCategory[category] = [];
      }
      quotasByCategory[category].push({
        name: segmentName,
        current,
        target: quotaTargets[key] || 0,
      });
    });

    // 5. Calcular días restantes
    const diasRestantes = surveyInfo.endDate
      ? Math.ceil(
          (new Date(surveyInfo.endDate) - new Date()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    // 6. Calcular tiempo promedio por encuestador
    const pollstersTimeData = Object.entries(pollsterMap)
      .map(([userId, data]) => {
        const userAnswers = answers.filter((a) => a.userId === userId);
        const totalTime = userAnswers.reduce(
          (sum, a) => sum + (a.time || 0),
          0,
        );
        const avgSeconds =
          userAnswers.length > 0 ? totalTime / userAnswers.length : 0;
        const avgMinutes = (avgSeconds / 60).toFixed(1);

        return {
          id: userId,
          name: data.name,
          avgMinutes: parseFloat(avgMinutes),
          totalResponses: data.responses,
          color: pollsterColors[userId],
        };
      })
      .sort((a, b) => b.avgMinutes - a.avgMinutes);

    return {
      pollsters: pollstersArray,
      dailyData,
      filteredAnswers,
      quotas: quotasByCategory,
      stats: {
        encuestadoresAsignados: selectedPollsters.includes("all")
          ? Object.keys(pollsterMap).length
          : selectedPollsters.length,
        respuestasCompletadas: filteredAnswers.length,
        diasRestantes,
        meta: surveyInfo.target || 0,
        isFiltered: !selectedPollsters.includes("all"),
      },
      pollsterColors,
      pollstersTime: pollstersTimeData,
    };
  }, [survey, answers, selectedPollsters, selectedDate]);

  // Handlers para filtros
  const togglePollster = (pollsterId) => {
    if (pollsterId === "all") {
      setSelectedPollsters(["all"]);
    } else {
      let newSelection = selectedPollsters.filter((id) => id !== "all");
      if (newSelection.includes(pollsterId)) {
        newSelection = newSelection.filter((id) => id !== pollsterId);
        if (newSelection.length === 0) newSelection = ["all"];
      } else {
        newSelection.push(pollsterId);
      }
      setSelectedPollsters(newSelection);
    }
    setSelectedDate(null);
  };

  // Handler para centrar el mapa en un encuestador
  const centerMapOnPollster = (pollsterId) => {
    console.log("🎯 Centering map on pollster:", pollsterId);
    console.log(
      "📍 Filtered answers for this pollster:",
      filteredAnswers.filter((a) => a.userId === pollsterId),
    );

    // Disparar evento personalizado para que el mapa se centre
    const event = new CustomEvent("centerOnPollster", {
      detail: { pollsterId },
    });
    window.dispatchEvent(event);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const clearFilters = () => {
    setSelectedPollsters(["all"]);
    setSelectedDate(null);
  };

  if (isLoading) {
    return <LoaderWrapper text="Cargando panel de supervisión" />;
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
  const {
    pollsters,
    dailyData,
    filteredAnswers,
    quotas,
    stats,
    pollsterColors,
    pollstersTime,
  } = processedData;

  const startDateFormatted = formatSurveyDate(surveyInfo?.startDate);
  const endDateFormatted = formatSurveyDate(surveyInfo?.endDate);
  const periodo =
    startDateFormatted && endDateFormatted
      ? `${startDateFormatted} - ${endDateFormatted}`
      : "No definido";

  return (
    <div className="min-h-screen bg-[var(--background)] p-3 sm:p-6">
      {/* Barra de filtros sticky */}
      {(!selectedPollsters.includes("all") || selectedDate) && (
        <div className="sticky top-0 z-50 backdrop-blur-md bg-[var(--primary-dark)]/80 shadow-xl mb-4 sm:mb-6 px-3 sm:px-6 py-3 rounded-b-2xl border-b-2 border-[var(--primary-light)]/30 transition-all">
          <div className="max-w-7xl mx-auto">
            {/* Header compacto siempre visible */}
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-white/90 flex-shrink-0" />
              <span className="text-sm font-medium text-white/90">
                Filtros aplicados:
              </span>
              <span className="px-3 py-1 bg-white/10 text-white rounded-full text-sm font-semibold">
                {selectedPollsters.includes("all")
                  ? selectedDate
                    ? 1
                    : 0
                  : selectedPollsters.length + (selectedDate ? 1 : 0)}
              </span>
              <button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="ml-auto p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-white/90 hover:text-white"
                title={
                  filtersExpanded ? "Contraer filtros" : "Expandir filtros"
                }
              >
                <span className="text-xs font-medium">
                  {filtersExpanded ? "Ocultar" : "Ver"}
                </span>
                {filtersExpanded ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>
            </div>

            {/* Filtros expandidos */}
            {filtersExpanded && (
              <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-white/20">
                {!selectedPollsters.includes("all") &&
                  selectedPollsters.map((id) => {
                    const pollster = pollsters.find((p) => p.id === id);
                    return (
                      <span
                        key={id}
                        className="px-3 py-1.5 bg-white/15 backdrop-blur-sm text-white rounded-full text-sm flex items-center gap-2 border border-white/20 hover:bg-white/25 transition-all shadow-sm"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-white/50"
                          style={{ backgroundColor: pollsterColors[id] }}
                        />
                        <span className="font-medium">{pollster?.name}</span>
                        <button
                          onClick={() => togglePollster(id)}
                          className="hover:scale-110 transition-transform"
                        >
                          <X
                            size={14}
                            className="opacity-80 hover:opacity-100"
                          />
                        </button>
                      </span>
                    );
                  })}
                {selectedDate && (
                  <span className="px-3 py-1.5 bg-white/15 backdrop-blur-sm text-white rounded-full text-sm flex items-center gap-2 border border-white/20 hover:bg-white/25 transition-all shadow-sm">
                    <span className="font-medium">📅 {selectedDate}</span>
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="hover:scale-110 transition-transform"
                    >
                      <X size={14} className="opacity-80 hover:opacity-100" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="ml-auto px-4 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/20 font-medium shadow-sm"
                >
                  Limpiar todos
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {/* Mobile: Stack everything vertically */}
          <div className="flex flex-col gap-4 sm:hidden mb-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
              <div className="flex-1">
                <h1 className="text-xl font-bold mb-1 text-[var(--text-primary)]">
                  {survey?.survey?.title || "Panel de Supervisión"}
                </h1>
                <p className="text-xs text-[var(--text-secondary)]">
                  Período: {periodo}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  router.push(`/dashboard/encuestas/${params.id}/editar-base`)
                }
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Editar Base
              </button>
              <ExportControls
                answers={answers}
                titleSurvey={survey?.survey?.title}
                surveyId={params.id}
                surveyData={survey}
              />
            </div>
          </div>

          {/* Desktop: Single row with proper spacing */}
          <div className="hidden sm:flex items-start gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors flex-shrink-0 mt-1"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
            <div className="flex-1 max-w-3xl">
              <h1 className="text-3xl font-bold mb-1 text-[var(--text-primary)]">
                {survey?.survey?.title || "Panel de Supervisión"}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Período: {periodo}
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() =>
                  router.push(`/dashboard/encuestas/${params.id}/editar-base`)
                }
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Editar Base
              </button>
              <ExportControls
                answers={answers}
                titleSurvey={survey?.survey?.title}
                surveyId={params.id}
                surveyData={survey}
              />
            </div>
          </div>
        </div>

        {/* Navbar de secciones */}
        <div className="sticky top-0 z-50 mb-4">
          <div className="bg-[var(--background)] px-2 py-2">
            <div className="sm:hidden relative">
              <button
                onClick={() => setNavOpen((v) => !v)}
                className="w-full px-3 py-2 rounded-lg hover:bg-[var(--hover-bg)]"
              >
                <span className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {sectionItems.find((s) => s.id === activeSection)?.label ||
                      sectionItems[0].label}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                </span>
              </button>
              {navOpen && (
                <div className="absolute left-0 right-0 mt-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-background)]/98 shadow-xl backdrop-blur-md">
                  {sectionItems.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => scrollToSection(s.id)}
                      className={`w-full text-left px-3 py-2 text-sm ${
                        activeSection === s.id
                          ? "font-bold text-[var(--primary)]"
                          : "font-medium text-[var(--text-secondary)]"
                      } hover:bg-[var(--hover-bg)]`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {sectionItems.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === s.id
                      ? "font-bold text-[var(--primary)] bg-[var(--primary)]/10"
                      : "font-medium text-[var(--text-secondary)]"
                  } hover:bg-[var(--hover-bg)]`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs Principales */}
        <SupervisionStats stats={stats} />

        {/* Mapa de Casos */}
        <div
          id="sec-casos-mapeados"
          className="mb-6 bg-[var(--card-background)] rounded-xl border border-[var(--card-border)] p-4 sm:p-6"
          style={{ scrollMarginTop: "110px" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <MapPin
                  size={20}
                  className="sm:w-6 sm:h-6 text-[var(--primary)]"
                />
                Casos Mapeados
              </h3>
              {surveyInfo?.requireGps ? (
                <span className="px-2 py-1 bg-[var(--success-bg)] text-[var(--success)] text-xs rounded-full border border-[var(--success-border)]">
                  GPS Obligatorio
                </span>
              ) : (
                <span className="px-2 py-1 bg-[var(--primary)]/20 text-[var(--primary)] text-xs rounded-full">
                  GPS Opcional
                </span>
              )}
            </div>

            <div className="bg-[var(--input-background)] rounded-lg px-3 sm:px-4 py-2">
              <div className="text-xl sm:text-2xl font-bold text-[var(--success)]">
                {filteredAnswers.length}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                casos visibles
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Filtros de Encuestadores */}
            <div className="lg:col-span-1">
              <PollsterFilter
                pollsters={pollsters}
                selectedPollsters={selectedPollsters}
                onTogglePollster={togglePollster}
                onCenterMap={centerMapOnPollster}
                colors={pollsterColors}
              />
            </div>

            {/* Mapa */}
            <div className="lg:col-span-2">
              <div className="bg-[var(--input-background)] rounded-lg border border-[var(--card-border)] overflow-hidden">
                <SurveyMap
                  survey={survey}
                  answers={filteredAnswers}
                  mostrarTodos={selectedPollsters.includes("all")}
                  selectedUsers={
                    selectedPollsters.includes("all") ? [] : selectedPollsters
                  }
                  height="400px"
                  userColors={pollsterColors}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Encuestas por Día */}
        <div id="sec-encuestas-por-dia" style={{ scrollMarginTop: "110px" }}>
          <DailyResponsesChart
            dailyData={dailyData}
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
          />
        </div>

        {/* Tiempo Promedio por Encuestador */}
        <div id="sec-tiempo-promedio" style={{ scrollMarginTop: "110px" }}>
          <PollsterAverageTime
            pollstersTime={pollstersTime}
            selectedPollsters={selectedPollsters}
          />
        </div>

        {/* Progreso de Cuotas */}
        <div id="sec-progreso-cuotas" style={{ scrollMarginTop: "110px" }}>
          <QuotaProgressTable survey={survey} answers={filteredAnswers} />
        </div>

        {pollsterProgressData?.pollsterProgress &&
          pollsterProgressData.pollsterProgress.length > 0 && (
            <div className="bg-[var(--card-background)] rounded-xl border border-[var(--card-border)] p-4 sm:p-6 mb-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-[var(--text-primary)]">
                Progreso por Encuestador
              </h3>
              <div className="space-y-3">
                {pollsterProgressData.pollsterProgress.map((p) => {
                  const isExpanded = !!expandedPollsters[p.pollsterId];
                  return (
                    <div
                      key={p.pollsterId}
                      className="rounded-lg border bg-[var(--input-background)] border-[var(--card-border)]"
                    >
                      <button
                        onClick={() => togglePollsterExpand(p.pollsterId)}
                        className="w-full p-3 flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {p.pollsterName ||
                                p.pollsterEmail ||
                                p.pollsterId}
                            </span>
                            <span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                              {p.completedAnswers}
                              <span className="text-[var(--text-secondary)] font-normal">
                                /{p.assignedCases}
                              </span>
                              <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                                ({p.progressPercentage}%)
                              </span>
                            </span>
                          </div>
                          <div className="mt-2 h-2 bg-[var(--card-background)] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                p.isCompleted
                                  ? "bg-[var(--success)]"
                                  : "bg-[var(--primary)]"
                              }`}
                              style={{
                                width: `${Math.min(
                                  p.progressPercentage || 0,
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[var(--text-secondary)] ml-3 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] ml-3 flex-shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3">
                          <QuotaProgressTable
                            survey={survey}
                            answers={answers}
                            pollsterId={p.pollsterId}
                            hideTitle
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Proyección */}
        <div className="p-4 sm:p-6 rounded-2xl border-2 bg-[var(--success-bg)] border-[var(--success-border)] mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-1 text-[var(--text-primary)]">
                Ritmo de Encuestas
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                Promedio:{" "}
                <span className="text-[var(--text-primary)] font-semibold">
                  {dailyData.length > 0
                    ? (
                        dailyData.reduce((sum, d) => sum + d.responses, 0) /
                        dailyData.length
                      ).toFixed(1)
                    : 0}
                </span>{" "}
                respuestas/día • Proyección:{" "}
                <span className="text-[var(--text-primary)] font-semibold">
                  {dailyData.length > 0
                    ? Math.round(
                        answers.length +
                          (dailyData.reduce((sum, d) => sum + d.responses, 0) /
                            dailyData.length) *
                            stats.diasRestantes,
                      )
                    : 0}
                </span>{" "}
                al cierre
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="px-4 py-2 bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)] rounded-full text-sm font-medium inline-flex items-center gap-2">
                <TrendingUp size={16} />
                En camino a la meta
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
