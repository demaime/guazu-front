"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import { Loader } from "@/components/ui/Loader";
import NuevaEncuesta from "../../nueva/page";

export default function EditarEncuesta() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const data = await surveyService.getSurvey(params.id);
        if (!data || !data.survey) {
          throw new Error("No se encontró la encuesta");
        }
        console.log("Raw survey data:", data.survey);
        setSurvey(data.survey);
      } catch (err) {
        console.error("Error loading survey:", err);
        setError(err.message || "Error al cargar la encuesta");
      } finally {
        setIsLoading(false);
      }
    };

    loadSurvey();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size="xl" className="text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500 mb-2">Error</h2>
          <p className="text-text-secondary">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Función auxiliar para extraer el texto del objeto de idiomas
  const getLocalizedText = (textObj) => {
    if (!textObj) return "";
    if (typeof textObj === "string") return textObj;
    // Si es un objeto, intentamos obtener el texto en español o el primer valor disponible
    if (textObj.es) return textObj.es;
    if (typeof textObj === "object") {
      const firstValue = Object.values(textObj)[0];
      return typeof firstValue === "string" ? firstValue : "";
    }
    return "";
  };

  // Función para analizar las condiciones visibleIf y extraer las relaciones de preguntas
  const parseVisibleIfConditions = (elements) => {
    // Mapa para almacenar las relaciones: { questionId: { parentId, optionValue } }
    const conditionalRelations = {};

    // Analizar cada elemento para encontrar condiciones visibleIf
    elements.forEach((element) => {
      if (element.visibleIf) {
        try {
          // Las condiciones visibleIf tienen formato "{parentId} operator 'optionValue'"
          // o pueden ser múltiples condiciones separadas por "or"
          const conditions = element.visibleIf.split(" or ");

          // Tomamos la primera condición para simplificar (podría mejorarse para manejar múltiples)
          const condition = conditions[0].trim();

          // Extraer parentId y optionValue
          const regex = /\{([^}]+)\}\s*(=|contains)\s*'([^']+)'/;
          const match = condition.match(regex);

          if (match) {
            const [_, parentId, operator, optionValue] = match;
            conditionalRelations[element.name] = {
              parentId,
              optionValue,
              operator,
            };
          }
        } catch (err) {
          console.warn(
            "Error parsing visibleIf condition:",
            element.visibleIf,
            err
          );
        }
      }
    });

    return conditionalRelations;
  };

  // Extraer y construir los datos iniciales para el editor
  const elements = survey.survey?.pages?.[0]?.elements || [];
  const conditionalRelations = parseVisibleIfConditions(elements);

  // Procesar las preguntas primero para mantener referencias
  const processedQuestions = elements.map((question) => ({
    id: question.name,
    type:
      question.type === "checkbox"
        ? "multiple_choice"
        : question.type === "radiogroup"
        ? "single_choice"
        : question.type,
    title: getLocalizedText(question.title),
    description: getLocalizedText(question.description) || "",
    required: question.isRequired || false,
    // Inicialmente, marca como no condicional - actualizaremos después
    isConditional: false,
    options: (question.choices || []).map((choice) => ({
      id: choice.value || choice.id,
      text: getLocalizedText(choice.text),
      // Sin nextQuestionId inicialmente
    })),
    matrixRows: (question.rows || []).map((row) => ({
      id: row.value || row.id,
      text: getLocalizedText(row.text),
    })),
    matrixColumns: (question.columns || []).map((col) => ({
      id: col.value || col.id,
      text: getLocalizedText(col.text),
    })),
    rateMin: question.rateMin,
    rateMax: question.rateMax,
  }));

  // Ahora, configurar las relaciones condicionales
  Object.entries(conditionalRelations).forEach(([childId, relation]) => {
    const parentQuestion = processedQuestions.find(
      (q) => q.id === relation.parentId
    );
    if (parentQuestion) {
      // Marcar la pregunta padre como condicional
      parentQuestion.isConditional = true;

      // Encontrar la opción correcta y establecer nextQuestionId
      const optionIndex = parentQuestion.options.findIndex(
        (opt) => opt.id === relation.optionValue
      );

      if (optionIndex !== -1) {
        parentQuestion.options[optionIndex].nextQuestionId = childId;
      }
    }
  });

  const initialData = {
    basicInfo: {
      title: getLocalizedText(survey.survey?.title) || "",
      description: getLocalizedText(survey.survey?.description) || "",
      startDate: survey.surveyInfo?.startDate
        ? new Date(survey.surveyInfo.startDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      endDate: survey.surveyInfo?.endDate
        ? new Date(survey.surveyInfo.endDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      target: survey.surveyInfo?.target || 100,
    },
    participants: {
      userIds: survey.userIds || [],
      supervisorsIds: survey.supervisorsIds || [],
    },
    questions: processedQuestions,
    quotas: survey.surveyInfo?.quotas || [],
  };

  console.log("Transformed survey data:", initialData);

  return (
    <NuevaEncuesta
      isEditing={true}
      surveyId={params.id}
      initialData={initialData}
    />
  );
}
