"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Type,
  CheckSquare,
  List,
  ToggleLeft,
  Star,
  Calendar,
  Clock,
  Mail,
  Hash,
  Phone,
  Grid,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QuestionModal from "./QuestionModal";
import { ConfirmModal } from "./ui/ConfirmModal";
import { toast } from "react-toastify";

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

// Spanish labels (redundant, consider moving to shared file later)
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

// Icon mapping
const QUESTION_TYPE_ICONS = {
  [QUESTION_TYPES.TEXT]: Type,
  [QUESTION_TYPES.MULTIPLE_CHOICE]: List,
  [QUESTION_TYPES.SINGLE_CHOICE]: ToggleLeft,
  [QUESTION_TYPES.CHECKBOX]: CheckSquare,
  [QUESTION_TYPES.RATING]: Star,
  [QUESTION_TYPES.DATE]: Calendar,
  [QUESTION_TYPES.TIME]: Clock,
  [QUESTION_TYPES.EMAIL]: Mail,
  [QUESTION_TYPES.NUMBER]: Hash,
  [QUESTION_TYPES.PHONE]: Phone,
  [QUESTION_TYPES.MATRIX]: Grid,
};

// Helper para encontrar información del padre
function findParentInfo(targetId, allQuestions) {
  if (!allQuestions || !Array.isArray(allQuestions)) return null;

  const targetQuestion = allQuestions.find((q) => q.id === targetId);
  if (targetQuestion && targetQuestion.showCondition) {
    const sc = targetQuestion.showCondition;
    const parentId = Array.isArray(sc.rules)
      ? sc.rules[0]?.parentQuestionId
      : sc.parentQuestionId;
    if (parentId) {
      return {
        parentId,
        optionIndex: 0,
      };
    }
  }

  return null;
}

// Función para calcular números jerárquicos
function calculateQuestionNumbers(questions) {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return {};
  }

  // Función helper para verificar si una pregunta es hija
  const findParentForQuestion = (question) => {
    // 1) Si tiene camino: hereda el padre de la pregunta fuente
    if (question.pathSourceQuestionId) {
      const source = questions.find(
        (q) => q.id === question.pathSourceQuestionId
      );
      if (source) {
        // Padre del source según sus reglas
        if (source.showCondition) {
          if (Array.isArray(source.showCondition.rules)) {
            return source.showCondition.rules[0]?.parentQuestionId || null;
          }
          return source.showCondition.parentQuestionId || null;
        }
      }
    }

    // 2) Formato nuevo/antiguo
    if (question.showCondition) {
      if (Array.isArray(question.showCondition.rules)) {
        return question.showCondition.rules[0]?.parentQuestionId || null;
      }
      return question.showCondition.parentQuestionId || null;
    }
    return null;
  };

  // Identificar preguntas raíz (sin padre)
  const rootQuestions = questions.filter((q) => {
    return !findParentForQuestion(q);
  });

  // Mapa para almacenar los números
  const numberMap = {};

  // Asignar números a las preguntas raíz
  rootQuestions.forEach((q, index) => {
    numberMap[q.id] = `${index + 1}`;
  });

  // Función recursiva para asignar números a hijos
  const assignChildNumbers = (parentId, parentNumber) => {
    // Encontrar hijos de este padre
    const childQuestions = questions.filter((q) => {
      const parentIdForQ = findParentForQuestion(q);
      return parentIdForQ === parentId;
    });

    // Asignar números a los hijos
    childQuestions.forEach((child, index) => {
      const childNumber = `${parentNumber}.${index + 1}`;
      numberMap[child.id] = childNumber;

      // Procesar recursivamente los hijos de este hijo
      assignChildNumbers(child.id, childNumber);
    });
  };

  // Procesar todos los nodos raíz
  rootQuestions.forEach((root) => {
    assignChildNumbers(root.id, numberMap[root.id]);
  });

  // Asignar números secuenciales a preguntas sin número
  let counter = rootQuestions.length + 1;
  questions.forEach((q) => {
    if (!numberMap[q.id]) {
      numberMap[q.id] = `${counter}`;
      counter++;
    }
  });

  return numberMap;
}

// Función para determinar si una pregunta es condicional
function isConditionalQuestion(question) {
  // Si sigue un camino, no mostrar como condicional (la visibilidad se hereda)
  if (question.pathSourceQuestionId) return false;
  if (!question.showCondition) return false;
  const sc = question.showCondition;
  if (Array.isArray(sc.rules)) return sc.rules.length > 0;
  return Boolean(sc.parentQuestionId);
}

