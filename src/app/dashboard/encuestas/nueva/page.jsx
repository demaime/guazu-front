"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "@/services/survey.service";
import { userService } from "@/services/user.service";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  FilePenLine,
  FileText,
} from "lucide-react";
import { Loader } from "@/components/ui/Loader";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import "survey-core/survey-core.css";
import { authService } from "@/services/auth.service";
import { TransferModal } from "@/components/TransferModal";
import QuestionEditor from "@/components/QuestionEditor";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { QuotaManager } from "@/components/QuotaManager";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import SurveyPDF from "@/components/SurveyPDF";

// Importar PDFDownloadLink de forma dinámica para que sea compatible con SSR
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

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
  CUOTAS: 1,
  PARTICIPANTES: 2,
  PREGUNTAS: 3,
  VISTA_PREVIA: 4,
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
  const targetQuestion = allQuestions.find((q) => q.id === targetId);
  if (targetQuestion?.showCondition?.parentQuestionId) {
    return {
      parentId: targetQuestion.showCondition.parentQuestionId,
      optionIndex: 0,
    };
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

// Función para mapear tipos de preguntas internas a SurveyJS
const mapQuestionType = (type) => {
  switch (type) {
    case "multiple_choice":
      return "checkbox";
    case "single_choice":
      return "radiogroup";
    default:
      return type;
  }
};

// Función para aplanar el árbol en el orden correcto
const flattenQuestionTree = (nodes, hierarchyMap) => {
  let result = [];

  for (const node of nodes) {
    const hierarchyNode = hierarchyMap[node.id];
    result.push(node);

    // Si tiene hijos, procesar recursivamente
    if (
      hierarchyNode &&
      hierarchyNode.children &&
      hierarchyNode.children.length > 0
    ) {
      result = result.concat(
        flattenQuestionTree(hierarchyNode.children, hierarchyMap)
      );
    }
  }

  return result;
};

// Función para crear una estructura jerárquica de preguntas
const createHierarchicalStructure = (questions) => {
  // Validación para evitar errores
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return { orderedQuestions: [], numberMap: {} };
  }

  // Mapa para almacenar la jerarquía de preguntas
  const hierarchyMap = {};

  // Primero identificamos las preguntas raíz (sin padre)
  const rootQuestions = questions.filter((q) => {
    // Verificamos si esta pregunta tiene showCondition
    return !q.showCondition?.parentQuestionId;
  });

  // Si no hay preguntas raíz, devolver las preguntas originales
  if (rootQuestions.length === 0) {
    const defaultMap = {};
    questions.forEach((q, idx) => {
      defaultMap[q.id] = `${idx + 1}`;
    });
    return { orderedQuestions: questions, numberMap: defaultMap };
  }

  // Función recursiva para construir el árbol
  const buildQuestionTree = (question, parentNumber = "") => {
    if (!question || !question.id) return null;

    // Asignar número basado en el padre
    let currentNumber;

    if (parentNumber && hierarchyMap[parentNumber]) {
      currentNumber = `${parentNumber}.${
        hierarchyMap[parentNumber].children.length + 1
      }`;
    } else {
      const rootIndex = rootQuestions.findIndex((q) => q.id === question.id);
      currentNumber = `${rootIndex !== -1 ? rootIndex + 1 : 1}`;
    }

    // Almacenar información jerárquica
    hierarchyMap[question.id] = {
      question,
      children: [],
      number: currentNumber,
    };

    // Buscar preguntas hijas que tienen este ID como padre
    const childQuestions = questions.filter(
      (q) => q.showCondition?.parentQuestionId === question.id
    );

    childQuestions.forEach((childQuestion) => {
      // Añadir a la lista de hijos
      hierarchyMap[question.id].children.push(childQuestion);
      // Construir subárbol recursivamente
      buildQuestionTree(childQuestion, currentNumber);
    });

    return hierarchyMap[question.id];
  };

  // Construir el árbol para cada pregunta raíz
  rootQuestions.forEach((q) => buildQuestionTree(q));

  // Crear el mapa de numeración para todas las preguntas
  const numberMap = {};
  Object.entries(hierarchyMap).forEach(([id, data]) => {
    numberMap[id] = data.number;
  });

  // Aplanar el árbol para obtener el orden correcto
  const orderedQuestions = flattenQuestionTree(rootQuestions, hierarchyMap);

  // Si no todas las preguntas están en el árbol, agregar las restantes al final
  questions.forEach((q) => {
    if (!orderedQuestions.find((oq) => oq.id === q.id)) {
      orderedQuestions.push(q);
      // Asignar un número si no tiene
      if (!numberMap[q.id]) {
        numberMap[q.id] = `${Object.keys(numberMap).length + 1}`;
      }
    }
  });

  return { orderedQuestions, numberMap };
};

