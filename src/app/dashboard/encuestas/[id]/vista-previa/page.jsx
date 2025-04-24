"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import { Loader } from "@/components/ui/Loader";
import dynamic from "next/dynamic";
import SurveyPDF from "@/components/SurveyPDF";
import { FileText, ArrowLeft } from "lucide-react";

// Importar PDFDownloadLink de forma dinámica
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

// Función auxiliar para traducir el tipo de pregunta a español
const getQuestionTypeLabel = (type) => {
  const types = {
    text: "Texto",
    radiogroup: "Opción Única",
    checkbox: "Selección Múltiple",
    dropdown: "Lista Desplegable",
    rating: "Calificación",
    boolean: "Sí/No",
    comment: "Comentario",
    matrix: "Matriz",
  };
  return types[type] || type;
};

export default function VistaPrevia() {
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

  // Adaptar los datos de la encuesta al formato esperado por SurveyPDF
  const surveyData = {
    basicInfo: {
      title: survey.surveyInfo?.title || "Sin título",
      description: survey.surveyInfo?.description || "",
      startDate: survey.surveyInfo?.startDate,
      endDate: survey.surveyInfo?.endDate,
      target: survey.surveyInfo?.target || 0,
    },
    participants: {
      userIds: survey.surveyInfo?.participants?.enumerators || [],
      supervisorsIds: survey.surveyInfo?.participants?.supervisors || [],
    },
    questions:
      survey.survey?.pages?.[0]?.elements.map((question) => ({
        id: question.name,
        title: question.title,
        description: question.description || "",
        type: question.type,
        required: question.isRequired || false,
        options: question.choices?.map((choice) =>
          typeof choice === "string" ? choice : choice.text || choice.value
        ),
        rows: question.rows,
        columns: question.columns,
      })) || [],
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <PDFDownloadLink
          document={<SurveyPDF surveyData={surveyData} />}
          fileName={`encuesta-${surveyData.basicInfo.title
            .toLowerCase()
            .replace(/\s+/g, "-")}.pdf`}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
        >
          {({ blob, url, loading, error }) => (
            <>
              <FileText className="w-5 h-5" />
              <span>{loading ? "Generando PDF..." : "Descargar PDF"}</span>
            </>
          )}
        </PDFDownloadLink>
      </div>

      <div className="card p-4">
        {/* Información básica */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">
            {surveyData.basicInfo.title}
          </h1>
          <p className="text-text-secondary mb-4">
            {surveyData.basicInfo.description}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="card p-3">
              <span className="font-medium block mb-1">
                Periodo de la encuesta
              </span>
              <div className="text-text-secondary">
                {surveyData.basicInfo.startDate
                  ? new Date(
                      surveyData.basicInfo.startDate
                    ).toLocaleDateString()
                  : "N/A"}{" "}
                -{" "}
                {surveyData.basicInfo.endDate
                  ? new Date(surveyData.basicInfo.endDate).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>
            <div className="card p-3">
              <span className="font-medium block mb-1">Meta de respuestas</span>
              <div className="text-text-secondary">
                {surveyData.basicInfo.target} respuestas
              </div>
            </div>
            <div className="card p-3">
              <span className="font-medium block mb-1">Participantes</span>
              <div className="text-text-secondary">
                {surveyData.participants.userIds.length} encuestadores
                {surveyData.participants.supervisorsIds.length > 0 &&
                  `, ${surveyData.participants.supervisorsIds.length} supervisores`}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de preguntas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Preguntas de la encuesta</h2>

          {surveyData.questions.map((question, index) => (
            <div
              key={question.id}
              className="card p-4 border border-card-border"
            >
              <div className="flex items-start gap-3">
                <div className="bg-primary text-white px-3 py-1 rounded-md text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-base">{question.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                      {question.required && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                          Obligatoria
                        </span>
                      )}
                    </div>
                  </div>

                  {question.description && (
                    <p className="text-text-secondary text-sm mt-1 mb-2">
                      {question.description}
                    </p>
                  )}

                  {/* Opciones */}
                  {question.options && question.options.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1">Opciones:</p>
                      <ul className="space-y-1 pl-5 list-disc text-sm text-text-secondary">
                        {question.options.map((option, optIndex) => (
                          <li key={optIndex}>{option}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Filas y columnas para matrices */}
                  {question.rows && question.rows.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1">Filas:</p>
                      <ul className="space-y-1 pl-5 list-disc text-sm text-text-secondary">
                        {question.rows.map((row, rowIndex) => (
                          <li key={rowIndex}>
                            {typeof row === "string" ? row : row.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {question.columns && question.columns.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1">Columnas:</p>
                      <ul className="space-y-1 pl-5 list-disc text-sm text-text-secondary">
                        {question.columns.map((col, colIndex) => (
                          <li key={colIndex}>
                            {typeof col === "string" ? col : col.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
