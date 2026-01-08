"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Copy,
  Trash2,
  Calendar,
  Play,
  Pause,
  FileText,
  Settings,
  BarChart3,
  Check,
  CheckCircle,
  Users,
  ClipboardList,
  Clock,
  X,
  AlertCircle,
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Eraser,
} from "lucide-react";
import { surveyService } from "@/services/survey.service";
import { toast } from "react-toastify";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Nueva clasificación: FINALIZADAS | ACTIVAS (recibiendo | pausada | pendiente)
const classifyStatus = (survey) => {
  const now = new Date();
  const startDate = survey.surveyInfo?.startDate ? new Date(survey.surveyInfo.startDate) : null;
  const endDate = survey.surveyInfo?.endDate ? new Date(survey.surveyInfo.endDate) : null;
  
  // 1. FINALIZADA: fecha de fin ya pasó
  if (endDate && now > endDate) {
    return {
      lifecycle: 'finalizada',
      label: 'Finalizada',
      color: 'gray',
      isFinished: true,
    };
  }
  
  // 2. ACTIVA: todavía en fecha
  // Detectar si está pausada (campo nuevo o status draft como fallback)
  const isPaused = survey.isPaused ?? false;
  
  // Detectar si está completa
  // Calcular basado en datos reales
  const hasQuestions = survey.survey?.pages?.some(page => 
    page.elements && page.elements.length > 0
  ) || false;
  const hasDates = !!(survey.surveyInfo?.startDate && survey.surveyInfo?.endDate);
  // Leer userIds desde surveyInfo, que es donde se guardan
  const pollsterIds = survey.surveyInfo?.userIds || survey.userIds || [];
  const hasPollsters = Array.isArray(pollsterIds) && pollsterIds.length > 0;
  const calculatedComplete = hasQuestions && hasDates && hasPollsters;
  
  // Solo usar el campo del backend si es TRUE, sino usar el cálculo
  // Esto asegura backward compatibility con encuestas viejas
  const isConfigurationComplete = survey.isConfigurationComplete === true 
    ? true 
    : calculatedComplete;
  
  // 2a. Pausada manualmente - AZUL
  if (isPaused) {
    return {
      lifecycle: 'pausada',
      label: 'Pausada',
      color: 'blue',
      isPaused: true,
    };
  }
  
  // 2b. Pendiente de configurar - AMARILLO
  if (!isConfigurationComplete) {
    return {
      lifecycle: 'pendiente',
      label: 'Pendiente de configurar',
      color: 'yellow',
      isPending: true,
    };
  }
  
  // 2c. Recibiendo casos (activa y completa)
  // Detectar si es programada (fecha futura)
  const isScheduled = startDate && now < startDate;
  
  return {
    lifecycle: 'recibiendo',
    label: 'Recibiendo casos',
    color: 'green',
    isActive: true,
    isScheduled: isScheduled, // Para mostrar relojito
  };
};

