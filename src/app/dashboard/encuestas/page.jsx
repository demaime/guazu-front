"use client";

import { useEffect, useState, useCallback, useRef } from "react"; // Añadir useCallback y useRef
import { useRouter, useSearchParams } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import {
  getAllSurveysLocal,
  upsertSurveys,
  setLastSync,
} from "@/services/db/pouch";
import { syncPendingResponses } from "@/services/sync";
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

export default function Encuestas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useWindowSize();
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

  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [limit] = useState(10);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [isOutboxSyncing, setIsOutboxSyncing] = useState(false);

  // --- Estados existentes que se mantienen --- //
  const [openMenuId, setOpenMenuId] = useState(null); // Considerar si aún es necesario
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // --- Función de Carga de Datos --- //
  const fetchDataForTab = useCallback(
    async (tabName, page) => {
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
          setError(err.message);
          setDraftSurveysData([]);
        } finally {
          setIsLoading((prev) => ({ ...prev, drafts: false }));
        }
        return;
      }

      setIsLoading((prev) => ({ ...prev, [tabName]: true }));
      setError(null);

      try {
        // Si no hay conexión, leer directo de PouchDB
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const local = await getAllSurveysLocal();
          const now = new Date();
          const activeSurveys = local.filter((survey) => {
            if (!survey.surveyInfo?.startDate || !survey.surveyInfo?.endDate) {
              return true;
            }
            const startDate = new Date(survey.surveyInfo.startDate);
            const endDate = new Date(survey.surveyInfo.endDate);
            return now >= startDate && now <= endDate;
          });
          const finishedSurveys = local.filter((survey) => {
            if (!survey.surveyInfo?.startDate || !survey.surveyInfo?.endDate) {
              return false;
            }
            const endDate = new Date(survey.surveyInfo.endDate);
            return now > endDate;
          });
          const filtered =
            tabName === "active" ? activeSurveys : finishedSurveys;
          if (tabName === "active") {
            setActiveSurveysData(filtered);
            setActiveTotalPages(1);
            setActiveCurrentPage(1);
          } else if (tabName === "finished") {
            setFinishedSurveysData(filtered);
            setFinishedTotalPages(1);
            setFinishedCurrentPage(1);
          }
          setTabCounts((prev) => ({
            ...prev,
            active: activeSurveys.length,
            finished: finishedSurveys.length,
          }));
          return;
        }
        const safePage = Math.max(1, page);
        setIsSyncing(true);
        setSyncProgress(10);
        // No enviar status al backend, obtener todas las encuestas y filtrar por fechas en frontend
        const response = await surveyService.getAllSurveys(
          safePage,
          limit,
          null // Sin filtro de status en backend
        );
        setSyncProgress(40);

        // Filtrar encuestas por fechas EN EL FRONT para la UI (pero sólo cacheamos activas)
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

        // Guardar/actualizar índice EN POUCH SÓLO con ACTIVAS
        try {
          await upsertSurveys(activeSurveys);
          await setLastSync(Date.now());
          setSyncProgress(60);
          // Prefetch: descargar detalle completo de encuestas activas para responder offline sin haberlas abierto
          try {
            const activeIds = activeSurveys
              .map((s) => s._id || s.id)
              .filter(Boolean);
            const total = activeIds.length || 1;
            let done = 0;
            for (const id of activeIds) {
              try {
                await surveyService.getSurvey(id); // este método guarda el detalle en Pouch automáticamente
              } catch (e) {
                console.warn(
                  "[Prefetch] detalle encuesta fallo",
                  id,
                  e?.message
                );
              }
              done += 1;
              setSyncProgress(60 + Math.round((done / total) * 40));
            }
          } catch (e) {
            console.warn("[Prefetch] no se pudo predescargar detalles", e);
          }
          // Prefetch del RSC de la página estable de responder para primer uso offline
          try {
            router.prefetch("/dashboard/encuestas/responder");
          } catch {}
          // Verificación inmediata de lectura
          const verify = await getAllSurveysLocal();
          console.log("[Pouch] verify local after upsert rows=", verify.length);
        } catch (e) {
          console.warn("[Pouch] save/verify failed", e);
        }
      } catch (err) {
        console.error(`Error loading data for tab ${tabName}:`, err);
        setError(err.message);
        if (tabName === "active") {
          setActiveSurveysData([]);
          setActiveTotalPages(0);
        } else if (tabName === "finished") {
          setFinishedSurveysData([]);
          setFinishedTotalPages(0);
        }
      } finally {
        setIsLoading((prev) => ({ ...prev, [tabName]: false }));
        setTimeout(() => {
          setIsSyncing(false);
          setSyncProgress(0);
        }, 300);
      }
    },
    [limit]
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

  // Monitorear red y contar pendientes
  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    let timer;
    const refreshPending = async () => {
      try {
        const { getPendingResponses } = await import("@/services/db/outbox");
        const rows = await getPendingResponses();
        setPendingCount(rows.length);
      } catch {}
    };
    refreshPending();
    timer = setInterval(refreshPending, 4000);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      clearInterval(timer);
    };
  }, []);

  // Sincronización manual/automática de pendientes
  const performOutboxSync = useCallback(async () => {
    if (isOutboxSyncing) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.info("No fue posible sincronizar: sin conexión.");
      return;
    }
    setIsOutboxSyncing(true);
    try {
      const { synced, total } = await syncPendingResponses();
      if (synced > 0) {
        toast.success(`Sincronización completada (${synced}/${total}).`);
        // Recargar datos visibles para el pollster
        await fetchDataForTab("active", 1);
      } else {
        toast.info("No hay elementos para sincronizar.");
      }
    } catch (e) {
      toast.error("Error de sincronización. Inténtalo nuevamente.");
    } finally {
      setIsOutboxSyncing(false);
    }
  }, [fetchDataForTab, isOutboxSyncing]);

  // Auto-sync al recuperar conexión (sólo en transición offline -> online)
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (wasOnlineRef.current === false && isOnline === true) {
      if (pendingCount > 0 && !isOutboxSyncing) {
        performOutboxSync();
      }
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, pendingCount, isOutboxSyncing, performOutboxSync]);

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
      {/* Barra de estado (offline / pendientes) */}
      {(!isOnline || pendingCount > 0) && (
        <div
          className={`mb-2 p-3 rounded-md border flex items-center justify-between gap-4 ${
            !isOnline
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
            <div>
              {!isOnline ? (
                <>
                  <strong>Modo offline</strong> · Respuestas pendientes:{" "}
                  {pendingCount}
                </>
              ) : (
                <>Respuestas pendientes: {pendingCount}</>
              )}
            </div>
          </div>
          {isOnline && pendingCount > 0 && (
            <button
              onClick={performOutboxSync}
              className="px-3 py-1 text-sm rounded bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
              disabled={isOutboxSyncing}
            >
              {isOutboxSyncing ? "Sincronizando…" : "Sincronizar"}
            </button>
          )}
        </div>
      )}
      {isSyncing && (
        <div className="mb-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Descargando encuestas…</span>
            <span className="text-xs">{syncProgress}%</span>
          </div>
          <div className="h-2 w-full bg-blue-100 rounded">
            <div
              className="h-2 bg-blue-500 rounded transition-all"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        </div>
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
          {!(
            user?.role === "POLLSTER" &&
            typeof navigator !== "undefined" &&
            !navigator.onLine
          ) && (
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
          )}
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
            {/* Estado de carga */}
            {currentLoadingState && (
              <div className="flex justify-center py-10">
                <Loader size="lg" />
              </div>
            )}

            {/* Mostrar mensaje cuando no hay encuestas */}
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
            {/* Mostrar contenido de encuestas */}
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
    </motion.div>
  );
}
