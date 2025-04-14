"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
// CSS imports moved to root layout.jsx
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { DefaultLight, DoubleBorderDark } from "survey-core/themes";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { useTheme } from "@/providers/ThemeProvider";
// CSS imports moved to globals.css

// Define survey configuration outside the component if it doesn't depend on props/state
const surveyCssConfiguration = {
  root: "survey-container",
  container: "p-4",
  header: "mb-4",
  body: "transition-all duration-300 ease-in-out",
  page: {
    root: "page-container",
    title: "text-xl font-semibold mb-4",
  },
  navigation: {
    complete:
      "bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors",
    prev: "bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary-dark transition-colors mr-2",
    next: "bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors",
    progressBar: "bg-gray-200 dark:bg-gray-700 rounded-full h-2",
    progressBarFill:
      "bg-primary h-2 rounded-full transition-all duration-300 ease-in-out",
  },
  question: {
    root: "mb-6",
    title: "text-lg font-medium mb-4",
    description: "text-text-secondary mb-2",
    required: "text-red-500 ml-1",
    error: {
      root: "text-red-500 mt-2 text-sm",
    },
  },
  text: {
    root: "w-full",
    input:
      "w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors",
  },
  radiogroup: {
    root: "space-y-2",
    item: "flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors",
    itemChecked: "bg-gray-100 dark:bg-gray-700",
    itemControl:
      "h-4 w-4 text-primary border-gray-300 dark:border-gray-600 focus:ring-primary",
    itemText: "ml-2 text-gray-900 dark:text-white",
  },
  checkbox: {
    root: "space-y-2",
    item: "flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors",
    itemChecked: "bg-gray-100 dark:bg-gray-700",
    itemControl:
      "h-5 w-5 text-blue-600 bg-gray-100 border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded",
    itemText: "ml-3 text-base text-gray-900 dark:text-white select-none",
    controlLabel: "w-full flex items-center cursor-pointer",
  },
};

// Prevent page change if current question is empty
const handleCurrentPageChanging = (sender, options) => {
  if (options.isNextPage) {
    const currentPage = sender.currentPage;
    if (!currentPage || currentPage.questions[0]?.isEmpty()) {
      // Add null check for questions[0]
      options.allowChanging = false;
    }
  }
};

