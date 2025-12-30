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
  CheckCircle,
  Users,
  ClipboardList,
  Clock,
  X,
  AlertCircle,
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
} from "lucide-react";
import { surveyService } from "@/services/survey.service";
import { toast } from "react-toastify";

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// lifecycle: pendiente | preparada | activa | finalizada
const classifyStatus = ({
  rawStatus,
  startDate,
  endDate,
  isReady, // formulario + config + participantes
}) => {
  // Pendiente: no está lista para ser enviada (draft incompleto)
  if (rawStatus === "draft" && !isReady) {
    return { lifecycle: "pendiente", isPending: true, isPrepared: false, isInDateRange: false };
  }

  const now = new Date();
  const start = safeDate(startDate);
  const end = safeDate(endDate);

  const isBeforeStart = !!(start && now < start);
  const isAfterEnd = !!(end && now > end);
  const isInDateRange = !!(start && end && now >= start && now <= end);

  // Finalizada: terminó por fecha (aplica a publicadas y drafts listos)
  if (isAfterEnd) {
    return { lifecycle: "finalizada", isPending: false, isPrepared: false, isInDateRange: false };
  }

  // Preparada: lista pero aún no empezó (startDate futura)
  // O es un DRAFT que está listo (y quizás incluso en fecha), pero no está publicado.
  if ((isReady && isBeforeStart) || (rawStatus === "draft" && isReady)) {
    return { lifecycle: "preparada", isPending: false, isPrepared: true, isInDateRange: isInDateRange };
  }

  // Activa: está en fecha Y (lista o publicada)
  // NOTA: Si llegamos acá, NO es draft (porque el if anterior capturó draft).
  if (isInDateRange) {
    return { lifecycle: "activa", isPending: false, isPrepared: false, isInDateRange: true };
  }

  // Fallback: Default a preparada si está lista, o activa genérica (casos raros)
  if (isReady) {
    return { lifecycle: "preparada", isPending: false, isPrepared: true, isInDateRange: false };
  }
  
  return { lifecycle: "activa", isPending: false, isPrepared: false, isInDateRange: false };
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
  
  // Estados de filtros (checkboxes)
  const [showPending, setShowPending] = useState(true); // Activado por defecto
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [finalizadasSort, setFinalizadasSort] = useState("fecha_desc"); // nombre | fecha_desc | fecha_asc
  
  // Custom Sort Dropdown State
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  // Paginación
  const pageSize = 10;
  const [page, setPage] = useState(0);

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
  }, [searchQuery, showPending, showOnlyActive, finalizadasSort]);

  const loadSurveysData = async () => {
    try {
      setError(null);
      // No seteamos isLoading(true) global para evitar parpadeo completo si solo refrescamos
      
      // 1. Traer encuestas publicadas (activas y finalizadas)
      const resp = await surveyService.getAllSurveys(1, 100, null);
      
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
          const surveyors = Array.isArray(s?.userIds) ? s.userIds.length : 0;
          // contamos preguntas: si hay pages con elements
          let questions = 0;
          const pages = s?.survey?.pages || s?.survey?.survey?.pages;
          if (Array.isArray(pages)) {
            pages.forEach((p) => {
              if (Array.isArray(p?.elements)) {
                questions += p.elements.length;
              }
            });
          }
          // Detectar si falta configuración/participantes/formulario
          const hasConfig = !!(
            startDate &&
            endDate &&
            startDate.trim() !== "" &&
            endDate.trim() !== ""
          );
          const hasParticipants = surveyors > 0;
          const hasForm = questions > 0;
          const isReady = hasConfig && hasParticipants && hasForm;
          
          // Clasificar estado considerando "ready" + fechas
          const { lifecycle, isPending, isPrepared, isInDateRange } = classifyStatus({
            rawStatus: s?.status,
            startDate,
            endDate,
            isReady,
          });

          return {
            id: s?._id || s?.id,
            title,
            description,
            status: lifecycle,
            isPending,
            isPrepared,
            isInDateRange,
            questions,
            surveyors,
            cases,
            totalCases,
            startDate,
            endDate,
            hasConfig,
            hasParticipants,
            hasForm,
            isReady,
            rawStatus: s?.status,
            // Flag auxiliar para UI de botón (si es activa real o simulada por fechas)
            isActive: lifecycle === 'activa'
          };
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

    // Mostrar pendientes = incluir pendientes (no "solo pendientes")
    if (!showPending) {
      filtered = filtered.filter((s) => !s.isPending);
    }

    // Solo con fecha activa:
    // - NO afecta a pendientes (porque están incompletas)
    // - oculta "preparadas" (listas pero aún no empezaron)
    if (showOnlyActive) {
      filtered = filtered.filter((s) => s.isPending || s.status === "activa");
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
    showPending,
    showOnlyActive,
    finalizadasSort,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSurveys.length / pageSize));
  const pageSafe = Math.min(page, totalPages - 1);
  const paginatedSurveys = useMemo(() => {
    const start = pageSafe * pageSize;
    return filteredSurveys.slice(start, start + pageSize);
  }, [filteredSurveys, pageSafe]);

  const handleToggleSurvey = async (id) => {
    const survey = surveys.find((s) => s.id === id);
    if (!survey) return;

    if (isToggling === id) return;
    setIsToggling(id);

    try {
      if (survey.isActive) {
        // PAUSAR -> Volver a draft
        // Necesitamos obtener la encuesta completa primero porque update requiere el objeto
        const fullData = await surveyService.getSurvey(id);
        const dataToSave = fullData.survey?.survey || fullData.survey; 
        const definition = fullData.survey?.surveyDefinition;
        const info = fullData.survey?.surveyInfo;
        
        // Estructura para update
        const payload = {
            survey: dataToSave,
            surveyDefinition: definition,
            surveyInfo: info
        };
        
        await surveyService.createOrUpdateSurvey(payload, id, true); // true = draft
        toast.warning("Encuesta pausada (vuelta a borrador)");
      } else {
        // ACTIVAR -> Publicar draft
        await surveyService.publishDraft(id);
        toast.success("¡Encuesta activada y publicada para encuestadores!");
      }

      // Recargar lista para ver cambios
      await loadSurveysData();
    } catch (e) {
      console.error("Error toggling survey:", e);
      toast.error(`Error: ${e.message}`);
    } finally {
      setIsToggling(null);
    }
  };

  const handleDelete = (id) => {
    toast.info("Eliminar encuesta: pronto");
    console.log("Eliminar encuesta", id);
  };

  const handleClone = (id) => {
    toast.info("Clonar encuesta: pronto");
    console.log("Clonar encuesta", id);
  };

  const activasCount = surveys.filter((s) => s.status !== "finalizada").length;
  const finalizadasCount = surveys.filter((s) => s.status === "finalizada").length;

  const tabs = [
    { id: "activas", label: `Activas (${activasCount})` },
    { id: "finalizadas", label: `Finalizadas (${finalizadasCount})` },
  ];

  const StatusBadge = ({ survey }) => {
    if (survey.isPending) {
      return (
        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs font-medium flex items-center gap-1">
          <Clock size={14} />
          Pendiente de completar
        </span>
      );
    }
    if (survey.status === "preparada") {
      return (
        <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-medium flex items-center gap-1">
          <Calendar size={14} />
          Preparada
        </span>
      );
    }
    if (survey.status === "finalizada") {
      return (
        <span className="px-3 py-1 bg-[color:var(--card-border)] text-[color:var(--text-primary)] rounded-full text-xs font-medium">
          Finalizada
        </span>
      );
    }
    if (survey.status === "activa") {
      return (
        <span className="px-3 py-1 bg-[color:var(--success-bg)] text-[color:var(--success)] rounded-full text-xs font-medium flex items-center gap-1">
          <div className="w-2 h-2 bg-[color:var(--success)] rounded-full animate-pulse" />
          Recibiendo casos
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-[color:var(--warning-bg)] text-[color:var(--warning)] rounded-full text-xs font-medium flex items-center gap-1">
        <div className="w-2 h-2 bg-[color:var(--warning)] rounded-full" />
        Pausada
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text-primary)]">
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
                  placeholder="Buscar por título o fecha..."
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
              <div className="bg-[color:var(--card-background)] border border-[color:var(--card-border)] rounded-xl p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <label className="flex items-center gap-3 cursor-pointer group select-none p-2 rounded-lg hover:bg-[color:var(--hover-bg)] transition-colors -ml-2">
                     <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${showPending ? 'bg-[color:var(--primary)] border-[color:var(--primary)]' : 'border-[color:var(--text-secondary)]'}`}>
                        {showPending && <CheckCircle size={12} className="text-white" />}
                     </div>
                     <input
                        type="checkbox"
                        checked={showPending}
                        onChange={(e) => setShowPending(e.target.checked)}
                        className="hidden"
                     />
                     <span className="text-sm font-medium text-[color:var(--text-primary)] flex items-center gap-2">
                        <Clock size={16} className="text-yellow-500" />
                        Mostrar pendientes 
                        <span className="bg-[color:var(--card-border)] text-[color:var(--text-secondary)] px-2 py-0.5 rounded-full text-xs">
                           {surveys.filter(s => s.isPending).length}
                        </span>
                     </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group select-none p-2 rounded-lg hover:bg-[color:var(--hover-bg)] transition-colors">
                     <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${showOnlyActive ? 'bg-[color:var(--primary)] border-[color:var(--primary)]' : 'border-[color:var(--text-secondary)]'}`}>
                        {showOnlyActive && <CheckCircle size={12} className="text-white" />}
                     </div>
                     <input
                        type="checkbox"
                        checked={showOnlyActive}
                        onChange={(e) => setShowOnlyActive(e.target.checked)}
                        className="hidden"
                     />
                     <span className="text-sm font-medium text-[color:var(--text-primary)] flex items-center gap-2">
                        <Calendar size={16} className="text-green-500" />
                        Solo con fecha activa
                     </span>
                  </label>

                  {(showPending || showOnlyActive) && (
                    <button
                      onClick={() => {
                        setShowPending(false);
                        setShowOnlyActive(false);
                      }}
                      className="text-xs font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--error-text)] transition-colors flex items-center gap-1 sm:ml-auto px-3 py-1.5 rounded-lg hover:bg-[color:var(--error-bg)]/10"
                    >
                      <Trash2 size={14} />
                      Limpiar filtros
                    </button>
                  )}
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
        </div>

        {isLoading ? (
          <div className="bg-[color:var(--card-background)] border border-[color:var(--card-border)] rounded-xl p-6 text-center text-[color:var(--text-secondary)]">
            Cargando encuestas...
          </div>
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
                <BarChart3 size={40} className="text-[color:var(--primary)]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                No hay encuestas {activeTab}
              </h3>
              <p className="text-[color:var(--text-secondary)] mb-6">
                Comienza creando tu primera encuesta para recolectar datos
              </p>
              <button
                onClick={() => router.push("/dashboard/encuestas/nueva")}
                className="bg-[color:var(--primary)] hover:opacity-90 px-6 py-3 rounded-xl inline-flex items-center gap-2 font-semibold transition-all text-white"
              >
                <Plus size={20} />
                Crear encuesta
              </button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {paginatedSurveys.map((survey) => (
              <div
                key={survey.id}
                className={`bg-[color:var(--card-background)] backdrop-blur-sm border rounded-xl p-3 md:p-4 hover:bg-[color:var(--hover-bg)] transition-all ${
                  survey.isPending
                    ? "border-yellow-500/30 hover:border-yellow-500/60" 
                    : "border-[color:var(--card-border)] hover:border-[color:var(--primary-dark)]/60"
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[color:var(--text-secondary)] text-xs mb-1">
                        Creada: {formatDate(survey.startDate)}
                      </p>
                      <h3 className="text-base md:text-lg font-semibold break-words text-[color:var(--text-primary)]">
                        {survey.title}
                      </h3>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusBadge survey={survey} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-[color:var(--text-secondary)] pb-2 border-b border-[color:var(--card-border)]">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar
                        size={13}
                        className="text-[color:var(--text-secondary)]"
                      />
                      {formatDate(survey.startDate)} -{" "}
                      {formatDate(survey.endDate)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-[color:var(--text-secondary)]">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <FileText size={13} />
                      {survey.questions || 0} preguntas
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Users size={13} />
                      {survey.surveyors || 0} encuestadores
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <CheckCircle size={13} />
                      {survey.cases}/{survey.totalCases || 0} casos
                    </span>
                    {survey.status !== "finalizada" && survey.endDate && (
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-[color:var(--text-secondary)]">
                        <Clock size={13} />
                        Hasta {formatDate(survey.endDate)}
                      </span>
                    )}
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
                        label="Resultados"
                        onClick={() => toast.info("Resultados: próximamente")}
                      />
                    </div>
                    <div className="hidden md:flex gap-1.5 ml-auto">
                      {survey.status !== "finalizada" && (
                        <ActionButton
                          icon={survey.isActive ? Pause : Play}
                          label={survey.isActive ? "Pausar" : "Activar"}
                          variant={survey.isActive ? "warning" : "success"}
                          iconOnly
                          onClick={() => handleToggleSurvey(survey.id)}
                          isLoading={isToggling === survey.id}
                        />
                      )}
                      <ActionButton
                        icon={Copy}
                        label="Clonar"
                        iconOnly
                        onClick={() => handleClone(survey.id)}
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Eliminar"
                        variant="danger"
                        iconOnly
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
                            toast.info("Supervisión: próximamente")
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
            ))}

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
      </div>
    </div>
  );
}
