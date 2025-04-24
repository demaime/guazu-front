"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { SurveyList } from "@/components/ui/SurveyList";
import { Plus, ChevronDown, FilePenLine } from "lucide-react";
import { useWindowSize } from "@/hooks/useWindowSize";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { Loader } from "@/components/ui/Loader";

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
  const [draftSurveys, setDraftSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDraftsLoading, setIsDraftsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [isFinishedExpanded, setIsFinishedExpanded] = useState(false); // State for finished section expansion
  const [activeTab, setActiveTab] = useState("active"); // 'active', 'finished', 'drafts'

  // Confirm modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);

  // Filter surveys into active and finished lists, excluding drafts from both
  const activeSurveys = surveys.filter(
    (survey) => survey?.status !== "draft" && isSurveyActive(survey)
  );
  const finishedSurveys = surveys.filter(
    (survey) => survey?.status !== "draft" && !isSurveyActive(survey)
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = authService.getUser();
        if (!userData) {
          router.replace("/login");
          return;
        }
        setUser(userData);

        // Cargar encuestas publicadas
        const response = await surveyService.getAllSurveys();
        console.log("Response from service:", response);

        // Asegurarnos de que surveys es un array
        const surveysData = Array.isArray(response.surveys)
          ? response.surveys
          : [];
        console.log("Surveys to set:", surveysData);
        setSurveys(surveysData);

        // Cargar borradores separadamente
        await loadDrafts();
      } catch (err) {
        console.error("Error loading surveys:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const loadDrafts = async () => {
    try {
      setIsDraftsLoading(true);
      const draftsResponse = await surveyService.getDrafts();
      console.log("Drafts from service:", draftsResponse);

      const draftsData = Array.isArray(draftsResponse.drafts)
        ? draftsResponse.drafts
        : [];
      console.log("Drafts to set:", draftsData);
      setDraftSurveys(draftsData);
    } catch (err) {
      console.error("Error loading drafts:", err);
      toast.error("Error al cargar los borradores de encuestas");
    } finally {
      setIsDraftsLoading(false);
    }
  };

  const handleDelete = async (surveyId) => {
    setSelectedSurveyId(surveyId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await surveyService.deleteSurvey(selectedSurveyId);
      setSurveys(surveys.filter((survey) => survey._id !== selectedSurveyId));
      setDraftSurveys(
        draftSurveys.filter((survey) => survey._id !== selectedSurveyId)
      );
      toast.success("Encuesta eliminada correctamente");
    } catch (err) {
      setError(err.message);
      toast.error("Error al eliminar la encuesta");
    } finally {
      setShowDeleteModal(false);
      setSelectedSurveyId(null);
    }
  };

  const handlePublishDraft = async (draftId) => {
    setSelectedSurveyId(draftId);
    setShowPublishModal(true);
  };

  const confirmPublish = async () => {
    try {
      setIsDraftsLoading(true);
      await surveyService.publishDraft(selectedSurveyId);

      // Recargar borradores y encuestas publicadas
      await loadDrafts();
      const response = await surveyService.getAllSurveys();
      const surveysData = Array.isArray(response.surveys)
        ? response.surveys
        : [];
      setSurveys(surveysData);

      toast.success("Borrador publicado correctamente");
    } catch (err) {
      console.error("Error al publicar borrador:", err);
      toast.error(err.message || "Error al publicar el borrador");
    } finally {
      setIsDraftsLoading(false);
      setShowPublishModal(false);
      setSelectedSurveyId(null);
    }
  };

  const handleEditDraft = (draftId) => {
    router.push(`/dashboard/encuestas/${draftId}/editar`);
  };

  const handleDeleteAnswers = async (surveyId) => {
    try {
      const result = await surveyService.deleteAnswers(surveyId);

      if (result.noAnswersFound) {
        toast.info("No se encontraron respuestas para eliminar.");
      } else if (result.success) {
        toast.success(result.message || "Respuestas eliminadas con éxito");
        // Refresh survey list after successful deletion
        const response = await surveyService.getAllSurveys();
        const newSurveysData = Array.isArray(response.surveys)
          ? response.surveys
          : [];
        setSurveys(newSurveysData);
      } else {
        // Handle errors returned from the service or unexpected issues
        console.error("Error deleting answers:", result.message);
        toast.error(result.message || "Error al eliminar las respuestas");
        setError(result.message); // Optionally update the main error state too
      }
    } catch (err) {
      // Catch any unexpected errors during the process (e.g., network issues)
      console.error("Unexpected error in handleDeleteAnswers:", err);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
      setError(err.message);
    }
  };

  if (isLoading) {
    return <LoaderWrapper fullScreen />;
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
                <div className="flex items-center justify-center gap-2">
                  <LoaderWrapper size="sm" />
                  <span>Cargando...</span>
                </div>
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

        {/* Tabs para navegar entre encuestas activas, finalizadas y borradores */}
        <div className="flex border-b border-[var(--card-border)] mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "active"
                ? "border-b-2 border-primary text-primary"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Activas ({activeSurveys.length})
          </button>
          <button
            onClick={() => setActiveTab("finished")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "finished"
                ? "border-b-2 border-primary text-primary"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Finalizadas ({finishedSurveys.length})
          </button>
          {(user?.role === "ROLE_ADMIN" || user?.role === "SUPERVISOR") && (
            <button
              onClick={() => setActiveTab("drafts")}
              className={`px-4 py-2 font-medium text-sm flex items-center ${
                activeTab === "drafts"
                  ? "border-b-2 border-primary text-primary"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              <FilePenLine className="w-4 h-4 mr-1" />
              Borradores ({draftSurveys.length})
            </button>
          )}
        </div>

        {!isLoading &&
        surveys.length === 0 &&
        draftSurveys.length === 0 &&
        !error ? (
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/dashboard/encuestas/nueva")}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Crear Encuesta
              </motion.button>
            )}
          </motion.div>
        ) : !isLoading && !error ? (
          // Display active, finished or draft survey sections based on active tab
          <>
            {/* Active Surveys */}
            {activeTab === "active" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mb-8"
              >
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
            )}

            {/* Finished Surveys */}
            {activeTab === "finished" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                {finishedSurveys.length > 0 ? (
                  <SurveyList
                    surveys={finishedSurveys}
                    onDelete={handleDelete}
                    onDeleteAnswers={handleDeleteAnswers}
                    role={user?.role}
                    isFinished={true}
                  />
                ) : (
                  <p className="text-[var(--text-secondary)] italic text-center py-4">
                    No hay encuestas finalizadas disponibles.
                  </p>
                )}
              </motion.div>
            )}

            {/* Draft Surveys */}
            {activeTab === "drafts" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                {isDraftsLoading ? (
                  <div className="flex justify-center py-6">
                    <LoaderWrapper size="default" />
                  </div>
                ) : draftSurveys.length > 0 ? (
                  <div className="space-y-4">
                    {draftSurveys.map((draft) => (
                      <div
                        key={draft._id}
                        className="border border-[var(--card-border)] bg-[var(--card-background)] rounded-lg p-4"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-medium">
                              {draft.survey?.title?.es ||
                                draft.survey?.title ||
                                "Borrador sin título"}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              Última edición:{" "}
                              {new Date(draft.lastEdited).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEditDraft(draft._id)}
                              className="px-3 py-2 text-sm bg-[var(--primary)] text-white rounded-md hover:bg-opacity-90 transition-colors"
                            >
                              Continuar editando
                            </button>
                            <button
                              onClick={() => handlePublishDraft(draft._id)}
                              className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-opacity-90 transition-colors"
                            >
                              Publicar
                            </button>
                            <button
                              onClick={() => handleDelete(draft._id)}
                              className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-opacity-90 transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-secondary)] italic text-center py-4">
                    No hay borradores de encuestas disponibles.
                  </p>
                )}
              </motion.div>
            )}
          </>
        ) : null}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Eliminar encuesta"
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmButtonClass="bg-red-500 text-white hover:bg-red-600"
      >
        <p>¿Estás seguro de que deseas eliminar esta encuesta?</p>
      </ConfirmModal>

      {/* Publish Draft Confirmation Modal */}
      <ConfirmModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={confirmPublish}
        title="Publicar borrador"
        confirmText="Publicar"
        cancelText="Cancelar"
        confirmButtonClass="bg-green-600 text-white hover:bg-green-700"
      >
        <p>
          ¿Estás seguro de que deseas publicar este borrador? Una vez publicado,
          estará disponible para los encuestadores.
        </p>
      </ConfirmModal>
    </motion.div>
  );
}
