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
      const sc = targetQuestion.showCondition;
      // Soportar formato nuevo (rules) y antiguo
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

      // Formato nuevo por defecto
      showCondition: { logic: "or", rules: [] },
      // Camino: hereda visibilidad de otra pregunta
      pathSourceQuestionId: "",
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
        // Normalizar a formato nuevo { logic, rules }
        const sc = data.showCondition;
        if (Array.isArray(sc.rules)) {
          initialState.showCondition = {
            logic: (sc.logic || "or").toLowerCase() === "and" ? "and" : "or",
            rules: sc.rules.map((r) => ({
              parentQuestionId: r.parentQuestionId,
              operator: r.operator || "equals",
              values: Array.isArray(r.values) ? r.values : [r.values],
            })),
          };
        } else if (sc.parentQuestionId) {
          initialState.showCondition = {
            logic: "or",
            rules: [
              {
                parentQuestionId: sc.parentQuestionId,
                operator: sc.operator || "equals",
                values:
                  sc.requiredValue !== undefined &&
                  sc.requiredValue !== null &&
                  sc.requiredValue !== ""
                    ? [sc.requiredValue]
                    : [],
              },
            ],
          };
        } else {
          initialState.showCondition = { logic: "or", rules: [] };
        }
        // Camino
        if (typeof data.pathSourceQuestionId === "string") {
          initialState.pathSourceQuestionId = data.pathSourceQuestionId;
        }
      } else {
        initialState.isConditional = false;
        initialState.showCondition = { logic: "or", rules: [] };
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

  // Helpers para manejar reglas de showCondition (formato nuevo)
  const ensureAtLeastOneRule = () => {
    setQuestion((prev) => {
      const sc = prev.showCondition || { logic: "or", rules: [] };
      if (!Array.isArray(sc.rules) || sc.rules.length === 0) {
        return {
          ...prev,
          showCondition: {
            logic: sc.logic || "or",
            rules: [{ parentQuestionId: "", operator: "equals", values: [] }],
          },
        };
      }
      return prev;
    });
  };

  const setGroupLogic = (logic) => {
    setQuestion((prev) => ({
      ...prev,
      showCondition: {
        ...(prev.showCondition || { rules: [] }),
        logic: logic === "and" ? "and" : "or",
      },
    }));
  };

  const addRule = () => {
    setQuestion((prev) => ({
      ...prev,
      isConditional: true,
      showCondition: {
        ...(prev.showCondition || { logic: "or", rules: [] }),
        rules: [
          ...((prev.showCondition && prev.showCondition.rules) || []),
          { parentQuestionId: "", operator: "equals", values: [] },
        ],
      },
    }));
  };

  const removeRule = (index) => {
    setQuestion((prev) => {
      const rules = (
        (prev.showCondition && prev.showCondition.rules) ||
        []
      ).filter((_, i) => i !== index);
      return {
        ...prev,
        showCondition: { ...(prev.showCondition || { logic: "or" }), rules },
      };
    });
  };

  const updateRuleParent = (index, parentQuestionId) => {
    setQuestion((prev) => {
      const sc = prev.showCondition || { logic: "or", rules: [] };
      const rules = [...(sc.rules || [])];
      if (!rules[index])
        rules[index] = { parentQuestionId: "", operator: "equals", values: [] };
      // Determinar operador por defecto según el tipo de la pregunta padre
      const parentQuestion = allQuestions.find(
        (q) => q.id === parentQuestionId
      );
      const isMultiple =
        parentQuestion?.type === QUESTION_TYPES.MULTIPLE_CHOICE ||
        parentQuestion?.type === QUESTION_TYPES.CHECKBOX;
      // Si no se ha seleccionado aún un operador o venía con el por defecto, setearlo acorde
      const defaultOperator = isMultiple ? "contains" : "equals";
      rules[index] = {
        ...rules[index],
        parentQuestionId,
        operator: defaultOperator,
        values: [],
      };
      return { ...prev, showCondition: { ...sc, rules } };
    });
  };

  const updateRuleOperator = (index, operator) => {
    setQuestion((prev) => {
      const sc = prev.showCondition || { logic: "or", rules: [] };
      const rules = [...(sc.rules || [])];
      if (!rules[index])
        rules[index] = { parentQuestionId: "", operator: "equals", values: [] };
      rules[index] = { ...rules[index], operator: operator || "equals" };
      return { ...prev, showCondition: { ...sc, rules } };
    });
  };

  const updateRuleValues = (index, values) => {
    setQuestion((prev) => {
      const sc = prev.showCondition || { logic: "or", rules: [] };
      const rules = [...(sc.rules || [])];
      if (!rules[index])
        rules[index] = { parentQuestionId: "", operator: "equals", values: [] };
      rules[index] = {
        ...rules[index],
        values: Array.isArray(values) ? values : [values],
      };
      return { ...prev, showCondition: { ...sc, rules } };
    });
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

    // Validaciones para preguntas condicionales (formato nuevo)
    if (question.isConditional) {
      const sc = question.showCondition;
      if (!sc || !Array.isArray(sc.rules) || sc.rules.length === 0) {
        const msg = "Las preguntas condicionales requieren al menos una regla.";
        if (onValidationError) onValidationError(msg);
        else alert(msg);
        return;
      }

      // Validar cada regla
      for (let i = 0; i < sc.rules.length; i++) {
        const r = sc.rules[i] || {};
        const op = (r.operator || "equals").toLowerCase();
        if (!r.parentQuestionId) {
          const msg = `La regla #${i + 1} requiere seleccionar una pregunta.`;
          if (onValidationError) onValidationError(msg);
          else alert(msg);
          return;
        }
        if (op === "contains") {
          if (!Array.isArray(r.values) || r.values.length === 0) {
            const msg = `La regla #${
              i + 1
            } requiere seleccionar al menos un valor.`;
            if (onValidationError) onValidationError(msg);
            else alert(msg);
            return;
          }
        } else if (op === "equals") {
          const v = Array.isArray(r.values) ? r.values[0] : r.values;
          if (v === undefined || v === null || v === "") {
            const msg = `La regla #${i + 1} requiere un valor.`;
            if (onValidationError) onValidationError(msg);
            else alert(msg);
            return;
          }
        } else if (op === "gt" || op === "gte" || op === "lt" || op === "lte") {
          const v = Array.isArray(r.values) ? r.values[0] : r.values;
          if (v === undefined || v === null || v === "" || isNaN(Number(v))) {
            const msg = `La regla #${i + 1} requiere un umbral numérico.`;
            if (onValidationError) onValidationError(msg);
            else alert(msg);
            return;
          }
        }
      }
    }

    // Preparar datos para guardar
    let questionToSave = {
      ...question,
      id: questionId, // Use the ensured ID
      variable: finalVariable, // Use the ensured variable
    };

    // Normalizar reglas antes de guardar para evitar que queden con operador incorrecto
    if (questionToSave.isConditional && questionToSave.showCondition) {
      const sc = questionToSave.showCondition || { logic: "or", rules: [] };
      const normalizedRules = (sc.rules || []).map((r) => {
        if (!r) return r;
        const parentQuestion = allQuestions.find(
          (q) => q.id === r.parentQuestionId
        );
        const isMultiple =
          parentQuestion?.type === QUESTION_TYPES.MULTIPLE_CHOICE ||
          parentQuestion?.type === QUESTION_TYPES.CHECKBOX;
        const isNumericType =
          parentQuestion?.type === QUESTION_TYPES.NUMBER ||
          parentQuestion?.type === QUESTION_TYPES.RATING;
        const numericOps = ["gt", "gte", "lt", "lte"];

        let op = (r.operator || "").toLowerCase();
        // Si el operador numérico no es válido para el padre, ajustar
        if (numericOps.includes(op) && !isNumericType) {
          op = isMultiple ? "contains" : "equals";
        }
        // Si no hay operador o quedó en "equals" para una múltiple, usar contains
        if (!op) op = isMultiple ? "contains" : "equals";
        if (isMultiple && op === "equals") op = "contains";

        const values = Array.isArray(r.values)
          ? r.values
          : r.values !== undefined && r.values !== null && r.values !== ""
          ? [r.values]
          : [];

        return {
          parentQuestionId: r.parentQuestionId,
          operator: op,
          values,
        };
      });

      questionToSave.showCondition = {
        logic: (sc.logic || "or").toLowerCase() === "and" ? "and" : "or",
        rules: normalizedRules,
      };
    }

    // Asegurar consistencia: si hay reglas válidas, marcar como condicional automáticamente
    const hasValidRules = (() => {
      const sc = questionToSave.showCondition;
      if (!sc) return false;
      if (Array.isArray(sc.rules)) {
        return sc.rules.some(
          (r) =>
            r &&
            r.parentQuestionId &&
            ((Array.isArray(r.values) && r.values.length > 0) ||
              r.values !== undefined)
        );
      }
      return Boolean(sc.parentQuestionId);
    })();

    const finalIsConditional = questionToSave.isConditional || hasValidRules;
    questionToSave.isConditional = finalIsConditional;
    if (!finalIsConditional) {
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
          <div className="p-6 space-y-4 bg-[var(--background)] ">
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
                        // Inicializar reglas cuando se activa; limpiar al desactivar
                        showCondition: !isChecked
                          ? { logic: "or", rules: [] }
                          : prev.showCondition &&
                            Array.isArray(prev.showCondition.rules)
                          ? prev.showCondition
                          : {
                              logic: "or",
                              rules: [
                                {
                                  parentQuestionId: "",
                                  operator: "equals",
                                  values: [],
                                },
                              ],
                            },
                      }));
                      if (isChecked) {
                        ensureAtLeastOneRule();
                      }
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
                <div className="card mt-4 p-4 rounded-md">
                  <p className="text-xs text-primary mb-3">
                    Esta pregunta se mostrará solo cuando se cumpla la condición
                    especificada.
                  </p>

                  <div className="space-y-4">
                    {/* Lógica de grupo AND/OR */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-primary">
                        Mostrar si se cumplen
                      </span>
                      <select
                        value={(
                          question.showCondition?.logic || "or"
                        ).toLowerCase()}
                        onChange={(e) => setGroupLogic(e.target.value)}
                        className="p-1.5 border rounded-md text-xs"
                      >
                        <option value="and">todas (AND)</option>
                        <option value="or">cualquiera (OR)</option>
                      </select>
                    </div>

                    {/* Reglas */}
                    <div className="space-y-3">
                      {(question.showCondition?.rules || []).map(
                        (rule, idx) => {
                          const parentQuestion = allQuestions.find(
                            (q) => q.id === rule.parentQuestionId
                          );
                          const hasOptions =
                            Array.isArray(parentQuestion?.options) &&
                            parentQuestion.options.length > 0;
                          const areOptionsNumeric = hasOptions
                            ? parentQuestion.options.every(
                                (o) =>
                                  o &&
                                  o.text !== undefined &&
                                  o.text !== null &&
                                  String(o.text).trim() !== "" &&
                                  !isNaN(Number(o.text))
                              )
                            : false;
                          const isMultiple =
                            parentQuestion?.type ===
                              QUESTION_TYPES.MULTIPLE_CHOICE ||
                            parentQuestion?.type === QUESTION_TYPES.CHECKBOX;
                          const isNumericType =
                            parentQuestion?.type === QUESTION_TYPES.NUMBER ||
                            parentQuestion?.type === QUESTION_TYPES.RATING;
                          const numericOps = ["gt", "gte", "lt", "lte"];

                          const operator = (() => {
                            let op =
                              rule.operator ||
                              (hasOptions
                                ? isMultiple
                                  ? "contains"
                                  : "equals"
                                : "equals");
                            if (
                              numericOps.includes(op) &&
                              !(
                                isNumericType ||
                                (hasOptions && areOptionsNumeric)
                              )
                            ) {
                              op = isMultiple ? "contains" : "equals";
                            }
                            return op;
                          })();

                          return (
                            <div
                              key={idx}
                              className="card p-3 rounded space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-primary">
                                  Regla #{idx + 1}
                                </span>
                                <button
                                  onClick={() => removeRule(idx)}
                                  className="text-red-500 text-xs"
                                >
                                  Eliminar
                                </button>
                              </div>

                              {/* Pregunta padre */}
                              <div>
                                <label className="block text-xs font-medium text-primary mb-1">
                                  Pregunta
                                </label>
                                <select
                                  value={rule.parentQuestionId || ""}
                                  onChange={(e) =>
                                    updateRuleParent(idx, e.target.value)
                                  }
                                  className="w-full p-2 border rounded-md text-sm"
                                >
                                  <option value="">
                                    - Seleccionar pregunta -
                                  </option>
                                  {allQuestions
                                    .filter(
                                      (q) =>
                                        q.id !== question.id &&
                                        (!initialData ||
                                          q.id !== initialData.id)
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

                              {/* Operador */}
                              <div>
                                <label className="block text-xs font-medium text-primary mb-1">
                                  Operador
                                </label>
                                <select
                                  value={operator}
                                  onChange={(e) =>
                                    updateRuleOperator(idx, e.target.value)
                                  }
                                  className="w-full p-2 border rounded-md text-sm"
                                >
                                  {isMultiple && (
                                    <>
                                      <option value="contains">contiene</option>
                                      <option value="not_contains">
                                        no contiene
                                      </option>
                                      <option value="contains_all">
                                        contiene todos
                                      </option>
                                      <option value="exactly">
                                        exactamente estos
                                      </option>
                                    </>
                                  )}
                                  {!isMultiple && (
                                    <>
                                      <option value="equals">es igual a</option>
                                      <option value="not_equals">
                                        no es igual a
                                      </option>
                                    </>
                                  )}
                                  {(isNumericType ||
                                    (hasOptions && areOptionsNumeric)) && (
                                    <>
                                      <option value="gt">mayor que</option>
                                      <option value="gte">
                                        mayor o igual que
                                      </option>
                                      <option value="lt">menor que</option>
                                      <option value="lte">
                                        menor o igual que
                                      </option>
                                    </>
                                  )}
                                </select>
                              </div>

                              {/* Valores */}
                              <div>
                                <label className="block text-xs font-medium text-primary mb-1">
                                  Valor/es
                                </label>
                                {hasOptions &&
                                  (operator === "contains" ||
                                    operator === "not_contains" ||
                                    operator === "contains_all" ||
                                    operator === "exactly") && (
                                    <div className="card p-3">
                                      <div className="flex gap-2 mb-2 text-xs">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateRuleValues(
                                              idx,
                                              getQuestionOptions(
                                                rule.parentQuestionId
                                              ).map((o) => String(o.id))
                                            )
                                          }
                                          className="btn-action px-2 py-1 border rounded"
                                        >
                                          Seleccionar todas
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateRuleValues(idx, [])
                                          }
                                          className="btn-action px-2 py-1 border rounded"
                                        >
                                          Ninguna
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const opts = getQuestionOptions(
                                              rule.parentQuestionId
                                            ).map((o) => String(o.id));
                                            const current = new Set(
                                              (rule.values || []).map(String)
                                            );
                                            const inverted = opts.filter(
                                              (id) => !current.has(id)
                                            );
                                            updateRuleValues(idx, inverted);
                                          }}
                                          className="btn-action px-2 py-1 border rounded"
                                        >
                                          Invertir
                                        </button>
                                      </div>
                                      <div className="max-h-40 overflow-y-auto space-y-1">
                                        {getQuestionOptions(
                                          rule.parentQuestionId
                                        ).map((opt) => {
                                          const checked = (rule.values || [])
                                            .map(String)
                                            .includes(String(opt.id));
                                          return (
                                            <label
                                              key={opt.id}
                                              className="interactive-element rounded px-2 py-1 flex items-center gap-2 text-sm"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                  const current = new Set(
                                                    (rule.values || []).map(
                                                      String
                                                    )
                                                  );
                                                  if (e.target.checked)
                                                    current.add(String(opt.id));
                                                  else
                                                    current.delete(
                                                      String(opt.id)
                                                    );
                                                  updateRuleValues(
                                                    idx,
                                                    Array.from(current)
                                                  );
                                                }}
                                              />
                                              <span>
                                                {opt.text || "Opción sin texto"}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                {hasOptions && operator === "equals" && (
                                  <select
                                    value={
                                      rule.values &&
                                      rule.values[0] !== undefined
                                        ? String(rule.values[0])
                                        : ""
                                    }
                                    onChange={(e) =>
                                      updateRuleValues(idx, e.target.value)
                                    }
                                    className="w-full p-2 border rounded-md text-sm"
                                  >
                                    <option value="">
                                      - Seleccionar valor -
                                    </option>
                                    {getQuestionOptions(
                                      rule.parentQuestionId
                                    ).map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.text || "Opción sin texto"}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {((hasOptions &&
                                  (operator === "gt" ||
                                    operator === "gte" ||
                                    operator === "lt" ||
                                    operator === "lte")) ||
                                  !hasOptions) && (
                                  <input
                                    type="number"
                                    value={
                                      rule.values &&
                                      rule.values[0] !== undefined
                                        ? rule.values[0]
                                        : ""
                                    }
                                    onChange={(e) =>
                                      updateRuleValues(idx, e.target.value)
                                    }
                                    className="w-full p-2 border rounded-md text-sm"
                                    placeholder={
                                      hasOptions
                                        ? "Ingrese umbral numérico (p. ej. 3)"
                                        : "Ingrese un número"
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                      <button
                        onClick={addRule}
                        className="link-action flex items-center gap-1 text-sm"
                      >
                        <Plus className="w-4 h-4" /> Agregar regla
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Configurar Camino (heredar visibilidad) */}
              <div className="mt-4 p-4 bg-[var(--card-background)] rounded-md border border-[var(--card-border)]">
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Camino: esta pregunta puede mostrarse solo cuando se ingresa a
                  un camino activado por otra pregunta. No depende de la
                  respuesta de esa pregunta, solo de haber entrado al camino.
                </p>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[var(--primary)]">
                    Seguir camino de la pregunta
                  </label>
                  <select
                    value={question.pathSourceQuestionId || ""}
                    onChange={(e) =>
                      setQuestion((prev) => ({
                        ...prev,
                        pathSourceQuestionId: e.target.value,
                      }))
                    }
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="">
                      - Sin camino (pregunta raíz o normal) -
                    </option>
                    {allQuestions
                      .filter((q) => q.id !== question.id)
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          {`${questionNumberMap[q.id] || "?"}. ${
                            q.title || "Pregunta sin título"
                          }`}
                        </option>
                      ))}
                  </select>
                  {question.pathSourceQuestionId && (
                    <p className="text-xs text-[var(--primary)]">
                      Esta pregunta seguirá el mismo camino que la pregunta
                      seleccionada y se mostrará a continuación.
                    </p>
                  )}
                </div>
              </div>
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
