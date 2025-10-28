"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Model, surveyLocalization } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { useTheme } from "@/providers/ThemeProvider";
import { GuazuLightTheme, GuazuDarkTheme } from "@/styles/survey-themes";
import {
  CheckCircle2,
  PartyPopper,
  MapPin,
  AlertTriangle,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import GeolocationService from "@/services/geolocation.service";
import { trackEvent } from "@/lib/analytics";
import { StatusIndicators } from "@/components/StatusIndicators";

import "survey-core/survey-core.css";
import "survey-core/i18n/spanish";
import "@/styles/survey-styles.css";

const spanishLocalization = {
  pagePrevText: "Anterior",
  pageNextText: "Siguiente",
  completeText: "Finalizar",
  requiredText: "",
  requiredError: "Este campo es obligatorio.",
  requiredInAllRowsError:
    "Por favor responda las preguntas en todas las filas.",
  emptySurvey: "No hay página visible o pregunta en la encuesta.",
  questionsProgressText: "Respondido {0}/{1} preguntas",
  completingSurvey: "¡Gracias por completar la encuesta!",
  completingSurveyBefore: "Ya has completado esta encuesta anteriormente.",
};
surveyLocalization.locales["es"] = spanishLocalization;
surveyLocalization.defaultLocale = "es";

export default function SurveyResponderStable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [surveyId, setSurveyId] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false);
  useEffect(() => {
    // Detectar si estamos en modo test
    const mode = searchParams.get("mode");
    setIsTestMode(mode === "test");

    try {
      const goodKey = "responder:surveyId";
      const legacyKey = "respondersurveyId"; // compat
      const fromSession =
        typeof window !== "undefined" && window.sessionStorage
          ? window.sessionStorage.getItem(goodKey) ||
            window.sessionStorage.getItem(legacyKey)
          : null;
      const fromLocal =
        !fromSession && typeof window !== "undefined" && window.localStorage
          ? window.localStorage.getItem(goodKey) ||
            window.localStorage.getItem(legacyKey)
          : null;
      const resolved = fromSession || fromLocal || null;
      setSurveyId(resolved);
      if (!resolved) router.replace("/dashboard/encuestas");
    } catch {
      router.replace("/dashboard/encuestas");
    }
  }, [router, searchParams]);
  const { theme } = useTheme();
  const [surveyModel, setSurveyModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const redirectTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const [surveyCompletedSuccessfully, setSurveyCompletedSuccessfully] =
    useState(false);
  const INITIAL_COUNTDOWN = 5;
  const [countdown, setCountdown] = useState(INITIAL_COUNTDOWN);
  const [successMode, setSuccessMode] = useState("online"); // 'online' | 'offline'
  const [locationError, setLocationError] = useState(null); // null | 'PERMISSION_DENIED' | 'TIMEOUT' | etc.
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState(null); // { lat, lng }
  const [requireGps, setRequireGps] = useState(false); // Default false - GPS opcional por defecto
  const [showSendWithoutGpsModal, setShowSendWithoutGpsModal] = useState(false);
  const [pendingSurveyData, setPendingSurveyData] = useState(null); // Guardar datos del sender para envío posterior
  const requireGpsRef = useRef(false); // Referencia para mantener el valor actualizado
  const [isSavingCase, setIsSavingCase] = useState(false); // Estado para pantalla "Guardando caso..."

  // Leave-blocking state
  const [isBlocking, setIsBlocking] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingNavRef = useRef(null);
  const suppressNavRef = useRef(false);
  const blockingRef = useRef(false);
  const suppressCountRef = useRef(0);
  useEffect(() => {
    blockingRef.current = isBlocking;
  }, [isBlocking]);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Redirección y cuenta regresiva luego del éxito
  useEffect(() => {
    if (!surveyCompletedSuccessfully) return;
    redirectTimerRef.current = setTimeout(() => {
      router.push("/dashboard/encuestas");
    }, 5000);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
    };
  }, [surveyCompletedSuccessfully, router]);

  useEffect(() => {
    if (surveyCompletedSuccessfully) setIsBlocking(false);
  }, [surveyCompletedSuccessfully]);

  useEffect(() => {
    if (!surveyId) return;
    let modelInstance = null;
    const loadSurvey = async () => {
      try {
        const user = authService.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        let surveyData;
        let serverEnvelope = null;
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const { getSurveyByIdLocal } = await import("@/services/db/pouch");
          const local = await getSurveyByIdLocal(surveyId);
          if (!local)
            throw new Error("No hay datos locales para esta encuesta");
          surveyData = local.survey || local;
          serverEnvelope = {
            survey: { survey: surveyData, surveyInfo: local.surveyInfo || {} },
          };
        } else {
          const resp = await surveyService.getSurvey(surveyId);
          serverEnvelope = resp;
          surveyData = resp?.survey?.survey || resp?.survey;
        }

        // Extraer configuración de GPS obligatorio
        const gpsRequired =
          serverEnvelope?.survey?.surveyInfo?.requireGps ?? false;
        setRequireGps(gpsRequired);
        requireGpsRef.current = gpsRequired; // Guardar también en ref

        if (
          !surveyData ||
          !Array.isArray(surveyData.pages) ||
          surveyData.pages.length === 0
        ) {
          throw new Error("La encuesta no tiene preguntas configuradas");
        }

        const model = new Model(surveyData);
        modelInstance = model;

        model.locale = "es";
        model.showQuestionNumbers = true;
        model.questionTitlePattern = "{no}) {title}";
        model.questionDescriptionLocation = "underTitle";
        model.showProgressBar = "top";
        model.pageNextText = "Siguiente";
        model.pagePrevText = "Anterior";
        model.completeText = "Finalizar";
        model.showPreviewBeforeComplete = "noPreview";
        // Mantener la página de completado oculta para usar nuestra UI personalizada
        // Evitamos parpadeos: también ajustamos CSS en survey-styles.css
        model.showCompletedPage = false;
        model.questionsOrder = "initial";
        model.questionsOnPageMode = "questionPerPage";

        if (theme === "dark") model.applyTheme(GuazuDarkTheme);
        else model.applyTheme(GuazuLightTheme);

        // Interceptar finalización para evitar el estado 'completed' de SurveyJS
        model.onCompleting.add(async (sender, options) => {
          try {
            options.allowComplete = false; // cancelar transición nativa
            await handleComplete(sender); // ejecuta nuestro flujo async y muestra la UI de éxito
          } catch (e) {
            setError(e.message || "Error al finalizar la encuesta.");
          }
        });

        // Traquear avance de página desde el modelo (más compatible que pasar prop)
        try {
          model.onCurrentPageChanged.add((sender) => {
            try {
              trackEvent("survey_page_advanced", {
                survey_id: resolved || surveyId,
                page_index: sender?.currentPageNo ?? 0,
              });
            } catch {}
          });
        } catch {}

        setSurveyModel(model);
        try {
          const totalQuestions = model.getAllQuestions()?.length || 0;
          trackEvent("survey_started", {
            survey_id: resolved || surveyId,
            mode:
              typeof navigator !== "undefined" && !navigator.onLine
                ? "offline"
                : "online",
            num_questions: totalQuestions,
          });
        } catch {}
        setIsBlocking(true);
      } catch (e) {
        setError(e.message || "Error al cargar la encuesta.");
      } finally {
        setLoading(false);
      }
    };
    loadSurvey();
    return () => {
      if (modelInstance && typeof modelInstance.dispose === "function") {
        modelInstance.dispose();
      }
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
    };
  }, [surveyId, router, theme]);

  useEffect(() => {
    try {
      history.pushState(null, "", location.href);
    } catch {}
    const onPopState = () => {
      if (suppressCountRef.current > 0) {
        suppressCountRef.current -= 1;
        return; // allow our own back(s)
      }
      if (!blockingRef.current) return;
      try {
        history.pushState(null, "", location.href);
      } catch {}
      pendingNavRef.current = { type: "back" };
      setShowLeaveModal(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onCaptureClick = (e) => {
      if (!blockingRef.current) return;
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:"))
        return;
      e.preventDefault();
      e.stopPropagation();
      try {
        const url = new URL(anchor.href, window.location.href);
        pendingNavRef.current = {
          type: url.origin === window.location.origin ? "url" : "external",
          target: url.href,
        };
      } catch {
        pendingNavRef.current = { type: "url", target: anchor.href };
      }
      setShowLeaveModal(true);
    };
    document.addEventListener("click", onCaptureClick, true);
    return () => document.removeEventListener("click", onCaptureClick, true);
  }, []);

  // Función para enviar la encuesta con o sin coordenadas
  // NUEVO FLUJO ROBUSTO: Guardar SIEMPRE primero, intentar enviar después
  const submitSurvey = async (sender, locationData = null) => {
    try {
      // 1. Preparar datos de la encuesta
      const user = authService.getUser();
      const token = localStorage.getItem("token");
      const transformedAnswers = {};
      sender.getAllQuestions().forEach((q) => {
        const name = q.name;
        const text = q.title || q.name;
        const ans = sender.data[name];
        if (ans !== undefined) {
          if (Array.isArray(ans))
            transformedAnswers[text] = ans.map(
              (v) => q.choices?.find((c) => c.value === v)?.text || v
            );
          else if (typeof ans === "object" && ans !== null)
            transformedAnswers[text] = ans;
          else
            transformedAnswers[text] =
              q.choices?.find((c) => c.value === ans)?.text || ans;
        }
      });

      // Crear payload con o sin coordenadas
      const payload = {
        surveyId: surveyId,
        _id: `survey_${surveyId}_${user?._id || "anon"}_${Date.now()}`,
        fullName: user?.fullName,
        userId: user?._id,
        answer: transformedAnswers,
        createdAt: new Date().toISOString(),
        time: sender.timeSpent,
        authToken: token,
        lat: locationData?.lat || null,
        lng: locationData?.lng || null,
      };

      // 2. SIEMPRE guardar en cola offline PRIMERO (garantía de no perder datos)
      const { queueResponseForSync } = await import("@/services/db/outbox");
      await queueResponseForSync(payload);
      console.log("✅ Caso guardado en cola offline como respaldo");

      // 3. Esperar mínimo 2 segundos para UX (usuario ve "Guardando caso...")
      const minDelay = new Promise((resolve) => setTimeout(resolve, 2000));
      const startTime = Date.now();

      // 4. Intentar envío al servidor (con timeout de 5 segundos)
      let serverSuccess = false;
      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          console.log("🌐 Intentando enviar al servidor...");
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/insert-answer`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: token,
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            // Éxito: eliminar de cola offline
            const { removeDoc } = await import("@/services/db/outbox");
            await removeDoc(payload._id);
            serverSuccess = true;
            console.log(
              "✅ Enviado al servidor exitosamente, removido de cola"
            );
          } else {
            console.log(
              `⚠️ Respuesta del servidor no OK (${res.status}), mantener en cola`
            );
          }
        } catch (fetchError) {
          // Fallo en envío: mantener en cola (ya está guardado)
          if (fetchError.name === "AbortError") {
            console.log("⏱️ Timeout al enviar, mantener en cola para sync");
          } else {
            console.log("❌ Error al enviar, mantener en cola:", fetchError);
          }
        }
      } else {
        console.log("📵 Sin conexión, mantener en cola para sync");
      }

      // 5. Asegurar mínimo 2 segundos de duración total
      const elapsed = Date.now() - startTime;
      if (elapsed < 2000) {
        await minDelay;
      }

      // 6. Mostrar resultado según éxito del envío
      setSuccessMode(serverSuccess ? "online" : "offline");
      setSurveyCompletedSuccessfully(true);

      // 7. Track analytics
      try {
        trackEvent("survey_completed", {
          survey_id: surveyId,
          mode: serverSuccess ? "online" : "offline",
          duration_seconds: Math.round(sender.timeSpent || 0),
          num_questions: sender?.getAllQuestions?.().length || 0,
          location_captured: locationData ? "true" : "false",
          location_accuracy_m: locationData?.accuracy || undefined,
        });
      } catch {}

      // 8. Limpiar storage si fue exitoso
      if (serverSuccess) {
        try {
          const key = "responder:surveyId";
          if (typeof window !== "undefined") {
            window.sessionStorage?.removeItem(key);
            window.localStorage?.removeItem(key);
          }
        } catch {}
      }
    } catch (e) {
      console.error("❌ Error crítico en submitSurvey:", e);
      toast.error("Error al guardar la encuesta");
      setError(e.message);
    }
  };

  const handleComplete = async (sender) => {
    try {
      // Si estamos en modo test, no guardar nada, solo mostrar éxito
      if (isTestMode) {
        setSuccessMode("test");
        setSurveyCompletedSuccessfully(true);
        return;
      }

      setIsCapturingLocation(true);
      setLocationError(null);

      // Intentar capturar geolocalización
      let locationData;
      try {
        locationData = await GeolocationService.getCurrentPosition();
        setCapturedLocation(locationData);
        setIsCapturingLocation(false);

        // Si se obtuvo correctamente, activar pantalla "Guardando caso..." y enviar
        setIsSavingCase(true);
        await submitSurvey(sender, locationData);
        setIsSavingCase(false);
      } catch (geoError) {
        setIsCapturingLocation(false);

        // Usar la ref que siempre tiene el valor correcto
        const isGpsRequired = requireGpsRef.current;

        try {
          trackEvent("geolocation_error", {
            survey_id: surveyId,
            error_type: geoError.message || "UNKNOWN",
            gps_required: isGpsRequired,
          });
        } catch {}

        // Si el GPS es obligatorio, detener el envío y mostrar error
        if (isGpsRequired) {
          setLocationError(geoError.message);
          return;
        }

        // Si el GPS NO es obligatorio, mostrar modal de confirmación
        setPendingSurveyData(sender);
        setShowSendWithoutGpsModal(true);
      }
    } catch (e) {
      toast.error(e.message || "Error inesperado");
      setError(e.message);
      setIsCapturingLocation(false);
      setIsSavingCase(false);
    }
  };

  const retryLocationCapture = async () => {
    setIsCapturingLocation(true);
    setLocationError(null);

    try {
      // Forzar una nueva solicitud de permisos con opciones específicas
      const locationData = await GeolocationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Fuerza una nueva ubicación, no usa caché
      });
      setCapturedLocation(locationData);

      // Reintentar envío automáticamente
      if (surveyModel) {
        const sender = surveyModel;
        await handleComplete(sender);
      }
    } catch (geoError) {
      console.log("Error en retry:", geoError.message);

      // Si es PERMISSION_DENIED, mostrar instrucciones específicas
      if (geoError.message === "PERMISSION_DENIED") {
        toast.error(
          "Debes permitir el acceso a la ubicación en la configuración de tu navegador. Busca el ícono de ubicación en la barra de direcciones."
        );
      }

      setLocationError(geoError.message);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  if (!surveyId) {
    return (
      <LoaderWrapper
        size="lg"
        fullScreen
        text="Esperando identificador..."
        className="text-primary"
      />
    );
  }

  // Pantalla de guardando caso
  if (isSavingCase) {
    return (
      <div className="p-4 h-[calc(100vh-64px)] flex items-center justify-center">
        <LoaderWrapper
          size="lg"
          fullScreen={false}
          text="Guardando caso..."
          className="text-primary"
        />
      </div>
    );
  }

  if (surveyCompletedSuccessfully) {
    // Configuración de colores según el modo
    const isOffline = successMode === "offline";
    const isTest = successMode === "test";
    const colorConfig = isTest
      ? {
          // Colores azul para modo test usando la paleta oficial
          bgColor: "bg-primary",
          ringColor: "ring-primary-dark/30",
          textColor: "text-white",
          buttonBgColor: "bg-white",
          buttonTextColor: "text-primary",
          buttonHoverColor: "hover:bg-white/90",
          gradientColors:
            "rgba(63,81,181,0.55) 0%, rgba(128,145,245,0.45) 35%, rgba(43,55,117,0.55) 70%, rgba(63,81,181,0.55) 100%",
          confettiColors: [
            "var(--primary)",
            "var(--primary-light)",
            "var(--primary-dark)",
            "var(--secondary)",
            "var(--secondary-light)",
          ],
        }
      : isOffline
      ? {
          // Colores amarillo/naranja para offline
          bgColor: "bg-amber-500",
          ringColor: "ring-amber-600/30",
          textColor: "text-white",
          buttonBgColor: "bg-white",
          buttonTextColor: "text-amber-600",
          buttonHoverColor: "hover:bg-white/90",
          gradientColors:
            "rgba(245,158,11,0.55) 0%, rgba(251,191,36,0.45) 35%, rgba(217,119,6,0.55) 70%, rgba(245,158,11,0.55) 100%",
          confettiColors: [
            "#f59e0b",
            "#fbbf24",
            "#f97316",
            "#fb923c",
            "#fcd34d",
          ],
        }
      : {
          // Colores verde para online
          bgColor: "bg-green-600",
          ringColor: "ring-green-700/30",
          textColor: "text-white",
          buttonBgColor: "bg-white",
          buttonTextColor: "text-green-700",
          buttonHoverColor: "hover:bg-white/90",
          gradientColors:
            "rgba(34,197,94,0.55) 0%, rgba(16,185,129,0.45) 35%, rgba(5,150,105,0.55) 70%, rgba(34,197,94,0.55) 100%",
          confettiColors: [
            "#22c55e",
            "#16a34a",
            "#84cc16",
            "#10b981",
            "#34d399",
          ],
        };

    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`relative rounded-2xl shadow-xl max-w-lg w-full overflow-hidden ${colorConfig.bgColor} ${colorConfig.textColor} ring-1 ${colorConfig.ringColor}`}
          >
            {/* Animated background */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(135deg, ${colorConfig.gradientColors})`,
                backgroundSize: "320% 320%",
                opacity: 0.5,
              }}
              initial={{ backgroundPosition: "0% 50%" }}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />

            {/* Confetti animation */}
            {Array.from({ length: 12 }).map((_, idx) => {
              const x = (Math.random() - 0.5) * 200;
              const y = -100 - Math.random() * 40;
              const delay = Math.random() * 0.3;
              const size = 3 + Math.round(Math.random() * 4);
              const rotate = (Math.random() - 0.5) * 90;
              return (
                <motion.span
                  key={idx}
                  className="absolute rounded-sm"
                  style={{
                    left: "50%",
                    top: "35%",
                    width: size,
                    height: size,
                    backgroundColor:
                      colorConfig.confettiColors[
                        idx % colorConfig.confettiColors.length
                      ],
                  }}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
                  animate={{ opacity: 1, scale: 1, x, y, rotate }}
                  transition={{ duration: 0.9, ease: "easeOut", delay }}
                />
              );
            })}

            {/* Content container with better spacing */}
            <div className="relative px-6 py-8">
              {/* Icon section */}
              <div className="mb-6 flex justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{
                    scale: [0.8, 1.1, 1],
                    rotate: [0, -3, 3, 0],
                    opacity: 1,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="relative"
                >
                  <CheckCircle2
                    size={80}
                    className="text-white drop-shadow-lg"
                  />
                </motion.div>
              </div>

              {/* Title */}
              <motion.h1
                className="text-2xl font-bold mb-4 text-white tracking-tight leading-tight"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {successMode === "test"
                  ? "¡Prueba local completada!"
                  : "¡Encuesta completada con éxito!"}
              </motion.h1>

              {/* Description */}
              <motion.div
                className="mb-6"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="flex flex-col justify-center items-center text-center">
                  <PartyPopper className="w-12 opacity-75 p-2 h-12 flex-shrink-0" />
                  <p className="text-white/90 text-sm leading-relaxed max-w-xs">
                    {successMode === "test"
                      ? "Esta fue una prueba local. No se guardó ningún caso real en la base de datos."
                      : successMode === "offline"
                      ? "Tu respuesta se guardó correctamente y se sincronizará automáticamente cuando haya conexión."
                      : "Tu respuesta fue enviada correctamente."}
                  </p>
                </div>
              </motion.div>

              {/* Progress bar */}
              <motion.div
                className="mb-6"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {(() => {
                  const progress = Math.min(
                    100,
                    Math.max(
                      0,
                      ((INITIAL_COUNTDOWN - countdown) / INITIAL_COUNTDOWN) *
                        100
                    )
                  );
                  return (
                    <div className="mx-auto w-48 h-2 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full bg-white/80 rounded-full"
                        style={{
                          width: `${progress}%`,
                          transition: "width 300ms ease",
                        }}
                      />
                    </div>
                  );
                })()}
              </motion.div>

              {/* Button */}
              <motion.button
                onClick={() => router.push("/dashboard/encuestas")}
                className={`px-8 py-3 rounded-lg ${colorConfig.buttonBgColor} ${colorConfig.buttonTextColor} ${colorConfig.buttonHoverColor} transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm`}
                whileTap={{ scale: 0.98 }}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Volver ahora {countdown > 0 ? `(${countdown})` : ""}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Pantalla de error de geolocalización (solo si GPS es obligatorio)
  if (locationError && requireGpsRef.current) {
    const getErrorConfig = (errorType) => {
      switch (errorType) {
        case "PERMISSION_DENIED":
          return {
            title: "Necesitamos tu ubicación",
            message:
              "Para registrar correctamente esta respuesta, necesitamos acceder a tu ubicación GPS.",
            instruction:
              "Toca el botón de abajo para activar el permiso de ubicación. Si ya lo rechazaste antes, deberás habilitar el acceso a la ubicación desde la configuración de tu dispositivo o navegador.",
            icon: MapPin,
            bgGradient: "from-amber-50 to-orange-50",
            borderColor: "border-amber-200",
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            titleColor: "text-gray-800",
            textColor: "text-gray-700",
            buttonBg:
              "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
            buttonText: "text-white",
            cancelBorder: "border-gray-300",
            cancelText: "text-gray-700",
            cancelHover: "hover:bg-gray-100",
          };
        case "POSITION_UNAVAILABLE":
          return {
            title: "No se pudo obtener tu ubicación",
            message: "Parece que hay un problema con el GPS de tu dispositivo.",
            instruction:
              "Verifica que el GPS esté activado en la configuración de tu dispositivo y que estés en un lugar con buena señal.",
            icon: AlertTriangle,
            bgGradient: "from-blue-50 to-indigo-50",
            borderColor: "border-blue-200",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            titleColor: "text-gray-800",
            textColor: "text-gray-700",
            buttonBg:
              "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600",
            buttonText: "text-white",
            cancelBorder: "border-gray-300",
            cancelText: "text-gray-700",
            cancelHover: "hover:bg-gray-100",
          };
        case "TIMEOUT":
          return {
            title: "La búsqueda tomó demasiado tiempo",
            message: "No pudimos obtener tu ubicación en el tiempo esperado.",
            instruction:
              "Intenta nuevamente. Asegúrate de estar en un lugar con buena señal GPS.",
            icon: AlertTriangle,
            bgGradient: "from-yellow-50 to-amber-50",
            borderColor: "border-yellow-200",
            iconBg: "bg-yellow-100",
            iconColor: "text-yellow-600",
            titleColor: "text-gray-800",
            textColor: "text-gray-700",
            buttonBg:
              "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600",
            buttonText: "text-white",
            cancelBorder: "border-gray-300",
            cancelText: "text-gray-700",
            cancelHover: "hover:bg-gray-100",
          };
        case "UNSUPPORTED":
          return {
            title: "Geolocalización no disponible",
            message:
              "Tu dispositivo o navegador no soporta la función de ubicación GPS.",
            instruction:
              "Por favor, intenta usar un navegador moderno como Chrome, Firefox o Safari.",
            icon: AlertTriangle,
            bgGradient: "from-red-50 to-rose-50",
            borderColor: "border-red-200",
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
            titleColor: "text-gray-800",
            textColor: "text-gray-700",
            buttonBg:
              "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600",
            buttonText: "text-white",
            cancelBorder: "border-gray-300",
            cancelText: "text-gray-700",
            cancelHover: "hover:bg-gray-100",
          };
        default:
          return {
            title: "Error de ubicación",
            message: "Ocurrió un error inesperado al obtener tu ubicación.",
            instruction:
              "Por favor, intenta nuevamente o contacta con soporte si el problema persiste.",
            icon: AlertTriangle,
            bgGradient: "from-gray-50 to-slate-50",
            borderColor: "border-gray-200",
            iconBg: "bg-gray-100",
            iconColor: "text-gray-600",
            titleColor: "text-gray-800",
            textColor: "text-gray-700",
            buttonBg:
              "bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600",
            buttonText: "text-white",
            cancelBorder: "border-gray-300",
            cancelText: "text-gray-700",
            cancelHover: "hover:bg-gray-100",
          };
      }
    };

    const config = getErrorConfig(locationError);
    const ErrorIcon = config.icon;

    return (
      <div className="p-4 sm:p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`relative p-8 rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden bg-gradient-to-br ${config.bgGradient} border-2 ${config.borderColor}`}
          >
            {/* Ícono decorativo con animación */}
            <div className="mb-6 flex justify-center">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{
                  scale: [0.8, 1.1, 1],
                  rotate: [-10, 5, 0],
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeOut",
                  times: [0, 0.6, 1],
                }}
                className={`${config.iconBg} p-6 rounded-full shadow-lg`}
              >
                <ErrorIcon
                  size={64}
                  className={`${config.iconColor}`}
                  strokeWidth={2.5}
                />
              </motion.div>
            </div>

            {/* Título */}
            <h1
              className={`text-2xl sm:text-3xl font-bold mb-3 ${config.titleColor} text-center`}
            >
              {config.title}
            </h1>

            {/* Mensaje principal */}
            <p
              className={`${config.textColor} mb-3 text-base sm:text-lg text-center font-medium`}
            >
              {config.message}
            </p>

            {/* Instrucciones detalladas */}
            <div
              className={`${config.textColor} mb-8 text-sm sm:text-base text-center bg-white/50 p-4 rounded-xl border ${config.borderColor}`}
            >
              <p className="leading-relaxed">{config.instruction}</p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 justify-center flex-wrap">
              <motion.button
                onClick={retryLocationCapture}
                disabled={isCapturingLocation}
                className={`px-8 py-4 rounded-xl ${config.buttonBg} ${config.buttonText} transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold text-base`}
                whileHover={{ scale: isCapturingLocation ? 1 : 1.02 }}
                whileTap={{ scale: isCapturingLocation ? 1 : 0.98 }}
              >
                {isCapturingLocation ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Obteniendo ubicación...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>
                      {locationError === "PERMISSION_DENIED"
                        ? "Activar ubicación"
                        : "Reintentar"}
                    </span>
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={() => router.push("/dashboard/encuestas")}
                className={`px-8 py-4 rounded-xl bg-white border-2 ${config.cancelBorder} ${config.cancelText} ${config.cancelHover} transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-base`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancelar
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Pantalla de captura de ubicación
  if (isCapturingLocation) {
    return (
      <div className="p-4 h-[calc(100vh-64px)] flex items-center justify-center">
        <LoaderWrapper
          size="lg"
          fullScreen={false}
          text="Obteniendo ubicación..."
          className="text-primary"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 h-[calc(100vh-64px)] flex items-center justify-center">
        <LoaderWrapper
          size="lg"
          fullScreen={false}
          text="Cargando encuesta..."
          className="text-primary"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => router.push("/dashboard/encuestas")}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Volver al panel
        </button>
      </div>
    );
  }

  if (!surveyModel) {
    return (
      <div className="p-4 h-[calc(100vh-64px)] flex items-center justify-center">
        <LoaderWrapper
          size="lg"
          fullScreen={false}
          text="Preparando encuesta..."
          className="text-primary"
        />
      </div>
    );
  }

  return (
    <div className="survey-container">
      <Survey model={surveyModel} onComplete={handleComplete} />

      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={() => {
          try {
            const pageIdx = surveyModel?.currentPageNo ?? 0;
            trackEvent("survey_abandon_confirmed", {
              survey_id: surveyId,
              page_index: pageIdx,
            });
          } catch {}
          setShowLeaveModal(false);
          setIsBlocking(false);
          const pending = pendingNavRef.current;
          pendingNavRef.current = null;
          if (!pending) {
            router.push("/dashboard/encuestas");
            return;
          }
          if (pending.type === "back") {
            router.replace("/dashboard/encuestas");
            return;
          }
          if (pending.type === "url") {
            try {
              const url = new URL(pending.target);
              if (url.origin === window.location.origin) {
                router.push(url.pathname + url.search + url.hash);
              } else {
                window.location.assign(pending.target);
              }
            } catch {
              window.location.assign(pending.target);
            }
            return;
          }
          if (pending.type === "external") {
            window.location.assign(pending.target);
            return;
          }
          router.push("/dashboard/encuestas");
        }}
        title="Abandonar encuesta"
        confirmText="Salir sin guardar"
        cancelText="Seguir contestando"
      >
        <p>Si abandonas ahora, perderás el progreso de esta encuesta.</p>
      </ConfirmModal>

      {/* Modal para enviar sin coordenadas GPS */}
      <AnimatePresence>
        {showSendWithoutGpsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowSendWithoutGpsModal(false);
                setPendingSurveyData(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            />

            {/* Dialog con estilo similar a pantallas de éxito/error */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="relative rounded-3xl shadow-xl max-w-lg w-full overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200"
            >
              {/* Ícono decorativo con animación */}
              <div className="pt-8 pb-4 flex justify-center">
                <motion.div
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{
                    scale: [0.8, 1.1, 1],
                    rotate: [-10, 5, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                    times: [0, 0.6, 1],
                  }}
                  className="bg-amber-100 p-6 rounded-full shadow-lg"
                >
                  <MapPin
                    size={64}
                    className="text-amber-600"
                    strokeWidth={2.5}
                  />
                </motion.div>
              </div>

              {/* Título */}
              <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-gray-800 text-center px-6">
                Ubicación GPS no disponible
              </h1>

              {/* Mensaje principal */}
              <p className="text-gray-700 mb-3 text-base sm:text-lg text-center font-medium px-6">
                No se pudo obtener tu ubicación
              </p>

              {/* Instrucciones detalladas */}
              <div className="text-gray-700 mb-8 text-sm sm:text-base text-center bg-white/50 p-4 mx-6 rounded-xl border border-amber-200">
                <p className="leading-relaxed">
                  ¿Deseas enviar el caso sin coordenadas GPS?
                </p>
              </div>

              {/* Botones de acción */}
              <div className="px-6 pb-8 space-y-3">
                <motion.button
                  onClick={async () => {
                    setShowSendWithoutGpsModal(false);
                    setIsSavingCase(true);
                    try {
                      await submitSurvey(pendingSurveyData, null);
                      try {
                        trackEvent("survey_submitted_without_gps", {
                          survey_id: surveyId,
                        });
                      } catch {}
                    } catch (e) {
                      toast.error(e.message || "Error al enviar la encuesta");
                      setError(e.message);
                    } finally {
                      setIsSavingCase(false);
                      setPendingSurveyData(null);
                    }
                  }}
                  className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-base flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Enviar sin GPS</span>
                </motion.button>

                <motion.button
                  onClick={async () => {
                    setShowSendWithoutGpsModal(false);
                    setIsCapturingLocation(true);
                    setLocationError(null);
                    try {
                      const locationData =
                        await GeolocationService.getCurrentPosition({
                          enableHighAccuracy: true,
                          timeout: 15000,
                          maximumAge: 0,
                        });
                      setCapturedLocation(locationData);
                      setIsCapturingLocation(false);

                      // Activar pantalla "Guardando caso..." y enviar
                      setIsSavingCase(true);
                      await submitSurvey(pendingSurveyData, locationData);
                      setIsSavingCase(false);
                    } catch (geoError) {
                      setLocationError(geoError.message);
                      setShowSendWithoutGpsModal(true);
                    } finally {
                      setIsCapturingLocation(false);
                      setIsSavingCase(false);
                    }
                  }}
                  className="w-full px-8 py-4 rounded-xl bg-white border-2 border-amber-300 text-amber-700 hover:bg-amber-50 transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-base flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Reintentar</span>
                </motion.button>

                <motion.button
                  onClick={() => {
                    setShowSendWithoutGpsModal(false);
                    setPendingSurveyData(null);
                  }}
                  className="w-full px-8 py-4 rounded-xl bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-base"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
