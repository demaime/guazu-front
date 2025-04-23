"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  Percent,
  FileSpreadsheet,
  Calendar,
  Clock,
  BarChart4,
} from "lucide-react";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { Loader } from "@/components/ui/Loader";
import { QuotaProgress } from "@/components/QuotaProgress";

export default function AnalisisEncuesta() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Comprobar permisos - solo admin y supervisor pueden ver análisis
    const checkPermissions = () => {
      const user = authService.getUser();
      if (!user) {
        router.replace("/login");
        return false;
      }

      // Pollsters no pueden acceder a esta página
      if (user.role === "POLLSTER") {
        console.log(
          "Acceso denegado: los encuestadores no pueden ver análisis"
        );
        router.replace("/dashboard");
        return false;
      }

      return true;
    };

    const fetchSurveyData = async () => {
      try {
        // Verificar permisos primero
        if (!checkPermissions()) return;

        setIsLoading(true);
        const surveyId = params.id;

        // Fetch survey data with answers in one call
        const surveyData = await surveyService.getSurveyWithAnswers(surveyId);
        setSurvey(surveyData.survey);
        setAnswers(surveyData.answers || []);

        setIsLoading(false);
      } catch (err) {
        console.error("Error loading survey analysis data:", err);
        setError("No se pudo cargar los datos de análisis de la encuesta.");
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchSurveyData();
    }
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2 text-red-500">Error</h2>
          <p className="text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Encuesta no encontrada</h2>
          <p className="text-[var(--text-secondary)]">
            No se pudo encontrar la encuesta solicitada.
          </p>
          <button
            onClick={() => router.push("/dashboard/encuestas")}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Volver a encuestas
          </button>
        </div>
      </div>
    );
  }

  const surveyInfo = survey.surveyInfo || {};
  const totalAnswers = answers.length;
  const completionRate = surveyInfo.target
    ? Math.min(100, Math.round((totalAnswers / surveyInfo.target) * 100))
    : 0;

  return (
    <div className="container mx-auto py-6 max-w-[1200px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Análisis de Encuesta: {survey.survey?.title}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {survey.survey?.description || "Sin descripción"}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-[var(--hover-bg)] transition-colors"
        >
          Volver
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm text-[var(--text-secondary)]">
              Total Respuestas
            </h3>
            <p className="text-2xl font-semibold">{totalAnswers}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm text-[var(--text-secondary)]">
              Tasa de Completado
            </h3>
            <p className="text-2xl font-semibold">{completionRate}%</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm text-[var(--text-secondary)]">Meta</h3>
            <p className="text-2xl font-semibold">{surveyInfo.target || 0}</p>
          </div>
        </div>
      </div>

      {/* Cuotas */}
      {survey.surveyInfo?.quotas && survey.surveyInfo.quotas.length > 0 && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart4 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Sistema de Cuotas</h2>
          </div>

          <QuotaProgress quotas={survey.surveyInfo.quotas} />
        </div>
      )}

      {/* Placeholder for actual analysis */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Análisis de Respuestas</h2>
        </div>

        {totalAnswers > 0 ? (
          <div className="text-center p-8 text-[var(--text-secondary)]">
            <p className="mb-2 text-lg">Visualización avanzada en desarrollo</p>
            <p>
              Próximamente: Gráficos de análisis detallados para todas las
              preguntas y opciones de filtrado avanzadas.
            </p>
          </div>
        ) : (
          <div className="text-center p-8 text-[var(--text-secondary)]">
            <p className="mb-2 text-lg">No hay respuestas para analizar</p>
            <p>
              Una vez que la encuesta reciba respuestas, podrás ver aquí
              estadísticas detalladas y análisis.
            </p>
          </div>
        )}
      </div>

      {/* Survey Period Info */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">
          Información de la Encuesta
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Período</p>
              <p>
                {new Date(surveyInfo.startDate).toLocaleDateString()} -{" "}
                {new Date(surveyInfo.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                Actualizado
              </p>
              <p>{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
