"use client";

import { useState } from "react";

/**
 * Componente que genera automáticamente preguntas basadas en las cuotas definidas
 * Estas preguntas se muestran antes de iniciar la encuesta principal
 */
export function QuotaQuestions({ quotas = [], onComplete }) {
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");

  // Si no hay cuotas definidas, simplemente continuar
  if (!quotas || quotas.length === 0) {
    return (
      <div className="text-center p-8">
        <button
          onClick={() => onComplete({})}
          className="btn-primary px-6 py-2"
        >
          Comenzar Encuesta
        </button>
      </div>
    );
  }

  const handleOptionSelect = (categoryName, value) => {
    setAnswers((prev) => ({
      ...prev,
      [categoryName]: value,
    }));
  };

  const handleNext = () => {
    // Verificar que se haya respondido la pregunta actual
    const currentCategory = quotas[currentStep].category;
    if (!answers[currentCategory]) {
      setError(`Por favor seleccione una opción para ${currentCategory}`);
      return;
    }

    setError("");

    // Si es la última pregunta, completar
    if (currentStep === quotas.length - 1) {
      onComplete(answers);
    } else {
      // Avanzar a la siguiente pregunta
      setCurrentStep((prevStep) => prevStep + 1);
    }
  };

  // Obtener la categoría actual
  const currentQuota = quotas[currentStep];

  return (
    <div className="bg-background p-6 rounded-lg shadow-sm max-w-md mx-auto my-8">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold mb-2">
          Información de Clasificación
        </h2>
        <p className="text-text-secondary text-sm">
          Por favor responda las siguientes preguntas para comenzar la encuesta
        </p>
      </div>

      {/* Indicador de progreso */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">
            Pregunta {currentStep + 1} de {quotas.length}
          </span>
          <span className="text-sm font-medium">
            {Math.round(((currentStep + 1) / quotas.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-card-background rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full"
            style={{
              width: `${((currentStep + 1) / quotas.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Pregunta actual */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">{currentQuota.category}</h3>

        <div className="space-y-3">
          {currentQuota.segments.map((segment) => (
            <div
              key={segment.name}
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                answers[currentQuota.category] === segment.name
                  ? "border-primary bg-hover-bg"
                  : "border-card-border hover:border-primary"
              }`}
              onClick={() =>
                handleOptionSelect(currentQuota.category, segment.name)
              }
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                    answers[currentQuota.category] === segment.name
                      ? "border-primary"
                      : "border-card-border"
                  }`}
                >
                  {answers[currentQuota.category] === segment.name && (
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                  )}
                </div>
                <span>{segment.name}</span>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Botones de navegación */}
      <div className="flex justify-between">
        {currentStep > 0 ? (
          <button
            onClick={() => setCurrentStep((prev) => prev - 1)}
            className="px-4 py-2 border border-card-border rounded-md text-text-secondary hover:bg-hover-bg transition-colors"
          >
            Anterior
          </button>
        ) : (
          <div></div> // Espacio vacío para mantener el justify-between
        )}

        <button onClick={handleNext} className="btn-primary px-6 py-2">
          {currentStep === quotas.length - 1
            ? "Comenzar Encuesta"
            : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