export default function ResponderEncuesta() {
  const router = useRouter();
  const { id } = useParams();
  const { theme } = useTheme();
  const [surveyJson, setSurveyJson] = useState(null); // State for survey JSON structure
  const [surveyModel, setSurveyModel] = useState(null); // State for SurveyJS Model instance
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Direct style injection for checkboxes - this is a more aggressive approach
  useEffect(() => {
    // Create a style element
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      /* Hide the decorative checkbox */
      .sd-checkbox__decorator {
        display: none !important;
      }
      
      /* Show and style the real checkbox */
      .sd-checkbox input[type="checkbox"] {
        opacity: 1 !important;
        position: static !important;
        width: 20px !important;
        height: 20px !important;
        margin-right: 10px !important;
        cursor: pointer !important;
        z-index: 1 !important;
      }
      
      /* Make labels clickable */
      .sd-selectbase__label {
        cursor: pointer !important;
      }
      
      /* Fix checkbox alignment */
      .sd-item__control-label {
        display: flex !important;
        align-items: center !important;
      }
    `;

    // Add the style element to the head
    document.head.appendChild(styleEl);

    // Clean up function
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Effect to load initial user and survey data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userData = authService.getUser();
        setUser(userData);

        if (!userData) {
          console.log("No hay usuario autenticado, redirigiendo a login");
          router.replace("/login");
          return; // Exit early if no user
        }

        const response = await surveyService.getSurvey(id);
        console.log("Survey data from backend:", response);

        // Check if the survey data exists
        if (!response || !response.survey) {
          throw new Error("No se encontró la encuesta");
        }

        // Use the survey object inside the response
        const surveyObject = response.survey;
        // Log para ver la estructura INMEDIATA de surveyObject
        console.log(
          "[Immediate Check] surveyObject raw:",
          JSON.parse(JSON.stringify(surveyObject))
        );
        console.log(
          `[Immediate Check] surveyObject has pages? ${!!surveyObject.pages}, length: ${
            surveyObject.pages?.length
          }`
        );
        console.log(
          `[Immediate Check] surveyObject has survey prop? ${!!surveyObject.survey}`
        );
        console.log(
          `[Immediate Check] surveyObject.survey has pages? ${!!surveyObject
            .survey?.pages}, length: ${surveyObject.survey?.pages?.length}`
        );

        // --- Inicio: Transformación para corregir key ---
        const transformedSurvey = JSON.parse(JSON.stringify(surveyObject));

        // Volver a buscar pages en .survey.pages
        console.log(
          `[Transform Pre-Check] transformedSurvey.survey.pages exists? ${!!transformedSurvey
            .survey?.pages}, length: ${transformedSurvey.survey?.pages?.length}`
        );

        transformedSurvey.survey?.pages?.forEach((page, pageIndex) => {
          // <-- CORREGIDO a transformedSurvey.survey.pages
          // Log para verificar la existencia y longitud de elements en cada page
          console.log(
            `[Transform Pre-Check] Page ${pageIndex}: page.elements exists? ${!!page.elements}, length: ${
              page.elements?.length
            }`
          );

          page.elements?.forEach((question) => {
            // Log CADA question encontrada ANTES del check de tipo/choices
            console.log(
              `[Transform Loop] Found element: name='${question.name}', type='${
                question.type
              }', hasChoices?=${!!question.choices}`
            );

            if (
              (question.type === "radiogroup" ||
                question.type === "checkbox" ||
                question.type === "dropdown") &&
              question.choices
            ) {
              console.log(
                `[Transform Check] Processing choices for question: ${question.name}`
              ); // Log question name
              question.choices.forEach((choice, index) => {
                console.log(
                  `[Transform Check] Choice ${index} BEFORE:`,
                  JSON.parse(JSON.stringify(choice))
                ); // Log choice before

                let valueIsMissingOrObject =
                  typeof choice.value === "undefined" ||
                  choice.value === null ||
                  typeof choice.value === "object";

                // Si 'value' falta O es un objeto, intentar generar uno desde text.es
                if (
                  valueIsMissingOrObject &&
                  choice.text &&
                  typeof choice.text.es === "string"
                ) {
                  const originalValue = choice.value; // Puede ser undefined u objeto
                  // Generar un valor simple desde el texto (ej: lowercase, replace spaces)
                  const newValue = choice.text.es
                    .toLowerCase()
                    .replace(/\s+/g, "_");
                  console.warn(
                    `[Transform Action] Generating/Replacing choice value for question '${question.name}', choice index ${index}. Original:`,
                    originalValue,
                    `New:`,
                    newValue
                  );
                  choice.value = newValue;
                  console.log(
                    `[Transform Check] Choice ${index} AFTER assign:`,
                    JSON.parse(JSON.stringify(choice))
                  );
                } else if (choice.value) {
                  // Si el value existe y es primitivo, no hacer nada pero loguear
                  console.log(
                    `[Transform Check] Choice ${index} - value exists and is primitive:`,
                    choice.value
                  );
                } else {
                  // Si no se pudo generar (ej. falta text.es)
                  console.error(
                    `[Transform Error] Could not generate value for choice ${index} in question '${question.name}'. Missing text.es?`,
                    choice
                  );
                }
              });
            } else {
              // Log si no entra en el if
              console.log(
                `[Transform Loop] Skipping choices processing for element '${question.name}' (type or choices condition not met).`
              );
            }
            // Añadir lógica similar para otros tipos de preguntas si es necesario (ej. matrix columns/rows)
          });
        });

        console.log(
          "[Transform Check] Final transformedSurvey before setSurveyJson:",
          JSON.parse(JSON.stringify(transformedSurvey))
        ); // Log final object
        // --- Fin: Transformación ---

        setSurveyJson(transformedSurvey); // <--- Usar el objeto transformado
        setStartTime(Date.now());
      } catch (err) {
        console.error("Error al cargar la encuesta:", err);
        setError("Error al cargar la encuesta. Por favor, intente nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, router]);

  // Effect to create and configure survey model when surveyJson is loaded
  useEffect(() => {
    if (surveyJson) {
      // Make sure we have the complete survey definition with all required properties
      console.log("Creating survey model with:", surveyJson);
      // Add debug log to examine structure
      console.log("Survey structure:", {
        title: surveyJson.title,
        description: surveyJson.description,
        survey: surveyJson.survey,
        surveyPages: surveyJson.survey?.pages,
      });

      // Create the model with the survey definition
      const model = new Model(surveyJson.survey || surveyJson);

      // Basic configuration
      model.mode = "edit";
      model.showProgressBar = "bottom";
      model.showQuestionNumbers = true;
      model.pageNextText = "Siguiente";
      model.pagePrevText = "Anterior";
      model.completeText = "Finalizar";
      model.showPrevButton = true;
      model.showCompletedPage = true;
      model.completedHtml = "<h4>¡Gracias por completar la encuesta!</h4>";
      model.requiredText = "Por favor responde esta pregunta.";
      model.checkErrorsMode = "onNextPage";
      model.questionErrorLocation = "bottom";
      model.showPreviewBeforeComplete = "noPreview";
      model.questionsOnPageMode = "questionPerPage";

      // Fix checkbox styling issues - target correct class names based on inspector
      model.onAfterRenderQuestion.add((survey, options) => {
        // Log question details for debugging
        const question = options.question;
        const choicesDetails = question.visibleChoices?.map((choice) => ({
          value: choice.value,
          text: choice.text, // Or choice.locText.renderedHtml for localized/HTML text
          // Add any other relevant choice properties here
        }));

        console.log("Rendering question: " + question.name, {
          type: question.getType(),
          // choices: question.choices, // Keep original choices array if needed
          visibleChoicesDetails: choicesDetails, // Log processed choice details
          data: question.toJSON(), // Log full question data as JSON
          htmlElement: options.htmlElement, // Reference to the rendered HTML
        });

        if (question.getType() === "checkbox") {
          // Give the real checkboxes proper styling and make them visible
          const checkboxInputs = options.htmlElement.querySelectorAll(
            'input[type="checkbox"]'
          );
          checkboxInputs.forEach((input) => {
            input.style.opacity = "1";
            input.style.position = "static";
            input.style.width = "20px";
            input.style.height = "20px";
            input.style.marginRight = "10px";
            input.style.cursor = "pointer";
          });

          // Hide the decorative checkboxes
          const decorators = options.htmlElement.querySelectorAll(
            ".sd-checkbox__decorator"
          );
          decorators.forEach((decorator) => {
            decorator.style.display = "none";
          });
        }
      });

      // Apply custom CSS classes
      model.css = surveyCssConfiguration;

      // Add event listener
      model.onCurrentPageChanging.add(handleCurrentPageChanging);

      setSurveyModel(model); // Set the configured model instance to state

      // Clean up event listener on unmount or when surveyJson changes
      return () => {
        model.onCurrentPageChanging.remove(handleCurrentPageChanging);
      };
    }
  }, [surveyJson]); // Re-run when surveyJson changes

  // Effect to apply SurveyJS theme dynamically based on app theme and surveyModel
  useEffect(() => {
    if (surveyModel) {
      if (theme === "dark") {
        surveyModel.applyTheme(DoubleBorderDark);
      } else {
        surveyModel.applyTheme(DefaultLight);
      }

      // Cleanup checkbox duplicates after model is applied
      const cleanupCheckboxes = () => {
        // Target the SD classes as seen in the console
        const checkboxGroups = document.querySelectorAll(".sd-checkbox");
        checkboxGroups.forEach((group) => {
          // Hide all decorative checkboxes
          const decorators = group.querySelectorAll(".sd-checkbox__decorator");
          decorators.forEach((decorator) => {
            decorator.style.display = "none";
          });

          // Make real checkboxes visible and styled
          const inputs = group.querySelectorAll('input[type="checkbox"]');
          inputs.forEach((input) => {
            input.style.opacity = "1";
            input.style.position = "static";
            input.style.width = "20px";
            input.style.height = "20px";
            input.style.marginRight = "10px";
            input.style.cursor = "pointer";
          });
        });
      };

      // Give some time for the DOM to render
      setTimeout(cleanupCheckboxes, 100);

      // Also run cleanup when window loads and resizes
      window.addEventListener("load", cleanupCheckboxes);
      window.addEventListener("resize", cleanupCheckboxes);

      return () => {
        window.removeEventListener("load", cleanupCheckboxes);
        window.removeEventListener("resize", cleanupCheckboxes);
      };
    }
  }, [theme, surveyModel]); // Re-run effect when theme or surveyModel changes

  // Handle survey completion - wrapped in useCallback
  const handleComplete = useCallback(
    async (sender) => {
      const endTime = new Date();
      const timeTaken = endTime - startTime; // Time in milliseconds

      console.log("Survey sender data:", sender.data);

      let coords = null;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          }); // Added timeout
        });
        coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (geoError) {
        console.error("Error al obtener la ubicación:", geoError);
        // Continue without location if it fails or times out
      }

      const answerData = {
        surveyId: id,
        fullName: user?.fullName, // Use optional chaining
        answer: sender.data,
        time: timeTaken,
        lat: coords?.lat,
        lng: coords?.lng,
        createdAt: new Date().toISOString(),
      };

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
        const errorBody = await response.text(); // Get more details on error
        throw new Error(
          `Error al guardar la respuesta: ${response.status} ${errorBody}`
        );
      }

      router.push("/dashboard/encuestas");
    },
    [id, router, startTime, user]
  ); // Added dependencies

  // --- Render logic ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" // Added margin
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          {/* Optional: Add a button to retry loading? */}
        </div>
      </div>
    );
  }

  // Render survey only when model is ready
  if (!surveyModel || !surveyJson) {
    // Check for surveyJson too
    // Or show a specific message like "Preparing survey..."
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando encuesta...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Add custom CSS to fix checkbox styling */}
      <style jsx global>{`
        /* Hide the decorator checkbox that's causing duplication */
        .sd-checkbox__decorator {
          display: none !important;
        }

        /* Style the real checkbox */
        .sd-checkbox input[type="checkbox"] {
          opacity: 1 !important;
          position: static !important;
          margin-right: 10px;
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        /* Make the label and row fully clickable */
        .sd-selectbase__label {
          cursor: pointer;
          width: 100%;
        }

        /* Style the checkbox container */
        div.sd-checkbox {
          margin-bottom: 8px;
        }

        /* Remove any extra spacing */
        .sd-item__control-label {
          display: flex;
          align-items: center;
        }
      `}</style>
      <div className="bg-card-background border border-card-border rounded-lg shadow-lg p-6">
        <div className="transition-all duration-300 ease-in-out">
          <Survey model={surveyModel} onComplete={handleComplete} />
        </div>
      </div>
    </div>
  );
}
