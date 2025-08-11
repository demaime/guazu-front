"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Model, surveyLocalization } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { useTheme } from "@/providers/ThemeProvider";
import { DoubleBorderLight, DoubleBorderDark } from "survey-core/themes";
import { CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

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
  const id = searchParams.get("id");
  const { theme } = useTheme();
  const [surveyModel, setSurveyModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const redirectTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const [surveyCompletedSuccessfully, setSurveyCompletedSuccessfully] =
    useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!id) return;
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
          const local = await getSurveyByIdLocal(id);
          if (!local)
            throw new Error("No hay datos locales para esta encuesta");
          surveyData = local.survey || local;
          serverEnvelope = {
            survey: { survey: surveyData, surveyInfo: local.surveyInfo || {} },
          };
        } else {
          const resp = await surveyService.getSurvey(id);
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
        model.questionsOrder = "initial";
        model.questionsOnPageMode = "questionPerPage";

        if (theme === "dark") model.applyTheme(DoubleBorderDark);
        else model.applyTheme(DoubleBorderLight);

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
  }, [id, router, theme]);

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
        surveyId: id,
        _id: `survey_${id}_${user?._id || "anon"}_${Date.now()}`,
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
        toast.success(
          "Respuesta guardada offline. Se enviará al volver la conexión."
        );
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
      toast.success("¡Encuesta enviada con éxito!");
      setSurveyCompletedSuccessfully(true);
    } catch (e) {
      toast.error(e.message || "Error inesperado");
      setError(e.message);
    }
  };

  if (!id) {
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
        <div className="bg-green-50 dark:bg-green-900 p-8 rounded-lg shadow-md max-w-2xl w-full">
          <div className="mb-4 flex justify-center">
            <CheckCircle2
              size={80}
              className="text-green-500 dark:text-green-400"
            />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-green-700 dark:text-green-300">
            ¡Encuesta completada con éxito!
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
          >
            Volver ahora
          </button>
        </div>
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-700">No hay encuesta disponible</div>
      </div>
    );
  }

  return (
    <div className="survey-container">
      <Survey model={surveyModel} onComplete={handleComplete} />
    </div>
  );
}
