"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { toast } from "react-toastify";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import GeolocationService from "@/services/geolocation.service";

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
  const [surveyId, setSurveyId] = useState(null);
  useEffect(() => {
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
  }, [router]);
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

        setSurveyModel(model);
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

  const handleComplete = async (sender) => {
    try {
      setIsCapturingLocation(true);
      setLocationError(null);

      // 1. Capturar geolocalización OBLIGATORIA
      let locationData;
      try {
        locationData = await GeolocationService.getCurrentPosition();
        setCapturedLocation(locationData);
      } catch (geoError) {
        setIsCapturingLocation(false);
        setLocationError(geoError.message);
        return; // Detener envío si no hay coordenadas
      }

      // 2. Preparar datos de la encuesta
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

      // 3. Crear payload CON coordenadas
      const payload = {
        surveyId: surveyId,
        _id: `survey_${surveyId}_${user?._id || "anon"}_${Date.now()}`,
        fullName: user?.fullName,
        userId: user?._id,
        answer: transformedAnswers,
        createdAt: new Date().toISOString(),
        time: sender.timeSpent,
        authToken: token,
        lat: locationData.lat,
        lng: locationData.lng,
      };

      // 4. Enviar (online/offline)
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const { queueResponseForSync } = await import("@/services/db/outbox");
        await queueResponseForSync(payload);
        setSuccessMode("offline");
        setSurveyCompletedSuccessfully(true);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/insert-answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Error al enviar la encuesta al servidor");

      setSuccessMode("online");
      setSurveyCompletedSuccessfully(true);
      try {
        const key = "responder:surveyId";
        if (typeof window !== "undefined") {
          window.sessionStorage?.removeItem(key);
          window.localStorage?.removeItem(key);
        }
      } catch {}
    } catch (e) {
      toast.error(e.message || "Error inesperado");
      setError(e.message);
    } finally {
      setIsCapturingLocation(false);
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

  if (surveyCompletedSuccessfully) {
    // Configuración de colores según el modo
    const isOffline = successMode === "offline";
    const colorConfig = isOffline
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
                ¡Encuesta completada con éxito!
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
                    {successMode === "offline"
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

  // Pantalla de error de geolocalización
  if (locationError) {
    const getErrorMessage = (errorType) => {
      switch (errorType) {
        case "PERMISSION_DENIED":
          return "No es posible registrar un caso sin coordenadas. Si ya rechazaste los permisos, busca el ícono de ubicación en la barra de direcciones de tu navegador y permite el acceso.";
        case "POSITION_UNAVAILABLE":
          return "No se pudo determinar tu ubicación. Verifica que el GPS esté activado.";
        case "TIMEOUT":
          return "Se agotó el tiempo para obtener tu ubicación. Inténtalo nuevamente.";
        case "UNSUPPORTED":
          return "Tu dispositivo no soporta geolocalización.";
        default:
          return "Error desconocido al obtener la ubicación.";
      }
    };

    const getErrorIcon = (errorType) => {
      return errorType === "PERMISSION_DENIED" ? MapPin : AlertTriangle;
    };

    const ErrorIcon = getErrorIcon(locationError);

    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative p-6 rounded-2xl shadow-lg max-w-2xl w-full overflow-hidden bg-red-600 text-white ring-1 ring-red-700/30"
          >
            <div className="mb-4 flex justify-center">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: [0.9, 1.08, 1] }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <ErrorIcon size={96} className="text-white drop-shadow" />
              </motion.div>
            </div>

            <h1 className="text-2xl font-extrabold mb-4 text-white tracking-tight">
              Ubicación requerida
            </h1>

            <p className="text-white/90 mb-6 text-lg">
              {getErrorMessage(locationError)}
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <motion.button
                onClick={retryLocationCapture}
                disabled={isCapturingLocation}
                className="px-6 py-3 rounded-md bg-white text-red-700 hover:bg-white/90 transition duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                whileTap={{ scale: 0.98 }}
              >
                {isCapturingLocation ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Obteniendo ubicación...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    {locationError === "PERMISSION_DENIED"
                      ? "Reintentar ubicación"
                      : "Activar ubicación"}
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={() => router.push("/dashboard/encuestas")}
                className="px-6 py-3 rounded-md bg-transparent border-2 border-white text-white hover:bg-white/10 transition duration-200"
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
    </div>
  );
}
