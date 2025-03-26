"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "@/services/survey.service";
import { userService } from "@/services/user.service";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Loader } from "@/components/ui/Loader";
import "survey-core/survey-core.css";
import { authService } from "@/services/auth.service";
import { TransferModal } from "@/components/TransferModal";
import QuestionEditor from "@/components/QuestionEditor";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

// Pasos del wizard
const STEPS = {
  INFORMACION_BASICA: 0,
  PARTICIPANTES: 1,
  PREGUNTAS: 2,
  VISTA_PREVIA: 3,
};

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

const useConfirmNavigation = (shouldConfirm) => {
  const handleBeforeUnload = (e) => {
    if (shouldConfirm) {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  useEffect(() => {
    if (shouldConfirm) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [shouldConfirm]);
};

export default function NuevaEncuesta() {
  const router = useRouter();
  const [[page, direction], setPage] = useState([0, 0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [user, setUser] = useState(null);
  const [surveyData, setSurveyData] = useState({
    basicInfo: {
      title: "",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      target: 100,
    },
    participants: {
      userIds: [],
      supervisorsIds: [],
    },
    questions: [],
  });
  const [showPollstersModal, setShowPollstersModal] = useState(false);
  const [showSupervisorsModal, setShowSupervisorsModal] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Mover el hook useConfirmNavigation aquí, antes de cualquier efecto condicional
  useConfirmNavigation(
    surveyData.basicInfo.title ||
      surveyData.basicInfo.description ||
      surveyData.participants.userIds.length > 0 ||
      surveyData.questions.length > 0
  );

  // Verificar permisos al cargar el componente
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const userData = authService.getUser();
        if (!userData) {
          router.replace("/login");
          return;
        }

        // Solo permitir acceso a admin y supervisor
        if (!["ROLE_ADMIN", "SUPERVISOR"].includes(userData.role)) {
          router.replace("/dashboard");
          return;
        }

        setUser(userData);

        // Cargar usuarios y supervisores
        try {
          const [usersResponse, supervisorsResponse] = await Promise.all([
            userService.getPollsters(),
            userService.getSupervisors(),
          ]);

          setUsers(usersResponse.users || []);
          setSupervisors(supervisorsResponse.supervisors || []);
          setIsLoading(false);
        } catch (err) {
          console.error("Error loading users and supervisors:", err);
          setError(
            "Error al cargar usuarios y supervisores. Por favor, intente nuevamente."
          );
          setIsLoading(false);
        }
        setIsInitializing(false);
      } catch (err) {
        console.error("Error checking permissions:", err);
        router.replace("/dashboard");
      }
    };

    checkPermissions();
  }, []);

  // Si está inicializando, mostrar pantalla de carga
  if (isInitializing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex items-center justify-center bg-[var(--background)]"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <Loader size="xl" className="text-primary" />
          <p className="text-[var(--text-secondary)]">
            Verificando permisos...
          </p>
        </motion.div>
      </motion.div>
    );
  }

  // Navegación entre pasos
  const paginate = (newDirection) => {
    if (page + newDirection >= 0 && page + newDirection <= 3) {
      setPage([page + newDirection, newDirection]);
    }
  };

  // Validar si se puede avanzar al siguiente paso
  const canProceed = () => {
    switch (page) {
      case STEPS.INFORMACION_BASICA:
        return (
          surveyData.basicInfo.title &&
          surveyData.basicInfo.description &&
          surveyData.basicInfo.startDate &&
          surveyData.basicInfo.endDate &&
          surveyData.basicInfo.target > 0
        );
      case STEPS.PARTICIPANTES:
        return surveyData.participants.userIds.length > 0;
      case STEPS.PREGUNTAS:
        return surveyData.questions.length > 0;
      default:
        return true;
    }
  };

  // Guardar encuesta
  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dataToSave = {
        survey: {
          title: surveyData.basicInfo.title,
          description: surveyData.basicInfo.description,
          pages: [
            {
              name: "page1",
              elements: surveyData.questions,
            },
          ],
        },
        surveyInfo: {
          startDate: surveyData.basicInfo.startDate,
          endDate: surveyData.basicInfo.endDate,
          target: surveyData.basicInfo.target,
          userIds: surveyData.participants.userIds,
          supervisorsIds: surveyData.participants.supervisorsIds,
        },
      };

      await surveyService.createOrUpdateSurvey(dataToSave);
      router.push("/dashboard/encuestas");
    } catch (err) {
      console.error("Error saving survey:", err);
      setError(err.message || "Error al guardar la encuesta");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar la cancelación
  const handleCancel = () => {
    const hasChanges =
      surveyData.basicInfo.title ||
      surveyData.basicInfo.description ||
      surveyData.participants.userIds.length > 0 ||
      surveyData.questions.length > 0;

    if (hasChanges) {
      setShowConfirmCancel(true);
    } else {
      router.back();
    }
  };

  // Renderizar paso actual
  const renderStep = () => {
    switch (page) {
      case STEPS.INFORMACION_BASICA:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Información Básica</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Título de la Encuesta
                </label>
                <input
                  type="text"
                  value={surveyData.basicInfo.title}
                  onChange={(e) =>
                    setSurveyData((prev) => ({
                      ...prev,
                      basicInfo: {
                        ...prev.basicInfo,
                        title: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2 border rounded-md"
                  placeholder="Ej: Encuesta de Satisfacción 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Descripción
                </label>
                <textarea
                  value={surveyData.basicInfo.description}
                  onChange={(e) =>
                    setSurveyData((prev) => ({
                      ...prev,
                      basicInfo: {
                        ...prev.basicInfo,
                        description: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  placeholder="Describe el propósito de la encuesta"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={surveyData.basicInfo.startDate}
                    onChange={(e) =>
                      setSurveyData((prev) => ({
                        ...prev,
                        basicInfo: {
                          ...prev.basicInfo,
                          startDate: e.target.value,
                        },
                      }))
                    }
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fecha de fin
                  </label>
                  <input
                    type="date"
                    value={surveyData.basicInfo.endDate}
                    onChange={(e) =>
                      setSurveyData((prev) => ({
                        ...prev,
                        basicInfo: {
                          ...prev.basicInfo,
                          endDate: e.target.value,
                        },
                      }))
                    }
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Meta de respuestas
                </label>
                <input
                  type="number"
                  value={surveyData.basicInfo.target}
                  onChange={(e) =>
                    setSurveyData((prev) => ({
                      ...prev,
                      basicInfo: {
                        ...prev.basicInfo,
                        target: parseInt(e.target.value),
                      },
                    }))
                  }
                  className="w-full p-2 border rounded-md"
                  min="1"
                  required
                />
              </div>
            </div>
          </div>
        );

      case STEPS.PARTICIPANTES:
        return (
          <div className="space-y-8">
            <h2 className="text-xl font-semibold">Participantes</h2>

            {/* Encuestadores */}
            <div className="card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium mb-2">Encuestadores</h3>
                  <p className="text-text-secondary">
                    Selecciona los encuestadores que participarán en esta
                    encuesta. Estos usuarios serán los responsables de realizar
                    las entrevistas y recopilar las respuestas.
                  </p>
                </div>
                <button
                  onClick={() => setShowPollstersModal(true)}
                  className="btn-primary whitespace-nowrap"
                >
                  Seleccionar Encuestadores
                </button>
              </div>

              {/* Lista de encuestadores seleccionados */}
              {surveyData.participants.userIds.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">
                    Encuestadores seleccionados:
                  </h4>
                  <div className="space-y-2">
                    {users
                      .filter((user) =>
                        surveyData.participants.userIds.includes(user._id)
                      )
                      .map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center text-sm"
                        >
                          <span>
                            {user.name} {user.lastName}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Supervisores */}
            <div className="card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium mb-2">Supervisores</h3>
                  <p className="text-text-secondary">
                    Asigna supervisores para monitorear el progreso de la
                    encuesta. Los supervisores podrán ver estadísticas y
                    gestionar a los encuestadores asignados.
                  </p>
                </div>
                <button
                  onClick={() => setShowSupervisorsModal(true)}
                  className="btn-primary whitespace-nowrap"
                >
                  Seleccionar Supervisores
                </button>
              </div>

              {/* Lista de supervisores seleccionados */}
              {surveyData.participants.supervisorsIds.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">
                    Supervisores seleccionados:
                  </h4>
                  <div className="space-y-2">
                    {supervisors
                      .filter((supervisor) =>
                        surveyData.participants.supervisorsIds.includes(
                          supervisor._id
                        )
                      )
                      .map((supervisor) => (
                        <div
                          key={supervisor._id}
                          className="flex items-center text-sm"
                        >
                          <span>
                            {supervisor.name} {supervisor.lastName}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modales */}
            <TransferModal
              isOpen={showPollstersModal}
              onClose={() => setShowPollstersModal(false)}
              title="Seleccionar Encuestadores"
              availableItems={users}
              selectedItems={users.filter((user) =>
                surveyData.participants.userIds.includes(user._id)
              )}
              onSave={(selected) => {
                setSurveyData((prev) => ({
                  ...prev,
                  participants: {
                    ...prev.participants,
                    userIds: selected.map((user) => user._id),
                  },
                }));
              }}
            />

            <TransferModal
              isOpen={showSupervisorsModal}
              onClose={() => setShowSupervisorsModal(false)}
              title="Seleccionar Supervisores"
              availableItems={supervisors}
              selectedItems={supervisors.filter((supervisor) =>
                surveyData.participants.supervisorsIds.includes(supervisor._id)
              )}
              onSave={(selected) => {
                setSurveyData((prev) => ({
                  ...prev,
                  participants: {
                    ...prev.participants,
                    supervisorsIds: selected.map(
                      (supervisor) => supervisor._id
                    ),
                  },
                }));
              }}
            />
          </div>
        );

      case STEPS.PREGUNTAS:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Preguntas</h2>
            <div className="space-y-4">
              <QuestionEditor
                questions={surveyData.questions}
                onChange={(questions) =>
                  setSurveyData((prev) => ({
                    ...prev,
                    questions,
                  }))
                }
              />
            </div>
          </div>
        );

      case STEPS.VISTA_PREVIA:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Vista Previa</h2>
            <div className="space-y-4">
              <div className="card p-6">
                {/* Información básica */}
                <div className="mb-8">
                  <h3 className="text-2xl font-semibold mb-2">
                    {surveyData.basicInfo.title}
                  </h3>
                  <p className="text-text-secondary text-lg mb-4">
                    {surveyData.basicInfo.description}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="card p-4">
                      <span className="font-medium block mb-1">
                        Periodo de la encuesta
                      </span>
                      <div className="text-text-secondary">
                        {new Date(
                          surveyData.basicInfo.startDate
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          surveyData.basicInfo.endDate
                        ).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="card p-4">
                      <span className="font-medium block mb-1">
                        Meta de respuestas
                      </span>
                      <div className="text-text-secondary">
                        {surveyData.basicInfo.target} respuestas
                      </div>
                    </div>
                    <div className="card p-4">
                      <span className="font-medium block mb-1">
                        Participantes
                      </span>
                      <div className="text-text-secondary">
                        {surveyData.participants.userIds.length} encuestadores
                        {surveyData.participants.supervisorsIds.length > 0 &&
                          `, ${surveyData.participants.supervisorsIds.length} supervisores`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de preguntas */}
                <div className="space-y-6">
                  <h4 className="text-lg font-medium">
                    Preguntas de la encuesta
                  </h4>
                  <div className="space-y-4">
                    {surveyData.questions.map((question, index) => (
                      <div key={question.id} className="card p-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h5 className="font-medium">
                                  {question.title}
                                </h5>
                                {question.description && (
                                  <p className="text-text-secondary text-sm mt-1">
                                    {question.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-text-secondary">
                                  {question.type
                                    .split("_")
                                    .map(
                                      (word) =>
                                        word.charAt(0).toUpperCase() +
                                        word.slice(1)
                                    )
                                    .join(" ")}
                                </span>
                                {question.required && (
                                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                    Obligatoria
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Opciones específicas según el tipo de pregunta */}
                            {(question.type === "multiple_choice" ||
                              question.type === "single_choice" ||
                              question.type === "checkbox") &&
                              question.options.length > 0 && (
                                <div className="mt-3">
                                  <span className="text-sm text-text-secondary block mb-2">
                                    Opciones:
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {question.options.map(
                                      (option, optIndex) => (
                                        <div
                                          key={option.id}
                                          className="flex items-center gap-2"
                                        >
                                          <div className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />
                                          <span className="text-sm">
                                            {option.text}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {question.type === "matrix" && (
                              <div className="mt-3">
                                <div className="space-y-3">
                                  {question.matrixRows.length > 0 && (
                                    <div>
                                      <span className="text-sm text-text-secondary block mb-2">
                                        Filas:
                                      </span>
                                      <div className="space-y-1">
                                        {question.matrixRows.map((row) => (
                                          <div key={row.id} className="text-sm">
                                            {row.text}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {question.matrixColumns.length > 0 && (
                                    <div>
                                      <span className="text-sm text-text-secondary block mb-2">
                                        Columnas:
                                      </span>
                                      <div className="space-y-1">
                                        {question.matrixColumns.map((col) => (
                                          <div key={col.id} className="text-sm">
                                            {col.text}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {question.type === "rating" && (
                              <div className="mt-3">
                                <span className="text-sm text-text-secondary block">
                                  Escala de 0 a 5 estrellas
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={() => router.back()}
        title="Confirmar cancelación"
        message="¿Estás seguro que deseas salir? Los cambios no guardados se perderán."
      />

      {/* Barra de navegación con pasos - Fija */}
      <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-2">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-hover-bg rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-12">
                {Object.entries(STEPS).map(([key, value]) => (
                  <div
                    key={key}
                    className={`flex items-center ${
                      value < page
                        ? "text-primary"
                        : value === page
                        ? "text-text-primary"
                        : "text-text-muted"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        value < page
                          ? "bg-primary text-white"
                          : value === page
                          ? "border-2 border-primary text-primary"
                          : "border border-[var(--border)]"
                      }`}
                    >
                      {value + 1}
                    </div>
                    <span className="ml-3 text-sm">
                      {key
                        .replace("_", " ")
                        .replace("INFORMACION BASICA", "INFORMACIÓN BÁSICA")
                        .replace("VISTA PREVIA", "VISTA PREVIA")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-md border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Cancelar
              </button>
              {page > 0 && (
                <button
                  onClick={() => paginate(-1)}
                  className="px-4 py-2 rounded-md border border-[var(--border)] hover:bg-hover-bg transition-colors"
                >
                  Anterior
                </button>
              )}
              {page < 3 ? (
                <button
                  onClick={() => paginate(1)}
                  disabled={!canProceed()}
                  className={`px-4 py-2 rounded-md ${
                    canProceed() ? "btn-primary" : "disabled-button"
                  }`}
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Encuesta</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="flex-1 overflow-auto">
        {/* Área de contenido */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto py-6">
            {/* Mensajes de error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-md"
              >
                {error}
              </motion.div>
            )}

            {/* Contenido del paso actual */}
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={page}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="bg-[var(--background)]"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
