"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react"; // Añadir useCallback, useRef y useMemo
import { useRouter, useSearchParams } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import { tutorialService } from "@/services/tutorial.service";
import { useTutorial } from "@/contexts/TutorialContext";
import { TutorialDriver } from "@/components/TutorialDriver";
import {
  getAllSurveysLocal,
  upsertSurveys,
  replaceAllSurveys,
  setLastSync,
  reconstructIndexesFromDetails,
  safeReplaceAllSurveys,
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
  MapPin,
  RefreshCw,
  Edit,
  Send,
  Trash2,
} from "lucide-react";
import { useWindowSize } from "@/hooks/useWindowSize";
import { motion, AnimatePresence } from "framer-motion";
import Tippy from "@tippyjs/react";
import { toast } from "react-toastify";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { Loader } from "@/components/ui/Loader";
import { trackEvent } from "@/lib/analytics";

export default function Encuestas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useWindowSize();
  const { shouldStartTutorial } = useTutorial();
  const [activeTab, setActiveTab] = useState("active"); // 'active', 'finished', 'drafts'
  const [showTutorial, setShowTutorial] = useState(false);

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
  const [progressRefreshToken, setProgressRefreshToken] = useState(0);
  // Loader inicial a pantalla completa mientras se actualizan encuestas
  const [isInitialLoadingView, setIsInitialLoadingView] = useState(true);
  const [isNavigatingToEdit, setIsNavigatingToEdit] = useState(false);
  // Estado de permisos/estado de ubicación
  const [locationStatus, setLocationStatus] = useState("unknown"); // granted | denied | prompt | unsupported | unknown
  // Flag para evitar toast duplicado en carga inicial
  const fallbackToastShownRef = useRef(false);

  // --- Estados existentes que se mantienen --- //
  const [openMenuId, setOpenMenuId] = useState(null); // Considerar si aún es necesario
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // --- Carga única de todas las encuestas y partición por tabs --- //
  const loadAllSurveys = useCallback(
    async (userData = null) => {
      setError(null);
      setIsLoading({ active: true, finished: true, drafts: true });

      // Usar el usuario pasado como parámetro o el del estado
      const currentUser = userData || user;
      console.log("📊 loadAllSurveys - Usuario actual:", currentUser);

      try {
        // Si offline, leer todo del caché local
        let all = [];
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          all = await getAllSurveysLocal();
          // Fallback: si no hay índices pero sí puede haber detalles, reconstruir
          if (!all || all.length === 0) {
            try {
              await reconstructIndexesFromDetails();
              all = await getAllSurveysLocal();
            } catch {}
          }
        } else {
          // Obtener todas las páginas del backend en una sola pasada
          let page = 1;
          const perPage = 100;
          while (true) {
            const { surveys = [], totalPages = 1 } =
              await surveyService.getAllSurveys(page, perPage, null);
            
            // 🔍 DEBUG
            console.log(`🔍 DEBUG - Página ${page} recibida:`, surveys.length, "encuestas");
            console.log(`🔍 DEBUG - Encuestas de esta página:`, surveys);
            
            all = all.concat(surveys);
            if (page >= totalPages) break;
            page += 1;
          }
          
          console.log("🔍 DEBUG - Total encuestas combinadas:", all.length);
          console.log("🔍 DEBUG - Todas las encuestas:", all);
        }

        const now = new Date();
        const isActive = (s) => {
          const info = s?.surveyInfo || {};
          if (!info.startDate || !info.endDate) return true;
          const sd = new Date(info.startDate);
          const ed = new Date(info.endDate);
          return now >= sd && now <= ed;
        };
        const isFinished = (s) => {
          const info = s?.surveyInfo || {};
          if (!info.startDate || !info.endDate) return false;
          const ed = new Date(info.endDate);
          return now > ed;
        };

        const active = all.filter(isActive);
        const finished = all.filter(isFinished);

        setActiveSurveysData(active);
        setFinishedSurveysData(finished);
        setActiveTotalPages(Math.max(1, Math.ceil(active.length / limit)));
        setFinishedTotalPages(Math.max(1, Math.ceil(finished.length / limit)));
        setActiveCurrentPage(1);
        setFinishedCurrentPage(1);

        // Borradores (solo ADMIN)
        try {
          console.log("🔍 Verificando rol para borradores:", currentUser?.role);
          if (currentUser?.role === "ROLE_ADMIN") {
            console.log("👤 Usuario es ADMIN, cargando borradores...");
            if (typeof navigator !== "undefined" && navigator.onLine) {
              const draftsResp = await surveyService.getDrafts();
              console.log("📦 loadAllSurveys - Respuesta drafts:", draftsResp);
              const drafts = draftsResp.drafts || [];
              console.log(
                "📋 loadAllSurveys - Borradores:",
                drafts.length,
                drafts
              );
              setDraftSurveysData(drafts);
              setTabCounts({
                active: active.length,
                finished: finished.length,
                drafts: drafts.length,
              });
            } else {
              // offline: no intentar drafts
              console.log("📴 Offline - no se cargan borradores");
              setDraftSurveysData([]);
              setTabCounts({
                active: active.length,
                finished: finished.length,
                drafts: 0,
              });
            }
          } else {
            // No admin: no consultar drafts
            console.log(
              "🚫 Usuario no es ADMIN (rol:",
              currentUser?.role,
              "), no se consultan borradores"
            );
            setDraftSurveysData([]);
            setTabCounts({
              active: active.length,
              finished: finished.length,
              drafts: 0,
            });
          }
        } catch (err) {
          console.error("❌ Error cargando borradores:", err);
          setDraftSurveysData([]);
          setTabCounts({
            active: active.length,
            finished: finished.length,
            drafts: 0,
          });
        }

        // Reemplazar completamente el cache con las encuestas actuales del servidor (solo índices)
        try {
          await safeReplaceAllSurveys(active);
          // Registrar la hora de sync solo en la carga inicial
          await setLastSync(Date.now());
          
          // 🔍 DEBUG: Verificar que las cuotas se están guardando
          console.log('📊 Encuestas guardadas en cache:', active.map(s => ({
            id: s._id,
            title: s.survey?.title || s.surveyInfo?.title || 'Sin título',
            hasQuotas: !!(s.surveyInfo?.quotas?.length > 0),
            quotasCount: s.surveyInfo?.quotas?.length || 0,
            quotas: s.surveyInfo?.quotas?.map(q => q.category) || []
          })));
        } catch {}

        // Reset flag si la carga fue exitosa
        fallbackToastShownRef.current = false;
      } catch (e) {
        console.error("loadAllSurveys error", e);

        // Intentar cargar desde caché como fallback
        try {
          const cached = await getAllSurveysLocal();
          if (cached && cached.length > 0) {
            console.log("⚠️ Usando encuestas en caché:", cached.length);

            // Filtrar activas/finalizadas del caché
            const now = new Date();
            const isActive = (s) => {
              const info = s?.surveyInfo || {};
              if (!info.startDate || !info.endDate) return true;
              const sd = new Date(info.startDate);
              const ed = new Date(info.endDate);
              return now >= sd && now <= ed;
            };
            const isFinished = (s) => {
              const info = s?.surveyInfo || {};
              if (!info.startDate || !info.endDate) return false;
              const ed = new Date(info.endDate);
              return now > ed;
            };

            const active = cached.filter(isActive);
            const finished = cached.filter(isFinished);

            setActiveSurveysData(active);
            setFinishedSurveysData(finished);
            setActiveTotalPages(Math.max(1, Math.ceil(active.length / limit)));
            setFinishedTotalPages(
              Math.max(1, Math.ceil(finished.length / limit))
            );
            setActiveCurrentPage(1);
            setFinishedCurrentPage(1);
            setTabCounts({
              active: active.length,
              finished: finished.length,
              drafts: 0,
            });

            // Limpiar error y mostrar mensaje informativo (solo una vez)
            setError(null);
            if (!fallbackToastShownRef.current) {
              toast.warning(
                "No se pudo conectar con el servidor. Mostrando encuestas guardadas localmente."
              );
              fallbackToastShownRef.current = true;
            }
            return; // Salir exitosamente
          }
        } catch (cacheError) {
          console.warn("No se pudo leer caché:", cacheError);
        }

        // No hay servidor NI caché → Error final traducido
        let errorMsg =
          "No se pudo conectar con el servidor. Por favor, verifica tu conexión e intenta nuevamente.\n\nDe persistir el inconveniente, puede comunicarse con nosotros.";

        if (
          e.message &&
          !e.message.includes("Failed to fetch") &&
          !e.message.includes("Network request failed") &&
          !e.message.includes("fetch")
        ) {
          errorMsg = e.message; // Usar mensaje si ya está en español
        }

        setError(errorMsg);
      } finally {
        setIsLoading({ active: false, finished: false, drafts: false });
      }
    },
    [limit]
  );
  const fetchDataForTab = useCallback(
    async (tabName, page) => {
      if (tabName === "drafts") {
        // Solo ADMIN consulta borradores
        if (user?.role !== "ROLE_ADMIN") {
          setDraftSurveysData([]);
          setTabCounts((prev) => ({ ...prev, drafts: 0 }));
          return;
        }
        setIsLoading((prev) => ({ ...prev, drafts: true }));
        setError(null);
        try {
          console.log("🔍 Solicitando borradores...");
          const response = await surveyService.getDrafts();
          console.log("📦 Respuesta de getDrafts:", response);
          const drafts = response.drafts || [];
          console.log("📋 Borradores encontrados:", drafts.length, drafts);
          setDraftSurveysData(drafts);
          setTabCounts((prev) => ({ ...prev, drafts: drafts.length }));
        } catch (err) {
          console.error(`❌ Error loading data for tab drafts:`, err);

          // Traducir error si es necesario
          let errorMsg =
            "No se pudo cargar los borradores. Por favor, verifica tu conexión e intenta nuevamente.";

          if (
            err.message &&
            !err.message.includes("Failed to fetch") &&
            !err.message.includes("Network request failed") &&
            !err.message.includes("fetch")
          ) {
            errorMsg = err.message; // Usar mensaje si ya está en español
          }

          setError(errorMsg);
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
        setSyncProgress((prev) => (prev < 10 ? 10 : prev));
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

        // Reemplazar completamente el cache EN POUCH SÓLO con ACTIVAS
        try {
          await replaceAllSurveys(activeSurveys);
          setSyncProgress((prev) => (prev < 60 ? 60 : prev));
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
              const next = 60 + Math.round((done / total) * 40);
              setSyncProgress((prev) => (next > prev ? next : prev));
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

        // Reset flag si la carga fue exitosa
        fallbackToastShownRef.current = false;
      } catch (err) {
        console.error(`Error loading data for tab ${tabName}:`, err);

        // Intentar cargar desde caché como fallback
        try {
          const cached = await getAllSurveysLocal();
          if (cached && cached.length > 0) {
            console.log(
              `⚠️ Usando encuestas en caché para tab ${tabName}:`,
              cached.length
            );

            const now = new Date();
            const activeSurveys = cached.filter((survey) => {
              if (
                !survey.surveyInfo?.startDate ||
                !survey.surveyInfo?.endDate
              ) {
                return true;
              }
              const startDate = new Date(survey.surveyInfo.startDate);
              const endDate = new Date(survey.surveyInfo.endDate);
              return now >= startDate && now <= endDate;
            });
            const finishedSurveys = cached.filter((survey) => {
              if (
                !survey.surveyInfo?.startDate ||
                !survey.surveyInfo?.endDate
              ) {
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

            // Limpiar error y mostrar mensaje informativo (solo una vez)
            setError(null);
            if (!fallbackToastShownRef.current) {
              toast.warning(
                "No se pudo conectar con el servidor. Mostrando encuestas guardadas localmente."
              );
              fallbackToastShownRef.current = true;
            }
            return; // Salir exitosamente
          }
        } catch (cacheError) {
          console.warn("No se pudo leer caché:", cacheError);
        }

        // No hay servidor NI caché → Error final traducido
        let errorMsg =
          "No se pudo conectar con el servidor. Por favor, verifica tu conexión e intenta nuevamente.\n\nDe persistir el inconveniente, puede comunicarse con nosotros.";

        if (
          err.message &&
          !err.message.includes("Failed to fetch") &&
          !err.message.includes("Network request failed") &&
          !err.message.includes("fetch")
        ) {
          errorMsg = err.message; // Usar mensaje si ya está en español
        }

        setError(errorMsg);
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

  // --- useEffect para Carga Inicial (una sola llamada) --- //
  useEffect(() => {
    const init = async () => {
      // Limpiar identificadores de respuesta al entrar a la lista
      try {
        if (typeof window !== "undefined") {
          const goodKey = "responder:surveyId";
          window.sessionStorage?.removeItem(goodKey);
          window.localStorage?.removeItem(goodKey);
          const legacyKeys = [
            "respondersurveyid",
            "responderSurveyId",
            "responder_id",
            "surveyIdToRespond",
          ];
          legacyKeys.forEach((k) => {
            window.sessionStorage?.removeItem(k);
            window.localStorage?.removeItem(k);
          });
        }
      } catch {}

      const userData = authService.getUser();
      console.log("🔐 Usuario cargado desde localStorage:", userData);
      console.log("🔑 Rol del usuario:", userData?.role);
      console.log("✅ ¿Es ROLE_ADMIN?:", userData?.role === "ROLE_ADMIN");
      if (!userData) {
        router.replace("/login");
        return;
      }
      setUser(userData);

      // Verificar si debe mostrar el tutorial automáticamente
      if (tutorialService.shouldShowTutorial()) {
        setShowTutorial(true);
      }

      // Intento de sincronización de outbox durante el loader inicial si hay conexión
      try {
        if (typeof navigator !== "undefined" && navigator.onLine) {
          setIsOutboxSyncing(true);
          const { getPendingResponses } = await import("@/services/db/outbox");
          const rows = await getPendingResponses();
          setPendingCount(rows.length);
          if (rows.length > 0) {
            try {
              const { synced } = await syncPendingResponses();
              if (synced > 0) {
                // Notificar al usuario que los casos se registraron exitosamente
                toast.success(
                  synced === 1
                    ? "Se registró 1 caso correctamente en el servidor."
                    : `Se registraron ${synced} casos correctamente en el servidor.`
                );
                // Refrescar encuestas activas para reflejar progreso
                await fetchDataForTab("active", 1);
              }
              // Recontar pendientes tras sincronizar
              const rowsAfter = await getPendingResponses();
              setPendingCount(rowsAfter.length);
            } catch (e) {
              // Silencioso: se puede reintentar manualmente
            }
          }
        }
      } finally {
        setIsOutboxSyncing(false);
      }

      try {
        setIsInitialLoadingView(true);
        // Pasar el usuario directamente a loadAllSurveys
        await loadAllSurveys(userData);
      } finally {
        setIsInitialLoadingView(false);
      }
    };
    init();
  }, [loadAllSurveys, router]);

  // useEffect para reaccionar al trigger manual del tutorial desde el menú
  useEffect(() => {
    if (shouldStartTutorial) {
      console.log("📊 [Encuestas] Activando tutorial manualmente");
      // Forzar pestaña activa si estamos en finalizadas
      if (activeTab !== "active") {
        console.log("   → Forzando pestaña activa para el tutorial");
        setActiveTab("active");
      }
      setShowTutorial(true);
    }
  }, [shouldStartTutorial, activeTab]);

  // --- useEffect para Cambios de Tab --- //
  useEffect(() => {
    // Solo resetear la página al cambiar de pestaña
    if (activeTab === "active") {
      setActiveCurrentPage(1);
    } else if (activeTab === "finished") {
      setFinishedCurrentPage(1);
    }
    // Los borradores ya se cargan en loadAllSurveys, no necesitan fetch adicional
  }, [activeTab]);

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

  // Comprobar permiso de geolocalización (y reaccionar a cambios)
  useEffect(() => {
    let mounted = true;
    const checkLocation = async () => {
      try {
        if (typeof navigator === "undefined") return;
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({
            name: "geolocation",
          });
          if (mounted) setLocationStatus(status.state || "unknown");
          try {
            trackEvent("location_permission_status", {
              status: status.state || "unknown",
            });
          } catch {}
          status.onchange = () => {
            if (mounted) setLocationStatus(status.state || "unknown");
            try {
              trackEvent("location_permission_status", {
                status: status.state || "unknown",
              });
            } catch {}
          };
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            () => {
              if (mounted) setLocationStatus("granted");
              try {
                trackEvent("location_permission_status", { status: "granted" });
              } catch {}
            },
            () => {
              if (mounted) setLocationStatus("denied");
              try {
                trackEvent("location_permission_status", { status: "denied" });
              } catch {}
            },
            { maximumAge: 0, timeout: 800 }
          );
        } else {
          if (mounted) setLocationStatus("unsupported");
          try {
            trackEvent("location_permission_status", { status: "unsupported" });
          } catch {}
        }
      } catch {
        if (mounted) setLocationStatus("unknown");
        try {
          trackEvent("location_permission_status", { status: "unknown" });
        } catch {}
      }
    };
    checkLocation();
    return () => {
      mounted = false;
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
        setProgressRefreshToken((t) => t + 1);
      } else if (total > 0) {
        // Hay elementos pero no se pudieron sincronizar (servidor caído/bloqueado)
        toast.error(
          "No se pudo sincronizar. El servidor no está disponible. Intenta nuevamente."
        );
      } else {
        // Realmente no hay elementos para sincronizar
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
        performOutboxSync().then(() => {
          setProgressRefreshToken((t) => t + 1);
        });
      }
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, pendingCount, isOutboxSyncing, performOutboxSync]);

  // Solicitar permiso de ubicación bajo demanda (al tocar el ícono rojo)
  const requestLocationPermission = useCallback(() => {
    try {
      if (typeof navigator === "undefined" || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        () => setLocationStatus("granted"),
        () => {
          setLocationStatus("denied");
          toast.error("No se pudo obtener la ubicación.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } catch {}
  }, []);

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

  const handleEditDraft = async (draftId) => {
    setIsNavigatingToEdit(true);

    // Pequeño delay para mostrar el loader antes de navegar
    await new Promise((resolve) => setTimeout(resolve, 300));

    router.push(`/dashboard/encuestas/${draftId}/editar`);

    // Limpiar el loading después de un delay (por si la navegación tarda)
    setTimeout(() => setIsNavigatingToEdit(false), 2000);
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
        await loadAllSurveys();
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

  // Handler para recargar borradores después de clonar
  const handleSurveyListChange = async () => {
    console.log("🔄 Recargando borradores después de clonar...");
    try {
      if (user?.role === "ROLE_ADMIN") {
        console.log("👤 Recargando borradores para ADMIN...");
        const draftsResp = await surveyService.getDrafts();
        console.log("📦 Borradores actualizados:", draftsResp);
        const drafts = draftsResp.drafts || [];
        setDraftSurveysData(drafts);
        setTabCounts((prev) => ({ ...prev, drafts: drafts.length }));
        console.log("✅ Borradores recargados:", drafts.length);
      }
    } catch (err) {
      console.error("❌ Error recargando borradores:", err);
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
      }
    } else if (activeTab === "finished") {
      if (
        newPage >= 1 &&
        newPage <= finishedTotalPages &&
        newPage !== finishedCurrentPage
      ) {
        setFinishedCurrentPage(newPage);
      }
    }
  };

  // --- Determinar datos y estado de paginación actual basado en activeTab (MEMOIZADO) --- //
  const {
    currentSurveys,
    currentTotalPages,
    currentLoadingState,
    currentPageForDisplay,
    currentCountForTab,
  } = useMemo(() => {
    if (activeTab === "active") {
      return {
        currentSurveys: activeSurveysData,
        currentTotalPages: activeTotalPages,
        currentLoadingState: isLoading.active,
        currentPageForDisplay: activeCurrentPage,
        currentCountForTab: tabCounts.active,
      };
    } else if (activeTab === "finished") {
      return {
        currentSurveys: finishedSurveysData,
        currentTotalPages: finishedTotalPages,
        currentLoadingState: isLoading.finished,
        currentPageForDisplay: finishedCurrentPage,
        currentCountForTab: tabCounts.finished,
      };
    } else if (activeTab === "drafts") {
      return {
        currentSurveys: draftSurveysData,
        currentTotalPages: 0, // No paginación para drafts
        currentLoadingState: isLoading.drafts,
        currentPageForDisplay: 1,
        currentCountForTab: tabCounts.drafts,
      };
    }
    return {
      currentSurveys: [],
      currentTotalPages: 0,
      currentLoadingState: false,
      currentPageForDisplay: 1,
      currentCountForTab: 0,
    };
  }, [
    activeTab,
    activeSurveysData,
    activeTotalPages,
    activeCurrentPage,
    tabCounts.active,
    finishedSurveysData,
    finishedTotalPages,
    finishedCurrentPage,
    tabCounts.finished,
    draftSurveysData,
    tabCounts.drafts,
    isLoading.active,
    isLoading.finished,
    isLoading.drafts,
  ]);

  // Derivados para indicadores (evita usar locationStatus crudo en JSX)
  const isLocationOn = locationStatus === "granted";

  // Mostrar loader ocupando el área de contenido (debajo del header) sin tapar el header
  if (isInitialLoadingView) {
    return (
      <div className="p-4 h-[calc(100vh-64px)] flex items-center justify-center">
        <LoaderWrapper
          size="lg"
          fullScreen={false}
          text="Actualizando encuestas…"
          className="text-primary"
        />
      </div>
    );
  }

  // Mostrar loader full screen cuando se navega a editar
  if (isNavigatingToEdit) {
    return (
      <LoaderWrapper
        size="lg"
        fullScreen={true}
        text="Cargando editor de encuesta…"
        className="text-primary"
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 p-4"
    >
      {/* Progreso visual oculto: mantenemos sincronización en segundo plano */}
      {/* --- Encabezado --- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-2"
      >
        {/* Fila título a la izquierda, indicadores a la derecha */}
        <div className="flex items-center justify-between w-full">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]"
          >
            {user?.role === "POLLSTER" ? "Mis Encuestas" : "Encuestas"}
          </motion.h1>
          <div
            className="flex items-center gap-3"
            data-tutorial="status-indicators"
          >
            {/* Conexión */}
            {isOnline ? (
              <Tippy
                content="Conexión activa"
                theme="light"
                placement="bottom"
                offset={[0, 8]}
              >
                <span className="inline-flex">
                  <Wifi className="w-5 h-5 text-green-500" />
                </span>
              </Tippy>
            ) : (
              <Tippy
                content="Conexión desactivada"
                theme="light"
                placement="bottom"
                offset={[0, 8]}
              >
                <span className="inline-flex">
                  <WifiOff className="w-5 h-5 text-red-500" />
                </span>
              </Tippy>
            )}
            {/* Ubicación */}
            <Tippy
              content={
                isLocationOn ? "Ubicación activada" : "Ubicación desactivada"
              }
              theme="light"
              placement="bottom"
              offset={[0, 8]}
            >
              <span
                className={`inline-flex ${
                  isLocationOn ? "" : "cursor-pointer"
                }`}
                onClick={() => {
                  if (!isLocationOn) requestLocationPermission();
                }}
                role={isLocationOn ? undefined : "button"}
                aria-label={
                  isLocationOn
                    ? "Ubicación activada"
                    : "Solicitar permiso de ubicación"
                }
              >
                <MapPin
                  className={`w-5 h-5 ${
                    isLocationOn ? "text-green-500" : "text-red-500"
                  }`}
                />
              </span>
            </Tippy>
            {/* Botón de sincronización manual cuando hay pendientes */}
            {pendingCount > 0 && (
              <button
                onClick={() => performOutboxSync()}
                disabled={!isOnline || isOutboxSyncing}
                className="cursor-pointer px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                aria-label="Sincronizar respuestas pendientes"
                title="Sincronizar respuestas pendientes"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isOutboxSyncing ? "animate-spin" : ""}`}
                />
                {isOutboxSyncing
                  ? "Sincronizando…"
                  : `Sincronizar (${pendingCount})`}
              </button>
            )}
          </div>
        </div>
        {user?.role === "ROLE_ADMIN" && (
          <div className="mt-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                router.push("/dashboard/encuestas/nueva");
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors w-full md:w-auto cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Nueva Encuesta
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Banner offline con pendientes, debajo del título y antes de la lista */}
      <AnimatePresence initial={false}>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mb-4"
          >
            <div
              className="rounded-lg border border-yellow-300 bg-yellow-50/90 text-yellow-900 px-4 py-3 md:px-5 md:py-4 shadow-sm"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex">
                  <WifiOff className="w-5 h-5 text-yellow-600" />
                </span>
                <div className="flex-1">
                  <p className="text-sm leading-5">
                    Estás sin conexión. Respuestas pendientes de sincronización:{" "}
                    <span className="font-semibold">{pendingCount}</span>.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* --- Pestañas (nuevo estilo pill + subrayado animado) --- */}
        <div className="relative mb-6">
          <div className="inline-flex gap-2 p-1 rounded-xl bg-[var(--card-background)] border border-[var(--card-border)] shadow-sm">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2 rounded-lg text-sm cursor-pointer font-medium transition-colors ${
                activeTab === "active"
                  ? "bg-primary text-white"
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
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer font-medium transition-colors ${
                  activeTab === "finished"
                    ? "bg-primary text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Finalizadas ({isLoading.finished ? "..." : tabCounts.finished})
              </button>
            )}
            {user?.role === "ROLE_ADMIN" && (
              <button
                onClick={() => setActiveTab("drafts")}
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer font-medium transition-colors ${
                  activeTab === "drafts"
                    ? "bg-primary text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Borradores ({isLoading.drafts ? "..." : tabCounts.drafts})
              </button>
            )}
          </div>
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
            {currentLoadingState && !isInitialLoadingView && (
              <div className="py-4">
                <div className="loader-caption mb-2">
                  <p className="text-sm italic text-[var(--text-secondary)]">
                    Cargando...
                  </p>
                  <span className="loading-underline" aria-hidden="true" />
                </div>
                <div className="grid gap-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-24 rounded-lg border border-[var(--card-border)] bg-[var(--card-background)] overflow-hidden"
                    >
                      <div className="h-full w-full animate-pulse bg-gradient-to-r from-[var(--hover-bg)] via-[var(--card-background)] to-[var(--hover-bg)] bg-[length:200%_100%]" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mostrar mensaje cuando no hay encuestas */}
            {!isInitialLoadingView &&
              !currentLoadingState &&
              currentSurveys.length === 0 && (
                <div className="text-center py-6 space-y-3">
                  <p className="text-[var(--text-secondary)] italic">
                    No hay encuestas{" "}
                    {activeTab === "drafts"
                      ? "borradores"
                      : activeTab === "active"
                      ? "activas"
                      : "finalizadas"}{" "}
                    disponibles.
                  </p>
                  {typeof navigator !== "undefined" && !navigator.onLine && (
                    <button
                      onClick={async () => {
                        try {
                          setIsLoading((prev) => ({
                            ...prev,
                            [activeTab]: true,
                          }));
                          await reconstructIndexesFromDetails();
                          const local = await getAllSurveysLocal();
                          const now = new Date();
                          const activeSurveys = local.filter((survey) => {
                            if (
                              !survey.surveyInfo?.startDate ||
                              !survey.surveyInfo?.endDate
                            ) {
                              return true;
                            }
                            const startDate = new Date(
                              survey.surveyInfo.startDate
                            );
                            const endDate = new Date(survey.surveyInfo.endDate);
                            return now >= startDate && now <= endDate;
                          });
                          const finishedSurveys = local.filter((survey) => {
                            if (
                              !survey.surveyInfo?.startDate ||
                              !survey.surveyInfo?.endDate
                            ) {
                              return false;
                            }
                            const endDate = new Date(survey.surveyInfo.endDate);
                            return now > endDate;
                          });
                          const filtered =
                            activeTab === "active"
                              ? activeSurveys
                              : finishedSurveys;
                          if (activeTab === "active") {
                            setActiveSurveysData(filtered);
                          } else if (activeTab === "finished") {
                            setFinishedSurveysData(filtered);
                          }
                          setTabCounts((prev) => ({
                            ...prev,
                            active: activeSurveys.length,
                            finished: finishedSurveys.length,
                          }));
                        } finally {
                          setIsLoading((prev) => ({
                            ...prev,
                            [activeTab]: false,
                          }));
                        }
                      }}
                      className="px-4 py-2 rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] cursor-pointer"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              )}
            {/* Mostrar contenido de encuestas */}
            {!isInitialLoadingView &&
              !currentLoadingState &&
              currentSurveys.length > 0 &&
              (activeTab === "drafts" ? (
                // Renderizado específico para borradores con diseño consistente
                <div className="space-y-4">
                  {currentSurveys.map((draft, index) => (
                    <motion.div
                      key={draft._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.18,
                        ease: "easeOut",
                        delay: index * 0.02,
                      }}
                      className="bg-[var(--card-background)] rounded-xl shadow-sm border border-[var(--card-border)] overflow-hidden hover:shadow-md transition-shadow duration-200"
                    >
                      {/* Vista mobile con estilo similar a encuestas activas */}
                      <div className="lg:hidden">
                        {/* Header azul con título - similar a las cards de encuestas activas */}
                        <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] p-3">
                          <div className="flex justify-between items-center">
                            <div className="text-white text-sm font-medium">
                              <span className="line-clamp-1">
                                {draft.survey?.title?.es ||
                                  draft.survey?.title ||
                                  "Borrador sin título"}
                              </span>
                            </div>
                            <div className="text-white text-xs font-medium">
                              Borrador
                            </div>
                          </div>
                        </div>

                        {/* Contenido del cuerpo */}
                        <div className="p-4">
                          {/* Descripción si existe */}
                          {(draft.survey?.description ||
                            draft.survey?.description?.es) && (
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">
                              {draft.survey?.description?.es ||
                                draft.survey?.description}
                            </p>
                          )}

                          {/* Metadatos */}
                          <div className="text-xs text-[var(--text-muted)] mb-4">
                            Última edición:{" "}
                            {draft.lastEdited
                              ? new Date(draft.lastEdited).toLocaleDateString(
                                  "es-ES",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : "N/A"}
                          </div>

                          {/* Botones de acción */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditDraft(draft._id)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-[var(--primary-light)] text-white hover:bg-[var(--primary-dark)] transition-all duration-200 font-medium"
                              title="Editar borrador"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Editar</span>
                            </button>

                            <button
                              onClick={() => handlePublishDraft(draft._id)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all duration-200 font-medium"
                              title="Publicar borrador"
                            >
                              <Send className="w-3 h-3" />
                              <span>Publicar</span>
                            </button>

                            <button
                              onClick={() => handleDelete(draft._id)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-200 font-medium"
                              title="Eliminar borrador"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Vista desktop - mantener como estaba */}
                      <div className="hidden lg:flex lg:flex-row lg:items-center justify-between gap-4 p-6">
                        {/* Información del borrador */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            {/* Indicador visual de borrador */}
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-6 h-6 rounded-lg bg-[var(--primary-dark)] text-[var(--primary-light)] flex items-center justify-center">
                                <FilePenLine className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-[var(--text-primary)] line-clamp-2 mb-2">
                                {draft.survey?.title?.es ||
                                  draft.survey?.title ||
                                  "Borrador sin título"}
                              </h3>

                              {/* Descripción si existe */}
                              {(draft.survey?.description ||
                                draft.survey?.description?.es) && (
                                <p className="text-sm font-normal text-[var(--text-secondary)] line-clamp-2 mb-3 opacity-80">
                                  {draft.survey?.description?.es ||
                                    draft.survey?.description}
                                </p>
                              )}

                              {/* Metadatos */}
                              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                <span className="flex items-center gap-1">
                                  <div className="w-1 h-1 rounded-full bg-primary"></div>
                                  Borrador
                                </span>
                                <span>
                                  Última edición:{" "}
                                  {draft.lastEdited
                                    ? new Date(
                                        draft.lastEdited
                                      ).toLocaleDateString("es-ES", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción alineados a la derecha */}
                        <div className="flex items-center gap-2 lg:flex-shrink-0">
                          <button
                            onClick={() => handleEditDraft(draft._id)}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--primary-light)] text-white hover:bg-[var(--primary-dark)] transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                            title="Editar borrador"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handlePublishDraft(draft._id)}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-green-500 text-white hover:bg-green-600 transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                            title="Publicar borrador"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(draft._id)}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                            title="Eliminar borrador"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : // Renderizado para activas y finalizadas - diferentes para pollsters
              user?.role === "POLLSTER" ? (
                <PollsterSurveyList
                  surveys={currentSurveys}
                  isFinished={activeTab === "finished"}
                  currentUser={user}
                  refreshToken={progressRefreshToken}
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
                  onSurveyListChange={handleSurveyListChange}
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
        isLoading={isConfirmLoading}
      >
        <p>
          ¿Estás seguro de que deseas publicar este borrador? Una vez publicado,
          será visible para los encuestadores asignados.
        </p>
      </ConfirmModal>

      {/* Tutorial Driver - mostrar solo para pollsters */}
      {user?.role === "POLLSTER" && showTutorial && (
        <TutorialDriver
          autoStart={true}
          isFirstTime={tutorialService.shouldShowTutorial()}
          onComplete={async () => {
            console.log("✅ [Encuestas] Tutorial completado - cerrando");

            // Inmediatamente ocultar el tutorial
            setShowTutorial(false);

            try {
              // Solo completar en backend si es primera vez
              if (tutorialService.shouldShowTutorial()) {
                console.log("   → Es primera vez, marcando en backend");
                await tutorialService.completeTutorial();
              } else {
                console.log("   → No es primera vez, solo cerrado");
              }
            } catch (error) {
              console.error("   ❌ Error al completar tutorial:", error);
            }
          }}
        />
      )}
    </motion.div>
  );
}
