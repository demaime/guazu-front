"use client";

import { useState, useEffect, useMemo } from "react";
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

// Constants (Consider moving to a shared file)
const QUESTION_TYPES = {
  TEXT: "text",
  MULTIPLE_CHOICE: "multiple_choice",
  SINGLE_CHOICE: "single_choice",
  CHECKBOX: "checkbox",
  RATING: "rating",
  DATE: "date",
  TIME: "time",
  EMAIL: "email",
  NUMBER: "number",
  PHONE: "phone",
  MATRIX: "matrix",
};

const QUESTION_TYPE_LABELS_ES = {
  [QUESTION_TYPES.TEXT]: "Texto",
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Opción Múltiple",
  [QUESTION_TYPES.SINGLE_CHOICE]: "Opción Única",
  [QUESTION_TYPES.CHECKBOX]: "Casilla Verificación",
  [QUESTION_TYPES.RATING]: "Calificación",
  [QUESTION_TYPES.DATE]: "Fecha",
  [QUESTION_TYPES.TIME]: "Hora",
  [QUESTION_TYPES.EMAIL]: "Correo Electrónico",
  [QUESTION_TYPES.NUMBER]: "Número",
  [QUESTION_TYPES.PHONE]: "Teléfono",
  [QUESTION_TYPES.MATRIX]: "Matriz",
};

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

// Helper para encontrar si una pregunta es hija y de quién
function findParentInfo(targetId, allQuestions) {
  for (let i = 0; i < allQuestions.length; i++) {
    const parentQ = allQuestions[i];
    if (parentQ.isConditional && parentQ.options) {
      const optionIndex = parentQ.options.findIndex(
        (opt) => opt.nextQuestionId === targetId
      );
      if (optionIndex !== -1) {
        // Asegurarse que el padre no sea el mismo (evitar ciclos en cálculo)
        if (parentQ.id !== targetId) {
          return { parentId: parentQ.id, optionIndex };
        }
      }
    }
  }
  return null;
}

// Función para calcular números jerárquicos
function calculateQuestionNumbers(questions) {
  const questionNumbers = {}; // { questionId: numberString }
  let mainQuestionCounter = 0;

  questions.forEach((q) => {
    const parentInfo = findParentInfo(q.id, questions);
    if (!parentInfo) {
      mainQuestionCounter++;
      questionNumbers[q.id] = `${mainQuestionCounter}`;
    }
  });

  questions.forEach((q) => {
    const parentInfo = findParentInfo(q.id, questions);
    if (parentInfo) {
      const parentNumber = questionNumbers[parentInfo.parentId];
      const mainParentNumber = parentNumber ? parentNumber.split(".")[0] : "?";
      questionNumbers[q.id] = `${mainParentNumber}.${
        parentInfo.optionIndex + 1
      }`;
    }
  });

  mainQuestionCounter = 0;
  questions.forEach((q) => {
    if (!questionNumbers[q.id]) {
      const parentInfo = findParentInfo(q.id, questions);
      if (!parentInfo) {
        mainQuestionCounter++;
        questionNumbers[q.id] = `${mainQuestionCounter}`;
      } else {
        const parentIndexFallback = questions.findIndex(
          (pq) => pq.id === parentInfo.parentId
        );
        questionNumbers[q.id] = `${parentIndexFallback + 1}.${
          parentInfo.optionIndex + 1
        }`;
      }
    }
  });

  return questionNumbers;
}

