"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export function QuotaIdentifier({
  survey,
  formData,
  onSubmit,
  onContinue,
  quotas = [],
}) {
  const [identifiedSegments, setIdentifiedSegments] = useState([]);
  const [notAvailableSegments, setNotAvailableSegments] = useState([]);

  useEffect(() => {
    // Si no hay cuotas, continuar normalmente
    if (!quotas || quotas.length === 0) {
      return;
    }

    // Analizar respuestas para identificar segmentos
    const segments = [];
    const unavailable = [];

    quotas.forEach((quota) => {
      const category = quota.category.toLowerCase();
      let foundMatch = false;

      // Buscar la pregunta correspondiente a esta categoría
      Object.keys(formData).forEach((key) => {
        const keyLower = key.toLowerCase();
        if (
          keyLower.includes(category) ||
          (category === "género" && keyLower.includes("genero")) ||
          (category === "genero" && keyLower.includes("género")) ||
          (category === "educacion" && keyLower.includes("educación")) ||
          (category === "educación" && keyLower.includes("educacion"))
        ) {
          const answer = formData[key];

          // Buscar el segmento correspondiente
          const matchedSegment = quota.segments.find(
            (segment) =>
              segment.name.toLowerCase() === answer.toLowerCase() ||
              answer.toLowerCase().includes(segment.name.toLowerCase())
          );

          if (matchedSegment) {
            foundMatch = true;
            segments.push({
              category: quota.category,
              segment: matchedSegment.name,
              available: matchedSegment.current < matchedSegment.target,
            });

            // Verificar si este segmento tiene cuota disponible
            if (matchedSegment.current >= matchedSegment.target) {
              unavailable.push({
                category: quota.category,
                segment: matchedSegment.name,
              });
            }
          }
        }
      });

      // Si no se encontró ninguna coincidencia para esta categoría
      if (!foundMatch) {
        segments.push({
          category: quota.category,
          segment: "No identificado",
          available: true,
        });
      }
    });

    setIdentifiedSegments(segments);
    setNotAvailableSegments(unavailable);
  }, [formData, quotas]);

  const handleSubmit = () => {
    // Si hay segmentos no disponibles, mostrar mensaje
    if (notAvailableSegments.length > 0) {
      // Mostrar alerta o mensaje
      return;
    }

    // Si todo está bien, continuar con el envío
    onSubmit();
  };

  const handleContinue = () => {
    onContinue();
  };

  // Si no hay cuotas, continuar normalmente
  if (!quotas || quotas.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Verificación de Cuotas</h2>

      <div className="mb-6">
        <p className="text-gray-600 mb-3">
          Información identificada en la encuesta:
        </p>

        <ul className="space-y-2">
          {identifiedSegments.map((item, index) => (
            <li
              key={index}
              className={`flex justify-between px-3 py-2 rounded-md ${
                item.available
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <span>{item.category}:</span>
              <span className="font-medium">{item.segment}</span>
            </li>
          ))}
        </ul>
      </div>

      {notAvailableSegments.length > 0 ? (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <AlertTriangle
              className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0"
              size={18}
            />
            <div>
              <p className="text-yellow-700 font-medium">Cuota completada</p>
              <p className="text-yellow-600 text-sm">
                No es posible continuar porque ya se ha alcanzado la cuota para:
              </p>
              <ul className="text-yellow-600 text-sm mt-1 list-disc list-inside">
                {notAvailableSegments.map((item, index) => (
                  <li key={index}>
                    {item.category}: {item.segment}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-between">
        <button
          onClick={handleContinue}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Atrás
        </button>

        <button
          onClick={handleSubmit}
          disabled={notAvailableSegments.length > 0}
          className={`px-4 py-2 bg-blue-600 text-white rounded-md ${
            notAvailableSegments.length > 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-700"
          }`}
        >
          Enviar respuesta
        </button>
      </div>
    </div>
  );
}