// Función más simple para ordenar preguntas jerárquicamente - Compatible con ambos formatos
const organizeQuestionsHierarchically = (questions) => {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return { orderedQuestions: [], numberMap: {} };
  }

  // Primero identificar preguntas raíz (sin padre)
  const rootQuestions = [];
  const childQuestions = new Map(); // mapa de preguntas hijas por padre

  // Función helper para verificar si una pregunta es hija
  const findParentForQuestion = (question) => {
    // Verificar showCondition
    if (question.showCondition && question.showCondition.parentQuestionId) {
      return question.showCondition.parentQuestionId;
    }
    return null;
  };

  // Clasificar preguntas como raíces o hijas
  questions.forEach((question) => {
    const parentId = findParentForQuestion(question);

    if (parentId) {
      // Es hija - agregar a la lista de hijos de su padre
      if (!childQuestions.has(parentId)) {
        childQuestions.set(parentId, []);
      }
      childQuestions.get(parentId).push(question);
    } else {
      // Es raíz
      rootQuestions.push(question);
    }
  });

  // Función recursiva para crear lista ordenada
  const buildOrderedList = (parentQuestion, prefix = "") => {
    let result = [];

    // Añadir pregunta actual
    const displayNumber = prefix
      ? `${prefix}`
      : `${rootQuestions.indexOf(parentQuestion) + 1}`;
    result.push({
      ...parentQuestion,
      displayNumber,
    });

    // Añadir hijos si existen
    const children = childQuestions.get(parentQuestion.id) || [];
    children.forEach((child, index) => {
      const childPrefix = prefix
        ? `${prefix}.${index + 1}`
        : `${rootQuestions.indexOf(parentQuestion) + 1}.${index + 1}`;
      result = result.concat(buildOrderedList(child, childPrefix));
    });

    return result;
  };

  // Construir lista completa ordenada
  let orderedList = [];
  rootQuestions.forEach((rootQuestion) => {
    orderedList = orderedList.concat(buildOrderedList(rootQuestion));
  });

  // Crear mapa de numeración
  const numberMap = {};
  orderedList.forEach((q) => {
    if (q.id && q.displayNumber) {
      numberMap[q.id] = q.displayNumber;
    }
  });

  return {
    orderedQuestions: orderedList,
    numberMap,
  };
};

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
        target: "",
      },
      participants: {
        userIds: [],
        supervisorsIds: [],
      },
      questions: [],
      quotas: [],
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
    return <LoaderWrapper size="xl" text="Verificando permisos..." />;
  }

  // Navegación entre pasos
  const paginate = (newDirection) => {
    if (page + newDirection >= 0 && page + newDirection <= 4) {
      setPage([page + newDirection, newDirection]);
    }
  };

  // Validar si se puede avanzar al siguiente paso
  const canProceed = () => {
    // Validaciones según el paso actual
    switch (page) {
      case STEPS.INFORMACION_BASICA:
        // Validar que los campos básicos estén completos
        return (
          surveyData.basicInfo.title.trim() !== "" &&
          surveyData.basicInfo.startDate &&
          surveyData.basicInfo.endDate &&
          surveyData.basicInfo.target > 0
        );

      case STEPS.SISTEMA_CUOTAS:
        // No hay requisitos obligatorios para pasar al siguiente paso
        // Se puede continuar incluso sin definir cuotas
        return true;

      case STEPS.PARTICIPANTES:
        // Validar que haya al menos un encuestador seleccionado
        return surveyData.participants.userIds.length > 0;

      case STEPS.PREGUNTAS:
        // Validar que haya al menos una pregunta
        return surveyData.questions.length > 0;

      case STEPS.VISTA_PREVIA:
        // No hay restricción para finalizar
        return true;

      default:
        return true;
    }
  };

  // Guardar encuesta
  const handleSave = async (saveAsDraft = false) => {
    // Si es un borrador, permitir guardar sin todas las validaciones
    if (!saveAsDraft) {
      // Validation: Check if title is empty
      if (!surveyData.basicInfo.title.trim()) {
        showValidationError("No es posible crear una encuesta sin título.");
        return; // Prevent saving
      }

      // Validation: Check if there is a target value
      if (!surveyData.basicInfo.target || surveyData.basicInfo.target <= 0) {
        showValidationError("Debe especificar una meta válida mayor a 0.");
        return; // Prevent saving
      }

      // Validation: Check if there are any questions
      if (surveyData.questions.length === 0) {
        showValidationError("No es posible crear una encuesta sin preguntas.");
        return; // Prevent saving
      }
    } else {
      // Para borradores solo validamos que tenga título
      if (!surveyData.basicInfo.title.trim()) {
        showValidationError("Por favor, ingresa un título para el borrador.");
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Convertir preguntas a formato para SurveyJS
      const surveyJSElements = [];

      try {
        // Ensure questions is an array before processing
        const questionsToOrganize = Array.isArray(surveyData.questions)
          ? surveyData.questions
          : [];

        // Obtener preguntas ordenadas jerárquicamente
        const { orderedQuestions, numberMap } =
          organizeQuestionsHierarchically(questionsToOrganize);

        // Guardar el mapa de numeración en surveyData para usar en la interfaz
        surveyData.questionNumberMap = numberMap;

        console.log("Preguntas ordenadas jerárquicamente:", orderedQuestions);

        // Usar las preguntas ordenadas jerárquicamente
        if (orderedQuestions && Array.isArray(orderedQuestions)) {
          orderedQuestions.forEach((question, index) => {
            if (!question) return; // Skip if question is undefined

            const element = {
              type: mapQuestionType(question.type),
              name: question.id,
              title: question.title,
              description: question.description || "",
              isRequired: question.required || false,
              // Añadir número jerárquico al título visible
              titleLocation: "top",
              showNumber: true,
            };

            // Adaptar tipos y opciones (SIN lógica condicional aquí)
            switch (question.type) {
              case "multiple_choice":
                element.type = "checkbox"; // SurveyJS usa checkbox para multiple choice
                element.choices =
                  question.options && Array.isArray(question.options)
                    ? question.options.map((opt) => ({
                        value: opt?.id || "", // Protect against undefined options
                        text: { es: opt?.text || "" },
                      }))
                    : [];
                break;
              case "single_choice":
                element.type = "radiogroup"; // SurveyJS usa radiogroup para single choice
                element.choices =
                  question.options && Array.isArray(question.options)
                    ? question.options.map((opt) => ({
                        value: opt?.id || "",
                        text: { es: opt?.text || "" },
                      }))
                    : [];
                break;
              case "checkbox": // Nuestro tipo Checkbox (que es diferente de multiple_choice)
                element.type = "checkbox"; // Mapea directamente
                element.choices =
                  question.options && Array.isArray(question.options)
                    ? question.options.map((opt) => ({
                        value: opt?.id || "",
                        text: { es: opt?.text || "" },
                      }))
                    : [];
                break;
              case "matrix":
                element.rows =
                  question.matrixRows && Array.isArray(question.matrixRows)
                    ? question.matrixRows.map((row) => ({
                        value: row?.id || "",
                        text: { es: row?.text || "" },
                      }))
                    : [];
                element.columns =
                  question.matrixColumns &&
                  Array.isArray(question.matrixColumns)
                    ? question.matrixColumns.map((col) => ({
                        value: col?.id || "",
                        text: { es: col?.text || "" },
                      }))
                    : [];
                break;
              case "rating":
                element.rateMin =
                  question.rateMin !== undefined ? question.rateMin : 1;
                element.rateMax = question.rateMax || 5;
                break;
              default:
                break;
            }

            surveyJSElements.push(element);
          });
        }
      } catch (err) {
        console.error("Error al ordenar preguntas jerárquicamente:", err);
        // Fallback: usar el orden original
        if (surveyData.questions && Array.isArray(surveyData.questions)) {
          surveyData.questions.forEach((question, index) => {
            if (!question) return; // Skip if question is undefined

            const element = {
              type: mapQuestionType(question.type),
              name: question.id,
              title: question.title,
              description: question.description || "",
              isRequired: question.required || false,
              titleLocation: "top",
              showNumber: true,
            };

            // Adapt types and options
            switch (question.type) {
              case "multiple_choice":
                element.type = "checkbox";
                element.choices =
                  question.options && Array.isArray(question.options)
                    ? question.options.map((opt) => ({
                        value: opt?.id || "",
                        text: { es: opt?.text || "" },
                      }))
                    : [];
                break;
              case "single_choice":
                element.type = "radiogroup";
                element.choices =
                  question.options && Array.isArray(question.options)
                    ? question.options.map((opt) => ({
                        value: opt?.id || "",
                        text: { es: opt?.text || "" },
                      }))
                    : [];
                break;
              case "checkbox":
                element.type = "checkbox";
                element.choices =
                  question.options && Array.isArray(question.options)
                    ? question.options.map((opt) => ({
                        value: opt?.id || "",
                        text: { es: opt?.text || "" },
                      }))
                    : [];
                break;
              case "matrix":
                element.rows =
                  question.matrixRows && Array.isArray(question.matrixRows)
                    ? question.matrixRows.map((row) => ({
                        value: row?.id || "",
                        text: { es: row?.text || "" },
                      }))
                    : [];
                element.columns =
                  question.matrixColumns &&
                  Array.isArray(question.matrixColumns)
                    ? question.matrixColumns.map((col) => ({
                        value: col?.id || "",
                        text: { es: col?.text || "" },
                      }))
                    : [];
                break;
              case "rating":
                element.rateMin =
                  question.rateMin !== undefined ? question.rateMin : 1;
                element.rateMax = question.rateMax || 5;
                break;
              default:
                break;
            }

            surveyJSElements.push(element);
          });
        }
      }

      // Establecer las condiciones de visibilidad
      if (surveyJSElements && Array.isArray(surveyJSElements)) {
        surveyJSElements.forEach((element, index) => {
          if (!element) return; // Skip if element is undefined

          const originalQuestionId = element.name;
          const visibilityConditions = [];

          // Buscar si esta pregunta es destino de alguna condición
          if (surveyData.questions && Array.isArray(surveyData.questions)) {
            // Buscar si esta pregunta tiene showCondition
            const currentQuestion = surveyData.questions.find(
              (q) => q.id === originalQuestionId
            );
            if (
              currentQuestion &&
              currentQuestion.showCondition &&
              currentQuestion.showCondition.parentQuestionId
            ) {
              const parentId = currentQuestion.showCondition.parentQuestionId;
              const requiredValue = currentQuestion.showCondition.requiredValue;

              // Encontrar la pregunta padre para determinar el operador
              const parentQuestion = surveyData.questions.find(
                (q) => q.id === parentId
              );
              if (parentQuestion) {
                let operator = "=";
                if (parentQuestion.type === "multiple_choice") {
                  operator = "contains";
                } else if (parentQuestion.type === "checkbox") {
                  operator = "contains";
                }

                // Construir la condición
                const condition = `{${parentId}} ${operator} '${requiredValue}'`;
                visibilityConditions.push(condition);

                console.log("✅ Condición generada:", {
                  questionId: originalQuestionId,
                  condition: condition,
                  parentId: parentId,
                  requiredValue: requiredValue,
                  originalShowCondition: currentQuestion.showCondition,
                });
              }
            }
          }

          // Si se encontraron condiciones, unirlas con OR y asignarlas
          if (visibilityConditions.length > 0) {
            element.visibleIf = visibilityConditions.join(" or ");
            console.log(
              "🎯 Condición final aplicada a pregunta:",
              originalQuestionId,
              "->",
              element.visibleIf
            );
          }
        });
      }

      // 3. Crear el objeto final para SurveyJS con configuración para jerarquía
      const surveyJSFormat = {
        locale: "es",
        title: surveyData.basicInfo.title,
        description: surveyData.basicInfo.description,
        pages: [
          {
            name: "page1",
            elements: surveyJSElements,
          },
        ],
        showProgressBar: "top",
        progressBarType: "questions",
        showPrevButton: true,
        showQuestionNumbers: "on",
        completeText: "Finalizar",
        pageNextText: "Siguiente",
        pagePrevText: "Anterior",
        requiredText: "(*) Pregunta obligatoria.",
        requiredErrorText: "Por favor responda la pregunta.",
        questionsOrder: "initial", // Mantener el orden inicial que hemos establecido
        questionsOnPageMode: "questionPerPage",
        clearInvisibleValues: "onHidden",
        checkErrorsMode: "onNextPage",
      };

      // 4. Crear objeto para guardar en BD (incluye info extra)
      const dataToSave = {
        survey: surveyJSFormat,
        surveyDefinition: surveyData,
        surveyInfo: {
          startDate: surveyData.basicInfo.startDate,
          endDate: surveyData.basicInfo.endDate,
          target: surveyData.basicInfo.target,
          userIds: surveyData.participants.userIds || [],
          supervisorsIds: surveyData.participants.supervisorsIds || [],
          quotas: surveyData.quotas || [],
        },
      };

      console.log("=== DEBUGGING SAVE ===");
      console.log("SurveyData questions before save:", surveyData.questions);
      console.log(
        "Questions with showCondition before save:",
        surveyData.questions.filter((q) => q.showCondition)
      );
      console.log("Data to save:", dataToSave);
      console.log("=== END SAVE DEBUG ===");

      await surveyService.createOrUpdateSurvey(
        dataToSave,
        surveyId,
        saveAsDraft
      );

      if (saveAsDraft) {
        toast.success("Borrador guardado exitosamente");
      }
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

  // Función para actualizar las cuotas
  const handleQuotasChange = (quotas) => {
    // Ya no actualizamos automáticamente la meta total basada en las cuotas
    setSurveyData((prev) => ({
      ...prev,
      quotas,
    }));
  };

  // Renderizar paso actual
  const renderStep = () => {
    switch (page) {
      case STEPS.INFORMACION_BASICA:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Información Básica</h2>
            <div className="space-y-5">
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
                  className="w-full p-3 border rounded-md"
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
                  className="w-full p-3 border rounded-md"
                  rows={1}
                  placeholder="Describe el propósito de la encuesta"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                    className="w-full p-3 border rounded-md"
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
                    className="w-full p-3 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Meta (total de encuestas){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={surveyData.basicInfo.target}
                    onChange={(e) =>
                      setSurveyData((prev) => ({
                        ...prev,
                        basicInfo: {
                          ...prev.basicInfo,
                          target: parseInt(e.target.value) || "",
                        },
                      }))
                    }
                    className="w-full p-3 border rounded-md"
                    placeholder="Ingrese la meta"
                    required
                  />
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Este valor es obligatorio y se utilizará para las cuotas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case STEPS.CUOTAS:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Sistema de Cuotas</h2>
            <p className="text-[var(--text-secondary)]">
              Define las categorías y segmentos para tu sistema de cuotas. Las
              cuotas te permiten establecer cuántas encuestas necesitas de cada
              segmento de la población.
            </p>

            <div className="mt-4">
              <QuotaManager
                value={surveyData.quotas}
                onChange={handleQuotasChange}
                totalTarget={surveyData.basicInfo.target || 0}
              />
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
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {surveyData.basicInfo.title}
                    </h3>
                    <p className="text-text-secondary text-sm">
                      {surveyData.basicInfo.description}
                    </p>
                  </div>
                  <PDFDownloadLink
                    document={<SurveyPDF surveyData={surveyData} />}
                    fileName={`encuesta-${surveyData.basicInfo.title
                      .toLowerCase()
                      .replace(/\s+/g, "-")}.pdf`}
                    className="bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-md flex items-center gap-2 transition-colors"
                  >
                    {({ blob, url, loading, error }) => (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>
                          {loading ? "Generando PDF..." : "Descargar PDF"}
                        </span>
                      </>
                    )}
                  </PDFDownloadLink>
                </div>
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
                  {(() => {
                    try {
                      // Ensure questions is an array before processing
                      const questionsToOrganize = Array.isArray(
                        surveyData.questions
                      )
                        ? surveyData.questions
                        : [];

                      // Obtener preguntas ordenadas jerárquicamente
                      const { orderedQuestions, numberMap } =
                        organizeQuestionsHierarchically(questionsToOrganize);

                      // Usar el mapa de numeración para la visualización
                      surveyData.questionNumberMap = numberMap;

                      // Use optional chaining for safety
                      return orderedQuestions?.map((question, index) => {
                        // Obtener el número jerárquico
                        const questionNumber =
                          question.displayNumber ||
                          (surveyData.questionNumberMap &&
                            surveyData.questionNumberMap[question.id]) ||
                          `${index + 1}`;

                        // Información del padre si es hijo condicional
                        let parentInfoText = "";
                        let parentQuestion = null;

                        // Verificar showCondition
                        if (
                          question.showCondition &&
                          question.showCondition.parentQuestionId
                        ) {
                          parentQuestion = surveyData.questions.find(
                            (q) =>
                              q.id === question.showCondition.parentQuestionId
                          );
                          if (parentQuestion) {
                            // Buscar el texto de la opción requerida
                            const requiredOption = parentQuestion.options?.find(
                              (opt) =>
                                opt.id === question.showCondition.requiredValue
                            );

                            const optionText =
                              requiredOption?.text ||
                              question.showCondition.requiredValue ||
                              "valor desconocido";

                            parentInfoText = `↳ Se muestra si en pregunta ${
                              numberMap[parentQuestion.id] || "?"
                            } se elige "${optionText}"`;
                          }
                        }

                        // Renderizar la pregunta
                        return (
                          <div key={question.id} className="card p-3">
                            <div className="flex items-start gap-3">
                              <div className="bg-[var(--primary)] text-white px-2 py-0.5 rounded-md flex-shrink-0 text-sm font-medium min-w-[30px] text-center">
                                {questionNumber}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h5 className="font-medium text-sm">
                                      {question.title}
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
                                  question.options &&
                                  question.options.length > 0 && (
                                    <div className="mt-2">
                                      <span className="text-xs text-text-secondary block mb-1">
                                        Opciones:
                                      </span>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                        {question.options.map((option) => {
                                          // Determinar si esta opción lleva a una pregunta específica
                                          let conditionInfo = null;

                                          // Buscar si alguna pregunta hace referencia a esta opción
                                          const childQuestion =
                                            surveyData.questions.find(
                                              (q) =>
                                                q.showCondition
                                                  ?.parentQuestionId ===
                                                  question.id &&
                                                q.showCondition
                                                  ?.requiredValue === option.id
                                            );
                                          if (childQuestion) {
                                            conditionInfo = {
                                              questionNumber:
                                                numberMap[childQuestion.id] ||
                                                "?",
                                              questionTitle:
                                                childQuestion.title,
                                            };
                                          }

                                          return (
                                            <div
                                              key={option.id}
                                              className="flex items-center gap-1.5"
                                            >
                                              <div className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />
                                              <span className="text-xs">
                                                {option.text}
                                              </span>
                                              {conditionInfo && (
                                                <span className="text-xs font-medium text-green-600">
                                                  → P
                                                  {conditionInfo.questionNumber}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
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
                                              <div
                                                key={row.id}
                                                className="text-xs"
                                              >
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
                                            {question.matrixColumns.map(
                                              (col) => (
                                                <div
                                                  key={col.id}
                                                  className="text-xs"
                                                >
                                                  {col.text}
                                                </div>
                                              )
                                            )}
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
                      });
                    } catch (err) {
                      console.error("Error al organizar preguntas:", err);
                      // Fallback: mostrar las preguntas en el orden original, ensuring it's an array
                      const questionsToMapFallback = Array.isArray(
                        surveyData.questions
                      )
                        ? surveyData.questions
                        : [];
                      return questionsToMapFallback?.map((question, index) => (
                        <div key={question.id} className="card p-3">
                          <div className="flex items-start gap-3">
                            <div className="bg-[var(--primary)] text-white px-2 py-0.5 rounded-md flex-shrink-0 text-sm font-medium min-w-[30px] text-center">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">
                                {question.title}
                              </h5>
                              {/* Contenido mínimo para mostrar */}
                            </div>
                          </div>
                        </div>
                      ));
                    }
                  })()}
                </div>

                {/* Diagrama de flujo condicional */}
                {(() => {
                  // Función helper para determinar si una pregunta es padre condicional
                  const isConditionalParent = (question) => {
                    // Verificar si otras preguntas hacen referencia a esta
                    const hasChildren = surveyData.questions.some(
                      (q) => q.showCondition?.parentQuestionId === question.id
                    );
                    return hasChildren;
                  };

                  // Función helper para obtener preguntas hijas
                  const getChildQuestions = (parentQuestion) => {
                    const children = [];

                    // Buscar preguntas con showCondition que referencian esta
                    surveyData.questions.forEach((q) => {
                      if (
                        q.showCondition?.parentQuestionId === parentQuestion.id
                      ) {
                        const parentOption = parentQuestion.options?.find(
                          (opt) => opt.id === q.showCondition.requiredValue
                        );
                        children.push({
                          question: q,
                          option: parentOption || {
                            text: q.showCondition.requiredValue,
                          },
                        });
                      }
                    });

                    return children;
                  };

                  // Obtener todas las preguntas padre (que tienen hijos)
                  const parentQuestions =
                    surveyData.questions.filter(isConditionalParent);

                  if (parentQuestions.length === 0) {
                    return null;
                  }

                  return (
                    <div className="mt-6 p-4 card">
                      <h5 className="text-base font-medium mb-3">
                        Flujo condicional de la encuesta
                      </h5>
                      <div className="text-sm text-text-secondary space-y-4">
                        {parentQuestions.map((parentQ) => {
                          const questionNumber =
                            surveyData.questionNumberMap[parentQ.id] || "?";
                          const childQuestions = getChildQuestions(parentQ);

                          if (childQuestions.length === 0) return null;

                          return (
                            <div
                              key={parentQ.id}
                              className="p-3 rounded-lg border-l-4 border-green-400 bg-[var(--card-background)] border border-[var(--card-border)]"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-500 text-white">
                                  P{questionNumber}
                                </span>
                                <p className="font-medium text-[var(--text-primary)]">
                                  {parentQ.title}
                                </p>
                              </div>

                              <div className="ml-6 space-y-1">
                                {childQuestions.map((child, idx) => {
                                  const childNumber =
                                    surveyData.questionNumberMap[
                                      child.question.id
                                    ] || "?";

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <span className="text-[var(--text-secondary)]">
                                        • Si elige "{child.option.text}":
                                      </span>
                                      <span className="font-medium text-green-600">
                                        → P{childNumber} ({child.question.title}
                                        )
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
                  );
                })()}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full relative">
      {/* Header con pasos y botones de acción */}
      <div className="bg-background border-b sticky top-0 z-10">
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

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-between">
            <div>
              <button
                type="button"
                onClick={handleCancel}
                className="w-full md:w-auto mb-2 md:mb-0 px-4 py-2 border border-[var(--card-border)] text-[var(--text-primary)] bg-[var(--card-background)] rounded-md hover:bg-[var(--hover-bg)] transition-colors"
              >
                Cancelar
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {user?.role === "ROLE_ADMIN" && (
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-4 py-2 border border-blue-500 text-blue-500 bg-transparent rounded-md hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                >
                  <FilePenLine className="w-4 h-4" />
                  {isLoading ? "Guardando..." : "Guardar como borrador"}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isLoading || !canProceed()}
                className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Guardando..." : "Guardar y publicar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal con scroll */}
      <div className="overflow-y-auto h-[calc(100%-180px)] py-4">
        <div className="container mx-auto max-w-5xl px-4">
          {page === STEPS.INFORMACION_BASICA && renderStep()}
          {page === STEPS.CUOTAS && renderStep()}
          {page === STEPS.PARTICIPANTES && renderStep()}
          {page === STEPS.PREGUNTAS && renderStep()}
          {page === STEPS.VISTA_PREVIA && renderStep()}
        </div>
      </div>

      {/* Footer con botones de navegación - fijo en la parte inferior */}
      <div className="bg-background border-t py-3 fixed bottom-0 left-0 right-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto max-w-5xl flex justify-between items-center px-4">
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
            disabled={page === 4 || !canProceed()}
            className={`px-3 py-1.5 text-sm ${
              page === 4 || !canProceed()
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
