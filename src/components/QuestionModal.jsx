"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

// Función para generar IDs únicos
const generateUniqueId = () => {
  return Math.random().toString(36).substr(2, 9) + "_" + Date.now();
};

// Helper function to generate variable name from title
const generateVariableName = (title) => {
  if (!title) return "";
  const normalized = title
    .toLowerCase()
    // Remove accents
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Replace non-alphanumeric with underscore
    .replace(/[^a-z0-9_\\s-]/g, "")
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .replace(/-+/g, "_") // Replace hyphens with underscore
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ""); // Trim leading/trailing underscores

  // Limit length
  const maxLength = 40;
  const prefix = "p_";
  const truncated = normalized.slice(0, maxLength);

  if (!truncated) return ""; // Avoid returning just "p_" if title was non-alphanumeric

  return `${prefix}${truncated}`;
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

// Función para calcular números jerárquicos (formato nuevo)
function calculateQuestionNumbers(questions) {
  const questionNumbers = {}; // { questionId: numberString }
  let mainQuestionCounter = 0;

  // Helper para encontrar si una pregunta es hija y de quién
  function findParentInfo(targetId, allQuestions) {
    const targetQuestion = allQuestions.find((q) => q.id === targetId);
    if (targetQuestion && targetQuestion.showCondition) {
      return {
        parentId: targetQuestion.showCondition.parentQuestionId,
        optionIndex: 0,
      };
    }
    return null;
  }

  // Asignar números principales primero
  questions.forEach((q) => {
    const parentInfo = findParentInfo(q.id, questions);
    if (!parentInfo) {
      mainQuestionCounter++;
      questionNumbers[q.id] = `${mainQuestionCounter}`;
    }
  });

  // Asignar números jerárquicos a hijos
  questions.forEach((q) => {
    const parentInfo = findParentInfo(q.id, questions);
    if (parentInfo) {
      const parentNumber = questionNumbers[parentInfo.parentId];
      // Usar solo la parte principal del número padre
      const mainParentNumber = parentNumber ? parentNumber.split(".")[0] : "?";
      questionNumbers[q.id] = `${mainParentNumber}.${
        parentInfo.optionIndex + 1
      }`;
    }
  });

  return questionNumbers;
}

