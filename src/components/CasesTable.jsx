"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef(null);

  // Filtrar las respuestas según los filtros aplicados en el mapa
  const filteredAnswers = useMemo(() => {
    return answers.filter((answer) => {
      if (mostrarTodos) return true;
      return selectedUsers.includes(answer.userId);
    });
  }, [answers, mostrarTodos, selectedUsers]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + 20, filteredAnswers.length)
          );
        }
      });
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredAnswers.length]);

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

  // Mobile: render as cards with infinite scroll
  return (
    <div className="mt-6 bg-[var(--card-background)] rounded-lg shadow-lg p-4 md:p-6">
      <h3 className="text-xl font-semibold mb-4">Casos registrados</h3>
      <div className="grid grid-cols-1 gap-3">
        {filteredAnswers.slice(0, visibleCount).map((answer) => (
          <div
            key={answer._id}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card-background)] p-4 active:scale-[0.995] transition transform"
            onClick={() => handleToggleRow(answer._id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {formatDate(answer.createdAt)}
                </div>
                <div className="text-base font-medium text-[var(--text-primary)]">
                  {answer.fullName || `Encuestador ${answer.userId}`}
                </div>
              </div>
              <div className="text-[var(--text-secondary)]">
                {expandedRows[answer._id] ? (
                  <ChevronDownIcon className="h-5 w-5" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5" />
                )}
              </div>
            </div>
            {/* Resumen clave */}
            <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
              {keyQuestions.map((q) => (
                <div key={q.name} className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">
                    {q.title}
                  </span>
                  <span className="text-[var(--text-primary)] ml-2">
                    {answer.answer && answer.answer[q.name]
                      ? getReadableAnswer(survey, q.name, answer.answer[q.name])
                      : "-"}
                  </span>
                </div>
              ))}
            </div>
            {/* Expandable details */}
            {expandedRows[answer._id] && (
              <div className="mt-3 pt-3 border-t border-[var(--card-border)] text-sm">
                {!answer.answer || Object.keys(answer.answer).length === 0 ? (
                  <div className="text-center text-[var(--text-secondary)] py-2">
                    No hay respuestas detalladas disponibles para este caso.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(answer.answer).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-start justify-between"
                      >
                        <span className="text-[var(--text-secondary)]">
                          {survey?.pages?.[0]?.elements?.find(
                            (q) => q.name === key
                          )?.title?.es || key}
                          :
                        </span>
                        <span className="text-[var(--text-primary)] ml-2">
                          {getReadableAnswer(survey, key, value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="h-6" />
    </div>
  );
};

export default CasesTable;
