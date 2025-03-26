"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      type: QUESTION_TYPES.TEXT,
      title: "",
      description: "",
      required: false,
      options: [],
      matrixRows: [],
      matrixColumns: [],
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value,
    };
    onChange(updatedQuestions);
  };

  const deleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    onChange(updatedQuestions);
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options = [
      ...updatedQuestions[questionIndex].options,
      { id: Date.now(), text: "" },
    ];
    onChange(updatedQuestions);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex].text = value;
    onChange(updatedQuestions);
  };

  const deleteOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options = updatedQuestions[
      questionIndex
    ].options.filter((_, i) => i !== optionIndex);
    onChange(updatedQuestions);
  };

  const renderQuestionOptions = (question, index) => {
    switch (question.type) {
      case QUESTION_TYPES.MULTIPLE_CHOICE:
      case QUESTION_TYPES.SINGLE_CHOICE:
      case QUESTION_TYPES.CHECKBOX:
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => addOption(index)}
                className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Agregar opción
              </button>
            </div>
            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <div key={option.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) =>
                      updateOption(index, optionIndex, e.target.value)
                    }
                    className="flex-1 p-2 border rounded-md"
                    placeholder="Texto de la opción"
                  />
                  <button
                    onClick={() => deleteOption(index, optionIndex)}
                    className="p-2 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case QUESTION_TYPES.MATRIX:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Filas</label>
              <div className="space-y-2">
                {question.matrixRows.map((row, rowIndex) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.text}
                      onChange={(e) => {
                        const updatedQuestions = [...questions];
                        updatedQuestions[index].matrixRows[rowIndex].text =
                          e.target.value;
                        onChange(updatedQuestions);
                      }}
                      className="flex-1 p-2 border rounded-md"
                      placeholder="Texto de la fila"
                    />
                    <button
                      onClick={() => {
                        const updatedQuestions = [...questions];
                        updatedQuestions[index].matrixRows = updatedQuestions[
                          index
                        ].matrixRows.filter((_, i) => i !== rowIndex);
                        onChange(updatedQuestions);
                      }}
                      className="p-2 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updatedQuestions = [...questions];
                    updatedQuestions[index].matrixRows.push({
                      id: Date.now(),
                      text: "",
                    });
                    onChange(updatedQuestions);
                  }}
                  className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Agregar fila
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Columnas</label>
              <div className="space-y-2">
                {question.matrixColumns.map((column, columnIndex) => (
                  <div key={column.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={column.text}
                      onChange={(e) => {
                        const updatedQuestions = [...questions];
                        updatedQuestions[index].matrixColumns[
                          columnIndex
                        ].text = e.target.value;
                        onChange(updatedQuestions);
                      }}
                      className="flex-1 p-2 border rounded-md"
                      placeholder="Texto de la columna"
                    />
                    <button
                      onClick={() => {
                        const updatedQuestions = [...questions];
                        updatedQuestions[index].matrixColumns =
                          updatedQuestions[index].matrixColumns.filter(
                            (_, i) => i !== columnIndex
                          );
                        onChange(updatedQuestions);
                      }}
                      className="p-2 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updatedQuestions = [...questions];
                    updatedQuestions[index].matrixColumns.push({
                      id: Date.now(),
                      text: "",
                    });
                    onChange(updatedQuestions);
                  }}
                  className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Agregar columna
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Preguntas de la encuesta</h3>
        <button
          onClick={addQuestion}
          className="btn-primary flex items-center gap-2"
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
            className="card p-6 space-y-4"
          >
            <div className="flex items-start gap-4">
              <button
                className="p-2 text-gray-400 hover:text-gray-600 cursor-move"
                onMouseDown={() => setDraggingIndex(index)}
                onMouseUp={() => setDraggingIndex(null)}
              >
                <GripVertical className="w-5 h-5" />
              </button>
              <div className="flex-1 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={question.title}
                      onChange={(e) =>
                        updateQuestion(index, "title", e.target.value)
                      }
                      className="w-full p-2 border rounded-md"
                      placeholder="Título de la pregunta"
                    />
                  </div>
                  <select
                    value={question.type}
                    onChange={(e) =>
                      updateQuestion(index, "type", e.target.value)
                    }
                    className="p-2 border rounded-md"
                  >
                    {Object.entries(QUESTION_TYPES).map(([key, value]) => (
                      <option key={value} value={value}>
                        {key
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0) + word.slice(1).toLowerCase()
                          )
                          .join(" ")}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => deleteQuestion(index)}
                    className="p-2 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <textarea
                  value={question.description}
                  onChange={(e) =>
                    updateQuestion(index, "description", e.target.value)
                  }
                  className="w-full p-2 border rounded-md"
                  rows={2}
                  placeholder="Descripción (opcional)"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`required-${question.id}`}
                    checked={question.required}
                    onChange={(e) =>
                      updateQuestion(index, "required", e.target.checked)
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor={`required-${question.id}`}
                    className="text-sm"
                  >
                    Pregunta obligatoria
                  </label>
                </div>

                {renderQuestionOptions(question, index)}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