export default function QuestionEditor({
  questions,
  onChange,
  onValidationError,
}) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [editingOrder, setEditingOrder] = useState({ id: null, value: "" }); // State for inline order editing

  // Calcular números jerárquicos
  const questionNumberMap = useMemo(
    () => calculateQuestionNumbers(questions),
    [questions]
  );

  // Calcular conteo de preguntas raíz
  const rootQuestionsCount = useMemo(() => {
    if (!questions || !questionNumberMap) return 0;
    return questions.filter(
      (q) => questionNumberMap[q.id] && !questionNumberMap[q.id].includes(".")
    ).length;
  }, [questions, questionNumberMap]);

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowModal(true);
  };

  const handleCopyQuestion = (question) => {
    // Crear una copia profunda de la pregunta
    const questionCopy = JSON.parse(JSON.stringify(question));

    // Generar nuevos IDs para la pregunta copiada y sus opciones/elementos
    const generateUniqueId = () =>
      Math.random().toString(36).substr(2, 9) + "_" + Date.now();

    questionCopy.id = generateUniqueId();
    questionCopy.title = `${questionCopy.title} (Copia)`;

    // Limpiar relaciones condicionales
    if (questionCopy.showCondition) {
      questionCopy.showCondition = null;
    }
    questionCopy.isConditional = false;

    // Regenerar IDs para opciones si existen
    if (questionCopy.options && questionCopy.options.length > 0) {
      questionCopy.options = questionCopy.options.map((opt) => ({
        ...opt,
        id: generateUniqueId(),
        nextQuestionId: null, // Limpiar referencia a siguiente pregunta
      }));
    }

    // Regenerar IDs para elementos de matriz si existen
    if (questionCopy.matrixRows && questionCopy.matrixRows.length > 0) {
      questionCopy.matrixRows = questionCopy.matrixRows.map((row) => ({
        ...row,
        id: generateUniqueId(),
      }));
    }

    if (questionCopy.matrixColumns && questionCopy.matrixColumns.length > 0) {
      questionCopy.matrixColumns = questionCopy.matrixColumns.map((col) => ({
        ...col,
        id: generateUniqueId(),
      }));
    }

    // Agregar la pregunta copiada
    const updatedQuestions = [...questions, questionCopy];
    onChange(updatedQuestions);

    toast.success("Pregunta copiada exitosamente");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingQuestion(null);
  };

  const handleSaveQuestion = (question) => {
    let updatedQuestions = [...questions];
    if (editingQuestion) {
      const index = updatedQuestions.findIndex((q) => q.id === question.id);
      if (index !== -1) {
        updatedQuestions[index] = question;
      }
    } else {
      updatedQuestions.push(question);
    }
    onChange(updatedQuestions);
    setShowModal(false);
    setEditingQuestion(null);
  };

  const handleDeleteClick = (question) => {
    setQuestionToDelete(question);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    if (questionToDelete) {
      const updatedQuestions = questions.filter(
        (q) => q.id !== questionToDelete.id
      );
      onChange(updatedQuestions);
    }
    setShowConfirmDelete(false);
    setQuestionToDelete(null);
  };

  const handleReorder = (questionId, newOrderStr) => {
    const newOrder = parseInt(newOrderStr);
    if (isNaN(newOrder)) return;

    // Find the current question
    const questionIndex = questions.findIndex((q) => q.id === questionId);
    if (questionIndex === -1) return;

    const question = questions[questionIndex];

    // Helper function to get all descendants of a given parent
    const getDescendants = (parentId, questionsArray) => {
      const descendants = [];

      const findDescendants = (parentId) => {
        questionsArray.forEach((q) => {
          const parentInfo = findParentInfo(q.id, questionsArray);
          if (parentInfo && parentInfo.parentId === parentId) {
            descendants.push(q);
            findDescendants(q.id); // Recursively find descendants of this child
          }
        });
      };

      findDescendants(parentId);
      return descendants;
    };

    // Get descendants of the current question
    const descendants = getDescendants(questionId, questions);

    // Get all root questions (questions without parents)
    const rootQuestions = questions.filter((q) => {
      const parentInfo = findParentInfo(q.id, questions);
      return !parentInfo;
    });

    // Create a new array without the current question and its descendants
    const questionsWithoutReordered = questions.filter((q) => {
      return q.id !== questionId && !descendants.find((d) => d.id === q.id);
    });

    // Recalculate root questions after removal
    const newRootQuestions = questionsWithoutReordered.filter((q) => {
      const parentInfo = findParentInfo(q.id, questionsWithoutReordered);
      return !parentInfo;
    });

    // Insert the question and its descendants at the new position
    const insertIndex = newOrder - 1; // Convert to 0-based index

    // Build the final array
    let reorderedQuestions = [];
    newRootQuestions.forEach((rootQ, index) => {
      if (index === insertIndex) {
        // Insert the reordered question here
        reorderedQuestions.push(question);
        descendants.forEach((desc) => reorderedQuestions.push(desc));
      }
      reorderedQuestions.push(rootQ);
      // Add descendants of this root question
      const rootDescendants = getDescendants(
        rootQ.id,
        questionsWithoutReordered
      );
      rootDescendants.forEach((desc) => reorderedQuestions.push(desc));
    });

    // If we haven't inserted the question yet (newOrder is beyond current length)
    if (insertIndex >= newRootQuestions.length) {
      reorderedQuestions.push(question);
      descendants.forEach((desc) => reorderedQuestions.push(desc));
    }

    onChange(reorderedQuestions);
  };

  const handleOrderEditStart = (questionId, currentOrder) => {
    setEditingOrder({ id: questionId, value: currentOrder });
  };

  const handleDropdownItemClick = (newOrder) => {
    if (editingOrder.id) {
      handleReorder(editingOrder.id, newOrder.toString());
      setEditingOrder({ id: null, value: "" });
    }
  };

  const getQuestionTypeIcon = (type) => {
    return QUESTION_TYPE_ICONS[type] || Type;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Preguntas de la encuesta</h3>
        <button
          onClick={handleAddQuestion}
          className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5"
        >
          <Plus className="w-4 h-4" />
          Agregar pregunta
        </button>
      </div>

      <AnimatePresence>
        {questions.map((question, index) => {
          // Obtener el número calculado
          const questionNumber = questionNumberMap[question.id] || "?";
          const isRootQuestion =
            questionNumber && !questionNumber.includes(".");

          // Determinar si es condicional y su formato
          const isConditional = isConditionalQuestion(question);
          const parentInfo = findParentInfo(question.id, questions);

          // Información sobre el padre si es hijo condicional
          let parentInfoText = "";
          let parentInfoBlock = null;
          if (parentInfo) {
            const parentQuestion = questions.find(
              (q) => q.id === parentInfo.parentId
            );
            if (parentQuestion) {
              const parentNumber = questionNumberMap[parentQuestion.id] || "?";
              // Resumen basado en reglas
              const sc = question.showCondition || {};
              if (Array.isArray(sc.rules) && sc.rules.length > 0) {
                const opLabel = {
                  equals: "es igual a",
                  contains: "contiene",
                  gt: "mayor que",
                  gte: "mayor o igual que",
                  lt: "menor que",
                  lte: "menor o igual que",
                };
                const ruleTexts = sc.rules.map((r) => {
                  const parentOfRule = questions.find(
                    (q) => q.id === r.parentQuestionId
                  );
                  const resolveText = (val) => {
                    const t = parentOfRule?.options?.find(
                      (opt) => String(opt.id) === String(val)
                    )?.text;
                    return t || val;
                  };
                  const label =
                    opLabel[r.operator] || r.operator || "es igual a";
                  if (r.operator === "contains") {
                    const vals = Array.isArray(r.values)
                      ? r.values
                      : [r.values];
                    const texts = vals
                      .filter((v) => v !== undefined && v !== null && v !== "")
                      .map((v) => resolveText(v));
                    return `${label} ${texts.join(", ")}`;
                  }
                  const v = Array.isArray(r.values) ? r.values[0] : r.values;
                  return `${label} ${resolveText(v)}`;
                });
                const logicText =
                  (sc.logic || "or").toLowerCase() === "and"
                    ? "todas (AND)"
                    : "cualquiera (OR)";
                parentInfoBlock = (
                  <div className="text-xs mt-1 text-green-600">
                    <div>↳ Se muestra si: {logicText}</div>
                    <ul className="list-disc ml-5">
                      {ruleTexts.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                );
              } else if (sc.parentQuestionId) {
                const requiredOption = parentQuestion.options?.find(
                  (opt) => opt.id === sc.requiredValue
                );
                const optionText =
                  requiredOption?.text ||
                  sc.requiredValue ||
                  "valor desconocido";
                parentInfoText = `Se muestra si en P${parentNumber} se elige "${optionText}"`;
              }
            }
          }

          return (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card p-3"
            >
              <div className="flex items-start gap-3">
                {/* Question Type Icon */}
                <div className="p-1.5 text-gray-500 mt-0.5 flex-shrink-0">
                  {React.createElement(getQuestionTypeIcon(question.type), {
                    className: "w-4 h-4",
                  })}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="w-full md:w-2/3 pr-3 min-w-0">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        {/* Question Number - Apply conditional background */}
                        {(() => {
                          const level = (questionNumber.match(/\./g) || [])
                            .length;
                          let opacityClass = ""; // Default for root (level 0)
                          if (level === 1) {
                            opacityClass = "opacity-75";
                          } else if (level >= 2) {
                            opacityClass = "opacity-50";
                          }

                          return (
                            <div
                              className={`bg-[var(--primary)] ${opacityClass} text-white px-2 py-0.5 rounded-md flex-shrink-0 text-xs font-medium min-w-[35px] text-center relative ${
                                isRootQuestion
                                  ? "cursor-pointer hover:bg-primary/80"
                                  : ""
                              }`}
                              onClick={() =>
                                isRootQuestion &&
                                handleOrderEditStart(
                                  question.id,
                                  questionNumber
                                )
                              }
                              title={
                                isRootQuestion ? "Clic para cambiar orden" : ""
                              }
                            >
                              {/* Always display the number */}
                              {questionNumber}

                              {/* Custom Dropdown - Render conditionally */}
                              {editingOrder.id === question.id && (
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-max bg-white border border-gray-300 rounded shadow-lg z-10 overflow-hidden">
                                  {Array.from(
                                    { length: rootQuestionsCount },
                                    (_, i) => i + 1
                                  ).map((num) => (
                                    <button
                                      key={num}
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent click from bubbling to the parent div
                                        handleDropdownItemClick(num);
                                      }}
                                      // Apply primary hover color using var()
                                      className={`block w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-[var(--primary)] hover:text-white ${
                                        num === parseInt(editingOrder.value)
                                          ? "bg-gray-200"
                                          : ""
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <span className="break-words whitespace-normal">
                          {question.title}
                        </span>
                      </h4>
                      {question.description && (
                        <p className="text-text-secondary text-xs mt-0.5">
                          {question.description}
                        </p>
                      )}
                      {/* Mostrar información del padre si existe */}
                      {parentInfoBlock
                        ? parentInfoBlock
                        : parentInfoText && (
                            <p className="text-xs mt-1 text-green-600">
                              ↳ {parentInfoText}
                            </p>
                          )}
                      {question.pathSourceQuestionId && (
                        <p className="text-xs mt-1 text-blue-700">
                          Camino: sigue a{" "}
                          {questionNumberMap[question.pathSourceQuestionId] ||
                            "?"}
                        </p>
                      )}
                    </div>
                    <div className="w-full md:w-1/3 md:justify-end justify-start mt-2 md:mt-0 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-text-secondary">
                        {QUESTION_TYPE_LABELS_ES[question.type] ||
                          question.type}
                      </span>
                      {question.required && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                          Obligatoria
                        </span>
                      )}
                      {/* Mostrar indicador si es pregunta condicional */}
                      {isConditional && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600">
                          Condicional
                        </span>
                      )}
                      <button
                        onClick={() => handleCopyQuestion(question)}
                        className="p-1.5 text-gray-500 hover:text-gray-700"
                        title="Copiar pregunta: Crea un duplicado que podrás editar independientemente"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditQuestion(question)}
                        className="p-1.5 text-gray-500 hover:text-gray-700"
                        title="Editar pregunta"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(question)}
                        className="p-1.5 text-red-500 hover:text-red-600"
                        title="Eliminar pregunta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mostrar resumen de opciones si es relevante */}
                  {(question.type === "multiple_choice" ||
                    question.type === "single_choice" ||
                    question.type === "checkbox") &&
                    question.options.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-text-secondary">
                          {question.options.length} opciones
                          {/* Mostrar información sobre condiciones */}
                          {isConditional && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-green-600">
                                Pregunta condicional:
                              </span>
                              <ul className="mt-1 space-y-1">
                                {question.options.map((opt, idx) => (
                                  <li
                                    key={opt.id}
                                    className="flex items-center text-xs"
                                  >
                                    <span className="text-gray-600">
                                      • {opt.text}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {question.type === "matrix" && (
                    <div className="mt-2">
                      <div className="text-xs text-text-secondary">
                        {question.matrixRows?.length || 0} filas,{" "}
                        {question.matrixColumns?.length || 0} columnas
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <QuestionModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveQuestion}
        initialData={editingQuestion}
        onValidationError={onValidationError}
        allQuestions={questions} // Pasar todas las preguntas para poder implementar lógica condicional
      />

      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setQuestionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar pregunta"
        message={`¿Estás seguro de que deseas eliminar la pregunta "${questionToDelete?.title}"?`}
      />
    </div>
  );
}
