"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  X,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
  MinusSquare,
  Eye,
} from "lucide-react";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { motion, AnimatePresence } from "framer-motion";
import ExportControls from "@/components/ExportControls/ExportControls";

// Función para obtener casos excluidos del localStorage
const getExcludedCases = (surveyId) => {
  if (typeof window === "undefined") return [];
  try {
    const key = `survey:${surveyId}:excluded-cases`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error reading excluded cases:", e);
    return [];
  }
};

// Función para guardar casos excluidos en localStorage
const saveExcludedCases = (surveyId, excludedIds) => {
  if (typeof window === "undefined") return;
  try {
    const key = `survey:${surveyId}:excluded-cases`;
    localStorage.setItem(key, JSON.stringify(excludedIds));
    // NO disparar evento inmediatamente para evitar re-renders
    // El evento de storage natural se disparará para otras pestañas
  } catch (e) {
    console.error("Error saving excluded cases:", e);
  }
};

// Función para formatear fecha
const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

// Función para formatear hora
const formatTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

export default function EditarBase() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id;

  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de selección
  const [excludedCases, setExcludedCases] = useState([]);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPollster, setFilterPollster] = useState("all");
  const [filterObserved, setFilterObserved] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Mostrar 50 casos por página

  // Estados para modal de detalles
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Cargar datos iniciales
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

    const fetchData = async () => {
      try {
        if (!checkPermissions()) return;

        setIsLoading(true);
        const data = await surveyService.getSurveyWithAnswers(surveyId);
        setSurvey(data.survey);
        setAnswers(data.answers || []);

        // Cargar casos excluidos desde localStorage
        const excluded = getExcludedCases(surveyId);
        setExcludedCases(excluded);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err.message || "Error al cargar los datos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [surveyId, router]);

  // Sincronizar con otras pestañas
  useEffect(() => {
    const handleStorageChange = (e) => {
      const key = `survey:${surveyId}:excluded-cases`;
      if (e.key === key && e.newValue) {
        try {
          const newExcluded = JSON.parse(e.newValue);
          setExcludedCases(newExcluded);
        } catch (err) {
          console.error("Error syncing excluded cases:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [surveyId]);

  // Obtener lista de encuestadores únicos
  const pollsters = useMemo(() => {
    const unique = [...new Set(answers.map((a) => a.fullName))].filter(Boolean);
    return unique.sort();
  }, [answers]);

  // Ordenar respuestas por fecha (más recientes primero)
  const sortedAnswers = useMemo(() => {
    return [...answers].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA; // Orden descendente
    });
  }, [answers]);

  // Filtrar respuestas
  const filteredAnswers = useMemo(() => {
    return sortedAnswers.filter((answer) => {
      // Filtro de búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesId = answer._id?.toLowerCase().includes(search);
        const matchesName = answer.fullName?.toLowerCase().includes(search);
        const matchesObservation = answer.observation
          ?.toLowerCase()
          .includes(search);
        if (!matchesId && !matchesName && !matchesObservation) return false;
      }

      // Filtro de encuestador
      if (filterPollster !== "all" && answer.fullName !== filterPollster) {
        return false;
      }

      // Filtro de observados
      if (filterObserved === "observed" && !answer.observation) return false;
      if (filterObserved === "normal" && answer.observation) return false;

      return true;
    });
  }, [sortedAnswers, searchTerm, filterPollster, filterObserved]);

  // Guardar en localStorage cuando cambien los excludedCases
  useEffect(() => {
    if (surveyId) {
      saveExcludedCases(surveyId, excludedCases);
    }
  }, [excludedCases, surveyId]);

  // Manejar selección/deselección individual
  const toggleCase = useCallback((caseId) => {
    setExcludedCases((prev) => {
      if (prev.includes(caseId)) {
        return prev.filter((id) => id !== caseId);
      } else {
        return [...prev, caseId];
      }
    });
  }, []);

  // Manejar selección/deselección masiva
  const toggleAll = useCallback(() => {
    const allFilteredIds = filteredAnswers.map((a) => a._id);
    const allExcluded = allFilteredIds.every((id) =>
      excludedCases.includes(id)
    );

    if (allExcluded) {
      // Incluir todos los filtrados
      setExcludedCases((prev) => 
        prev.filter((id) => !allFilteredIds.includes(id))
      );
    } else {
      // Excluir todos los filtrados
      setExcludedCases((prev) => 
        [...new Set([...prev, ...allFilteredIds])]
      );
    }
  }, [filteredAnswers, excludedCases]);

  // Estado del checkbox "seleccionar todos"
  const selectAllState = useMemo(() => {
    if (filteredAnswers.length === 0) return "none";
    const filteredIds = filteredAnswers.map((a) => a._id);
    const includedCount = filteredIds.filter(
      (id) => !excludedCases.includes(id)
    ).length;

    if (includedCount === 0) return "none";
    if (includedCount === filteredIds.length) return "all";
    return "some";
  }, [filteredAnswers, excludedCases]);

  // Resetear selección (incluir todos)
  const resetSelection = useCallback(() => {
    setExcludedCases([]);
  }, []);

  // Contadores
  const includedCount = answers.length - excludedCases.length;
  const filteredIncludedCount = filteredAnswers.filter(
    (a) => !excludedCases.includes(a._id)
  ).length;

  // Calcular casos para exportar (filtrados y no excluidos)
  const answersToExport = useMemo(() => {
    return filteredAnswers.filter((a) => !excludedCases.includes(a._id));
  }, [filteredAnswers, excludedCases]);

  // Paginación
  const totalPages = Math.ceil(filteredAnswers.length / itemsPerPage);
  const paginatedAnswers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAnswers.slice(startIndex, endIndex);
  }, [filteredAnswers, currentPage, itemsPerPage]);

  // Resetear a página 1 cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPollster, filterObserved]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
        <LoaderWrapper text="Cargando base de datos..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">
                Error al cargar
              </h3>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--card-background)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Editar Base de Datos
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {survey?.title || "Encuesta"}
            </p>
          </div>
        </div>

        {/* Estadísticas y controles */}
        <div className="bg-[var(--card-background)] rounded-lg border border-[var(--card-border)] p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">
                  Total de casos
                </p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {answers.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">
                  Incluidos
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {includedCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">
                  Excluidos
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {excludedCases.length}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <ExportControls
                answers={answersToExport}
                titleSurvey={survey?.title}
                surveyId={surveyId}
                preFiltered={true}
              />
              <button
                onClick={resetSelection}
                disabled={excludedCases.length === 0}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Incluir Todos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="mb-4 bg-[var(--card-background)] rounded-lg border border-[var(--card-border)] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Buscar por ID, encuestador u observación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Botón filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-md hover:bg-[var(--card-background)] transition-colors flex items-center gap-2 text-sm"
          >
            <Filter className="w-4 h-4" />
            Filtros
            {(filterPollster !== "all" || filterObserved !== "all") && (
              <span className="w-2 h-2 bg-[var(--primary)] rounded-full"></span>
            )}
          </button>
        </div>

        {/* Panel de filtros expandible */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-[var(--card-border)] flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--text-secondary)] mb-2">
                    Encuestador
                  </label>
                  <select
                    value={filterPollster}
                    onChange={(e) => setFilterPollster(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="all">Todos</option>
                    {pollsters.map((pollster) => (
                      <option key={pollster} value={pollster}>
                        {pollster}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs text-[var(--text-secondary)] mb-2">
                    Estado
                  </label>
                  <select
                    value={filterObserved}
                    onChange={(e) => setFilterObserved(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="all">Todos</option>
                    <option value="normal">Normal</option>
                    <option value="observed">Observados</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contador de resultados filtrados */}
      {filteredAnswers.length < answers.length && (
        <div className="mb-4 text-sm text-[var(--text-secondary)]">
          Mostrando {filteredAnswers.length} de {answers.length} casos
          {filteredIncludedCount < filteredAnswers.length && (
            <span className="ml-2">
              ({filteredIncludedCount} incluidos)
            </span>
          )}
        </div>
      )}

      {/* Tabla - Desktop */}
      <div className="hidden lg:block bg-[var(--card-background)] rounded-lg border border-[var(--card-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--primary-light)] text-white">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    {selectAllState === "all" ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : selectAllState === "some" ? (
                      <MinusSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Encuestador
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Hora
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Ubicación
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Tiempo
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedAnswers.map((answer, index) => {
                const isExcluded = excludedCases.includes(answer._id);
                const isObserved = !!answer.observation;

                return (
                  <tr
                    key={answer._id}
                    className={`border-t border-[var(--card-border)] hover:bg-[var(--background)] transition-colors ${
                      isExcluded ? "opacity-50" : ""
                    } ${isObserved ? "bg-amber-50/50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleCase(answer._id);
                        }}
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        {isExcluded ? (
                          <Square className="w-5 h-5 text-[var(--text-secondary)]" />
                        ) : (
                          <CheckSquare className="w-5 h-5 text-[var(--primary)]" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {isObserved ? (
                        <div
                          className="flex items-center gap-1 text-amber-600"
                          title={answer.observation}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs">Observado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="w-4 h-4" />
                          <span className="text-xs">Normal</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                      {answer.fullName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {formatDate(answer.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {formatTime(answer.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {answer.lat && answer.lng
                        ? `${answer.lat.toFixed(4)}, ${answer.lng.toFixed(4)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {answer.time ? `${answer.time}s` : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] font-mono">
                      {answer._id?.slice(-8) || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedCase(answer);
                          setShowDetailsModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-dark)] transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAnswers.length === 0 && (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            <p>No se encontraron casos con los filtros aplicados</p>
          </div>
        )}
      </div>

      {/* Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {paginatedAnswers.map((answer) => {
          const isExcluded = excludedCases.includes(answer._id);
          const isObserved = !!answer.observation;

          return (
            <motion.div
              key={answer._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-[var(--card-background)] rounded-lg border border-[var(--card-border)] p-4 ${
                isExcluded ? "opacity-50" : ""
              } ${isObserved ? "border-l-4 border-l-amber-500" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleCase(answer._id);
                  }}
                  className="hover:scale-110 transition-transform cursor-pointer"
                >
                  {isExcluded ? (
                    <Square className="w-6 h-6 text-[var(--text-secondary)]" />
                  ) : (
                    <CheckSquare className="w-6 h-6 text-[var(--primary)]" />
                  )}
                </button>

                {isObserved && (
                  <div className="flex items-center gap-1 text-amber-600 text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    Observado
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-[var(--text-secondary)] text-xs">
                    Encuestador:
                  </span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {answer.fullName || "-"}
                  </p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <span className="text-[var(--text-secondary)] text-xs">
                      Fecha:
                    </span>
                    <p className="text-[var(--text-primary)]">
                      {formatDate(answer.createdAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)] text-xs">
                      Hora:
                    </span>
                    <p className="text-[var(--text-primary)]">
                      {formatTime(answer.createdAt)}
                    </p>
                  </div>
                </div>

                {isObserved && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                    <p className="text-amber-800">{answer.observation}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--card-border)]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--text-secondary)]">
                      ID: {answer._id?.slice(-12) || "-"}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCase(answer);
                        setShowDetailsModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-dark)] transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Ver Detalle
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredAnswers.length === 0 && (
          <div className="p-8 text-center text-[var(--text-secondary)] bg-[var(--card-background)] rounded-lg border border-[var(--card-border)]">
            <p>No se encontraron casos con los filtros aplicados</p>
          </div>
        )}
      </div>

      {/* Controles de Paginación */}
      {filteredAnswers.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--card-background)] rounded-lg border border-[var(--card-border)] p-4">
          <div className="text-sm text-[var(--text-secondary)]">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAnswers.length)} de {filteredAnswers.length} casos
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-md hover:bg-[var(--card-background)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Primera
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-md hover:bg-[var(--card-background)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Anterior
            </button>
            
            <div className="px-4 py-2 bg-[var(--primary)] text-white rounded-md text-sm font-medium">
              {currentPage} / {totalPages}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-md hover:bg-[var(--card-background)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Siguiente
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-md hover:bg-[var(--card-background)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Última
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Caso */}
      <AnimatePresence>
        {showDetailsModal && selectedCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowDetailsModal(false);
              setSelectedCase(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--card-background)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)] bg-[var(--primary)] text-white">
                <div>
                  <h3 className="text-lg font-semibold">Detalle del Caso</h3>
                  <p className="text-sm opacity-90">
                    {selectedCase.fullName} - {formatDate(selectedCase.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCase(null);
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido scrolleable */}
              <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-4 space-y-4">
                {/* Información general */}
                <div className="bg-[var(--background)] rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-[var(--text-primary)] mb-3">
                    Información General
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[var(--text-secondary)]">Encuestador:</span>
                      <p className="text-[var(--text-primary)] font-medium">
                        {selectedCase.fullName || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Fecha y Hora:</span>
                      <p className="text-[var(--text-primary)] font-medium">
                        {formatDate(selectedCase.createdAt)} - {formatTime(selectedCase.createdAt)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Tiempo de respuesta:</span>
                      <p className="text-[var(--text-primary)] font-medium">
                        {selectedCase.time ? `${selectedCase.time} segundos` : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">ID del caso:</span>
                      <p className="text-[var(--text-primary)] font-mono text-xs">
                        {selectedCase._id}
                      </p>
                    </div>
                    {(selectedCase.lat && selectedCase.lng) && (
                      <div className="sm:col-span-2">
                        <span className="text-[var(--text-secondary)]">Ubicación:</span>
                        <p className="text-[var(--text-primary)] font-medium">
                          Lat: {selectedCase.lat.toFixed(6)}, Lng: {selectedCase.lng.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observación si existe */}
                {selectedCase.observation && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-amber-900 mb-1">
                          Caso Observado
                        </h5>
                        <p className="text-sm text-amber-800">
                          {selectedCase.observation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Respuestas */}
                <div className="bg-[var(--background)] rounded-lg p-4">
                  <h4 className="font-semibold text-[var(--text-primary)] mb-3">
                    Respuestas
                  </h4>
                  
                  {selectedCase.answer && Object.keys(selectedCase.answer).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(selectedCase.answer).map(([question, answer], idx) => (
                        <div
                          key={idx}
                          className="pb-3 border-b border-[var(--card-border)] last:border-0"
                        >
                          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                            {question}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {typeof answer === "object"
                              ? JSON.stringify(answer, null, 2)
                              : answer || "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">
                      No hay respuestas registradas
                    </p>
                  )}
                </div>
              </div>

              {/* Footer con acciones */}
              <div className="flex items-center justify-between gap-3 p-4 border-t border-[var(--card-border)] bg-[var(--background)]">
                <div className="text-sm text-[var(--text-secondary)]">
                  {excludedCases.includes(selectedCase._id) ? (
                    <span className="text-red-600 font-medium">❌ Caso excluido</span>
                  ) : (
                    <span className="text-green-600 font-medium">✓ Caso incluido</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCase(selectedCase._id);
                    }}
                    className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                      excludedCases.includes(selectedCase._id)
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {excludedCases.includes(selectedCase._id)
                      ? "Incluir Caso"
                      : "Excluir Caso"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedCase(null);
                    }}
                    className="px-4 py-2 bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] rounded-md hover:bg-[var(--hover-bg)] transition-colors text-sm font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

