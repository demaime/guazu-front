"use client";

import React, { useState, useMemo } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

// Función auxiliar para obtener la respuesta legible
const getReadableAnswer = (survey, questionKey, answerValue) => {
  if (!survey?.pages?.[0]?.elements) {
    return Array.isArray(answerValue)
      ? JSON.stringify(answerValue)
      : String(answerValue);
  }

  const question = survey.pages[0].elements.find((q) => q.name === questionKey);
  if (!question) {
    return Array.isArray(answerValue)
      ? JSON.stringify(answerValue)
      : String(answerValue);
  }

  // Manejar diferentes tipos de preguntas
  switch (question.type) {
    case "radiogroup":
    case "dropdown":
      const selectedChoice = question.choices?.find(
        (c) => c.value === answerValue
      );
      return selectedChoice?.text?.es || selectedChoice?.text || answerValue;
    case "checkbox":
      if (!Array.isArray(answerValue)) {
        return String(answerValue);
      }
      const selectedTexts = answerValue.map((val) => {
        const choice = question.choices?.find((c) => c.value === val);
        return choice?.text?.es || choice?.text || val;
      });
      return selectedTexts.join(", ");
    case "matrix":
      if (typeof answerValue === "object" && answerValue !== null) {
        return Object.entries(answerValue)
          .map(([rowValue, colValue]) => {
            const rowText =
              question.rows?.find((r) => r.value === rowValue)?.text?.es ||
              rowValue;
            const colText =
              question.columns?.find((c) => c.value === colValue)?.text?.es ||
              colValue;
            return `${rowText}: ${colText}`;
          })
          .join("; ");
      } else {
        return String(answerValue);
      }
    case "boolean":
      return answerValue
        ? question.labelTrue || "Sí"
        : question.labelFalse || "No";
    default:
      return String(answerValue);
  }
};

const CasesTable = ({
  survey,
  answers = [],
  mostrarTodos = true,
  selectedUsers = [],
}) => {
  const [expandedRows, setExpandedRows] = useState({});

  // Filtrar las respuestas según los filtros aplicados en el mapa
  const filteredAnswers = useMemo(() => {
    return answers.filter((answer) => {
      if (mostrarTodos) return true;
      return selectedUsers.includes(answer.userId);
    });
  }, [answers, mostrarTodos, selectedUsers]);

  // Identificar las preguntas importantes para mostrar en la tabla
  const keyQuestions = useMemo(() => {
    if (!survey?.pages?.[0]?.elements) return [];

    // Revisamos si hay respuestas para determinar qué campos son los más relevantes
    const firstAnswer = filteredAnswers[0]?.answer || {};
    const availableFields = Object.keys(firstAnswer);

    // Intenta encontrar preguntas relacionadas con ubicación, nombre, edad, etc.
    return survey.pages[0].elements
      .filter(
        (q) =>
          // Solo incluimos preguntas que tengan respuestas y priorizar por relevancia
          availableFields.includes(q.name) &&
          (q.name?.toLowerCase().includes("ubica") ||
            q.name?.toLowerCase().includes("direcc") ||
            q.name?.toLowerCase().includes("nombre") ||
            q.name?.toLowerCase().includes("edad") ||
            q.name?.toLowerCase().includes("sexo") ||
            q.name?.toLowerCase().includes("genero") ||
            q.name?.toLowerCase().includes("fecha") ||
            q.title?.es?.toLowerCase().includes("ubica") ||
            q.title?.es?.toLowerCase().includes("direcc") ||
            q.title?.es?.toLowerCase().includes("nombre") ||
            q.title?.es?.toLowerCase().includes("edad") ||
            q.title?.es?.toLowerCase().includes("sexo") ||
            q.title?.es?.toLowerCase().includes("genero") ||
            q.title?.es?.toLowerCase().includes("fecha") ||
            true) // Si no hay campos con esos términos, incluir todos los disponibles
      )
      .slice(0, 4) // Limitar a 4 preguntas clave para la vista de resumen
      .map((q) => ({
        name: q.name,
        title: q.title?.es || q.title || q.name,
      }));
  }, [survey, filteredAnswers]);

  const handleToggleRow = (answerId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [answerId]: !prev[answerId],
    }));
  };

  if (filteredAnswers.length === 0) {
    return (
      <div className="mt-6 bg-[var(--card-background)] rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Casos registrados</h3>
        <p className="text-center py-4 text-[var(--text-secondary)]">
          No hay casos para mostrar con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-[var(--card-background)] rounded-lg shadow-lg p-6 overflow-x-auto">
      <h3 className="text-xl font-semibold mb-4">Casos registrados</h3>
      <table className="min-w-full divide-y divide-[var(--card-border)]">
        <thead className="bg-[var(--card-background)]">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
            >
              Expandir
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
            >
              Encuestador
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
            >
              Fecha
            </th>
            {keyQuestions.map((q) => (
              <th
                key={q.name}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                {q.title}
              </th>
            ))}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
            >
              Ubicación
            </th>
          </tr>
        </thead>
        <tbody className="bg-[var(--card-background)] divide-y divide-[var(--card-border)]">
          {filteredAnswers.map((answer) => (
            <React.Fragment key={answer._id}>
              <tr
                className="hover:bg-[var(--hover-bg)] cursor-pointer"
                onClick={() => handleToggleRow(answer._id)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-[var(--text-secondary)]">
                    {expandedRows[answer._id] ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {answer.fullName || `Encuestador ${answer.userId}`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-[var(--text-secondary)]">
                    {formatDate(answer.createdAt)}
                  </div>
                </td>
                {keyQuestions.map((q) => (
                  <td key={q.name} className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--text-primary)]">
                      {answer.answer && answer.answer[q.name]
                        ? getReadableAnswer(
                            survey,
                            q.name,
                            answer.answer[q.name]
                          )
                        : "-"}
                    </div>
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-[var(--text-secondary)]">
                    {answer.lat && answer.lng
                      ? `${parseFloat(answer.lat).toFixed(6)}, ${parseFloat(
                          answer.lng
                        ).toFixed(6)}`
                      : "No disponible"}
                  </div>
                </td>
              </tr>
              {expandedRows[answer._id] && (
                <tr className="bg-[var(--hover-bg)]">
                  <td colSpan={keyQuestions.length + 4} className="px-6 py-4">
                    {!answer.answer ||
                    Object.keys(answer.answer).length === 0 ? (
                      <div className="text-center text-[var(--text-secondary)] py-4">
                        No hay respuestas detalladas disponibles para este caso.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(answer.answer).map(([key, value]) => (
                          <div key={key} className="mb-3">
                            <div className="font-medium text-[var(--text-secondary)]">
                              {survey?.pages?.[0]?.elements?.find(
                                (q) => q.name === key
                              )?.title?.es || key}
                              :
                            </div>
                            <div className="text-sm text-[var(--text-primary)] mt-1">
                              {getReadableAnswer(survey, key, value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CasesTable;
