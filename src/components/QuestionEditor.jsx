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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QuestionModal from "./QuestionModal";
import { ConfirmModal } from "./ui/ConfirmModal";

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

// Helper to find if a question is a child of another
function findParentInfo(targetId, allQuestions) {
  for (let i = 0; i < allQuestions.length; i++) {
    const parentQ = allQuestions[i];
    if (parentQ.isConditional && parentQ.options) {
      const optionIndex = parentQ.options.findIndex(
        (opt) => opt && opt.nextQuestionId === targetId
      );
      if (optionIndex !== -1) {
        // Ensure parent is not the same (avoid cycles)
        if (parentQ.id !== targetId) {
          return { parentId: parentQ.id, optionIndex };
        }
      }
    }
  }
  return null;
}

// Function to calculate hierarchical numbers
function calculateQuestionNumbers(questions) {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return {};
  }

  // Primero identificar preguntas raíz (sin padre)
  const rootQuestions = questions.filter((q) => {
    // Verificamos si esta pregunta es destino de alguna pregunta condicional
    const isChild = questions.some(
      (parentQ) =>
        parentQ &&
        parentQ.isConditional &&
        parentQ.options &&
        parentQ.options.some((opt) => opt && opt.nextQuestionId === q.id)
    );
    return !isChild;
  });

  // Mapa para almacenar los números
  const numberMap = {};

  // Asignar números a las preguntas raíz
  rootQuestions.forEach((q, index) => {
    numberMap[q.id] = `${index + 1}`;
  });

  // Asignar números a las preguntas hijas de manera recursiva
  const assignChildNumbers = (parentId, parentNumber) => {
    // Encontrar todas las preguntas hijas de este padre
    const childQuestions = questions.filter((q) => {
      for (const parent of questions) {
        if (parent.id === parentId && parent.isConditional && parent.options) {
          return parent.options.some(
            (opt) => opt && opt.nextQuestionId === q.id
          );
        }
      }
      return false;
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

  // Calcular números jerárquicos
  const questionNumberMap = useMemo(
    () => calculateQuestionNumbers(questions),
    [questions]
  );

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingQuestion(null);
  };

  const handleSaveQuestion = (question) => {
    if (editingQuestion) {
      // Editar pregunta existente
      const updatedQuestions = questions.map((q) =>
        q.id === editingQuestion.id
          ? { ...question, id: editingQuestion.id }
          : q
      );
      onChange(updatedQuestions);
    } else {
      // Agregar nueva pregunta
      onChange([...questions, question]);
    }
    handleCloseModal();
  };

  const handleDeleteClick = (question) => {
    setQuestionToDelete(question);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    const updatedQuestions = questions.filter(
      (q) => q.id !== questionToDelete.id
    );
    onChange(updatedQuestions);
    setShowConfirmDelete(false);
    setQuestionToDelete(null);
  };

  // Helper to get the icon component for a type
  const getQuestionTypeIcon = (type) => {
    return QUESTION_TYPE_ICONS[type] || Type; // Default to 'Type' icon
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
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <span className="bg-[var(--primary)] text-white px-2 py-0.5 rounded-md flex-shrink-0 text-xs font-medium min-w-[30px] text-center">
                          {questionNumber}
                        </span>
                        {question.title}
                      </h4>
                      {question.description && (
                        <p className="text-text-secondary text-xs mt-0.5">
                          {question.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                      {question.isConditional && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                          Condicional
                        </span>
                      )}
                      <button
                        onClick={() => handleEditQuestion(question)}
                        className="p-1.5 text-gray-500 hover:text-gray-700"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(question)}
                        className="p-1.5 text-red-500 hover:text-red-600"
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
                          {/* Mostrar información sobre condiciones si es condicional */}
                          {question.isConditional && (
                            <div className="mt-1">
                              <span className="text-blue-600 text-xs font-medium">
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
                                    {opt.nextQuestionId && (
                                      <span className="ml-1 text-blue-600">
                                        → P
                                        {questionNumberMap[
                                          opt.nextQuestionId
                                        ] || "?"}
                                      </span>
                                    )}
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
                        {question.matrixRows.length} filas,{" "}
                        {question.matrixColumns.length} columnas
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
