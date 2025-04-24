"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Model, surveyLocalization, StylesManager } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { useTheme } from "@/providers/ThemeProvider";
import { DoubleBorderLight, DoubleBorderDark } from "survey-core/themes";

// Import SurveyJS styles
import "survey-core/survey-core.css";
import "survey-core/i18n/spanish";

// Spanish localization configuration
const spanishLocalization = {
  pagePrevText: "Anterior",
  pageNextText: "Siguiente",
  completeText: "Finalizar",
  requiredText: "",
  requiredError: "Este campo es obligatorio.",
  emptySurvey: "No hay página visible o pregunta en la encuesta.",
  questionsProgressText: "Respondido {0}/{1} preguntas",
};

// Configure Spanish locale
surveyLocalization.locales["es"] = spanishLocalization;
surveyLocalization.defaultLocale = "es";

export default function SurveyPage() {
  const router = useRouter();
  const { id } = useParams();
  const { theme } = useTheme();
  const [surveyModel, setSurveyModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Apply theme when it changes
  useEffect(() => {
    if (surveyModel) {
      if (theme === "dark") {
        surveyModel.applyTheme(DoubleBorderDark);
      } else {
        surveyModel.applyTheme(DoubleBorderLight);
      }
    }
  }, [theme, surveyModel]);

  // Load survey data
  useEffect(() => {
    const loadSurvey = async () => {
      try {
        // Check authentication
        const user = authService.getUser();
        if (!user) {
          console.log("No user found, redirecting to login");
          router.replace("/login");
          return;
        }

        console.log("Loading survey with ID:", id);
        const response = await surveyService.getSurvey(id);
        console.log("Survey response:", response);

        if (!response?.survey) {
          throw new Error("Survey not found");
        }

        // Get the actual survey data
        const surveyData = response.survey.survey || response.survey;
        console.log("Processing survey data:", surveyData);

        if (!surveyData.pages || !surveyData.pages.length) {
          throw new Error("La encuesta no tiene preguntas configuradas");
        }

        // Check if we have quotas defined in the survey
        const quotas = response.survey.surveyInfo?.quotas || [];

        // Add quota-based questions at the beginning if quotas exist
        if (quotas.length > 0) {
          // Create a new page for quota-based questions
          const quotaPage = {
            name: "quota_page",
            title: "Información del participante",
            description:
              "Por favor, seleccione los datos del participante para comenzar la encuesta",
            elements: [],
          };

          // Create questions for each quota category
          quotas.forEach((quota) => {
            const questionName = `quota_${quota.category
              .toLowerCase()
              .replace(/\s+/g, "_")}`;

            // Create a dropdown question for this quota category
            const quotaQuestion = {
              type: "dropdown",
              name: questionName,
              title: quota.category,
              isRequired: true,
              choicesOrder: "asc",
              placeholder: `Seleccione ${quota.category.toLowerCase()}`,
              choices: quota.segments.map((segment) => ({
                value: segment.name,
                text: segment.name,
              })),
            };

            // Add the question to the quota page
            quotaPage.elements.push(quotaQuestion);
          });

          // Add this page at the beginning of the survey
          surveyData.pages.unshift(quotaPage);
        }

        // Process choices for radio, checkbox, and dropdown questions
        surveyData.pages.forEach((page) => {
          if (!page.elements) return;

          page.elements.forEach((question) => {
            if (
              (question.type === "radiogroup" ||
                question.type === "checkbox" ||
                question.type === "dropdown") &&
              question.choices
            ) {
              question.choices.forEach((choice) => {
                // Handle choice text in Spanish
                if (
                  choice.text &&
                  typeof choice.text === "object" &&
                  choice.text.es
                ) {
                  choice.text = choice.text.es;
                }

                // Generate value from text if missing
                if (
                  typeof choice.value === "undefined" ||
                  choice.value === null ||
                  typeof choice.value === "object"
                ) {
                  if (choice.text && typeof choice.text === "string") {
                    choice.value = choice.text
                      .toLowerCase()
                      .replace(/\s+/g, "_");
                  }
                }
              });
            }
          });
        });

        // Create and configure survey model
        const model = new Model(surveyData);
        console.log("Survey model created:", model);
        console.log("Survey pages:", model.pages);

        // Incluir la definición de la encuesta completa para acceder a la numeración
        try {
          // Verificar si tenemos datos de surveyDefinition y questionNumberMap
          if (
            response.survey.surveyDefinition &&
            response.survey.surveyDefinition.questionNumberMap
          ) {
            model.data = {
              surveyDefinition: response.survey.surveyDefinition,
            };
            console.log("Using hierarchical question numbers from definition");
          } else {
            console.log("No hierarchical question numbers found in definition");
            // Crear una estructura básica para evitar errores
            model.data = {
              surveyDefinition: {
                questionNumberMap: {},
              },
            };

            // Crear un mapa básico de numeración
            const elements = surveyData.pages[0]?.elements || [];
            elements.forEach((element, index) => {
              if (model.data.surveyDefinition.questionNumberMap) {
                model.data.surveyDefinition.questionNumberMap[
                  element.name
                ] = `${index + 1}`;
              }
            });
          }
        } catch (err) {
          console.error("Error setting up survey definition data:", err);
          // Fallback
          model.data = { surveyDefinition: { questionNumberMap: {} } };
        }

        // Basic configuration
        model.locale = "es";
        model.showQuestionNumbers = true;
        model.questionTitlePattern = "{no}) {title}"; // Formato para numeración personalizada
        model.showProgressBar = "top";
        model.pageNextText = "Siguiente";
        model.pagePrevText = "Anterior";
        model.completeText = "Finalizar";
        model.showPreviewBeforeComplete = "noPreview";

        // Conservar el orden jerárquico establecido durante la creación
        model.questionsOrder = "initial";

        // Configurar para mostrar una pregunta por página
        model.questionsOnPageMode = "questionPerPage";

        // Evitar que se salten preguntas en una rama jerárquica
        model.onCurrentPageChanging.add(function (sender, options) {
          try {
            if (options.isNextPage) {
              const currentPage = sender.currentPage;
              if (currentPage && currentPage.hasErrors()) {
                options.allowChanging = false;
              }

              // Verificar que todas las preguntas condicionales visibles actuales estén contestadas
              const visibleQuestions = sender.currentPage.questions.filter(
                (q) => q.isVisible
              );
              const allAnswered = visibleQuestions.every(
                (q) =>
                  !q.isRequired ||
                  (q.value !== undefined && q.value !== null && q.value !== "")
              );

              if (!allAnswered) {
                options.allowChanging = false;
              }
            }
          } catch (err) {
            console.error("Error in page changing event:", err);
            // En caso de error, permitir el cambio para evitar bloquear la encuesta
            options.allowChanging = true;
          }
        });

        // Formatear los números de las preguntas para mostrar la jerarquía
        model.onProcessTextValue.add(function (sender, options) {
          try {
            if (options.name === "no" && options.question) {
              const questionId = options.question.name;
              if (
                sender.data &&
                sender.data.surveyDefinition &&
                sender.data.surveyDefinition.questionNumberMap &&
                sender.data.surveyDefinition.questionNumberMap[questionId]
              ) {
                const hierarchicalNumber =
                  sender.data.surveyDefinition.questionNumberMap[questionId];
                if (hierarchicalNumber) {
                  options.value = hierarchicalNumber;
                }
              }
            }
          } catch (err) {
            console.error("Error processing question number:", err);
            // En caso de error, dejar que SurveyJS use su numeración predeterminada
          }
        });

        // Custom progress text
        const updateProgressText = (sender) => {
          const currentPageNo = sender.currentPageNo + 1;
          const pageCount = sender.pageCount;
          const progressTextElement =
            document.querySelector(".sv-progress__text");
          if (progressTextElement) {
            progressTextElement.textContent = `Pregunta ${currentPageNo} de ${pageCount}`;
          }
        };

        // Initial progress text
        model.onAfterRenderPage.add(updateProgressText);
        // Update progress text when page changes
        model.onCurrentPageChanged.add(updateProgressText);

        // Apply initial theme
        if (theme === "dark") {
          model.applyTheme(DoubleBorderDark);
        } else {
          model.applyTheme(DoubleBorderLight);
        }

        setSurveyModel(model);
      } catch (err) {
        console.error("Error loading survey:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [id, router, theme]);

  // Handle survey completion
  const handleComplete = async (sender) => {
    try {
      const user = authService.getUser();

      // Transform the answers to use question text as keys
      const transformedAnswers = {};

      // Separate object to track quota responses
      const quotaAnswers = {};

      // Get all questions from the survey
      sender.getAllQuestions().forEach((question) => {
        const questionName = question.name;
        const questionText = question.title;
        const answer = sender.data[questionName];

        // Check if this is a quota question
        const isQuotaQuestion = questionName.startsWith("quota_");

        if (answer !== undefined) {
          // Save quota answers in a separate object
          if (isQuotaQuestion) {
            const quotaCategory = questionText;
            quotaAnswers[quotaCategory] = answer;
          }

          // Handle different question types
          if (Array.isArray(answer)) {
            // For checkbox questions that have multiple answers
            transformedAnswers[questionText] = answer.map((value) => {
              const choice = question.choices?.find((c) => c.value === value);
              return choice?.text || value;
            });
          } else if (typeof answer === "object" && answer !== null) {
            // For matrix or panel dynamic questions
            transformedAnswers[questionText] = {};
            Object.entries(answer).forEach(([key, value]) => {
              const row = question.rows?.find((r) => r.value === key);
              const col = question.columns?.find((c) => c.value === value);
              transformedAnswers[questionText][row?.text || key] =
                col?.text || value;
            });
          } else {
            // For simple questions (radiogroup, text, etc)
            const choice = question.choices?.find((c) => c.value === answer);
            transformedAnswers[questionText] = choice?.text || answer;
          }
        }
      });

      // First, check if the quota is still available
      if (Object.keys(quotaAnswers).length > 0) {
        try {
          // Fetch the current survey to check quota availability
          const surveyResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/survey/${id}`,
            {
              headers: {
                Authorization: localStorage.getItem("token"),
              },
            }
          );

          if (!surveyResponse.ok) {
            throw new Error("Error al verificar disponibilidad de cuotas");
          }

          const surveyData = await surveyResponse.json();
          const survey = surveyData.survey;

          // Check if the selected quota is already full
          if (survey.surveyInfo && survey.surveyInfo.quotas) {
            let isQuotaFull = false;
            let fullQuotaMessage = "";

            survey.surveyInfo.quotas.forEach((quota) => {
              const selectedSegment = quotaAnswers[quota.category];

              if (selectedSegment) {
                const segment = quota.segments.find(
                  (s) => s.name === selectedSegment
                );

                if (segment && segment.current >= segment.target) {
                  isQuotaFull = true;
                  fullQuotaMessage = `La cuota para "${quota.category}: ${selectedSegment}" ya está completa (${segment.current}/${segment.target}).`;
                }
              }
            });

            if (isQuotaFull) {
              setError(fullQuotaMessage);
              return;
            }
          }
        } catch (quotaError) {
          console.error("Error al verificar cuotas:", quotaError);
          // Continue with submission even if quota check fails
        }
      }

      const answerData = {
        surveyId: id,
        fullName: user?.fullName,
        answer: transformedAnswers,
        quotaAnswers: quotaAnswers, // Include quota answers separately
        createdAt: new Date().toISOString(),
      };

      // Get geolocation if available
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          });

          answerData.lat = position.coords.latitude;
          answerData.lng = position.coords.longitude;
        } catch (geoError) {
          console.warn("Could not get geolocation:", geoError);
        }
      }

      // Add time spent
      answerData.time = sender.timeSpent;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/insert-answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("token"),
          },
          body: JSON.stringify(answerData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save survey response");
      }

      router.push("/dashboard/encuestas");
    } catch (err) {
      console.error("Error saving survey:", err);
      setError("Failed to save survey response");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
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
    <div className="container mx-auto px-4 py-8">
      <div className="bg-card-background rounded-lg shadow-sm border border-card-border p-6">
        <style jsx global>{`
          .sv_main .sv_container {
            color: var(--text-primary);
          }

          .sv_main .sv_body {
            border: none;
            background: transparent;
          }

          .sv_main .sv_q_title {
            color: var(--text-primary);
          }

          .sv_main .sv_q_description {
            color: var(--text-secondary);
          }

          .sv_main input[type="radio"],
          .sv_main input[type="checkbox"] {
            accent-color: var(--primary);
          }

          .sv_main .sv_q_radiogroup_label,
          .sv_main .sv_q_checkbox_label,
          .sv_main .sv_q_rating_item {
            color: var(--text-primary);
            transition: all 0.2s ease-in-out;
          }

          .sv_main .sv_q_radiogroup_label:hover,
          .sv_main .sv_q_checkbox_label:hover {
            color: var(--primary);
          }

          .sv_main .sv_q_rating_item.active {
            background-color: var(--primary);
            border-color: var(--primary);
          }

          .sv_main .sv_progress_bar {
            background-color: var(--card-background);
          }

          .sv_main .sv_progress_bar > span {
            background-color: var(--primary);
          }
        `}</style>
        <Survey model={surveyModel} onComplete={handleComplete} />
      </div>
    </div>
  );
}
