"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [surveyJson, setSurveyJson] = useState(null); // State for survey JSON structure
  const [surveyModel, setSurveyModel] = useState(null); // State for SurveyJS Model instance
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [startTime, setStartTime] = useState(null);

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
        console.log(
          "[Data Flow] Raw surveyObject from API:",
          JSON.parse(JSON.stringify(surveyObject))
        );

        // --- Inicio: Transformación para corregir key ---
        const transformedSurvey = JSON.parse(JSON.stringify(surveyObject));

        // Check where 'pages' actually exists
        console.log(
          `[Transform Pre-Check] transformedSurvey.pages exists? ${!!transformedSurvey.pages}, length: ${
            transformedSurvey.pages?.length
          }`
        );
        console.log(
          `[Transform Pre-Check] transformedSurvey.survey.pages exists? ${!!transformedSurvey
            .survey?.pages}, length: ${transformedSurvey.survey?.pages?.length}`
        );

        // Determine the correct path to pages
        const pagesToTransform =
          transformedSurvey.pages || transformedSurvey.survey?.pages || []; // Prioritize direct pages

        // Log which path is being used
        console.log(
          `[Transform Logic] Using pages from: ${
            transformedSurvey.pages
              ? "transformedSurvey.pages"
              : transformedSurvey.survey?.pages
              ? "transformedSurvey.survey.pages"
              : "none"
          }`
        );

        // Iterate over the determined pages array
        pagesToTransform.forEach((page, pageIndex) => {
          // <-- Use pagesToTransform
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

            // ---> START: Convert specific types to text + inputType <---
            const originalType = question.type;
            if (originalType === "date") {
              question.type = "text";
              question.inputType = "date";
              console.log(
                `[Transform Action] Converted question '${question.name}' from 'date' to 'text' with inputType 'date'.`
              );
            } else if (originalType === "time") {
              question.type = "text";
              question.inputType = "time";
              console.log(
                `[Transform Action] Converted question '${question.name}' from 'time' to 'text' with inputType 'time'.`
              );
            } else if (originalType === "email") {
              question.type = "text";
              question.inputType = "email";
              console.log(
                `[Transform Action] Converted question '${question.name}' from 'email' to 'text' with inputType 'email'.`
              );
            } else if (originalType === "number") {
              question.type = "text";
              question.inputType = "number";
              console.log(
                `[Transform Action] Converted question '${question.name}' from 'number' to 'text' with inputType 'number'.`
              );
            } else if (originalType === "phone") {
              question.type = "text";
              question.inputType = "tel"; // Use 'tel' for phone inputType
              console.log(
                `[Transform Action] Converted question '${question.name}' from 'phone' to 'text' with inputType 'tel'.`
              );
            }
            // ---> END: Convert specific types <---

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
        console.log(
          "[Data Flow] Transformed survey data before setting state:",
          JSON.parse(JSON.stringify(transformedSurvey))
        );
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
      console.log(
        "[Data Flow] surveyJson state before creating Model:",
        JSON.parse(JSON.stringify(surveyJson))
      );
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

      // --- START: Define common styles for inputs ---
      const commonInputStyles = {
        opacity: "1",
        position: "static",
        width: "24px", // Increased size
        height: "24px", // Increased size
        marginRight: "12px", // Adjusted margin
        cursor: "pointer",
        verticalAlign: "middle", // Align vertically with label
      };
      // --- END: Define common styles for inputs ---

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
          // Apply common styles to the real checkboxes
          const checkboxInputs = options.htmlElement.querySelectorAll(
            'input[type="checkbox"]'
          );
          checkboxInputs.forEach((input) => {
            Object.assign(input.style, commonInputStyles); // Apply styles
          });

          // Hide the decorative checkboxes
          const checkboxDecorators = options.htmlElement.querySelectorAll(
            ".sd-checkbox__decorator"
          );
          checkboxDecorators.forEach((decorator) => {
            decorator.style.display = "none";
          });
        } else if (question.getType() === "radiogroup") {
          // Apply common styles to the real radio buttons
          const radioInputs = options.htmlElement.querySelectorAll(
            'input[type="radio"]' // Target radio inputs
          );
          radioInputs.forEach((input) => {
            Object.assign(input.style, commonInputStyles); // Apply same styles
          });

          // Hide the decorative element for radio buttons
          const radioDecorators = options.htmlElement.querySelectorAll(
            ".sd-radio__decorator"
          );
          radioDecorators.forEach((decorator) => {
            decorator.style.display = "none";
          });
        } else if (
          question.getType() === "text" ||
          question.getType() === "comment"
        ) {
          // Handle text and comment inputs
          const textInput = options.htmlElement.querySelector(
            'input[type="text"], textarea'
          );
          if (textInput) {
            // Apply Tailwind classes for consistent styling
            textInput.classList.add(
              "p-2", // Increase vertical padding
              "border", // Ensure border utility is applied
              "border-gray-600", // Visible border (adjust if needed for dark mode)
              "dark:border-gray-500", // Slightly lighter border for dark mode contrast
              "rounded-md" // Use consistent rounding
            );
            // Optional: Remove potentially conflicting default classes if necessary
            // textInput.classList.remove('some-default-surveyjs-class');
          }
        }
      });

      // Apply custom CSS classes
      model.css = surveyCssConfiguration;

      // Add event listener
      model.onCurrentPageChanging.add(handleCurrentPageChanging);

      setSurveyModel(model); // Set the configured model instance to state

      // ---> ADDED LOGGING
      console.log("[Data Flow] SurveyJS Model created:", model);
      console.log("[Data Flow] Model Pages Count:", model.pages?.length);
      model.pages?.forEach((page, index) => {
        console.log(
          `[Data Flow] Model Page ${index} Elements Count:`,
          page.elements?.length
        );
        page.elements?.forEach((element, elIndex) => {
          console.log(
            `[Data Flow] Model Page ${index}, Element ${elIndex}:`,
            element.name,
            element.getType()
          );
        });
      });

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
    }
  }, [theme, surveyModel]); // Re-run effect when theme or surveyModel changes

  // Handle survey completion - wrapped in useCallback
  const handleComplete = useCallback(
    async (sender) => {
      const mode = searchParams.get("mode");

      // If it's test mode, show message and skip saving
      if (mode === "test") {
        console.log("Modo Prueba Local: Omitiendo guardado.");
        sender.completedHtml = `
          <div style="padding: 20px; text-align: center;">
            <h4>¡Prueba Local Completada!</h4>
            <p>Esta fue una prueba. Tus respuestas no han sido guardadas.</p>
            <button 
              onclick="window.location.href='/dashboard/encuestas'" 
              style="margin-top: 15px; padding: 8px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
            >
              Volver a Encuestas
            </button>
          </div>
        `;
        // We modify the sender's completedHtml directly
        // The survey library will show this page instead of redirecting immediately
        return; // Exit before saving and redirecting
      }

      // --- Regular saving logic starts here ---
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
    [id, router, startTime, user, searchParams]
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
      <div className="bg-card-background border border-card-border rounded-lg shadow-lg p-6">
        <div className="transition-all duration-300 ease-in-out">
          <Survey model={surveyModel} onComplete={handleComplete} />
        </div>
      </div>
    </div>
  );
}
