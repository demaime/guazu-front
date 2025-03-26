"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { SurveyList } from "@/components/ui/SurveyList";
import { Plus, ChevronDown } from "lucide-react";
import { useWindowSize } from "@/hooks/useWindowSize";
import { motion } from "framer-motion";

export default function Encuestas() {
  const router = useRouter();
  const { isMobile } = useWindowSize();
  const [surveys, setSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = authService.getUser();
        if (!userData) {
          router.replace("/login");
          return;
        }
        setUser(userData);

        const response = await surveyService.getAllSurveys();
        console.log("Response from service:", response);

        // Asegurarnos de que surveys es un array
        const surveysData = Array.isArray(response.surveys)
          ? response.surveys
          : [];
        console.log("Surveys to set:", surveysData);
        setSurveys(surveysData);
      } catch (err) {
        console.error("Error loading surveys:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleDelete = async (surveyId) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta encuesta?")) {
      try {
        await surveyService.deleteSurvey(surveyId);
        setSurveys(surveys.filter((survey) => survey._id !== surveyId));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDeleteAnswers = async (surveyId) => {
    if (
      window.confirm(
        "¿Estás seguro de que deseas eliminar todas las respuestas de esta encuesta?"
      )
    ) {
      try {
        await surveyService.deleteAnswers(surveyId);
        const response = await surveyService.getAllSurveys();
        const newSurveysData = Array.isArray(response.surveys)
          ? response.surveys
          : [];
        setSurveys(newSurveysData);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen p-8 flex items-center justify-center"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen space-y-4"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]"
        >
          Encuestas
        </motion.h1>
        {user?.role === "ROLE_ADMIN" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setIsCreatingSurvey(true);
              router.push("/dashboard/encuestas/nueva");
            }}
            disabled={isCreatingSurvey}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors w-full md:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingSurvey ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Cargando...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Nueva Encuesta
              </>
            )}
          </motion.button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-lg bg-[var(--background)] border border-[var(--card-border)] px-4 py-4 md:px-5 md:py-6 shadow-sm"
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 text-red-500 bg-red-50 rounded-md"
          >
            {error}
          </motion.div>
        )}

        {!Array.isArray(surveys) || surveys.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-8"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[var(--text-secondary)] mb-4"
            >
              {user?.role === "ROLE_ADMIN"
                ? "No hay encuestas creadas. ¡Crea tu primera encuesta!"
                : "No tienes encuestas asignadas. Por favor, consulta con el administrador."}
            </motion.p>
            {user?.role === "ROLE_ADMIN" && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => {
                  setIsCreatingSurvey(true);
                  router.push("/dashboard/encuestas/nueva");
                }}
                disabled={isCreatingSurvey}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingSurvey ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Crear Encuesta
                  </>
                )}
              </motion.button>
            )}
          </motion.div>
        ) : (
          <SurveyList
            surveys={surveys}
            onDelete={handleDelete}
            onDeleteAnswers={handleDeleteAnswers}
            role={user?.role}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
