"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  List,
  MapPin,
  AlertTriangle,
  Eye,
  Map,
  Loader2,
  X,
  FileInput,
  ClipboardType,
} from "lucide-react";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { motion, AnimatePresence } from "framer-motion";
import MapModal from "@/components/MapModal";
import { ObserveCaseModal } from "@/components/ui/ObserveCaseModal";
import { ToastContainer } from "@/components/ui/Toast";

export default function MisCasosPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [myCases, setMyCases] = useState([]);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Estado para el modal de detalles
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCaseDetails, setSelectedCaseDetails] = useState(null);

  // Estado para toasts
  const [toasts, setToasts] = useState([]);

  // Estados para el mapa
  const [showMapModal, setShowMapModal] = useState(false);
  const [modalMapData, setModalMapData] = useState({
    lat: null,
    lng: null,
    pollsterName: "",
    date: null,
  });

  // Estados para observar caso
  const [showObserveModal, setShowObserveModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [isObserving, setIsObserving] = useState(false);

  useEffect(() => {
    const checkPermissionsAndFetchData = async () => {
      try {
        // Verificar que el usuario esté logueado
        const userData = authService.getUser();
        if (!userData) {
          router.replace("/login");
          return;
        }

        // Solo pollsters pueden acceder a esta página
        if (userData.role !== "POLLSTER") {
          router.replace("/dashboard/encuestas");
          return;
        }

        setUser(userData);
        setIsLoading(true);
        const surveyId = params.id;

        // Obtener datos de la encuesta y todas las respuestas
        const surveyData = await surveyService.getSurveyWithAnswers(surveyId);
        setSurvey(surveyData.survey);

        // Filtrar solo las respuestas del pollster actual
        const userAnswers = (surveyData.answers || []).filter(
          (answer) => answer.userId === userData._id
        );

        // Ordenar por fecha más reciente primero
        userAnswers.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        setMyCases(userAnswers);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading my cases:", err);
        setError("No se pudieron cargar tus casos.");
        setIsLoading(false);
      }
    };

    if (params.id) {
      checkPermissionsAndFetchData();
    }
  }, [params.id, router]);

  const openMapModal = (lat, lng, pollsterName, date) => {
    setModalMapData({ lat, lng, pollsterName, date });
    setShowMapModal(true);
  };

  const closeMapModal = () => {
    setShowMapModal(false);
    setModalMapData({ lat: null, lng: null, pollsterName: "", date: null });
  };

  const addToast = (message, type = "info", duration = 5000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleObserveCase = async (observation) => {
    if (!selectedCase) return;

    setIsObserving(true);
    try {
      const response = await surveyService.observeAnswer(
        selectedCase._id,
        observation
      );

      // Actualizar el caso en la lista local
      setMyCases((prevCases) =>
        prevCases.map((c) =>
          c._id === selectedCase._id ? { ...c, observation } : c
        )
      );

      // No cerramos el modal aquí, el modal se cierra solo después de mostrar el check
      setSelectedCase(null);
    } catch (error) {
      console.error("Error al observar caso:", error);

      // Mensaje de error más específico
      let errorMessage = "Error al observar el caso.";

      if (
        error.message.includes("404") ||
        error.message.includes("Not Found")
      ) {
        errorMessage =
          "El endpoint de observación no está disponible en el backend. Contacta al administrador.";
      } else if (error.message.includes("JSON")) {
        errorMessage =
          "Error de comunicación con el servidor. El backend no responde correctamente.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      addToast(errorMessage, "error", 7000);
    } finally {
      setIsObserving(false);
    }
  };

  const getSurveyTitle = () => {
    const title = survey?.survey?.title || survey?.title;
    if (typeof title === "object") {
      return title.es || title.en || "Encuesta sin título";
    }
    return title || "Encuesta sin título";
  };

  if (isLoading) {
    return <LoaderWrapper text="Cargando tus casos..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
              Error al cargar
            </h2>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(myCases.length / pageSize);
  const paginatedCases = myCases.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver a encuestas</span>
          </button>

          <div className="bg-[var(--card-background)] rounded-xl shadow-sm border border-[var(--card-border)] p-6">
            {/* Línea 1: Ícono + "Mis Casos" */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--primary)] rounded-lg flex items-center justify-center flex-shrink-0">
                <List className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Mis Casos
              </h1>
            </div>

            {/* Línea 2: Título de la encuesta */}
            <p className="text-lg text-[var(--text-secondary)] mb-2">
              {getSurveyTitle()}
            </p>

            {/* Línea 3: Total de casos */}
            <p className="text-sm text-[var(--text-muted)]">
              Total de casos registrados:{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {myCases.length}
              </span>
            </p>
          </div>
        </motion.div>

        {/* Lista de casos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {myCases.length === 0 ? (
            <div className="bg-[var(--card-background)] rounded-xl shadow-sm border border-[var(--card-border)] p-12 text-center">
              <List className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                No tienes casos registrados
              </h3>
              <p className="text-[var(--text-secondary)]">
                Cuando completes encuestas, tus casos aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedCases.map((caseItem, index) => (
                <div
                  key={caseItem._id}
                  onClick={() => {
                    setSelectedCaseDetails(caseItem);
                    setShowDetailsModal(true);
                  }}
                  className={`bg-[var(--card-background)] rounded-xl shadow-sm border transition-colors duration-200 cursor-pointer hover:shadow-md ${
                    caseItem.observation
                      ? "border-red-500 bg-red-50/10"
                      : "border-[var(--card-border)]"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            caseItem.observation
                              ? "bg-red-500"
                              : "bg-[var(--primary)]"
                          }`}
                        >
                          {caseItem.observation ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <ClipboardType className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-[var(--text-primary)]">
                              Caso #{(currentPage - 1) * pageSize + index + 1}
                            </h3>
                            {caseItem.observation && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Observado
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] truncate">
                            {new Date(caseItem.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Botón Ver Ubicación */}
                        {caseItem.lat && caseItem.lng && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openMapModal(
                                caseItem.lat,
                                caseItem.lng,
                                user?.fullName || "Mi ubicación",
                                caseItem.createdAt
                              );
                            }}
                            className="flex items-center justify-center w-10 h-10 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
                          >
                            <MapPin className="w-5 h-5" />
                          </button>
                        )}

                        {/* Botón Observar (solo si no está observado) */}
                        {!caseItem.observation && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCase(caseItem);
                              setShowObserveModal(true);
                            }}
                            className="flex items-center justify-center w-10 h-10 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 bg-[var(--card-background)] rounded-xl shadow-sm border border-[var(--card-border)] p-4">
                  <span className="text-sm text-[var(--text-secondary)]">
                    Mostrando {(currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, myCases.length)} de{" "}
                    {myCases.length} casos
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-[var(--input-background)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-[var(--text-secondary)]">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-[var(--input-background)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal del mapa */}
      <MapModal
        isOpen={showMapModal}
        onClose={closeMapModal}
        lat={modalMapData.lat}
        lng={modalMapData.lng}
        pollsterName={modalMapData.pollsterName}
        date={modalMapData.date}
      />

      {/* Modal de observación */}
      <ObserveCaseModal
        isOpen={showObserveModal}
        onClose={() => {
          setShowObserveModal(false);
          setSelectedCase(null);
        }}
        onConfirm={handleObserveCase}
        surveyTitle={getSurveyTitle()}
        isLoading={isObserving}
      />

      {/* Modal de detalles del caso */}
      <AnimatePresence>
        {showDetailsModal && selectedCaseDetails && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailsModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            />

            {/* Modal */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full sm:max-w-2xl mx-0 sm:mx-4 bg-[var(--background)] rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
            >
              {/* Header fijo */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)] bg-[var(--card-background)] rounded-t-2xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                      selectedCaseDetails.observation
                        ? "bg-red-500"
                        : "bg-[var(--primary)]"
                    }`}
                  >
                    {selectedCaseDetails.observation ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <ClipboardType className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      Detalles del Caso
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {new Date(selectedCaseDetails.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-[var(--hover-bg)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido scrolleable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Mostrar observación si existe */}
                {selectedCaseDetails.observation && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                          Caso Observado
                        </h5>
                        <p className="text-sm text-red-600 dark:text-red-300">
                          {selectedCaseDetails.observation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Respuestas detalladas */}
                {selectedCaseDetails.answer &&
                Object.keys(selectedCaseDetails.answer).length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-[var(--text-primary)] sticky top-0 bg-[var(--background)] py-2 z-10">
                      Respuestas
                    </h4>
                    {Object.entries(selectedCaseDetails.answer).map(
                      ([question, answer], index) => (
                        <div
                          key={index}
                          className="p-4 bg-[var(--card-background)] rounded-lg border border-[var(--card-border)]"
                        >
                          <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                            {question}
                          </div>
                          <div className="text-base text-[var(--text-primary)]">
                            {typeof answer === "object"
                              ? Array.isArray(answer)
                                ? answer.join(", ")
                                : JSON.stringify(answer, null, 2)
                              : answer || "Sin respuesta"}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-[var(--input-background)] rounded-lg">
                    <List className="w-12 h-12 mx-auto mb-3 text-[var(--text-secondary)]" />
                    <p className="text-[var(--text-secondary)]">
                      No hay respuestas detalladas
                    </p>
                  </div>
                )}

                {/* ID del caso */}
                <div className="bg-[var(--input-background)] rounded-lg p-3">
                  <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                    ID del Caso
                  </div>
                  <div className="text-sm font-mono text-[var(--text-primary)] break-all">
                    {selectedCaseDetails._id}
                  </div>
                </div>
              </div>

              {/* Footer con botones de acción (opcional) */}
              <div className="flex gap-3 p-4 border-t border-[var(--card-border)] bg-[var(--card-background)] rounded-b-2xl flex-shrink-0">
                {selectedCaseDetails.lat && selectedCaseDetails.lng && (
                  <button
                    onClick={() => {
                      openMapModal(
                        selectedCaseDetails.lat,
                        selectedCaseDetails.lng,
                        user?.fullName || "Mi ubicación",
                        selectedCaseDetails.createdAt
                      );
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Ver Ubicación
                  </button>
                )}
                {!selectedCaseDetails.observation && (
                  <button
                    onClick={() => {
                      setSelectedCase(selectedCaseDetails);
                      setShowObserveModal(true);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Observar Caso
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
