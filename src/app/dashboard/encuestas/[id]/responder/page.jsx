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
      "h-4 w-4 text-primary border-gray-300 dark:border-gray-600 focus:ring-primary",
    itemText: "ml-2 text-gray-900 dark:text-white",
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
        setSurveyJson(response); // Store survey JSON
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
      const model = new Model(surveyJson);

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
    }
  }, [theme, surveyModel]); // Re-run effect when theme or surveyModel changes

  // Handle survey completion - wrapped in useCallback
  const handleComplete = useCallback(
    async (sender) => {
      try {
        const endTime = Date.now();
        const timeSpent = Math.floor((endTime - startTime) / 1000); // Time in seconds

        let location = { lat: null, lng: null };
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
            }); // Added timeout
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch (geoError) {
          console.error("Error al obtener la ubicación:", geoError);
          // Continue without location if it fails or times out
        }

        const answerData = {
          surveyId: id,
          userId: user?._id, // Use optional chaining
          fullName: user?.fullName, // Use optional chaining
          answer: sender.data,
          time: timeSpent,
          lat: location.lat,
          lng: location.lng,
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
      } catch (err) {
        console.error("Error al guardar la respuesta:", err);
        setError(
          `Error al guardar la respuesta: ${err.message}. Por favor, intente nuevamente.`
        );
        // Potentially show error within the survey UI instead of replacing the whole page
      }
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
      <div className="bg-card-background border border-card-border rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-text-primary">
          {surveyJson.title?.es || surveyJson.title?.default || "Sin título"}
        </h1>
        <div className="prose max-w-none mb-6">
          <p className="text-text-secondary">
            {surveyJson.description?.es ||
              surveyJson.description?.default ||
              "Sin descripción"}
          </p>
        </div>
        <div className="transition-all duration-300 ease-in-out">
          <Survey model={surveyModel} onComplete={handleComplete} />
        </div>
      </div>
    </div>
  );
}
