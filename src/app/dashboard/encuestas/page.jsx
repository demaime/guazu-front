"use client";

import { useEffect, useState, useCallback } from "react"; // Añadir useCallback
import { useRouter } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { SurveyList } from "@/components/ui/SurveyList";
import {
  Plus,
  ChevronDown,
  FilePenLine,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useWindowSize } from "@/hooks/useWindowSize";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { Loader } from "@/components/ui/Loader";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePouchDB } from "@/hooks/usePouchDB";
import {
  OfflineIndicator,
  OfflineDownloadButton,
} from "@/components/ui/OfflineIndicator";

export default function Encuestas() {
  const router = useRouter();
  const { isMobile } = useWindowSize();
  const { isOnline, isOffline } = useNetworkStatus();
  const { offlineSurveys, isInitialized } = usePouchDB();
  const [activeTab, setActiveTab] = useState("active"); // 'active', 'finished', 'drafts'

  // --- Estados por Pestaña --- //
  const [activeSurveysData, setActiveSurveysData] = useState([]);
  const [finishedSurveysData, setFinishedSurveysData] = useState([]);
  const [draftSurveysData, setDraftSurveysData] = useState([]);

  const [activeCurrentPage, setActiveCurrentPage] = useState(1);
  const [finishedCurrentPage, setFinishedCurrentPage] = useState(1);

  const [activeTotalPages, setActiveTotalPages] = useState(0);
  const [finishedTotalPages, setFinishedTotalPages] = useState(0);

  const [tabCounts, setTabCounts] = useState({
    active: 0,
    finished: 0,
    drafts: 0,
  });

  const [isLoading, setIsLoading] = useState({
    // Loading por tab
    active: true,
    finished: true,
    drafts: true,
  });

  // Offline state management - usar useNetworkStatus
  const [lastFetchAttempt, setLastFetchAttempt] = useState(null);

  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [limit] = useState(10);

  // --- Estados existentes que se mantienen --- //
  const [openMenuId, setOpenMenuId] = useState(null); // Considerar si aún es necesario
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Manejo de recuperación de conexión
  useEffect(() => {
    if (isOnline && lastFetchAttempt) {
      const { tabName, page } = lastFetchAttempt;
      toast.success("Conexión restaurada - Actualizando datos");
      fetchDataForTab(tabName, page);
      setLastFetchAttempt(null);
    }
  }, [isOnline, lastFetchAttempt]);

  // --- Función de Carga de Datos --- //
  // Usamos useCallback para evitar re-crear la función en cada render
  const fetchDataForTab = useCallback(
    async (tabName, page) => {
      // If offline, load from offline storage
      if (isOffline) {
        console.log(`Loading ${tabName} from offline storage`);
        await loadOfflineDataForTab(tabName);
        return;
      }

      // Borradores usan un endpoint diferente
      if (tabName === "drafts") {
        setIsLoading((prev) => ({ ...prev, drafts: true }));
        setError(null);
        try {
          const response = await surveyService.getDrafts();
          console.log(`Response for tab drafts:`, response);
          const drafts = response.drafts || [];
          setDraftSurveysData(drafts);
          setTabCounts((prev) => ({ ...prev, drafts: drafts.length }));
        } catch (err) {
          console.error(`Error loading data for tab drafts:`, err);

          // Check if it's a network error
          const isNetworkError =
            isOffline ||
            err.message?.includes("fetch") ||
            err.message?.includes("Network") ||
            err.message?.includes("Failed to fetch");

          if (isNetworkError) {
            setLastFetchAttempt({ tabName, page });
            console.log("Network error detected, staying offline mode");
            // Don't clear data when offline, keep existing data
          } else {
            setError(err.message);
            setDraftSurveysData([]);
          }
        } finally {
          setIsLoading((prev) => ({ ...prev, drafts: false }));
        }
        return; // Salir temprano para borradores
      }

      // Para activas y finalizadas
      const currentStatus = tabName; // 'active' o 'finished'
      setIsLoading((prev) => ({ ...prev, [tabName]: true }));
      setError(null);

      try {
        // Asegurarse que la página sea válida
        const safePage = Math.max(1, page);
        const response = await surveyService.getAllSurveys(
          safePage,
          limit,
          currentStatus
        );
        console.log(`Response for tab ${tabName}, page ${safePage}:`, response);

        if (tabName === "active") {
          setActiveSurveysData(response.surveys || []);
          setActiveTotalPages(response.totalPages || 0);
          setActiveCurrentPage(response.currentPage || 1);
        } else if (tabName === "finished") {
          setFinishedSurveysData(response.surveys || []);
          setFinishedTotalPages(response.totalPages || 0);
          setFinishedCurrentPage(response.currentPage || 1);
        }
        // Actualizar los conteos globales con la info de la respuesta
        if (response.totalCounts) {
          setTabCounts((prev) => ({
            ...prev,
            active: response.totalCounts.active ?? prev.active,
            finished: response.totalCounts.finished ?? prev.finished,
          }));
        }
      } catch (err) {
        console.error(`Error loading data for tab ${tabName}:`, err);

        // Check if it's a network error
        const isNetworkError =
          isOffline ||
          err.message?.includes("fetch") ||
          err.message?.includes("Network") ||
          err.message?.includes("Failed to fetch");

        if (isNetworkError) {
          setLastFetchAttempt({ tabName, page });
          console.log("Network error detected, staying offline mode");
          // Don't clear data when offline, keep existing data
        } else {
          setError(err.message);
          if (tabName === "active") {
            setActiveSurveysData([]);
            setActiveTotalPages(0);
          } else if (tabName === "finished") {
            setFinishedSurveysData([]);
            setFinishedTotalPages(0);
          }
        }
      } finally {
        setIsLoading((prev) => ({ ...prev, [tabName]: false }));
      }
    },
    [limit, isOffline, offlineSurveys]
  ); // useCallback dependency

  // --- Función para cargar datos offline --- //
  const loadOfflineDataForTab = useCallback(
    async (tabName) => {
      if (!isInitialized || !offlineSurveys) return;

      setIsLoading((prev) => ({ ...prev, [tabName]: true }));
      setError(null);

      try {
        console.log("Loading offline surveys:", offlineSurveys);

        if (tabName === "drafts") {
          // Los borradores no están disponibles offline por el momento
          setDraftSurveysData([]);
          setTabCounts((prev) => ({ ...prev, drafts: 0 }));
        } else {
          // Filtrar encuestas offline por estado (activas/finalizadas)
          const now = new Date();
          const filteredSurveys = offlineSurveys.filter((offlineSurvey) => {
            console.log("Processing offline survey:", offlineSurvey);

            // Si no hay surveyInfo, incluir en activas por defecto
            if (
              !offlineSurvey.surveyInfo ||
              !offlineSurvey.surveyInfo.startDate ||
              !offlineSurvey.surveyInfo.endDate
            ) {
              console.log("No surveyInfo or dates, including in active");
              return tabName === "active";
            }

            const startDate = new Date(offlineSurvey.surveyInfo.startDate);
            const endDate = new Date(offlineSurvey.surveyInfo.endDate);
            const isActive = now >= startDate && now <= endDate;

            console.log(
              `Survey ${offlineSurvey.title}: isActive=${isActive}, tabName=${tabName}`
            );

            return tabName === "active" ? isActive : !isActive;
          });

          console.log(`Filtered ${tabName} offline surveys:`, filteredSurveys);

          // Convertir formato offline a formato esperado por la UI
          const formattedSurveys = filteredSurveys.map((offlineSurvey) => ({
            _id: offlineSurvey.surveyId,
            title: offlineSurvey.title,
            description: offlineSurvey.description,
            survey: offlineSurvey.survey,
            surveyInfo: offlineSurvey.surveyInfo,
            availableOffline: true, // Marcar como disponible offline
            totalAnswers: 0, // En offline no tenemos respuestas sincronizadas
          }));

          if (tabName === "active") {
            setActiveSurveysData(formattedSurveys);
            setActiveTotalPages(1); // En offline solo mostramos una página
            setActiveCurrentPage(1);
          } else if (tabName === "finished") {
            setFinishedSurveysData(formattedSurveys);
            setFinishedTotalPages(1); // En offline solo mostramos una página
            setFinishedCurrentPage(1);
          }

          // Actualizar conteos
          setTabCounts((prev) => ({
            ...prev,
            [tabName]: formattedSurveys.length,
          }));
        }

        console.log(`Loaded ${tabName} offline data successfully`);
      } catch (err) {
        console.error(`Error loading offline data for ${tabName}:`, err);
        setError("Error al cargar datos offline");
      } finally {
        setIsLoading((prev) => ({ ...prev, [tabName]: false }));
      }
    },
    [isInitialized, offlineSurveys]
  );

  // --- useEffect para Carga Inicial --- //
  useEffect(() => {
    const userData = authService.getUser();
    if (!userData) {
      router.replace("/login");
      return;
    }
    setUser(userData);
    // Cargar datos iniciales para la primera pestaña (activas) y borradores
    fetchDataForTab("active", 1);
    fetchDataForTab("drafts", 1); // Carga inicial de borradores (page no usada)
  }, [fetchDataForTab, router]); // Incluir fetchDataForTab y router

  // --- useEffect para manejar cambios en datos offline --- //
  useEffect(() => {
    if (isOffline && isInitialized && offlineSurveys) {
      console.log(
        "Offline state detected, loading offline surveys for current tab"
      );
      loadOfflineDataForTab(activeTab);
    }
  }, [
    isOffline,
    isInitialized,
    offlineSurveys,
    activeTab,
    loadOfflineDataForTab,
  ]);

  // --- useEffect para Cambios de Tab --- //
  useEffect(() => {
    // Cargar datos cuando cambia la pestaña activa.
    // La función fetchDataForTab manejará el estado isLoading internamente.
    if (activeTab === "active") {
      setActiveCurrentPage(1); // Resetear a página 1
      fetchDataForTab("active", 1);
    } else if (activeTab === "finished") {
      setFinishedCurrentPage(1); // Resetear a página 1
      fetchDataForTab("finished", 1);
    } else if (activeTab === "drafts") {
      // Los borradores no tienen paginación propia aquí
      fetchDataForTab("drafts", 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchDataForTab]); // Quitar isLoading de las condiciones if

  /* ELIMINAR ESTOS UseEffects separados para evitar llamadas dobles
  useEffect(() => {
    if (activeTab === 'active' && !isLoading.active) {
       fetchDataForTab('active', activeCurrentPage);
    }
  }, [activeCurrentPage]); 

 useEffect(() => {
    if (activeTab === 'finished' && !isLoading.finished) {
       fetchDataForTab('finished', finishedCurrentPage);
    }
  }, [finishedCurrentPage]); 
  */

  // --- Handlers --- //
  const handleDelete = async (surveyId) => {
    setSelectedSurveyId(surveyId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedSurveyId) return;
    try {
      setIsConfirmLoading(true);
      const tabWhereSurveyWas = draftSurveysData.some(
        (d) => d._id === selectedSurveyId
      )
        ? "drafts"
        : activeSurveysData.some((a) => a._id === selectedSurveyId)
        ? "active"
        : "finished";

      setIsLoading((prev) => ({ ...prev, [tabWhereSurveyWas]: true }));
      await surveyService.deleteSurvey(selectedSurveyId);

      // Forzar recarga explícita aquí es más seguro que depender de useEffects complejos
      const pageToReload =
        tabWhereSurveyWas === "active"
          ? activeCurrentPage
          : tabWhereSurveyWas === "finished"
          ? finishedCurrentPage
          : 1;
      await fetchDataForTab(tabWhereSurveyWas, pageToReload);
      // Siempre recargar counts de borradores por si acaso
      if (tabWhereSurveyWas !== "drafts") await fetchDataForTab("drafts", 1);

      toast.success("Encuesta eliminada correctamente");
    } catch (err) {
      setError(err.message);
      toast.error("Error al eliminar la encuesta");
    } finally {
      setIsConfirmLoading(false);
      setShowDeleteModal(false);
      setSelectedSurveyId(null);
    }
  };

  const handlePublishDraft = async (draftId) => {
    setSelectedSurveyId(draftId);
    setShowPublishModal(true);
  };

  const confirmPublish = async () => {
    if (!selectedSurveyId) return;
    try {
      setIsConfirmLoading(true);
      setIsLoading((prev) => ({
        ...prev,
        drafts: true,
        active: true,
        finished: true,
      }));
      await surveyService.publishDraft(selectedSurveyId);
      // Recargar todo explícitamente
      await fetchDataForTab("drafts", 1);
      await fetchDataForTab("active", 1);
      await fetchDataForTab("finished", 1);
      setActiveTab("active");
      setActiveCurrentPage(1);
      setFinishedCurrentPage(1); // Resetear ambas páginas
      toast.success("Borrador publicado correctamente");
    } catch (err) {
      console.error("Error al publicar borrador:", err);
      toast.error(err.message || "Error al publicar el borrador");
    } finally {
      setIsConfirmLoading(false);
      setShowPublishModal(false);
      setSelectedSurveyId(null);
    }
  };

  const handleEditDraft = (draftId) => {
    router.push(`/dashboard/encuestas/${draftId}/editar`);
  };

  const handleDeleteAnswers = async (surveyId) => {
    if (!selectedSurveyId) return;
    try {
      const tabToReload = activeTab;
      const pageToReload =
        tabToReload === "active" ? activeCurrentPage : finishedCurrentPage;
      setIsLoading((prev) => ({ ...prev, [tabToReload]: true }));
      const result = await surveyService.deleteAnswers(surveyId);
      if (result.noAnswersFound) {
        toast.info("No se encontraron respuestas para eliminar.");
        setIsLoading((prev) => ({ ...prev, [tabToReload]: false }));
      } else if (result.success) {
        toast.success(result.message || "Respuestas eliminadas con éxito");
        await fetchDataForTab(tabToReload, pageToReload); // Recargar explícitamente
      } else {
        console.error("Error deleting answers:", result.message);
        toast.error(result.message || "Error al eliminar las respuestas");
        setError(result.message);
        setIsLoading((prev) => ({ ...prev, [tabToReload]: false }));
      }
    } catch (err) {
      console.error("Unexpected error in handleDeleteAnswers:", err);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
      setError(err.message);
      setIsLoading((prev) => ({ ...prev, [activeTab]: false }));
    } finally {
      setSelectedSurveyId(null);
    }
  };

  // --- Helper para Cambiar Página (LLAMAR A FETCH DIRECTAMENTE) --- //
  const handlePageChange = (newPage) => {
    if (activeTab === "active") {
      if (
        newPage >= 1 &&
        newPage <= activeTotalPages &&
        newPage !== activeCurrentPage
      ) {
        setActiveCurrentPage(newPage);
        fetchDataForTab("active", newPage); // <<< LLAMAR FETCH
      }
    } else if (activeTab === "finished") {
      if (
        newPage >= 1 &&
        newPage <= finishedTotalPages &&
        newPage !== finishedCurrentPage
      ) {
        setFinishedCurrentPage(newPage);
        fetchDataForTab("finished", newPage); // <<< LLAMAR FETCH
      }
    }
  };

  // --- Determinar datos y estado de paginación actual basado en activeTab --- //
  let currentSurveys = [];
  let currentTotalPages = 0;
  let currentLoadingState = false;
  let currentPageForDisplay = 1;
  let currentCountForTab = 0; // Para mostrar en la tab

  if (activeTab === "active") {
    currentSurveys = activeSurveysData;
    currentTotalPages = activeTotalPages;
    currentLoadingState = isLoading.active;
    currentPageForDisplay = activeCurrentPage;
    currentCountForTab = tabCounts.active;
  } else if (activeTab === "finished") {
    currentSurveys = finishedSurveysData;
    currentTotalPages = finishedTotalPages;
    currentLoadingState = isLoading.finished;
    currentPageForDisplay = finishedCurrentPage;
    currentCountForTab = tabCounts.finished;
  } else if (activeTab === "drafts") {
    currentSurveys = draftSurveysData;
    currentTotalPages = 0; // No paginación para drafts
    currentLoadingState = isLoading.drafts;
    currentPageForDisplay = 1;
    currentCountForTab = tabCounts.drafts;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 p-4"
    >
      {/* --- Offline Status Indicator --- */}
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-md"
        >
          <div className="flex items-center">
            <WifiOff className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <p className="text-yellow-800 font-medium">Modo offline</p>
              <p className="text-sm text-yellow-700 mt-1">
                Mostrando datos guardados localmente. Los cambios se
                sincronizarán cuando se restaure la conexión.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- Encabezado --- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]"
        >
          Encuestas
        </motion.h1>
        {user?.role === "ROLE_ADMIN" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // Podríamos querer guardar el estado actual antes de navegar
              // o resetear algo al volver. Por ahora, navegación simple.
              router.push("/dashboard/encuestas/nueva");
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors w-full md:w-auto cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Nueva Encuesta
          </motion.button>
        )}
      </motion.div>

      {/* --- Contenedor Principal Tabs --- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-lg bg-[var(--background)] border border-[var(--card-border)] px-4 py-4 md:px-5 md:py-6 shadow-sm"
      >
        {/* --- Error Display --- */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 text-red-500 bg-red-100 border border-red-200 rounded-md"
          >
            Error al cargar datos: {error}
          </motion.div>
        )}

        {/* --- Pestañas --- */}
        <div className="flex border-b border-[var(--card-border)] mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "active"
                ? "border-b-2 border-primary text-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Activas ({isLoading.active ? "..." : tabCounts.active})
          </button>
          <button
            onClick={() => setActiveTab("finished")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "finished"
                ? "border-b-2 border-primary text-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Finalizadas ({isLoading.finished ? "..." : tabCounts.finished})
          </button>
          {(user?.role === "ROLE_ADMIN" || user?.role === "SUPERVISOR") && (
            <button
              onClick={() => setActiveTab("drafts")}
              className={`px-4 py-2 font-medium text-sm flex items-center ${
                activeTab === "drafts"
                  ? "border-b-2 border-primary text-primary"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <FilePenLine className="w-4 h-4 mr-1" />
              Borradores ({isLoading.drafts ? "..." : tabCounts.drafts})
            </button>
          )}
        </div>

        {/* --- Contenido Pestañas --- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab} // Key para que AnimatePresence detecte el cambio
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentLoadingState && (
              <div className="flex justify-center py-10">
                <Loader size="lg" />
              </div>
            )}
            {!currentLoadingState && currentSurveys.length === 0 && (
              <p className="text-[var(--text-secondary)] italic text-center py-4">
                No hay encuestas{" "}
                {activeTab === "drafts"
                  ? "borradores"
                  : activeTab === "active"
                  ? "activas"
                  : "finalizadas"}{" "}
                disponibles.
              </p>
            )}
            {!currentLoadingState &&
              currentSurveys.length > 0 &&
              (activeTab === "drafts" ? (
                // Renderizado específico para borradores
                <div className="space-y-4">
                  {currentSurveys.map((draft) => (
                    <div
                      key={draft._id}
                      className="border border-[var(--card-border)] bg-[var(--card-background)] rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-medium text-[var(--text-primary)]">
                            {draft.survey?.title?.es ||
                              draft.survey?.title ||
                              "Borrador sin título"}
                          </h3>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Última edición:{" "}
                            {draft.lastEdited
                              ? new Date(draft.lastEdited).toLocaleString()
                              : "N/A"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleEditDraft(draft._id)}
                            className="cursor-pointer px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handlePublishDraft(draft._id)}
                            className="cursor-pointer px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Publicar
                          </button>
                          <button
                            onClick={() => handleDelete(draft._id)}
                            className="cursor-pointer px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Renderizado para activas y finalizadas usando SurveyList
                <SurveyList
                  surveys={currentSurveys}
                  role={user?.role}
                  isFinished={activeTab === "finished"}
                  listType={activeTab}
                  onDelete={handleDelete}
                  onDeleteAnswers={handleDeleteAnswers}
                  onEditDraft={handleEditDraft}
                  onPublishDraft={handlePublishDraft}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                />
              ))}
          </motion.div>
        </AnimatePresence>

        {/* --- Controles de Paginación --- */}
        {activeTab !== "drafts" &&
          !currentLoadingState &&
          currentTotalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }} // Aparece rápido después de la lista
              className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-[var(--card-border)]"
            >
              <button
                onClick={() => handlePageChange(currentPageForDisplay - 1)}
                disabled={currentPageForDisplay === 1}
                aria-label="Página anterior"
                className="p-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-[var(--text-secondary)] font-medium">
                Página {currentPageForDisplay} de {currentTotalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPageForDisplay + 1)}
                disabled={currentPageForDisplay === currentTotalPages}
                aria-label="Página siguiente"
                className="p-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
      </motion.div>

      {/* --- Modales --- */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Eliminación"
        confirmButtonClass="bg-red-600 hover:bg-red-700" // Tailwind classes
        isLoading={isConfirmLoading}
      >
        <p>
          ¿Estás seguro de que deseas eliminar esta encuesta? Esta acción no se
          puede deshacer.
        </p>
      </ConfirmModal>
      <ConfirmModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={confirmPublish}
        title="Confirmar Publicación"
        confirmButtonClass="bg-green-600 hover:bg-green-700" // Tailwind classes
        isLoading={isConfirmLoading}
      >
        <p>
          ¿Estás seguro de que deseas publicar este borrador? Una vez publicado,
          será visible para los encuestadores asignados.
        </p>
      </ConfirmModal>

      {/* Indicador offline */}
      <OfflineIndicator />
    </motion.div>
  );
}