export default function NuevaEncuesta({
  isEditing = false,
  surveyId = null,
  initialData = null,
}) {
  const router = useRouter();
  const [[page, direction], setPage] = useState([0, 0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [user, setUser] = useState(null);
  const [surveyData, setSurveyData] = useState(
    initialData || {
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
    }
  );
  const [showPollstersModal, setShowPollstersModal] = useState(false);
  const [showSupervisorsModal, setShowSupervisorsModal] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] =
    useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState("");

  // Calcular números jerárquicos para la vista previa
  const questionNumberMap = useMemo(
    () => calculateQuestionNumbers(surveyData.questions),
    [surveyData.questions]
  );

  // Function to show validation error modal
  const showValidationError = (message) => {
    setValidationErrorMessage(message);
    setShowValidationErrorModal(true);
  };

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
    // Validation: Check if title is empty
    if (!surveyData.basicInfo.title.trim()) {
      showValidationError("No es posible crear una encuesta sin título.");
      return; // Prevent saving
    }

    // Validation: Check if there are any questions
    if (surveyData.questions.length === 0) {
      showValidationError("No es posible crear una encuesta sin preguntas.");
      return; // Prevent saving
    }

    // console.log("[NuevaEncuesta] Starting handleSave...");
    try {
      setIsLoading(true);
      setError(null);

      // 1. Crear la estructura base de los elementos SurveyJS
      const surveyJSElements = surveyData.questions.map((question) => {
        const baseQuestion = {
          type: question.type,
          name: question.id, // Usar nuestro ID como nombre para SurveyJS
          title: question.title,
          description: question.description,
          isRequired: question.required,
        };

        // Adaptar tipos y opciones (SIN lógica condicional aquí)
        switch (question.type) {
          case "multiple_choice":
            return {
              ...baseQuestion,
              type: "checkbox", // SurveyJS usa checkbox para multiple choice
              choices: question.options.map((opt) => ({
                value: opt.id, // Usar nuestro ID de opción como valor
                text: { es: opt.text },
              })),
            };
          case "single_choice":
            return {
              ...baseQuestion,
              type: "radiogroup", // SurveyJS usa radiogroup para single choice
              choices: question.options.map((opt) => ({
                value: opt.id,
                text: { es: opt.text },
              })),
            };
          case "checkbox": // Nuestro tipo Checkbox (que es diferente de multiple_choice)
            return {
              ...baseQuestion,
              type: "checkbox", // Mapea directamente
              choices: question.options.map((opt) => ({
                value: opt.id,
                text: { es: opt.text },
              })),
            };
          case "matrix":
            return {
              ...baseQuestion,
              rows: question.matrixRows.map((row) => ({
                value: row.id,
                text: { es: row.text },
              })),
              columns: question.matrixColumns.map((col) => ({
                value: col.id,
                text: { es: col.text },
              })),
            };
          case "rating":
            return {
              ...baseQuestion,
              rateMin: question.rateMin !== undefined ? question.rateMin : 1,
              rateMax: question.rateMax || 5,
            };
          default:
            return baseQuestion;
        }
      });

      // 2. Añadir reglas visibleIf a los elementos destino
      surveyJSElements.forEach((element, index) => {
        const originalQuestionId = element.name; // Nuestro ID original
        const visibilityConditions = [];

        // Buscar si esta pregunta es destino de alguna condición
        surveyData.questions.forEach((parentQ) => {
          if (parentQ.isConditional && parentQ.options) {
            parentQ.options.forEach((opt) => {
              if (opt.nextQuestionId === originalQuestionId) {
                // Determinar operador basado en tipo de pregunta padre
                let operator = "=";
                if (parentQ.type === "multiple_choice") {
                  // SurveyJS usa 'checkbox' para multiple_choice, el operador es 'contains'
                  operator = "contains";
                } else if (parentQ.type === "checkbox") {
                  operator = "contains";
                } // para single_choice/radiogroup, '=' está bien

                // Construir la condición: {nombre_pregunta_padre} operador 'valor_opcion'
                const condition = `{${parentQ.id}} ${operator} '${opt.id}'`;
                visibilityConditions.push(condition);
              }
            });
          }
        });

        // Si se encontraron condiciones, unirlas con OR y asignarlas
        if (visibilityConditions.length > 0) {
          element.visibleIf = visibilityConditions.join(" or ");
        }
      });

      // 3. Crear el objeto final para SurveyJS
      const surveyJSFormat = {
        locale: "es",
        title: surveyData.basicInfo.title,
        description: surveyData.basicInfo.description,
        pages: [
          {
            name: "page1",
            elements: surveyJSElements, // Usar los elementos procesados con visibleIf
          },
        ],
        showProgressBar: "top",
        progressBarType: "questions",
        showPrevButton: true,
        showQuestionNumbers: "on", // SurveyJS maneja la numeración
        completeText: "Finalizar",
        pageNextText: "Siguiente",
        pagePrevText: "Anterior",
        requiredText: "(*) Pregunta obligatoria.",
        // questionTitlePattern: "N° {num}. {title}", // Quitar esto si queremos nuestra numeración jerárquica visual, SurveyJS usará la suya interna
        requiredErrorText: "Por favor responda la pregunta.",
        questionsOnPageMode: "singlePage", // O "questionPerPage" si prefieres
        clearInvisibleValues: "onHidden", // Importante para lógica condicional
        checkErrorsMode: "onNextPage", // O "onValueChanging"
      };

      // 4. Crear objeto para guardar en BD (incluye info extra)
      const dataToSave = {
        survey: surveyJSFormat, // Guardar el formato que entiende SurveyJS
        // Guardar también nuestra estructura interna para la edición
        surveyDefinition: surveyData,
        surveyInfo: {
          startDate: surveyData.basicInfo.startDate,
          endDate: surveyData.basicInfo.endDate,
          target: surveyData.basicInfo.target,
          userIds: surveyData.participants.userIds,
          supervisorsIds: surveyData.participants.supervisorsIds,
        },
      };

      // console.log("[NuevaEncuesta] Data to send to service:", dataToSave);
      // console.log("[NuevaEncuesta] Survey ID being passed:", surveyId);

      await surveyService.createOrUpdateSurvey(dataToSave, surveyId);
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

  const handleConfirmCancel = () => {
    setShowConfirmCancel(false);
    router.back();
  };

  // Renderizar paso actual
  const renderStep = () => {
    switch (page) {
      case STEPS.INFORMACION_BASICA:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Información Básica</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
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
                <label className="block text-sm font-medium mb-1">
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
                  rows={3}
                  placeholder="Describe el propósito de la encuesta"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
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
                  <label className="block text-sm font-medium mb-1">
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
                <label className="block text-sm font-medium mb-1">
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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Participantes</h2>

            {/* Encuestadores */}
            <div className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-medium mb-1">Encuestadores</h3>
                  <p className="text-text-secondary text-sm">
                    Selecciona los encuestadores que participarán en esta
                    encuesta.
                  </p>
                </div>
                <button
                  onClick={() => setShowPollstersModal(true)}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  Seleccionar Encuestadores
                </button>
              </div>

              {/* Lista de encuestadores seleccionados */}
              {surveyData.participants.userIds.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">
                    Encuestadores seleccionados:
                  </h4>
                  <div className="space-y-1">
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
            <div className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-medium mb-1">Supervisores</h3>
                  <p className="text-text-secondary text-sm">
                    Asigna supervisores para monitorear el progreso.
                  </p>
                </div>
                <button
                  onClick={() => setShowSupervisorsModal(true)}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  Seleccionar Supervisores
                </button>
              </div>

              {/* Lista de supervisores seleccionados */}
              {surveyData.participants.supervisorsIds.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">
                    Supervisores seleccionados:
                  </h4>
                  <div className="space-y-1">
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
          </div>
        );

      case STEPS.PREGUNTAS:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Preguntas</h2>
            <div>
              <QuestionEditor
                questions={surveyData.questions}
                onValidationError={showValidationError}
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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Vista Previa</h2>
            <div className="card p-4">
              {/* Información básica */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">
                  {surveyData.basicInfo.title}
                </h3>
                <p className="text-text-secondary text-sm mb-3">
                  {surveyData.basicInfo.description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="card p-3">
                    <span className="font-medium block mb-0.5">
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
                  <div className="card p-3">
                    <span className="font-medium block mb-0.5">
                      Meta de respuestas
                    </span>
                    <div className="text-text-secondary">
                      {surveyData.basicInfo.target} respuestas
                    </div>
                  </div>
                  <div className="card p-3">
                    <span className="font-medium block mb-0.5">
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
              <div className="space-y-3">
                <h4 className="text-base font-medium">
                  Preguntas de la encuesta
                </h4>
                <div className="space-y-2">
                  {surveyData.questions.map((question, index) => {
                    // Obtener el número calculado
                    const questionNumber =
                      questionNumberMap[question.id] || "?";

                    // Información del padre si es hijo condicional
                    let parentInfoText = "";
                    const parentInfo = findParentInfo(
                      question.id,
                      surveyData.questions
                    ); // Reutilizar helper localmente si es necesario
                    if (parentInfo) {
                      const parentQuestion = surveyData.questions.find(
                        (q) => q.id === parentInfo.parentId
                      );
                      if (parentQuestion) {
                        const parentNumber =
                          questionNumberMap[parentQuestion.id] || "?";
                        parentInfoText = `↳ Se muestra si en pregunta ${parentNumber} se elige "${
                          parentQuestion.options[parentInfo.optionIndex]
                            ?.text || "opción"
                        }"`;
                      }
                    }

                    return (
                      <div key={question.id} className="card p-3">
                        <div className="flex items-start gap-2">
                          <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm">
                            {questionNumber} {/* Número jerárquico */}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h5 className="font-medium text-sm">
                                  {questionNumber}. {question.title}
                                </h5>
                                {parentInfoText && (
                                  <p className="text-xs text-blue-600 mt-0.5">
                                    {parentInfoText}
                                  </p>
                                )}
                                {question.description && (
                                  <p className="text-text-secondary text-xs mt-0.5">
                                    {question.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {/* Use Spanish Label for Type Tag */}
                                <span className="text-xs text-text-secondary">
                                  {QUESTION_TYPE_LABELS_ES[question.type] ||
                                    question.type}
                                </span>
                                {question.required && (
                                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
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
                                <div className="mt-2">
                                  <span className="text-xs text-text-secondary block mb-1">
                                    Opciones:
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {question.options.map((option) => (
                                      <div
                                        key={option.id}
                                        className="flex items-center gap-1.5"
                                      >
                                        <div className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />
                                        <span className="text-xs">
                                          {option.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {question.type === "matrix" && (
                              <div className="mt-2">
                                <div className="space-y-2">
                                  {question.matrixRows.length > 0 && (
                                    <div>
                                      <span className="text-xs text-text-secondary block mb-1">
                                        Filas:
                                      </span>
                                      <div className="space-y-0.5">
                                        {question.matrixRows.map((row) => (
                                          <div key={row.id} className="text-xs">
                                            {row.text}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {question.matrixColumns.length > 0 && (
                                    <div>
                                      <span className="text-xs text-text-secondary block mb-1">
                                        Columnas:
                                      </span>
                                      <div className="space-y-0.5">
                                        {question.matrixColumns.map((col) => (
                                          <div key={col.id} className="text-xs">
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
                              <div className="mt-2">
                                <span className="text-xs text-text-secondary block">
                                  Escala de 0 a 5 estrellas
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Diagrama de flujo condicional */}
                {surveyData.questions.some((q) => q.isConditional) && (
                  <div className="mt-6 p-4 card">
                    <h5 className="text-base font-medium mb-3">
                      Diagrama de flujo condicional
                    </h5>
                    <div className="text-sm text-text-secondary">
                      {surveyData.questions
                        .filter((q) => q.isConditional)
                        .map((q) => {
                          const parentNumber = questionNumberMap[q.id] || "?";
                          return (
                            <div
                              key={q.id}
                              className="mb-4 pb-3 border-b border-dashed border-gray-200"
                            >
                              <p className="font-medium text-primary">
                                Pregunta {parentNumber}: {q.title}
                              </p>
                              <div className="ml-4 mt-2">
                                {q.options.map((opt, optIdx) => {
                                  const targetQuestion = opt.nextQuestionId
                                    ? surveyData.questions.find(
                                        (que) => que.id === opt.nextQuestionId
                                      )
                                    : null;
                                  const targetQuestionNumber = targetQuestion
                                    ? questionNumberMap[targetQuestion.id] ||
                                      "?"
                                    : null;

                                  return (
                                    <div
                                      key={opt.id}
                                      className="flex items-center gap-2 mb-1"
                                    >
                                      <span className="text-xs">
                                        • Si elige "{opt.text}":
                                      </span>
                                      <span className="text-xs text-blue-600">
                                        {targetQuestionNumber
                                          ? `→ Va a la pregunta ${targetQuestionNumber}: "${targetQuestion.title}"`
                                          : "→ Continúa con la siguiente pregunta"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col p-2">
      {/* Header con pasos y botones de acción */}
      <div className="bg-background border-b">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-4">
            {Object.entries(STEPS).map(([key, value]) => (
              <button
                key={value}
                onClick={() => paginate(value - page)}
                className={`flex items-center gap-1.5 cursor-pointer ${
                  value === page
                    ? "text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                    value === page
                      ? "border-primary text-primary"
                      : "border-text-secondary text-text-secondary"
                  }`}
                >
                  {value + 1}
                </div>
                <span className="font-medium text-sm">
                  {key.replace("_", " ")}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-red-500 border border-red-500 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm btn-primary flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isEditing ? "Guardar Cambios" : "Guardar Encuesta"}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal con scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="container mx-auto max-w-5xl h-full py-4">
          <div className="overflow-x-hidden h-full">
            {page === STEPS.INFORMACION_BASICA && renderStep()}
            {page === STEPS.PARTICIPANTES && renderStep()}
            {page === STEPS.PREGUNTAS && renderStep()}
            {page === STEPS.VISTA_PREVIA && renderStep()}
          </div>
        </div>
      </div>

      {/* Footer con botones de navegación */}
      <div className="bg-background ">
        <div className="container mx-auto max-w-5xl flex justify-between items-center">
          <button
            onClick={() => paginate(-1)}
            disabled={page === 0}
            className={`px-3 py-1.5 text-sm ${
              page === 0
                ? "disabled-button"
                : "bg-primary text-white rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
            }`}
          >
            Anterior
          </button>

          <button
            onClick={() => paginate(1)}
            disabled={page === 3 || !canProceed()}
            className={`px-3 py-1.5 text-sm ${
              page === 3 || !canProceed()
                ? "disabled-button"
                : "bg-primary text-white rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
            }`}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal de confirmación para cancelar */}
      {showConfirmCancel && (
        <ConfirmModal
          isOpen={showConfirmCancel}
          onClose={() => setShowConfirmCancel(false)}
          onConfirm={handleConfirmCancel}
          title="Confirmar cancelación"
          confirmText="Salir sin guardar"
          cancelText="Permanecer"
          confirmButtonClass="bg-red-500 text-white hover:bg-red-600"
        >
          <p>
            ¿Estás seguro que deseas salir? Los cambios no guardados se
            perderán.
          </p>
        </ConfirmModal>
      )}

      {/* Modal de selección de encuestadores */}
      <TransferModal
        isOpen={showPollstersModal}
        onClose={() => setShowPollstersModal(false)}
        title="Seleccionar Encuestadores"
        availableItems={users}
        selectedItems={users.filter((user) =>
          surveyData.participants.userIds.includes(user._id)
        )}
        onSave={(selectedPollsters) => {
          setSurveyData((prev) => ({
            ...prev,
            participants: {
              ...prev.participants,
              userIds: selectedPollsters.map((pollster) => pollster._id),
            },
          }));
          setShowPollstersModal(false);
        }}
      />

      {/* Modal de selección de supervisores */}
      <TransferModal
        isOpen={showSupervisorsModal}
        onClose={() => setShowSupervisorsModal(false)}
        title="Seleccionar Supervisores"
        availableItems={supervisors}
        selectedItems={supervisors.filter((supervisor) =>
          surveyData.participants.supervisorsIds.includes(supervisor._id)
        )}
        onSave={(selectedSupervisors) => {
          setSurveyData((prev) => ({
            ...prev,
            participants: {
              ...prev.participants,
              supervisorsIds: selectedSupervisors.map(
                (supervisor) => supervisor._id
              ),
            },
          }));
          setShowSupervisorsModal(false);
        }}
      />

      {/* Validation Error Modal - Using modified ConfirmModal */}
      <ConfirmModal
        isOpen={showValidationErrorModal}
        onClose={() => setShowValidationErrorModal(false)}
        onConfirm={() => setShowValidationErrorModal(false)}
        title="Error de Validación"
        confirmText="Aceptar"
        showCancelButton={false}
        confirmButtonClass="btn-primary"
      >
        <p>{validationErrorMessage}</p>
      </ConfirmModal>
    </div>
  );
}
