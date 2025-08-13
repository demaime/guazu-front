"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Model, surveyLocalization } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { useTheme } from "@/providers/ThemeProvider";
import { DoubleBorderLight, DoubleBorderDark } from "survey-core/themes";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { toast } from "react-toastify";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { motion, AnimatePresence } from "framer-motion";

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
      const key = "responder:surveyId";
      const fromSession =
        typeof window !== "undefined" && window.sessionStorage
          ? window.sessionStorage.getItem(key)
          : null;
      const fromLocal =
        !fromSession && typeof window !== "undefined" && window.localStorage
          ? window.localStorage.getItem(key)
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

        if (theme === "dark") model.applyTheme(DoubleBorderDark);
        else model.applyTheme(DoubleBorderLight);

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

  const handleComplete = async (sender) => {
    try {
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

      const payload = {
        surveyId: surveyId,
        _id: `survey_${surveyId}_${user?._id || "anon"}_${Date.now()}`,
        fullName: user?.fullName,
        userId: user?._id,
        answer: transformedAnswers,
        createdAt: new Date().toISOString(),
        time: sender.timeSpent,
        authToken: token,
      };

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
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative p-4 rounded-2xl shadow-lg max-w-2xl w-full overflow-hidden bg-green-600 text-white ring-1 ring-green-700/30"
          >
            {/* Animated background in green tones */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(34,197,94,0.55) 0%, rgba(16,185,129,0.45) 35%, rgba(5,150,105,0.55) 70%, rgba(34,197,94,0.55) 100%)",
                backgroundSize: "320% 320%",
                opacity: 0.5,
              }}
              initial={{ backgroundPosition: "0% 50%" }}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            {/* Confetti simple */}
            {Array.from({ length: 16 }).map((_, idx) => {
              const colors = [
                "#22c55e",
                "#16a34a",
                "#84cc16",
                "#10b981",
                "#34d399",
              ];
              const x = (Math.random() - 0.5) * 260;
              const y = -140 - Math.random() * 60;
              const delay = Math.random() * 0.25;
              const size = 4 + Math.round(Math.random() * 5);
              const rotate = (Math.random() - 0.5) * 90;
              return (
                <motion.span
                  key={idx}
                  className="absolute rounded-sm"
                  style={{
                    left: "50%",
                    top: "40%",
                    width: size,
                    height: size,
                    backgroundColor: colors[idx % colors.length],
                  }}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
                  animate={{ opacity: 1, scale: 1, x, y, rotate }}
                  transition={{ duration: 0.9, ease: "easeOut", delay }}
                />
              );
            })}
            <div className="mb-4 flex justify-center relative">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: [0.9, 1.08, 1], rotate: [0, -2, 2, 0] }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative"
              >
                <CheckCircle2 size={96} className="text-white drop-shadow" />
              </motion.div>
            </div>
            <motion.h1
              className="text-3xl font-extrabold mb-2 text-white tracking-tight"
              initial={{ x: 0 }}
              animate={{ x: [0, -2, 2, -1, 1, 0] }}
              transition={{ duration: 0.6 }}
            >
              ¡Encuesta completada con éxito!
            </motion.h1>
            <p className="text-white/90 mb-5 flex items-center gap-2 justify-center">
              <PartyPopper className="w-5 h-5" />
              {successMode === "offline"
                ? "Tu respuesta se guardó correctamente y se sincronizará automáticamente cuando haya conexión."
                : "Tu respuesta fue enviada correctamente."}
            </p>
            {/* Countdown progress */}
            {(() => {
              const progress = Math.min(
                100,
                Math.max(
                  0,
                  ((INITIAL_COUNTDOWN - countdown) / INITIAL_COUNTDOWN) * 100
                )
              );
              return (
                <div className="mx-auto mb-4 w-56 h-2 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="h-full bg-white/80"
                    style={{
                      width: `${progress}%`,
                      transition: "width 300ms ease",
                    }}
                  />
                </div>
              );
            })()}
            <motion.button
              onClick={() => router.push("/dashboard/encuestas")}
              className="mt-2 px-6 py-2 rounded-md bg-white text-green-700 hover:bg-white/90 transition duration-200 shadow-sm hover:shadow-md"
              whileTap={{ scale: 0.98 }}
            >
              Volver ahora {countdown > 0 ? `(${countdown})` : ""}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (loading) {
    return (
      <LoaderWrapper
        size="lg"
        fullScreen
        text="Cargando encuesta..."
        className="text-primary"
      />
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Volver al panel
        </button>
      </div>
    );
  }

  if (!surveyModel) {
    return (
      <LoaderWrapper
        size="lg"
        fullScreen
        text="Preparando encuesta..."
        className="text-primary"
      />
    );
  }

  return (
    <div className="survey-container">
      <Survey model={surveyModel} onComplete={handleComplete} />
    </div>
  );
}
