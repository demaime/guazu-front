"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function QuotaProgress({ quotas = [] }) {
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (index) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Calcular el total de respuestas objetivo y actual por categoría
  const getCategoryTotals = (category) => {
    const targetTotal = category.segments.reduce(
      (sum, segment) => sum + segment.target,
      0
    );
    const currentTotal = category.segments.reduce(
      (sum, segment) => sum + segment.current,
      0
    );
    const percentage =
      targetTotal > 0 ? Math.round((currentTotal / targetTotal) * 100) : 0;

    return { targetTotal, currentTotal, percentage };
  };

  if (!quotas || quotas.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded text-center">
        <p className="text-gray-500">
          No hay cuotas definidas para esta encuesta
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium mb-2">Progreso de Cuotas</h3>

      {quotas.map((category, index) => {
        const { targetTotal, currentTotal, percentage } =
          getCategoryTotals(category);
        const isExpanded = !!expandedCategories[index];

        return (
          <div key={index} className="border rounded overflow-hidden">
            <div
              className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer"
              onClick={() => toggleCategory(index)}
            >
              <div>
                <h4 className="font-medium">{category.category}</h4>
                <div className="text-sm text-gray-500">
                  {currentTotal} de {targetTotal} respuestas ({percentage}%)
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-4">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Segmento</th>
                      <th className="text-center py-2">Actual</th>
                      <th className="text-center py-2">Objetivo</th>
                      <th className="text-center py-2">Diferencia</th>
                      <th className="text-right py-2">Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.segments.map((segment, segmentIndex) => {
                      const segmentPercentage =
                        segment.target > 0
                          ? Math.round((segment.current / segment.target) * 100)
                          : 0;
                      const remaining = segment.target - segment.current;

                      return (
                        <tr key={segmentIndex} className="border-b">
                          <td className="py-3">{segment.name}</td>
                          <td className="text-center py-3">
                            {segment.current}
                          </td>
                          <td className="text-center py-3">{segment.target}</td>
                          <td className="text-center py-3">
                            {remaining > 0 ? (
                              <span className="text-orange-600">Faltan: {remaining}</span>
                            ) : remaining < 0 ? (
                              <span className="text-green-600">Exceso: {Math.abs(remaining)}</span>
                            ) : (
                              <span className="text-green-600">Meta alcanzada</span>
                            )}
                          </td>
                          <td className="text-right py-3">
                            <div className="flex items-center justify-end">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`${
                                    segmentPercentage >= 100
                                      ? "bg-green-500"
                                      : "bg-blue-600"
                                  } h-2 rounded-full`}
                                  style={{
                                    width: `${Math.min(
                                      150,
                                      segmentPercentage
                                    )}%`, // Permitir hasta 150% visual
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm w-8">
                                {segmentPercentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
