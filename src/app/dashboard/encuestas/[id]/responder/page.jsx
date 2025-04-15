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

        // Basic configuration
        model.locale = "es";
        model.showQuestionNumbers = false;
        model.showProgressBar = "top";
        model.pageNextText = "Siguiente";
        model.pagePrevText = "Anterior";
        model.completeText = "Finalizar";
        model.showPreviewBeforeComplete = "noPreview";

        // Customize CSS classes
        model.css = {
          root: "survey-container",
          header: "survey-header text-sm text-text-secondary mb-4",
          headerText: "text-base font-normal",
          description: "hidden",
          page: {
            root: "survey-page",
            title: "hidden",
          },
          pageTitle: "hidden",
          question: {
            root: "survey-question mb-6",
            title: "text-lg font-medium text-text-primary mb-3",
            content: "question-content",
            mainRoot: "question-main-root",
            header: "question-header",
            headerLeft: "question-header-left",
            headerRight: "question-header-right",
            contentLeft: "question-content-left",
            contentRight: "question-content-right",
          },
          panel: {
            title: "panel-title text-base font-medium text-text-primary mb-2",
            description: "panel-description text-sm text-text-secondary mb-4",
          },
          error: {
            root: "text-red-500 text-sm mt-1",
            icon: "hidden",
            item: "text-red-500",
          },
          progressBar: {
            root: "progress-bar-root mb-4",
            container:
              "progress-bar-container h-2 bg-card-background rounded-full",
            bar: "progress-bar h-full bg-primary rounded-full transition-all duration-300",
          },
          navigation: {
            complete: "btn-primary px-6 py-2 rounded-lg",
            prev: "btn-action px-6 py-2 rounded-lg mr-2",
            next: "btn-primary px-6 py-2 rounded-lg",
            start: "btn-primary px-6 py-2 rounded-lg",
          },
        };

        // Wizard configuration
        model.questionsOnPageMode = "questionPerPage";
        model.showPageTitles = false;
        model.showPageNumbers = false;
        model.showNavigationButtons = true;
        model.showPrevButton = true;
        model.goNextPageAutomatic = false;
        model.checkErrorsMode = "onNextPage";
        model.clearInvisibleValues = "onHidden";

        // Completion page configuration
        model.showCompletedPage = true;
        model.completedHtml = "<h4>¡Gracias por completar la encuesta!</h4>";

        // Event handlers for navigation
        model.onCurrentPageChanging.add(function (sender, options) {
          if (options.isNextPage) {
            const currentPage = sender.currentPage;
            if (currentPage && currentPage.hasErrors()) {
              options.allowChanging = false;
            }
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

      // Get all questions from the survey
      sender.getAllQuestions().forEach((question) => {
        const questionName = question.name;
        const questionText = question.title;
        const answer = sender.data[questionName];

        if (answer !== undefined) {
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

      const answerData = {
        surveyId: id,
        fullName: user?.fullName,
        answer: transformedAnswers,
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
