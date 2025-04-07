"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

// Función para generar IDs únicos
const generateUniqueId = () => {
  return Math.random().toString(36).substr(2, 9) + "_" + Date.now();
};

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

export default function QuestionModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
}) {
  const [question, setQuestion] = useState(
    initialData || {
      id: null,
      type: QUESTION_TYPES.TEXT,
      title: "",
      description: "",
      required: false,
      options: [],
      matrixRows: [],
      matrixColumns: [],
    }
  );

  // Asegurarse de que el ID se mantenga al editar
  useEffect(() => {
    if (initialData) {
      setQuestion(initialData);
    } else {
      setQuestion({
        id: null,
        type: QUESTION_TYPES.TEXT,
        title: "",
        description: "",
        required: false,
        options: [],
        matrixRows: [],
        matrixColumns: [],
      });
    }
  }, [initialData]);

  const addOption = () => {
    setQuestion((prev) => ({
      ...prev,
      options: [...prev.options, { id: generateUniqueId(), text: "" }],
    }));
  };

  const updateOption = (optionIndex, value) => {
    setQuestion((prev) => {
      const newOptions = [...prev.options];
      newOptions[optionIndex].text = value;
      return { ...prev, options: newOptions };
    });
  };

  const deleteOption = (optionIndex) => {
    setQuestion((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== optionIndex),
    }));
  };

  const addMatrixItem = (type) => {
    setQuestion((prev) => ({
      ...prev,
      [type]: [...prev[type], { id: generateUniqueId(), text: "" }],
    }));
  };

  const updateMatrixItem = (type, index, value) => {
    setQuestion((prev) => {
      const newItems = [...prev[type]];
      newItems[index].text = value;
      return { ...prev, [type]: newItems };
    });
  };

  const deleteMatrixItem = (type, index) => {
    setQuestion((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const renderQuestionOptions = () => {
    switch (question.type) {
      case QUESTION_TYPES.MULTIPLE_CHOICE:
      case QUESTION_TYPES.SINGLE_CHOICE:
      case QUESTION_TYPES.CHECKBOX:
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={addOption}
                className="link-action flex items-center gap-1 text-sm"
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
                    onChange={(e) => updateOption(optionIndex, e.target.value)}
                    className="flex-1 p-2 border rounded-md"
                    placeholder="Texto de la opción"
                  />
                  <button
                    onClick={() => deleteOption(optionIndex)}
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
                {question.matrixRows.map((row, index) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.text}
                      onChange={(e) =>
                        updateMatrixItem("matrixRows", index, e.target.value)
                      }
                      className="flex-1 p-2 border rounded-md"
                      placeholder="Texto de la fila"
                    />
                    <button
                      onClick={() => deleteMatrixItem("matrixRows", index)}
                      className="p-2 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addMatrixItem("matrixRows")}
                  className="link-action flex items-center gap-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar fila
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Columnas</label>
              <div className="space-y-2">
                {question.matrixColumns.map((column, index) => (
                  <div key={column.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={column.text}
                      onChange={(e) =>
                        updateMatrixItem("matrixColumns", index, e.target.value)
                      }
                      className="flex-1 p-2 border rounded-md"
                      placeholder="Texto de la columna"
                    />
                    <button
                      onClick={() => deleteMatrixItem("matrixColumns", index)}
                      className="p-2 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addMatrixItem("matrixColumns")}
                  className="link-action flex items-center gap-1 text-sm"
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

  const handleSave = () => {
    const questionToSave = {
      ...question,
      id: question.id || generateUniqueId(),
    };
    onSave(questionToSave);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="card relative transform overflow-hidden shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-medium">
              {initialData ? "Editar pregunta" : "Nueva pregunta"}
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={question.title}
                    onChange={(e) =>
                      setQuestion((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full p-2 border rounded-md"
                    placeholder="Título de la pregunta"
                  />
                </div>
                <select
                  value={question.type}
                  onChange={(e) =>
                    setQuestion((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="p-2 border rounded-md"
                >
                  {Object.entries(QUESTION_TYPES).map(([key, value]) => (
                    <option key={value} value={value}>
                      {key
                        .split("_")
                        .map(
                          (word) => word.charAt(0) + word.slice(1).toLowerCase()
                        )
                        .join(" ")}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={question.description}
                onChange={(e) =>
                  setQuestion((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-md"
                rows={2}
                placeholder="Descripción (opcional)"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={question.required}
                  onChange={(e) =>
                    setQuestion((prev) => ({
                      ...prev,
                      required: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="required" className="text-sm">
                  Pregunta obligatoria
                </label>
              </div>

              {renderQuestionOptions()}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={onClose} className="btn-action">
                Cancelar
              </button>
              <button onClick={handleSave} className="btn-primary">
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
