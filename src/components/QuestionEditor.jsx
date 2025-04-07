"use client";

import { useState } from "react";
import { Plus, Trash2, Edit, GripVertical } from "lucide-react";
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

export default function QuestionEditor({ questions, onChange }) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowModal(true);
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
    setShowModal(false);
    setEditingQuestion(null);
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

  const getQuestionTypeLabel = (type) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
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
        {questions.map((question, index) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card p-3"
          >
            <div className="flex items-start gap-3">
              <button
                className="p-1.5 text-gray-400 hover:text-gray-600 cursor-move mt-0.5"
                onMouseDown={() => setDraggingIndex(index)}
                onMouseUp={() => setDraggingIndex(null)}
              >
                <GripVertical className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{question.title}</h4>
                    {question.description && (
                      <p className="text-text-secondary text-xs mt-0.5">
                        {question.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      {getQuestionTypeLabel(question.type)}
                    </span>
                    {question.required && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                        Obligatoria
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
        ))}
      </AnimatePresence>

      <QuestionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveQuestion}
        initialData={editingQuestion}
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
