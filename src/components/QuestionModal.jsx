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

// Placeholder descriptions for each question type
const DESCRIPTION_PLACEHOLDERS = {
  [QUESTION_TYPES.TEXT]: "Respuesta de texto libre.",
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Seleccione una o más opciones.",
  [QUESTION_TYPES.SINGLE_CHOICE]: "Seleccione solo una opción.",
  [QUESTION_TYPES.CHECKBOX]: "Marque las casillas correspondientes.",
  [QUESTION_TYPES.RATING]: "Valore en una escala.",
  [QUESTION_TYPES.DATE]: "Introduzca una fecha.",
  [QUESTION_TYPES.TIME]: "Introduzca una hora.",
  [QUESTION_TYPES.EMAIL]: "Introduzca una dirección de correo electrónico.",
  [QUESTION_TYPES.NUMBER]: "Introduzca un número.",
  [QUESTION_TYPES.PHONE]: "Introduzca un número de teléfono.",
  [QUESTION_TYPES.MATRIX]: "Valore los elementos según las columnas.",
};

// Spanish labels for question types
const QUESTION_TYPE_LABELS = {
  [QUESTION_TYPES.TEXT]: "Texto",
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Opción Múltiple",
  [QUESTION_TYPES.SINGLE_CHOICE]: "Opción Única",
  [QUESTION_TYPES.CHECKBOX]: "Casilla de Verificación",
  [QUESTION_TYPES.RATING]: "Calificación",
  [QUESTION_TYPES.DATE]: "Fecha",
  [QUESTION_TYPES.TIME]: "Hora",
  [QUESTION_TYPES.EMAIL]: "Correo Electrónico",
  [QUESTION_TYPES.NUMBER]: "Número",
  [QUESTION_TYPES.PHONE]: "Teléfono",
  [QUESTION_TYPES.MATRIX]: "Matriz",
};

export default function QuestionModal({
  isOpen,
  onClose,
  onSave,
  onValidationError,
  initialData = null,
}) {
  const [question, setQuestion] = useState(
    initialData || {
      id: null,
      type: QUESTION_TYPES.TEXT,
      title: "",
      description: DESCRIPTION_PLACEHOLDERS[QUESTION_TYPES.TEXT] || "",
      required: true,
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
        description: DESCRIPTION_PLACEHOLDERS[QUESTION_TYPES.TEXT] || "",
        required: true,
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
            <div className="flex items-center">
              <button
                onClick={addOption}
                className="link-action flex items-center gap-1 text-sm border rounded-md p-2 hover:bg-gray-100"
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
    // Validation: Check if title is empty
    if (!question.title.trim()) {
      if (onValidationError) {
        onValidationError("No es posible crear una pregunta sin título.");
      } else {
        console.error("QuestionModal: onValidationError prop is missing!");
        alert("No es posible crear una pregunta sin título.");
      }
      return; // Prevent saving
    }

    // Validation: Check for minimum options for relevant types
    const typesRequiringOptions = [
      QUESTION_TYPES.MULTIPLE_CHOICE,
      QUESTION_TYPES.SINGLE_CHOICE,
      QUESTION_TYPES.CHECKBOX,
    ];

    if (
      typesRequiringOptions.includes(question.type) &&
      question.options.length < 2
    ) {
      if (onValidationError) {
        onValidationError(
          "Este tipo de pregunta requiere al menos 2 opciones."
        );
      } else {
        console.error("QuestionModal: onValidationError prop is missing!");
        alert("Este tipo de pregunta requiere al menos 2 opciones.");
      }
      return; // Prevent saving
    }

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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="card relative transform overflow-hidden shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-medium">
              {initialData ? "Editar pregunta" : "Nueva pregunta"}
            </h3>

            <div className="space-y-4">
              {/* Title Input - Full Width */}
              <div>
                <input
                  type="text"
                  value={question.title}
                  onChange={(e) =>
                    setQuestion((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full p-2 border rounded-md" // Ensure full width
                  placeholder="Título de la pregunta"
                />
              </div>

              {/* Required Checkbox & Type Dropdown Row */}
              <div className="flex justify-evenly items-center gap-4">
                {/* Required Checkbox */}
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
                {/* Type Dropdown */}
                <select
                  value={question.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setQuestion((prev) => ({
                      ...prev,
                      type: newType,
                      description: DESCRIPTION_PLACEHOLDERS[newType] || "",
                    }));
                  }}
                  className="p-2 border rounded-md flex-none"
                >
                  {Object.entries(QUESTION_TYPES).map(([key, value]) => (
                    <option key={value} value={value}>
                      {QUESTION_TYPE_LABELS[value] || key}{" "}
                      {/* Use Spanish label */}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description Textarea - Full Width */}
              <textarea
                value={question.description}
                onChange={(e) =>
                  setQuestion((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-md" // Ensure full width
                rows={2}
                placeholder="Descripción (opcional)"
              />

              {/* Dynamic Question Options */}
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