export default function QuestionModal({
  isOpen,
  onClose,
  onSave,
  onValidationError,
  initialData = null,
  allQuestions = [],
}) {
  const getInitialState = (data) => {
    const defaults = {
      id: null,
      type: QUESTION_TYPES.TEXT,
      title: "",
      variable: "", // Add variable field
      variableManuallySet: false, // Add flag
      description: "",
      required: true,
      rateMin: 1, // Default minimum rating
      rateMax: 5, // Default maximum rating
      options: [],
      matrixRows: [],
      matrixColumns: [],
      isConditional: false,

      showCondition: null,
    };

    let initialState = { ...defaults };

    if (data) {
      // Merge initialData with defaults
      initialState = { ...initialState, ...data };

      // Set variable state based on initialData
      if (data.variable && data.variable.trim() !== "") {
        initialState.variable = data.variable;
        initialState.variableManuallySet = true;
      } else {
        initialState.variable = generateVariableName(data.title);
        initialState.variableManuallySet = false;
      }

      // Ensure description is prefilled if empty based on type
      initialState.description =
        data.description || DESCRIPTION_PLACEHOLDERS[initialState.type] || "";

      // Configurar pregunta condicional
      if (data.showCondition) {
        initialState.isConditional = true;
        initialState.showCondition = data.showCondition;
      } else {
        initialState.isConditional = false;
        initialState.showCondition = null;
      }
    } else {
      // New question, ensure description is prefilled for default type
      initialState.description = DESCRIPTION_PLACEHOLDERS[defaults.type] || "";
      // Variable will be generated based on title later
    }
    return initialState;
  };

  const [question, setQuestion] = useState(() => getInitialState(initialData));

  // Asegurarse de que el ID se mantenga al editar y el estado se resetee/inicialice correctamente
  useEffect(() => {
    // Reset state completely when modal opens or initialData changes
    setQuestion(getInitialState(initialData));
  }, [initialData, isOpen]);

  // Auto-generate variable name when title changes, if not manually set
  useEffect(() => {
    if (!question.variableManuallySet && isOpen) {
      // Only run if modal is open
      const generatedVariable = generateVariableName(question.title);
      if (generatedVariable !== question.variable) {
        setQuestion((prev) => ({ ...prev, variable: generatedVariable }));
      }
    }
  }, [question.title, question.variableManuallySet, isOpen]);

  // Calcular números jerárquicos para usar en el selector
  const questionNumberMap = useMemo(
    () => calculateQuestionNumbers(allQuestions),
    [allQuestions]
  );

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

  // Nueva función para actualizar showCondition (formato nuevo)
  const updateShowCondition = (
    parentQuestionId,
    requiredValue,
    operator = "equals"
  ) => {
    setQuestion((prev) => ({
      ...prev,
      showCondition: parentQuestionId
        ? {
            parentQuestionId,
            requiredValue,
            operator,
            logicType: "AND",
          }
        : null,
    }));
  };

  // Función para obtener las opciones de una pregunta específica
  const getQuestionOptions = (questionId) => {
    const question = allQuestions.find((q) => q.id === questionId);
    return question?.options || [];
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
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {question.options.map((option, index) => (
                <div
                  key={option.id}
                  className="flex flex-col border border-[var(--border)] p-2 rounded-md"
                >
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 p-1.5 border rounded-md"
                      placeholder={`Opción ${index + 1}`}
                    />
                    <button
                      onClick={() => deleteOption(index)}
                      className="p-1 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
      case QUESTION_TYPES.RATING:
        return (
          <div className="flex justify-evenly">
            <div>
              <label
                htmlFor="rateMin"
                className="block text-sm font-medium mb-1"
              >
                Valor mínimo de la escala
              </label>
              <input
                type="number"
                id="rateMin"
                value={question.rateMin}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  // Ensure value is non-negative and less than current max
                  if (!isNaN(value) && value >= 0 && value < question.rateMax) {
                    setQuestion((prev) => ({ ...prev, rateMin: value }));
                  }
                }}
                max={question.rateMax - 1} // Max is one less than current rateMax
                className="p-2 border rounded-md w-24"
              />
            </div>
            <div>
              <label
                htmlFor="rateMax"
                className="block text-sm font-medium mb-1"
              >
                Valor máximo de la escala
              </label>
              <input
                type="number"
                id="rateMax"
                value={question.rateMax}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  // Ensure value is greater than current min
                  if (!isNaN(value) && value > question.rateMin) {
                    setQuestion((prev) => ({ ...prev, rateMax: value }));
                  }
                }}
                min={question.rateMin + 1} // Min is one more than current rateMin
                className="p-2 border rounded-md w-24"
              />
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

    // Ensure variable is set, generate default if needed
    let finalVariable = question.variable.trim();
    const questionId = question.id || generateUniqueId(); // Ensure ID exists

    if (!finalVariable) {
      finalVariable =
        generateVariableName(question.title) ||
        `p_${questionId.substring(0, 8)}`;
      if (!finalVariable) {
        // Fallback if title generation also failed
        finalVariable = `p_${questionId.substring(0, 8)}`;
      }
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

    // Validaciones para preguntas condicionales
    if (question.isConditional) {
      if (!question.showCondition || !question.showCondition.parentQuestionId) {
        if (onValidationError) {
          onValidationError(
            "Las preguntas condicionales requieren especificar una pregunta padre."
          );
        } else {
          alert(
            "Las preguntas condicionales requieren especificar una pregunta padre."
          );
        }
        return;
      }

      if (!question.showCondition.requiredValue) {
        if (onValidationError) {
          onValidationError(
            "Las preguntas condicionales requieren especificar un valor de condición."
          );
        } else {
          alert(
            "Las preguntas condicionales requieren especificar un valor de condición."
          );
        }
        return;
      }
    }

    // Preparar datos para guardar
    let questionToSave = {
      ...question,
      id: questionId, // Use the ensured ID
      variable: finalVariable, // Use the ensured variable
    };

    // Si no es condicional, limpiar showCondition
    if (!questionToSave.isConditional) {
      questionToSave.showCondition = null;
    }

    // Guardar la pregunta
    onSave(questionToSave);

    // Reiniciar el estado a valores predeterminados vacíos
    setQuestion(getInitialState(null));
  };

  // Función para reiniciar el estado al cerrar el modal
  const handleClose = () => {
    // Reiniciamos explícitamente al estado inicial antes de cerrar
    setQuestion(getInitialState(null));
    onClose();
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
              {/* Title */}
              <div>
                <label
                  htmlFor="question-title"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Título de la pregunta
                </label>
                <input
                  id="question-title"
                  type="text"
                  placeholder="Escribe el título de la pregunta"
                  value={question.title}
                  onChange={(e) =>
                    setQuestion((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Variable Input */}
              <div>
                <label
                  htmlFor="question-variable"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Variable (identificador único)
                </label>
                <input
                  id="question-variable"
                  type="text"
                  placeholder="Ej: p_imagen_candidato"
                  value={question.variable}
                  onChange={(e) =>
                    setQuestion((prev) => ({
                      ...prev,
                      variable: e.target.value,
                      variableManuallySet: true, // Mark as manually set
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se genera automáticamente del título, pero puedes editarlo.
                  Evita espacios y caracteres especiales.
                </p>
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
                {/* Conditional Question Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isConditional"
                    checked={question.isConditional || false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setQuestion((prev) => ({
                        ...prev,
                        isConditional: isChecked,
                        // Limpiar showCondition si se desmarca
                        showCondition: !isChecked ? null : prev.showCondition,
                      }));
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isConditional" className="text-sm">
                    Pregunta condicional
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

              {/* Description */}
              <div>
                <label
                  htmlFor="question-description"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Descripción de la pregunta
                </label>
                <textarea
                  id="question-description"
                  placeholder={DESCRIPTION_PLACEHOLDERS[question.type]}
                  value={question.description}
                  onChange={(e) =>
                    setQuestion((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                />
              </div>

              {/* Dynamic Question Options */}
              {renderQuestionOptions()}

              {/* Configurar condición de visualización */}
              {question.isConditional && (
                <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
                  <h4 className="text-sm font-medium text-green-800 mb-2">
                    🔥 Configurar condición de visualización
                  </h4>
                  <p className="text-xs text-green-600 mb-3">
                    Esta pregunta se mostrará solo cuando se cumpla la condición
                    especificada.
                  </p>

                  <div className="space-y-3">
                    {/* Selector de pregunta padre */}
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Mostrar esta pregunta cuando:
                      </label>
                      <select
                        value={question.showCondition?.parentQuestionId || ""}
                        onChange={(e) => {
                          const parentId = e.target.value;
                          if (parentId) {
                            // Limpiar valor requerido cuando cambia la pregunta padre
                            updateShowCondition(parentId, "", "equals");
                          } else {
                            updateShowCondition(null, "", "equals");
                          }
                        }}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        <option value="">- Seleccionar pregunta padre -</option>
                        {allQuestions
                          .filter(
                            (q) =>
                              q.id !== question.id &&
                              (!initialData || q.id !== initialData.id) &&
                              // Solo mostrar preguntas con opciones
                              q.options &&
                              q.options.length > 0
                          )
                          .map((q) => (
                            <option key={q.id} value={q.id}>
                              {`${questionNumberMap[q.id] || "?"}. ${
                                q.title || "Pregunta sin título"
                              }`}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Selector de valor requerido */}
                    {question.showCondition?.parentQuestionId && (
                      <div>
                        <label className="block text-xs font-medium text-green-700 mb-1">
                          Sea igual a:
                        </label>
                        <select
                          value={question.showCondition?.requiredValue || ""}
                          onChange={(e) => {
                            const parentQuestion = allQuestions.find(
                              (q) =>
                                q.id === question.showCondition.parentQuestionId
                            );
                            const operator =
                              parentQuestion?.type === "multiple_choice"
                                ? "contains"
                                : "equals";
                            updateShowCondition(
                              question.showCondition.parentQuestionId,
                              e.target.value,
                              operator
                            );
                          }}
                          className="w-full p-2 border rounded-md text-sm"
                        >
                          <option value="">- Seleccionar valor -</option>
                          {getQuestionOptions(
                            question.showCondition.parentQuestionId
                          ).map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.text || "Opción sin texto"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Mostrar resumen de la condición */}
                    {question.showCondition?.parentQuestionId &&
                      question.showCondition?.requiredValue && (
                        <div className="p-2 bg-white rounded border border-green-300">
                          <p className="text-xs text-green-800">
                            <span className="font-medium">Condición:</span> Se
                            mostrará cuando "
                            {allQuestions.find(
                              (q) =>
                                q.id === question.showCondition.parentQuestionId
                            )?.title || "Pregunta padre"}
                            "
                            {question.showCondition.operator === "contains"
                              ? " contenga "
                              : " sea igual a "}
                            "
                            {getQuestionOptions(
                              question.showCondition.parentQuestionId
                            ).find(
                              (opt) =>
                                opt.id === question.showCondition.requiredValue
                            )?.text || question.showCondition.requiredValue}
                            "
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={handleClose} className="btn-action">
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
