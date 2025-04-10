"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { SurveyList } from "@/components/ui/SurveyList";
import { Plus, ChevronDown } from "lucide-react";
import { useWindowSize } from "@/hooks/useWindowSize";
import { motion, AnimatePresence } from "framer-motion";

// Helper function to check if a survey is active based on dates
const isSurveyActive = (survey) => {
  if (!survey?.surveyInfo?.startDate || !survey?.surveyInfo?.endDate) {
    return false; // Treat incomplete data as inactive
  }
  const now = new Date();
  const startDate = new Date(survey.surveyInfo.startDate);
  const endDate = new Date(survey.surveyInfo.endDate);
  return now >= startDate && now <= endDate;
};

export default function Encuestas() {
  const router = useRouter();
  const { isMobile } = useWindowSize();
  const [surveys, setSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [isFinishedExpanded, setIsFinishedExpanded] = useState(false); // State for finished section expansion

  // Filter surveys into active and finished lists
  const activeSurveys = surveys.filter(isSurveyActive);
  const finishedSurveys = surveys.filter((survey) => !isSurveyActive(survey));

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
        className="p-8 flex items-center justify-center"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 p-4"
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
        {!isLoading && surveys.length === 0 && !error ? (
          // Display message when no surveys exist at all
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
        ) : !isLoading && !error ? (
          // Display active and finished survey sections if surveys exist
          <>
            {/* Active Surveys Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mb-8" // Add margin between sections
            >
              <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
                Encuestas Activas ({activeSurveys.length})
              </h2>
              {activeSurveys.length > 0 ? (
                <SurveyList
                  surveys={activeSurveys}
                  onDelete={handleDelete}
                  onDeleteAnswers={handleDeleteAnswers}
                  role={user?.role}
                />
              ) : (
                <p className="text-[var(--text-secondary)] italic text-center py-4">
                  No hay encuestas activas disponibles.
                </p>
              )}
            </motion.div>

            {/* Finished Surveys Section */}
            {finishedSurveys.length > 0 && (
              <motion.div
                initial={{ opacity: 0.8 }} // Start slightly faded
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="opacity-80" // Keep base opacity
              >
                <div // Make the header clickable
                  className="flex justify-between items-center cursor-pointer mb-4 border-b border-[var(--card-border)] pb-2"
                  onClick={() => setIsFinishedExpanded(!isFinishedExpanded)}
                >
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    Encuestas Finalizadas ({finishedSurveys.length})
                  </h2>
                  <motion.div
                    animate={{ rotate: isFinishedExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                  </motion.div>
                </div>
                {/* Animate presence for smooth expand/collapse */}
                <AnimatePresence>
                  {isFinishedExpanded && (
                    <motion.div
                      key="finished-list" // Need key for AnimatePresence
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} // Keep height animation for exit
                      transition={{ duration: 0.3 }}
                      className="" // No overflow hidden needed here
                    >
                      {/* Wrap SurveyList to handle exit animation issues */}
                      <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{
                          opacity: 0,
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                        }} // Fade out and position absolute on exit
                        transition={{ duration: 0.1 }} // Quick fade out before height collapses
                      >
                        <SurveyList
                          surveys={finishedSurveys}
                          onDelete={handleDelete} // Allow deleting finished surveys
                          onDeleteAnswers={handleDeleteAnswers} // Allow deleting answers from finished surveys
                          role={user?.role}
                          isFinished={true} // Pass prop to disable responding
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        ) : null}{" "}
        {/* Render nothing if loading or error (which are handled above) */}
      </motion.div>
    </motion.div>
  );
}
