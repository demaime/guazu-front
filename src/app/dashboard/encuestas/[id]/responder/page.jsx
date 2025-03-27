"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import "survey-core/survey-core.css";

export default function ResponderEncuesta() {
  const router = useRouter();
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = authService.getUser();
        setUser(userData);

        if (!userData) {
          console.log("No hay usuario autenticado, redirigiendo a login");
          router.replace("/login");
          return;
        }

        const response = await surveyService.getSurvey(id);
        setSurvey(response);
        setStartTime(Date.now());
        setLoading(false);
      } catch (error) {
        console.error("Error al cargar la encuesta:", error);
        setError("Error al cargar la encuesta. Por favor, intente nuevamente.");
        setLoading(false);
      }
    };

    loadData();
  }, [id, router]);

  const handleComplete = async (sender) => {
    try {
      const endTime = Date.now();
      const timeSpent = Math.floor((endTime - startTime) / 1000); // Tiempo en segundos

      // Obtener la ubicación actual
      let location = { lat: null, lng: null };
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (geoError) {
        console.error("Error al obtener la ubicación:", geoError);
      }

      const answerData = {
        surveyId: id,
        userId: user._id,
        fullName: user.fullName,
        answer: sender.data,
        time: timeSpent,
        lat: location.lat,
        lng: location.lng,
        createdAt: new Date().toISOString(),
      };

      // Enviar la respuesta al backend
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
        throw new Error("Error al guardar la respuesta");
      }

      // Redirigir al dashboard o mostrar mensaje de éxito
      router.push("/dashboard/encuestas");
    } catch (error) {
      console.error("Error al guardar la respuesta:", error);
      setError("Error al guardar la respuesta. Por favor, intente nuevamente.");
    }
  };

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
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Advertencia!</strong>
          <span className="block sm:inline"> No se encontró la encuesta.</span>
        </div>
      </div>
    );
  }

  // Crear el modelo de la encuesta usando la estructura correcta
  const surveyModel = new Model(survey);

  // Configuración básica del modelo
  surveyModel.mode = "edit";
  surveyModel.showProgressBar = "bottom";
  surveyModel.showQuestionNumbers = true;
  surveyModel.pageNextText = "Siguiente";
  surveyModel.pagePrevText = "Anterior";
  surveyModel.completeText = "Finalizar";
  surveyModel.showPrevButton = true;
  surveyModel.showCompletedPage = true;
  surveyModel.completedHtml = "<h4>¡Gracias por completar la encuesta!</h4>";
  surveyModel.requiredText = "Por favor responde esta pregunta.";
  surveyModel.checkErrorsMode = "onNextPage";
  surveyModel.questionErrorLocation = "bottom";
  surveyModel.showPreviewBeforeComplete = "noPreview";

  // Convertir cada pregunta en una página separada
  const questions = surveyModel.getAllQuestions();
  questions.forEach((question) => {
    question.isRequired = true; // Mantenemos las preguntas como requeridas
    const page = surveyModel.addNewPage(question.name);
    page.addQuestion(question);
  });

  // Eliminar la página por defecto que contiene todas las preguntas
  surveyModel.pages.splice(0, 1);

  // Configurar estilos personalizados
  surveyModel.css = {
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

  // Configuración para prevenir avanzar si no hay respuesta
  surveyModel.onCurrentPageChanging.add((sender, options) => {
    if (options.isNextPage) {
      const currentPage = sender.currentPage;
      if (!currentPage || currentPage.questions[0].isEmpty()) {
        options.allowChanging = false;
      }
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-card-background border border-card-border rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-text-primary">
          {survey.title?.es || survey.title?.default || "Sin título"}
        </h1>
        <div className="prose max-w-none mb-6">
          <p className="text-text-secondary">
            {survey.description?.es ||
              survey.description?.default ||
              "Sin descripción"}
          </p>
        </div>
        <div className="transition-all duration-300 ease-in-out">
          <Survey
            model={surveyModel}
            onComplete={handleComplete}
            css={{ root: "survey-custom-container" }}
          />
        </div>
      </div>
    </div>
  );
}
