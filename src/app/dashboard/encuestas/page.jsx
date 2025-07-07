"use client";

import { useEffect, useState, useCallback } from "react"; // Añadir useCallback
import { useRouter, useSearchParams } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { SurveyList } from "@/components/ui/SurveyList";
import { PollsterSurveyList } from "@/components/ui/PollsterSurveyList";
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
  const searchParams = useSearchParams();
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
  const [isRetrying, setIsRetrying] = useState(false); // Nueva bandera para evitar bucles

  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [limit] = useState(10);

  // NEW: Estado para controlar cuando mostrar encuestas offline
  const [showOfflineSurveys, setShowOfflineSurveys] = useState(false);

  // --- Estados existentes que se mantienen --- //
  const [openMenuId, setOpenMenuId] = useState(null); // Considerar si aún es necesario
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Manejo de recuperación de conexión con debounce y prevención de bucles
  useEffect(() => {
    if (isOnline && lastFetchAttempt && !isRetrying) {
      const { tabName, page } = lastFetchAttempt;

      // Prevenir múltiples ejecuciones simultáneas
      setIsRetrying(true);

      // Debounce de 1 segundo para evitar múltiples llamadas rápidas
      const timeoutId = setTimeout(async () => {
        try {
          toast.success("Conexión restaurada - Actualizando datos");
          await fetchDataForTab(tabName, page);
          setLastFetchAttempt(null); // Solo limpiar si fue exitoso
        } catch (error) {
          console.error("Error during network recovery retry:", error);
          // Si falla nuevamente, esperar más tiempo antes del próximo intento
          setTimeout(() => setIsRetrying(false), 5000); // 5 segundos de espera
          return;
        }
        setIsRetrying(false);
      }, 1000);

      return () => {
        clearTimeout(timeoutId);
        setIsRetrying(false);
      };
    }
  }, [isOnline, lastFetchAttempt, isRetrying]);

  // --- REORDENADO: Función para cargar datos offline --- //
  // Definida ANTES de fetchDataForTab para evitar ReferenceError
  const loadOfflineDataForTab = useCallback(
    async (tabName) => {
      if (!isInitialized || !offlineSurveys) return;

      setIsLoading((prev) => ({ ...prev, [tabName]: true }));
      setError(null);

      try {
        console.log("Loading offline surveys:", offlineSurveys);

        if (tabName === "drafts") {
          setDraftSurveysData([]);
          setTabCounts((prev) => ({ ...prev, drafts: 0 }));
        } else {
          const now = new Date();
          const filteredSurveys = offlineSurveys.filter((offlineSurvey) => {
            console.log("Processing offline survey:", offlineSurvey);
            if (
              !offlineSurvey.surveyInfo ||
              !offlineSurvey.surveyInfo.startDate ||
              !offlineSurvey.surveyInfo.endDate
            ) {
              return tabName === "active";
            }
            const startDate = new Date(offlineSurvey.surveyInfo.startDate);
            const endDate = new Date(offlineSurvey.surveyInfo.endDate);
            const isWithinDateRange = now >= startDate && now <= endDate;
            const isActive = isWithinDateRange;
            console.log(
              `Survey ${offlineSurvey.title}: isActive=${isActive}, tabName=${tabName} (offline mode - no progress tracking)`
            );
            return tabName === "active" ? isActive : !isActive;
          });

          console.log(`Filtered ${tabName} offline surveys:`, filteredSurveys);

          const formattedSurveys = filteredSurveys.map((offlineSurvey) => ({
            _id: offlineSurvey.surveyId,
            title: offlineSurvey.title,
            description: offlineSurvey.description,
            survey: offlineSurvey.survey,
            surveyInfo: offlineSurvey.surveyInfo,
            availableOffline: true,
          }));

          if (tabName === "active") {
            setActiveSurveysData(formattedSurveys);
            setActiveTotalPages(1);
            setActiveCurrentPage(1);
          } else if (tabName === "finished") {
            setFinishedSurveysData(formattedSurveys);
            setFinishedTotalPages(1);
            setFinishedCurrentPage(1);
          }

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

  // --- Función de Carga de Datos --- //
  const fetchDataForTab = useCallback(
    async (tabName, page) => {
      if (isOffline && showOfflineSurveys) {
        console.log(`Loading ${tabName} from offline storage`);
        await loadOfflineDataForTab(tabName);
        return;
      }
      if (isOffline && !showOfflineSurveys) {
        console.log(
          `Offline but not showing offline surveys yet for ${tabName}`
        );
        return;
      }

      if (tabName === "drafts") {
        setIsLoading((prev) => ({ ...prev, drafts: true }));
        setError(null);
        try {
          const response = await surveyService.getDrafts();
          const drafts = response.drafts || [];
          setDraftSurveysData(drafts);
          setTabCounts((prev) => ({ ...prev, drafts: drafts.length }));
        } catch (err) {
          console.error(`Error loading data for tab drafts:`, err);
          const isNetworkError =
            isOffline ||
            err.message?.includes("fetch") ||
            err.message?.includes("Network") ||
            err.message?.includes("Failed to fetch");
          if (isNetworkError) {
            if (!isRetrying) {
              setLastFetchAttempt({ tabName, page });
            }
            console.log("Network error detected, staying offline mode");
          } else {
            setError(err.message);
            setDraftSurveysData([]);
          }
        } finally {
          setIsLoading((prev) => ({ ...prev, drafts: false }));
        }
        return;
      }

      setIsLoading((prev) => ({ ...prev, [tabName]: true }));
      setError(null);

      try {
        const safePage = Math.max(1, page);
        // No enviar status al backend, obtener todas las encuestas y filtrar por fechas en frontend
        const response = await surveyService.getAllSurveys(
          safePage,
          limit,
          null // Sin filtro de status en backend
        );

        // Filtrar encuestas por fechas en el frontend
        const now = new Date();
        const allSurveys = response.surveys || [];

        const activeSurveys = allSurveys.filter((survey) => {
          if (!survey.surveyInfo?.startDate || !survey.surveyInfo?.endDate) {
            // Si no tiene fechas definidas, considerar como activa
            return true;
          }
          const startDate = new Date(survey.surveyInfo.startDate);
          const endDate = new Date(survey.surveyInfo.endDate);
          return now >= startDate && now <= endDate;
        });

        const finishedSurveys = allSurveys.filter((survey) => {
          if (!survey.surveyInfo?.startDate || !survey.surveyInfo?.endDate) {
            // Si no tiene fechas definidas, no incluir en finalizadas
            return false;
          }
          const startDate = new Date(survey.surveyInfo.startDate);
          const endDate = new Date(survey.surveyInfo.endDate);
          return now > endDate;
        });

        // Asignar las encuestas filtradas según la pestaña solicitada
        const filteredSurveys =
          tabName === "active" ? activeSurveys : finishedSurveys;

        if (tabName === "active") {
          setActiveSurveysData(filteredSurveys);
          setActiveTotalPages(response.totalPages || 0);
          setActiveCurrentPage(response.currentPage || 1);
        } else if (tabName === "finished") {
          setFinishedSurveysData(filteredSurveys);
          setFinishedTotalPages(response.totalPages || 0);
          setFinishedCurrentPage(response.currentPage || 1);
        }

        // Actualizar contadores con los valores filtrados por fecha, no del backend
        setTabCounts((prev) => ({
          ...prev,
          active: activeSurveys.length,
          finished: finishedSurveys.length,
        }));
      } catch (err) {
        console.error(`Error loading data for tab ${tabName}:`, err);
        const isNetworkError =
          isOffline ||
          err.message?.includes("fetch") ||
          err.message?.includes("Network") ||
          err.message?.includes("Failed to fetch");
        if (isNetworkError) {
          if (!isRetrying) {
            setLastFetchAttempt({ tabName, page });
          }
          console.log("Network error detected, staying offline mode");
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
    [limit, isOffline, showOfflineSurveys, isRetrying, loadOfflineDataForTab]
  );

  // --- useEffect para Carga Inicial --- //
  useEffect(() => {
    const userData = authService.getUser();
    if (!userData) {
      router.replace("/login");
      return;
    }
    setUser(userData);
    fetchDataForTab("active", 1);
    fetchDataForTab("drafts", 1);
  }, [fetchDataForTab, router]);

  // --- useEffect para manejar cambios en datos offline --- //
  useEffect(() => {
    if (isOffline && isInitialized && offlineSurveys && showOfflineSurveys) {
      console.log(
        "Offline state detected and showOfflineSurveys is true, loading offline surveys for current tab"
      );
      loadOfflineDataForTab(activeTab);
    }
  }, [
    isOffline,
    isInitialized,
    offlineSurveys,
    activeTab,
    showOfflineSurveys,
    loadOfflineDataForTab,
  ]);

  // --- useEffect para detectar parámetro showOffline en URL --- //
  useEffect(() => {
    const showOfflineParam = searchParams.get("showOffline");
    if (showOfflineParam === "true" && isOffline && isInitialized) {
      console.log(
        "URL parameter showOffline=true detected, showing offline surveys"
      );
      setShowOfflineSurveys(true);
      // Limpiar el parámetro de la URL sin causar navegación
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete("showOffline");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [searchParams, isOffline, isInitialized]);

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
    if (!surveyId) {
      console.error("No se proporcionó surveyId para eliminar respuestas");
      return;
    }

    try {
      const tabToReload = activeTab;
      const pageToReload =
        tabToReload === "active" ? activeCurrentPage : finishedCurrentPage;
      setIsLoading((prev) => ({ ...prev, [tabToReload]: true }));

      const result = await surveyService.deleteAnswers(surveyId);

      if (result.noAnswersFound) {
        toast.info("No se encontraron respuestas para eliminar.");
      } else if (result.success) {
        toast.success(result.message || "Respuestas eliminadas con éxito");
        // Recargar datos después de eliminar respuestas
        await fetchDataForTab(tabToReload, pageToReload);
      } else {
        console.error("Error deleting answers:", result.message);
        toast.error(result.message || "Error al eliminar las respuestas");
        setError(result.message);
      }
    } catch (err) {
      console.error("Unexpected error in handleDeleteAnswers:", err);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
      setError(err.message);
    } finally {
      setIsLoading((prev) => ({ ...prev, [activeTab]: false }));
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
          {user?.role === "POLLSTER" ? "Mis Encuestas" : "Encuestas"}
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
            {/* Mostrar botón de encuestas offline cuando esté offline y no se hayan cargado */}
            {isOffline && !showOfflineSurveys && activeTab !== "drafts" && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <WifiOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    Sin conexión a internet
                  </h3>
                  <p className="text-[var(--text-secondary)] mb-6">
                    No hay conexión disponible para cargar las encuestas desde
                    el servidor.
                  </p>
                  <button
                    onClick={() => {
                      setShowOfflineSurveys(true);
                      fetchDataForTab(activeTab, 1);
                    }}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <WifiOff className="w-5 h-5" />
                    Mostrar encuestas disponibles sin conexión
                  </button>
                </div>
              </div>
            )}

            {/* Mostrar estado de carga cuando esté offline y se estén cargando las encuestas */}
            {isOffline && showOfflineSurveys && currentLoadingState && (
              <div className="flex justify-center py-10">
                <Loader size="lg" />
              </div>
            )}

            {/* Estado de carga normal (online) */}
            {!isOffline && currentLoadingState && (
              <div className="flex justify-center py-10">
                <Loader size="lg" />
              </div>
            )}

            {/* Mostrar mensaje cuando no hay encuestas */}
            {!currentLoadingState &&
              currentSurveys.length === 0 &&
              !(isOffline && !showOfflineSurveys && activeTab !== "drafts") && (
                <p className="text-[var(--text-secondary)] italic text-center py-4">
                  No hay encuestas{" "}
                  {activeTab === "drafts"
                    ? "borradores"
                    : activeTab === "active"
                    ? "activas"
                    : "finalizadas"}{" "}
                  {isOffline && showOfflineSurveys
                    ? "disponibles offline"
                    : "disponibles"}
                  .
                </p>
              )}
            {/* Mostrar contenido de encuestas */}
            {!currentLoadingState &&
              currentSurveys.length > 0 &&
              !(isOffline && !showOfflineSurveys && activeTab !== "drafts") &&
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
              ) : // Renderizado para activas y finalizadas - diferentes para pollsters
              user?.role === "POLLSTER" ? (
                <PollsterSurveyList
                  surveys={currentSurveys}
                  isFinished={activeTab === "finished"}
                  currentUser={user}
                />
              ) : (
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
          currentTotalPages > 1 &&
          !(isOffline && !showOfflineSurveys) && (
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