const formatDate = (value) => {
  if (!value) return "Sin fecha";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  iconOnly = false,
  className = "",
  iconSize = 16,
  hasAlert = false,
  isLoading = false,
  tooltip = "", // Nuevo parámetro
}) => {
  const variants = {
    default:
      "bg-[color:var(--card-background)] text-[color:var(--text-primary)] hover:bg-[color:var(--primary-light)] hover:text-black hover:border-[color:var(--primary-light)]/60 border border-[color:var(--card-border)]",
    danger:
      "bg-[color:var(--error-bg)] text-[color:var(--error-text)] hover:bg-[color:var(--error-bg)]/80 border border-[color:var(--error-border)]/70",
    success:
      "bg-[color:var(--success-bg)] text-[color:var(--success)] hover:bg-[color:var(--success-bg)]/80 border border-[color:var(--success-border)]/70",
    warning:
      "bg-[color:var(--warning-bg)] text-[color:var(--warning)] hover:bg-[color:var(--warning-bg)]/80 border border-[color:var(--warning-border)]/70",
    alert:
      "bg-yellow-500/10 text-[color:var(--text-primary)] hover:bg-yellow-500/20 border border-yellow-500/40",
  };

  const finalVariant = hasAlert ? "alert" : variant;

  return (
    <div className="relative group/tooltip">
      <button
        onClick={onClick}
        disabled={isLoading}
        className={`${
          iconOnly ? "px-2 py-1.5" : "px-3 py-1.5 md:px-4 md:py-2"
        } rounded-lg transition-all group relative flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer ${
          variants[finalVariant]
        } ${className} ${isLoading ? "opacity-70 cursor-wait" : ""}`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Icon size={iconSize} />
        )}
        {!iconOnly && <span>{label}</span>}
        {hasAlert && !isLoading && (
          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
            <AlertCircle size={10} className="text-white" strokeWidth={3} />
          </div>
        )}
      </button>
      {/* Tooltip */}
      {tooltip && iconOnly && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

export default function TemporalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [activeTab, setActiveTab] = useState("activas");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isToggling, setIsToggling] = useState(null);
  
  // Estados de filtros por status (checkboxes)
  const [showRecibiendo, setShowRecibiendo] = useState(true);
  const [showPausada, setShowPausada] = useState(true);
  const [showPendiente, setShowPendiente] = useState(true);
  const [showOnlyActive, setShowOnlyActive] = useState(false); // Filtro independiente para fechas activas
  const [finalizadasSort, setFinalizadasSort] = useState("fecha_desc"); // nombre | fecha_desc | fecha_asc
  
  // Custom Sort Dropdown State
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  // Paginación
  const pageSize = 10;
  const [page, setPage] = useState(0);

  // Estados para eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para confirmación de pausa/activación
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [surveyToPause, setSurveyToPause] = useState(null);

  // Estados para confirmación de clonado
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [surveyToClone, setSurveyToClone] = useState(null);
  const [isCloning, setIsCloning] = useState(false);

  // Estados para borrar respuestas
  const [deleteAnswersModalOpen, setDeleteAnswersModalOpen] = useState(false);
  const [surveyToDeleteAnswers, setSurveyToDeleteAnswers] = useState(null);
  const [isDeletingAnswers, setIsDeletingAnswers] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Al cambiar pestaña, cerrar panel y volver a la primer página
    setShowFilters(false);
    setPage(0);
    setSearchQuery("");
  }, [activeTab]);

  useEffect(() => {
    // Solo resetear página al cambiar filtros
    setPage(0);
  }, [searchQuery, showRecibiendo, showPausada, showPendiente, showOnlyActive, finalizadasSort]);

  const loadSurveysData = async () => {
    try {
      setError(null);
      // No seteamos isLoading(true) global para evitar parpadeo completo si solo refrescamos
      
      // 1. Traer encuestas publicadas (activas y finalizadas)
      const resp = await surveyService.getAllSurveys(1, 100, null);
      
      // 🔍 DEBUG: Ver qué devuelve el backend
      console.log("🔍 DEBUG - Encuestas recibidas del backend:", resp);
      console.log("🔍 DEBUG - Total encuestas:", resp?.surveys?.length || 0);
      
      // 2. Traer DRAFTS (separado, como lo hace el creador viejo)
      let draftsResp = { drafts: [] };
      try {
        draftsResp = await surveyService.getDrafts();
        console.log("📦 Drafts recibidos:", draftsResp);
      } catch (e) {
        console.error("Error al cargar drafts:", e);
      }
      
      // 3. Combinar ambos
      const allSurveys = [...(resp?.surveys || []), ...(draftsResp?.drafts || [])];
      
      console.log("🔍 DEBUG - Total combinado (surveys + drafts):", allSurveys.length);
      console.log("📥 Total encuestas (publicadas + drafts):", allSurveys.length);
      
      const normalized =
        allSurveys?.map((s) => {
          const title =
            s?.survey?.title ||
            s?.survey?.survey?.title ||
            s?.title ||
            "Sin título";
          const description =
            s?.survey?.description ||
            s?.survey?.survey?.description ||
            s?.description ||
            "";
          const startDate = s?.surveyInfo?.startDate;
          const endDate = s?.surveyInfo?.endDate;
          const totalCases = s?.surveyInfo?.target ?? 0;
          const cases = s?.totalAnswers ?? 0;
          // Leer userIds desde surveyInfo, que es donde se guardan
          const pollsterIds = s?.surveyInfo?.userIds || s?.userIds || [];
          const surveyors = Array.isArray(pollsterIds) ? pollsterIds.length : 0;
          
          // Función recursiva para contar preguntas reales (no panels)
          // Retorna { total, condicionales } para calcular min/max
          const contarPreguntasReales = (elements, esCondicional = false) => {
            let total = 0;
            let condicionales = 0;
            if (!Array.isArray(elements)) return { total: 0, condicionales: 0 };
            
            elements.forEach(el => {
              if (el.type === 'panel') {
                // Si es un panel con visibleIf, sus preguntas son condicionales
                const tieneCondicion = !!el.visibleIf;
                const resultado = contarPreguntasReales(el.elements, tieneCondicion);
                total += resultado.total;
                condicionales += resultado.condicionales;
              } else {
                // Es una pregunta real
                total++;
                if (esCondicional) {
                  condicionales++;
                }
              }
            });
            
            return { total, condicionales };
          };

          // Contar preguntas en todas las páginas
          let totalQuestions = 0;
          let conditionalQuestions = 0;
          const pages = s?.survey?.pages || s?.survey?.survey?.pages;
          if (Array.isArray(pages)) {
            pages.forEach((p) => {
              // Verificar si la página completa es condicional (nuevo formato)
              const paginaEsCondicional = !!p.visibleIf;
              
              if (Array.isArray(p?.elements)) {
                const resultado = contarPreguntasReales(p.elements, paginaEsCondicional);
                totalQuestions += resultado.total;
                
                // Si la página es condicional, todas sus preguntas son condicionales
                if (paginaEsCondicional) {
                  conditionalQuestions += resultado.total;
                } else {
                  // Si no, solo contar las que están en panels condicionales
                  conditionalQuestions += resultado.condicionales;
                }
              }
            });
          }

          const questions = totalQuestions;
          const minQuestions = totalQuestions - conditionalQuestions;
          const maxQuestions = totalQuestions;
          const hasConditionalQuestions = conditionalQuestions > 0;
          
          // Detectar qué falta configurar específicamente
          const hasConfig = !!(
            startDate &&
            endDate &&
            startDate.trim() !== "" &&
            endDate.trim() !== ""
          );
          const hasParticipants = surveyors > 0;
          const hasForm = questions > 0;
          
          // Clasificar estado usando la nueva función
          const statusInfo = classifyStatus(s);

          const surveyData = {
            id: s?._id || s?.id,
            title,
            description,
            status: statusInfo.lifecycle,
            statusLabel: statusInfo.label,
            statusColor: statusInfo.color,
            isPending: statusInfo.isPending || false,
            isPaused: statusInfo.isPaused || false,
            isFinished: statusInfo.isFinished || false,
            isActive: statusInfo.isActive || false,
            isScheduled: statusInfo.isScheduled || false,
            questions,
            minQuestions,
            maxQuestions,
            hasConditionalQuestions,
            surveyors,
            cases,
            totalCases,
            startDate,
            endDate,
            // Guardar qué falta para mostrar alertas
            hasConfig,
            hasParticipants,
            hasForm,
            rawStatus: s?.status,
            // Guardar campos originales del backend para verificación
            isConfigurationComplete: s?.isConfigurationComplete,
            isPausedBackend: s?.isPaused,
          };

          // 🔍 DEBUG: Ver clasificación de cada encuesta
          console.log(`🔍 DEBUG - Encuesta "${title}":`, {
            id: surveyData.id,
            status: surveyData.status,
            statusLabel: surveyData.statusLabel,
            isPaused: surveyData.isPaused,
            isConfigurationComplete: s?.isConfigurationComplete,
            hasQuestions: questions > 0,
            hasDates: !!startDate && !!endDate,
            hasParticipants: surveyors > 0,
            userIds: s?.userIds,
          });

          return surveyData;
        }) || [];
      
      setSurveys(normalized);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar las encuestas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadSurveysData();
  }, []);


  const filteredSurveys = useMemo(() => {
    let filtered = surveys.filter((s) => {
      if (activeTab === "activas") {
        // En "Activas" mostramos todo menos finalizadas (activa + preparada + pendiente)
        return s.status !== "finalizada";
      }
      if (activeTab === "finalizadas") {
        return s.status === "finalizada";
      }
      return true;
    });

    // Filtrar por estado usando checkboxes
    if (!showRecibiendo || !showPausada || !showPendiente) {
      filtered = filtered.filter((s) => {
        // Si es recibiendo casos
        if (s.status === "recibiendo" || s.lifecycle === "recibiendo") {
          return showRecibiendo;
        }
        // Si es pausada
        if (s.status === "pausada" || s.lifecycle === "pausada" || s.isPaused) {
          return showPausada;
        }
        // Si es pendiente
        if (s.status === "pendiente" || s.lifecycle === "pendiente" || s.isPending) {
          return showPendiente;
        }
        return false; // Si no matchea ninguno, no mostrar
      });
    }

    // Filtro independiente: solo fechas activas (excluir futuras)
    if (showOnlyActive) {
      const now = new Date();
      filtered = filtered.filter((s) => {
        // Si no tiene fecha de inicio, no filtrar (puede ser pendiente)
        if (!s.startDate) return true;
        const startDate = new Date(s.startDate);
        // Mostrar solo si ya empezó
        return startDate <= now;
      });
    }

    // Búsqueda universal: busca en título, descripción y fechas
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => {
        // Buscar en título y descripción
        const matchesText = 
          s.title.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q);
        
        // Buscar en fechas formateadas (ej: "22/08" o "28/01")
        const startDateFormatted = formatDate(s.startDate).toLowerCase();
        const endDateFormatted = formatDate(s.endDate).toLowerCase();
        const matchesDate = 
          startDateFormatted.includes(q) || 
          endDateFormatted.includes(q);
        
        return matchesText || matchesDate;
      });
    }

    if (activeTab === "finalizadas") {
      // Ordenar por selector (solo en finalizadas)
      const getEnd = (s) => safeDate(s.endDate) || safeDate(s.startDate);
      filtered = filtered.sort((a, b) => {
        if (finalizadasSort === "nombre") {
          return (a.title || "").localeCompare(b.title || "", "es", {
            sensitivity: "base",
          });
        }
        const da = getEnd(a);
        const db = getEnd(b);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return finalizadasSort === "fecha_asc" ? ta - tb : tb - ta;
      });
    } else {
      // Ordenar: activas arriba, luego preparadas, luego pendientes
      filtered = filtered.sort((a, b) => {
        const rank = (s) => {
          if (s.status === "activa") return 0;
          if (s.status === "preparada") return 1;
          if (s.isPending) return 2;
          return 3;
        };
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        return 0;
      });
    }

    return filtered;
  }, [
    surveys,
    activeTab,
    searchQuery,
    showRecibiendo,
    showPausada,
    showPendiente,
    showOnlyActive,
    finalizadasSort,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSurveys.length / pageSize));
  const pageSafe = Math.min(page, totalPages - 1);
  const paginatedSurveys = useMemo(() => {
    const start = pageSafe * pageSize;
    return filteredSurveys.slice(start, start + pageSize);
  }, [filteredSurveys, pageSafe]);

  const handleToggleSurvey = (survey) => {
    setSurveyToPause(survey);
    setPauseModalOpen(true);
  };

  const confirmToggleSurvey = async () => {
    if (!surveyToPause) return;

    setIsToggling(surveyToPause.id);
    try {
      // Verificar si está pendiente de configurar
      if (surveyToPause.isPending) {
        toast.error("Complete la configuración antes de activar la encuesta");
        return;
      }

      // Toggle pausa usando el nuevo endpoint
      const result = await surveyService.toggleSurveyPause(surveyToPause.id);
      
      // Mostrar toast según el nuevo estado
      if (result.isPaused) {
        toast.warning("Encuesta pausada", {
          style: { background: '#EAB308', color: 'white' }
        });
      } else {
        toast.success("¡Encuesta activada!");
      }

      // Recargar lista para ver cambios
      await loadSurveysData();
    } catch (e) {
      console.error("Error toggling survey:", e);
      toast.error(`Error: ${e.message}`);
    } finally {
      setIsToggling(null);
      setPauseModalOpen(false);
      setSurveyToPause(null);
    }
  };
  const handleDelete = (id) => {
    const survey = surveys.find((s) => s.id === id);
    if (survey) {
      setSurveyToDelete(survey);
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteSurvey = async () => {
    if (!surveyToDelete) return;
    
    setIsDeleting(true);
    try {
      await surveyService.deleteSurvey(surveyToDelete.id);
      toast.success("Encuesta eliminada correctamente");
      
      // Si estamos borrando la última de una página y no es la primera, volver atrás
      if (paginatedSurveys.length === 1 && page > 0) {
        setPage(p => p - 1);
      }
      
      await loadSurveysData();
    } catch (error) {
      console.error("Error deleting survey:", error);
      toast.error(error.message || "Error al eliminar la encuesta");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setSurveyToDelete(null);
    }
  };

  const handleDeleteAnswers = (survey) => {
    setSurveyToDeleteAnswers(survey);
    setDeleteAnswersModalOpen(true);
  };

  const confirmDeleteAnswers = async () => {
    if (!surveyToDeleteAnswers) return;
    
    setIsDeletingAnswers(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/answer-delete/${surveyToDeleteAnswers.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al borrar las respuestas");
      }

      toast.success("Respuestas eliminadas correctamente");
      await loadSurveysData();
    } catch (error) {
      console.error("Error deleting answers:", error);
      toast.error(error.message || "Error al eliminar las respuestas");
    } finally {
      setIsDeletingAnswers(false);
      setDeleteAnswersModalOpen(false);
      setSurveyToDeleteAnswers(null);
    }
  };

  const handleClone = (survey) => {
    setSurveyToClone(survey);
    setCloneModalOpen(true);
  };

  const confirmCloneSurvey = async () => {
    if (!surveyToClone || isCloning) return;
    
    setIsCloning(true);
    try {
      await surveyService.cloneSurvey(surveyToClone.id);
      toast.success("Encuesta clonada correctamente");
      await loadSurveysData();
      setCloneModalOpen(false);
      setSurveyToClone(null);
    } catch (error) {
      console.error("Error cloning survey:", error);
      toast.error(error.message || "Error al clonar la encuesta");
    } finally {
      setIsCloning(false);
    }
  };

  const activasCount = surveys.filter((s) => s.status !== "finalizada").length;
  const finalizadasCount = surveys.filter((s) => s.status === "finalizada").length;

  const tabs = [
    { id: "activas", label: `Activas (${activasCount})` },
    { id: "finalizadas", label: `Finalizadas (${finalizadasCount})` },
  ];

  const StatusBadge = ({ survey }) => {
  // Pendiente de configurar - AMARILLO
  if (survey.isPending || survey.status === "pendiente") {
    return (
      <span className="px-2 py-0.5 md:px-3 md:py-1 bg-yellow-500 text-white rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap">
        <Clock size={12} className="md:w-3.5 md:h-3.5" />
        Pendiente de configurar
      </span>
    );
  }
  // Pausada - AZUL
  if (survey.isPaused || survey.status === "pausada") {
    return (
      <span className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-500 text-white rounded-full text-xs font-medium flex items-center gap-1">
        <Pause size={12} className="md:w-3.5 md:h-3.5" />
        Pausada
      </span>
    );
  }
  // Finalizada - GRIS
  if (survey.isFinished || survey.status === "finalizada") {
    return (
      <span className="px-2 py-0.5 md:px-3 md:py-1 bg-gray-500 text-white rounded-full text-xs font-medium">
        Finalizada
      </span>
    );
  }
  // Recibiendo casos (activa) - VERDE
  if (survey.isActive || survey.status === "recibiendo") {
    
    const bgColor = survey.isScheduled ? "bg-teal-800" : "bg-green-600";
    
    return (
      <div className="flex items-center gap-1.5">
        <span className={`px-2 py-0.5 md:px-3 md:py-1 ${bgColor} text-white rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap`}>
          {!survey.isScheduled && (
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-pulse" />
          )}
          Recibiendo casos
        </span>
        {survey.isScheduled && (
          <div className="relative">
            <div className="flex items-center justify-center w-7 h-7 bg-teal-800 rounded-full">
              <Clock size={16} className="text-yellow-300" />
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              La fecha de la encuesta aún no ha llegado
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
    );
  }
  // Fallback
  return (
    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-gray-400 text-white rounded-full text-xs font-medium">
      Sin estado
    </span>
  );
};

  return (
    <div className="bg-[color:var(--background)] text-[color:var(--text-primary)]">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-bold">Encuestas</h2>
            <button
              onClick={() => router.push("/dashboard/temporal/nueva")}
              className="bg-[color:var(--primary)] hover:opacity-90 px-4 md:px-6 py-2.5 md:py-3 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-lg text-white text-sm md:text-base"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Nueva encuesta</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>



          <div className="flex flex-col gap-2">
            
            {/* Barra de búsqueda universal + Filtros */}
            <div className="flex flex-row gap-2 sm:gap-3">
              {/* Barra de búsqueda universal */}
              <div className="flex-1 bg-[color:var(--card-background)] border border-[color:var(--card-border)] rounded-xl flex items-center shadow-sm hover:border-[color:var(--primary)]/50 transition-all relative h-12">
                <Search size={18} className="text-[color:var(--text-secondary)] ml-4 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar por título, descripción o fecha..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 h-full bg-transparent border-none outline-none text-sm text-[color:var(--text-primary)] px-3 placeholder:text-[color:var(--text-secondary)] rounded-xl focus:outline-none focus:ring-0"
                />
                
                {/* Botón limpiar */}
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="p-1.5 mr-2 rounded-full hover:bg-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:text-[color:var(--error-text)] transition-colors flex-shrink-0"
                    title="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Botón de filtros/ordenamiento */}
              {activeTab === "activas" ? (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-12 w-12 sm:w-auto sm:px-4 rounded-xl flex items-center justify-center gap-2 transition-all flex-shrink-0 text-sm border font-medium ${
                    showFilters 
                      ? 'bg-[color:var(--primary)] border-[color:var(--primary)] text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-[color:var(--card-background)] border-[color:var(--card-border)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]'
                  }`}
                >
                  <Filter size={18} />
                  <span className="hidden sm:inline">Filtros</span>
                </button>
              ) : (
                <div className="relative h-12 flex-shrink-0" ref={sortDropdownRef}>
                  <button 
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="h-full pl-3 sm:pl-4 pr-8 sm:pr-10 flex items-center gap-2 hover:bg-[color:var(--hover-bg)] transition-colors border border-[color:var(--card-border)] outline-none rounded-xl group bg-[color:var(--card-background)] text-xs sm:text-sm font-medium text-[color:var(--text-primary)]"
                  >
                    <span>
                      {finalizadasSort === 'nombre' && 'Nombre'}
                      {finalizadasSort === 'fecha_desc' && 'Recientes'}
                      {finalizadasSort === 'fecha_asc' && 'Antiguas'}
                    </span>
                    <ArrowDownWideNarrow size={14} className={`text-[color:var(--text-secondary)] ml-auto transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Custom Dropdown Menu */}
                  {isSortDropdownOpen && (
                    <div className="absolute top-[calc(100%+0.5rem)] right-0 w-[140px] bg-[color:var(--card-background)] border border-[color:var(--card-border)] rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 p-1">
                      {[
                        { value: 'nombre', label: 'Nombre', icon: ArrowDownAZ },
                        { value: 'fecha_desc', label: 'Recientes', icon: ArrowDownWideNarrow },
                        { value: 'fecha_asc', label: 'Antiguas', icon: ArrowUpWideNarrow },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setFinalizadasSort(opt.value);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs sm:text-sm rounded-lg flex items-center gap-3 transition-colors ${
                            finalizadasSort === opt.value 
                              ? 'bg-[color:var(--primary)] text-white' 
                              : 'text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)]'
                          }`}
                        >
                          <opt.icon size={16} className={finalizadasSort === opt.value ? 'text-white' : 'text-[color:var(--primary)]'} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contador de resultados de búsqueda */}
            {searchQuery && (
              <div className="text-xs text-[color:var(--text-secondary)] px-1">
                Mostrando {filteredSurveys.length} resultado{filteredSurveys.length !== 1 ? 's' : ''} de {surveys.filter((s) => activeTab === "activas" ? s.status !== "finalizada" : s.status === "finalizada").length}
              </div>
            )}

            {/* Panel de Filtros expandible */}
            {activeTab === "activas" && showFilters && (
              <div className="bg-[color:var(--card-background)] border border-[color:var(--card-border)] rounded-xl p-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Recibiendo casos */}
                  <label className="flex items-center gap-2 cursor-pointer group select-none px-3 py-1.5 rounded-lg transition-colors">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                      showRecibiendo 
                        ? 'border-green-500 dark:border-green-400 bg-green-500 dark:bg-green-400' 
                        : 'border-green-300 dark:border-green-700 opacity-40'
                    }`}>
                      {showRecibiendo && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <input
                      type="checkbox"
                      checked={showRecibiendo}
                      onChange={(e) => setShowRecibiendo(e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-xs font-medium transition-colors ${
                      showRecibiendo 
                        ? 'text-[color:var(--text-primary)]' 
                        : 'text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)]'
                    }`}>
                      Recibiendo casos
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                      showRecibiendo 
                        ? 'bg-green-500 text-white' 
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                    }`}>
                      {surveys.filter(s => (s.lifecycle === "recibiendo" || s.status === "recibiendo") && s.status !== "finalizada").length}
                    </span>
                  </label>

                  {/* Pausada */}
                  <label className="flex items-center gap-2 cursor-pointer group select-none px-3 py-1.5 rounded-lg transition-colors">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                      showPausada 
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-500 dark:bg-blue-400' 
                        : 'border-blue-300 dark:border-blue-700 opacity-40'
                    }`}>
                      {showPausada && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <input
                      type="checkbox"
                      checked={showPausada}
                      onChange={(e) => setShowPausada(e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-xs font-medium transition-colors ${
                      showPausada 
                        ? 'text-[color:var(--text-primary)]' 
                        : 'text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)]'
                    }`}>
                      Pausada
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                      showPausada 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500'
                    }`}>
                      {surveys.filter(s => (s.lifecycle === "pausada" || s.status === "pausada" || s.isPaused) && s.status !== "finalizada").length}
                    </span>
                  </label>

                  {/* Pendiente de configurar */}
                  <label className="flex items-center gap-2 cursor-pointer group select-none px-3 py-1.5 rounded-lg transition-colors">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                      showPendiente 
                        ? 'border-yellow-500 dark:border-yellow-400 bg-yellow-500 dark:bg-yellow-400' 
                        : 'border-yellow-300 dark:border-yellow-700 opacity-40'
                    }`}>
                      {showPendiente && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <input
                      type="checkbox"
                      checked={showPendiente}
                      onChange={(e) => setShowPendiente(e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-xs font-medium transition-colors ${
                      showPendiente 
                        ? 'text-[color:var(--text-primary)]' 
                        : 'text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)]'
                    }`}>
                      Pendiente de configurar
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                      showPendiente 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'
                    }`}>
                      {surveys.filter(s => (s.lifecycle === "pendiente" || s.status === "pendiente" || s.isPending) && s.status !== "finalizada").length}
                    </span>
                  </label>

                  {/* Ver todas */}
                  <button
                    onClick={() => {
                      const allSelected = showRecibiendo && showPausada && showPendiente;
                      if (allSelected) {
                        // Si todas están seleccionadas, deseleccionar todas
                        setShowRecibiendo(false);
                        setShowPausada(false);
                        setShowPendiente(false);
                      } else {
                        // Si alguna no está seleccionada, seleccionar todas
                        setShowRecibiendo(true);
                        setShowPausada(true);
                        setShowPendiente(true);
                      }
                    }}
                    className="flex items-center gap-1.5 cursor-pointer select-none px-3 py-1.5 rounded-lg hover:bg-[color:var(--primary)]/10 transition-colors text-xs font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-dark)] ml-auto"
                  >
                    <CheckCircle size={14} />
                    {showRecibiendo && showPausada && showPendiente ? "Ocultar todas" : "Ver todas"}
                  </button>

                  {/* Solo fechas activas - filtro independiente */}
                  <label className="flex items-center gap-2 cursor-pointer group select-none px-3 py-1.5 rounded-lg transition-colors border-l border-[color:var(--card-border)] pl-3 ml-2">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                      showOnlyActive 
                        ? 'border-purple-500 dark:border-purple-400 bg-purple-500 dark:bg-purple-400' 
                        : 'border-purple-300 dark:border-purple-700 opacity-40'
                    }`}>
                      {showOnlyActive && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <input
                      type="checkbox"
                      checked={showOnlyActive}
                      onChange={(e) => setShowOnlyActive(e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-xs font-medium whitespace-nowrap transition-colors ${
                      showOnlyActive 
                        ? 'text-[color:var(--text-primary)]' 
                        : 'text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)]'
                    }`}>
                      Solo fechas activas
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap flex-shrink-0 text-sm ${
                activeTab === tab.id
                  ? "bg-[color:var(--primary)] text-white shadow-lg"
                  : "bg-[color:var(--card-background)] text-[color:var(--text-secondary)] hover:bg-[color:var(--hover-bg)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {/* Leyenda de filtros activos */}
          {activeTab === "activas" && (!showRecibiendo || !showPausada || !showPendiente || showOnlyActive) && (
            <div className="flex items-center ml-auto md:ml-2 text-xs text-[color:var(--text-muted)] italic animate-in fade-in duration-300 whitespace-nowrap">
              (No se están mostrando: {[
                !showRecibiendo && "Recibiendo casos",
                !showPausada && "Pausadas",
                !showPendiente && "Pendiente de configurar",
                showOnlyActive && "fechas inactivas"
              ].filter(Boolean).join(", ")})
            </div>
          )}
        </div>

        {isLoading ? (
          <LoaderWrapper text="Cargando encuestas" />
        ) : error ? (
          <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-6 text-center text-red-100">
            {error}
          </div>
        ) : filteredSurveys.length === 0 ? (
          searchQuery ? (
            <div className="bg-[color:var(--card-background)] backdrop-blur-sm border border-[color:var(--card-border)] rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-[color:var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-[color:var(--primary)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No hay coincidencias
              </h3>
              <p className="text-[color:var(--text-secondary)] mb-6 max-w-sm mx-auto">
                No encontramos encuestas que coincidan con tus criterios. Intenta con otra búsqueda.
              </p>
              <button
                onClick={() => {
                    setSearchQuery("");
                    setSearchLocation("");
                    setSearchDateStart("");
                    setSearchDateEnd("");
                    setSearchType("name");
                }}
                className="text-[color:var(--primary)] font-semibold hover:underline"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="bg-[color:var(--card-background)] backdrop-blur-sm border-2 border-dashed border-[color:var(--card-border)] rounded-xl p-12 text-center">
              <div className="w-20 h-20 bg-[color:var(--primary)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter size={40} className="text-[color:var(--primary)]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                No hay encuestas visibles
              </h3>
              <p className="text-[color:var(--text-secondary)]">
                Revisa los filtros activos o la barra de búsqueda
              </p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {paginatedSurveys.map((survey) => {
              // Determinar color de borde según estado
              let borderColor = 'border-[color:var(--card-border)]';
              
              if (survey.isPending || survey.status === 'pendiente') {
                borderColor = 'border-l-4 border-l-yellow-500 border-t border-r border-b border-t-[color:var(--card-border)] border-r-[color:var(--card-border)] border-b-[color:var(--card-border)]';
              } else if (survey.isPaused || survey.status === 'pausada') {
                borderColor = 'border-l-4 border-l-blue-500 border-t border-r border-b border-t-[color:var(--card-border)] border-r-[color:var(--card-border)] border-b-[color:var(--card-border)]';
              } else if (survey.isFinished || survey.status === 'finalizada') {
                borderColor = 'border-l-4 border-l-gray-500 border-t border-r border-b border-t-[color:var(--card-border)] border-r-[color:var(--card-border)] border-b-[color:var(--card-border)]';
              } else if (survey.isActive || survey.status === 'recibiendo') {
                // Teal-800 para programadas, green-600 para activas
                const greenColor = survey.isScheduled ? 'border-l-teal-800' : 'border-l-green-600';
                borderColor = `border-l-4 ${greenColor} border-t border-r border-b border-t-[color:var(--card-border)] border-r-[color:var(--card-border)] border-b-[color:var(--card-border)]`;
              }
              
              return (
              <div
                key={survey.id}
                className={`group bg-[color:var(--card-background)] backdrop-blur-sm rounded-xl p-3 md:p-4 hover:bg-[color:var(--hover-bg)] transition-all relative ${borderColor}`}
              >
                <div className="flex flex-col gap-2.5">
                  {/* Primera línea: Título (grande) + Tag (top-right, superpuesto) */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg md:text-xl font-bold break-words text-[color:var(--text-primary)] flex-1">
                      {survey.title}
                    </h3>
                    <div className="absolute -top-2 right-3 flex-shrink-0">
                      <StatusBadge survey={survey} />
                    </div>
                  </div>
                  
                  {/* Segunda línea: Descripción (pequeña, muteada) */}
                  {survey.description && (
                    <p className="text-xs text-[color:var(--text-secondary)] opacity-70">
                      {survey.description}
                    </p>
                  )}

                  {/* Tercera línea: Fechas + Días restantes */}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="flex items-center gap-1.5 text-[color:var(--text-primary)]">
                      <Calendar size={14} />
                      {survey.isScheduled ? (
                        <>
                          <span className="group-hover:text-yellow-500 group-hover:font-semibold transition-all duration-200">
                            {formatDate(survey.startDate)}
                          </span>
                          <span> - {formatDate(survey.endDate)}</span>
                        </>
                      ) : (
                        <>{formatDate(survey.startDate)} - {formatDate(survey.endDate)}</>
                      )}
                    </span>
                    {survey.status !== "finalizada" && survey.endDate && (() => {
                      const now = new Date();
                      const end = new Date(survey.endDate);
                      const diffTime = Math.abs(end - now);
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return (
                        <span className="text-xs text-[color:var(--text-secondary)] opacity-70">
                          (quedan {diffDays} días)
                        </span>
                      );
                    })()}
                  </div>

                  {/* Cuarta línea: Stats (preguntas | encuestadores | casos) */}
                  <div className="flex flex-wrap gap-3 text-xs text-[color:var(--text-secondary)]">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <FileText size={13} />
                      {survey.hasConditionalQuestions && survey.minQuestions !== survey.maxQuestions
                        ? `${survey.minQuestions}-${survey.maxQuestions} preguntas`
                        : `${survey.questions || 0} preguntas`
                      }
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Users size={13} />
                      {survey.surveyors || 0} encuestadores
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <CheckCircle size={13} />
                      {survey.cases}/{survey.totalCases || 0} casos
                    </span>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-1.5 pt-2 border-t border-[color:var(--card-border)]">
                    <div className="hidden md:flex flex-wrap gap-1.5">
                      <ActionButton
                        icon={ClipboardList}
                        label="Editar formulario"
                        onClick={() =>
                          router.push(
                            `/dashboard/temporal/nueva?id=${survey.id}`
                          )
                        }
                        hasAlert={!survey.hasForm}
                      />
                      <ActionButton
                        icon={Settings}
                        label="Configurar"
                        hasAlert={!survey.hasConfig}
                        onClick={() =>
                          router.push(
                            `/dashboard/temporal/configurar?id=${survey.id}`
                          )
                        }
                      />
                      <ActionButton
                        icon={Users}
                        label="Asignar participantes"
                        hasAlert={!survey.hasParticipants}
                        onClick={() =>
                          router.push(
                            `/dashboard/temporal/participantes?id=${survey.id}`
                          )
                        }
                      />
                      <ActionButton
                        icon={BarChart3}
                        label="Supervisión"
                        onClick={() => router.push(`/dashboard/encuestas/${survey.id}/supervision`)}
                      />
                    </div>
                    <div className="hidden md:flex gap-1.5 ml-auto">
                      {survey.status !== "finalizada" && (
                        <ActionButton
                          icon={survey.isActive ? Pause : Play}
                          label={survey.isActive ? "Pausar" : "Activar"}
                          variant={survey.isActive ? "warning" : "success"}
                          iconOnly
                          tooltip={survey.isActive ? "Pausar encuesta" : "Activar encuesta"}
                          onClick={() => handleToggleSurvey(survey)}
                          isLoading={isToggling === survey.id}
                        />
                      )}
                      {survey.cases > 0 && (
                        <ActionButton
                          icon={Eraser}
                          label="Borrar respuestas"
                          variant="danger"
                          iconOnly
                          tooltip="Borrar todas las respuestas"
                          onClick={() => handleDeleteAnswers(survey)}
                        />
                      )}
                      <ActionButton
                        icon={Copy}
                        label="Clonar"
                        iconOnly
                        tooltip="Clonar encuesta"
                        onClick={() => handleClone(survey)}
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Eliminar"
                        variant="danger"
                        iconOnly
                        tooltip="Eliminar encuesta"
                        onClick={() => handleDelete(survey.id)}
                      />
                    </div>
                    <div className="flex md:hidden items-center gap-1.5 w-full">
                      <div className="flex flex-1 flex-wrap gap-1.5">
                        <ActionButton
                          icon={ClipboardList}
                          label="Editar"
                          onClick={() =>
                            router.push(
                              `/dashboard/temporal/nueva?id=${survey.id}`
                            )
                          }
                        />
                        <ActionButton
                          icon={BarChart3}
                          label="Supervisión"
                          onClick={() =>
                            router.push(`/dashboard/encuestas/${survey.id}/supervision`)
                          }
                        />
                      </div>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId((prev) =>
                              prev === survey.id ? null : survey.id
                            )
                          }
                          className="px-3 py-2 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-background)] text-[color:var(--text-primary)] text-sm font-semibold"
                        >
                          Más
                        </button>
                        {openMenuId === survey.id && (
                          <div className="absolute bottom-full right-0 mb-2 w-56 bg-[color:var(--card-background)] border border-[color:var(--card-border)] rounded-xl shadow-lg p-2 flex flex-col gap-1 z-20">
                            <ActionButton
                              icon={ClipboardList}
                              label="Editar formulario"
                              hasAlert={!survey.hasForm}
                              className="w-full justify-start"
                              onClick={() => {
                                router.push(
                                  `/dashboard/temporal/nueva?id=${survey.id}`
                                );
                                setOpenMenuId(null);
                              }}
                            />
                            <ActionButton
                              icon={Settings}
                              label="Configurar"
                              hasAlert={!survey.hasConfig}
                              className="w-full justify-start"
                              onClick={() => {
                                router.push(
                                  `/dashboard/temporal/configurar?id=${survey.id}`
                                );
                                setOpenMenuId(null);
                              }}
                            />
                            <ActionButton
                              icon={Users}
                              label="Asignar participantes"
                              hasAlert={!survey.hasParticipants}
                              className="w-full justify-start"
                              onClick={() => {
                                router.push(
                                  `/dashboard/temporal/participantes?id=${survey.id}`
                                );
                                setOpenMenuId(null);
                              }}
                            />
                            <ActionButton
                              icon={survey.isActive ? Pause : Play}
                              label={survey.isActive ? "Pausar" : "Activar"}
                              variant={survey.isActive ? "warning" : "success"}
                              className="w-full justify-start"
                              onClick={() => {
                                handleToggleSurvey(survey.id);
                                setOpenMenuId(null);
                              }}
                            />
                            <ActionButton
                              icon={Copy}
                              label="Clonar"
                              className="w-full justify-start"
                              onClick={() => {
                                handleClone(survey.id);
                                setOpenMenuId(null);
                              }}
                            />
                            <ActionButton
                              icon={Trash2}
                              label="Eliminar"
                              variant="danger"
                              className="w-full justify-start"
                              onClick={() => {
                                handleDelete(survey.id);
                                setOpenMenuId(null);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
            })}


            {/* Paginación */}
            {filteredSurveys.length > pageSize && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="text-xs text-[color:var(--text-secondary)]">
                  Página {pageSafe + 1} de {totalPages} · {filteredSurveys.length} encuestas
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={pageSafe <= 0}
                    className="px-3 py-2 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-background)] text-[color:var(--text-primary)] text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[color:var(--hover-bg)]"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={pageSafe >= totalPages - 1}
                    className="px-3 py-2 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-background)] text-[color:var(--text-primary)] text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[color:var(--hover-bg)]"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Modal de confirmación de eliminación */}
        {/* Modal de confirmación para pausar/activar */}
        <ConfirmModal
          isOpen={pauseModalOpen}
          onClose={() => setPauseModalOpen(false)}
          onConfirm={confirmToggleSurvey}
          title={surveyToPause?.isActive ? "Pausar encuesta" : "Activar encuesta"}
          confirmText={surveyToPause?.isActive ? "Pausar" : "Activar"}
          variant={surveyToPause?.isActive ? "warning" : "primary"}
          isLoading={isToggling === surveyToPause?.id}
        >
          <p>
            ¿Estás seguro de que deseas {surveyToPause?.isActive ? "pausar" : "activar"} la encuesta{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">
              {surveyToPause?.title}
            </span>
            ?
          </p>
        </ConfirmModal>

        {/* Modal de confirmación para clonar */}
        <ConfirmModal
          isOpen={cloneModalOpen}
          onClose={() => !isCloning && setCloneModalOpen(false)}
          onConfirm={confirmCloneSurvey}
          title="Clonar encuesta"
          confirmText="Clonar"
          variant="primary"
          isLoading={isCloning}
        >
          <p>
            ¿Deseas crear una copia de la encuesta{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">
              {surveyToClone?.title}
            </span>
            ?
          </p>
        </ConfirmModal>

        {/* Modal de confirmación para borrar respuestas */}
        <ConfirmModal
          isOpen={deleteAnswersModalOpen}
          onClose={() => setDeleteAnswersModalOpen(false)}
          onConfirm={confirmDeleteAnswers}
          title="Borrar respuestas"
          confirmText="Borrar"
          isLoading={isDeletingAnswers}
          variant="danger"
          alertMessage={`Esta acción es irreversible. Se eliminarán permanentemente todas las respuestas (${surveyToDeleteAnswers?.cases || 0} casos).`}
        >
          <p>
              ¿Estás seguro de que deseas borrar todas las respuestas de la encuesta{" "}
              <span className="font-semibold text-[color:var(--text-primary)]">
                {surveyToDeleteAnswers?.title}
              </span>
              ?
            </p>
        </ConfirmModal>

        {/* Modal de confirmación para eliminar encuesta */}
        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={confirmDeleteSurvey}
          title="Eliminar encuesta"
          confirmText="Eliminar"
          isLoading={isDeleting}
          variant="danger"
          alertMessage="Esta acción es irreversible. Se eliminarán permanentemente el formulario, la configuración y todas las respuestas asociadas."
        >
          <p>
              ¿Estás seguro de que deseas eliminar la encuesta{" "}
              <span className="font-semibold text-[color:var(--text-primary)]">
                {surveyToDelete?.title}
              </span>
              ?
            </p>
        </ConfirmModal>
      </div>
    </div>
  );
}
