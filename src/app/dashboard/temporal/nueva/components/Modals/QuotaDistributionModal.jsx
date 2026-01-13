"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronDown, User, Loader2, Scale } from "lucide-react";

const IconRenderer = ({ iconName, size = 18, className = "" }) => {
  const icons = {
    User,
  };
  const Icon = icons[iconName] || User;
  return <Icon size={size} className={className} />;
};

export default function QuotaDistributionModal({
  open,
  onClose,
  encuestadores = [],
  categorias = [],
  metaTotal = 0,
  initialDistribution = null,
  onSave,
}) {
  const [expandedEncuestadores, setExpandedEncuestadores] = useState({});
  const [cuotasPorEncuestador, setCuotasPorEncuestador] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  // Estado para controlar qué categorías están visibles
  const [visibleCategories, setVisibleCategories] = useState({});

  // Estructura de datos correcta:
  // cuotasPorEncuestador[pollsterId] = {
  //   totalCases: number,
  //   quotas: [{
  //     category: string,
  //     segments: [{ name: string, target: number }]
  //   }]
  // }

  // Inicializar visibilidad de categorías (todas visibles por defecto)
  useEffect(() => {
    if (open && categorias.length > 0) {
      const initialVisible = {};
      categorias.forEach((cat) => {
        initialVisible[cat.nombre] = true;
      });
      setVisibleCategories(initialVisible);
    }
  }, [open, categorias]);

  // Inicializar distribución
  useEffect(() => {
    if (open && encuestadores.length > 0 && categorias.length > 0) {
      if (initialDistribution?.quotaAssignments) {
        // Cargar distribución existente
        const cuotasData = {};

        initialDistribution.quotaAssignments.forEach((assignment) => {
          // Calcular total de casos para este pollster
          let totalCases = 0;

          if (assignment.quotas && Array.isArray(assignment.quotas)) {
            // Formato correcto - usar directamente
            assignment.quotas.forEach((quota) => {
              quota.segments.forEach((segment) => {
                totalCases += segment.target || 0;
              });
            });

            cuotasData[assignment.pollsterId] = {
              totalCases,
              quotas: assignment.quotas,
            };
          } else if (assignment.matrix) {
            // Formato viejo (matriz) - necesitamos convertir
            console.warn(
              "⚠️ Detectado formato antiguo de matriz, convirtiendo..."
            );
            // Por ahora, reinicializar
            inicializarDistribucion();
            return;
          }
        });

        setCuotasPorEncuestador(cuotasData);

        // Expandir todos por defecto
        const allExpanded = {};
        encuestadores.forEach((enc) => {
          allExpanded[enc._id] = true;
        });
        setExpandedEncuestadores(allExpanded);
      } else {
        inicializarDistribucion();
      }
    }
  }, [open, encuestadores, categorias, metaTotal, initialDistribution]);

  const inicializarDistribucion = () => {
    // Distribución equitativa de casos totales
    const casosPorEncuestador = Math.floor(metaTotal / encuestadores.length);
    const resto = metaTotal % encuestadores.length;

    const newCuotas = {};

    encuestadores.forEach((enc, encIdx) => {
      const casosParaEsteEncuestador =
        casosPorEncuestador + (encIdx === 0 ? resto : 0);

      // ✅ CORRECCIÓN: Las categorías son independientes
      // Cada categoría debe distribuir el TOTAL de casos del encuestador
      // porque una misma respuesta puede cumplir múltiples cuotas
      // (ej: una mujer de 30 años cuenta para "Femenino" Y "30-54")
      
      const quotas = categorias.map((categoria) => {
        // Para esta categoría, distribuir equitativamente entre sus segmentos
        const casosPorSegmento = Math.floor(
          casosParaEsteEncuestador / categoria.segmentos.length
        );
        const restoSegmento = casosParaEsteEncuestador % categoria.segmentos.length;

        const segments = categoria.segmentos.map((segmento, segIdx) => ({
          name: segmento.nombre,
          target: casosPorSegmento + (segIdx === 0 ? restoSegmento : 0),
        }));

        return {
          category: categoria.nombre,
          segments,
        };
      });

      newCuotas[enc._id] = {
        totalCases: casosParaEsteEncuestador,
        quotas,
      };
    });

    setCuotasPorEncuestador(newCuotas);

    // Expandir todos por defecto
    const allExpanded = {};
    encuestadores.forEach((enc) => {
      allExpanded[enc._id] = true;
    });
    setExpandedEncuestadores(allExpanded);
  };

  const toggleExpandEncuestador = (encuestadorId) => {
    setExpandedEncuestadores((prev) => ({
      ...prev,
      [encuestadorId]: !prev[encuestadorId],
    }));
  };

  const updateSegmentTarget = (
    encuestadorId,
    categoryName,
    segmentName,
    newTarget
  ) => {
    setCuotasPorEncuestador((prev) => {
      const encData = prev[encuestadorId];
      if (!encData) return prev;

      const updatedQuotas = encData.quotas.map((quota) => {
        if (quota.category === categoryName) {
          return {
            ...quota,
            segments: quota.segments.map((seg) =>
              seg.name === segmentName
                ? { ...seg, target: Math.max(0, newTarget) }
                : seg
            ),
          };
        }
        return quota;
      });

      // Recalcular total
      let newTotal = 0;
      updatedQuotas.forEach((quota) => {
        quota.segments.forEach((seg) => {
          newTotal += seg.target;
        });
      });

      return {
        ...prev,
        [encuestadorId]: {
          totalCases: newTotal,
          quotas: updatedQuotas,
        },
      };
    });
  };

  const incrementSegmentTarget = (
    encuestadorId,
    categoryName,
    segmentName,
    delta
  ) => {
    const encData = cuotasPorEncuestador[encuestadorId];
    if (!encData) return;

    const quota = encData.quotas.find((q) => q.category === categoryName);
    if (!quota) return;

    const segment = quota.segments.find((s) => s.name === segmentName);
    if (!segment) return;

    updateSegmentTarget(
      encuestadorId,
      categoryName,
      segmentName,
      segment.target + delta
    );
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const pollsterAssignments = encuestadores.map((enc) => ({
        pollsterId: enc._id,
        assignedCases: cuotasPorEncuestador[enc._id]?.totalCases || 0,
      }));

      const quotaAssignments = encuestadores.map((enc) => ({
        pollsterId: enc._id,
        quotas: cuotasPorEncuestador[enc._id]?.quotas || [],
      }));

      await onSave({
        pollsterAssignments,
        quotaAssignments,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalAsignadoEncuestadores = Object.values(cuotasPorEncuestador).reduce(
    (sum, data) => sum + (data.totalCases || 0),
    0
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={() => !isSaving && onClose()}
    >
      <div
        className="bg-[var(--card-background)] rounded-t-2xl sm:rounded-xl w-full sm:max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col border-t sm:border border-[var(--card-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--card-border)] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate">
              Distribución por Encuestador
            </h2>
            {categorias.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {categorias.map((cat) => (
                  <label
                    key={cat.nombre}
                    className="flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCategories[cat.nombre] || false}
                      onChange={(e) =>
                        setVisibleCategories((prev) => ({
                          ...prev,
                          [cat.nombre]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-[var(--card-border)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
                    />
                    <span>{cat.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={inicializarDistribucion}
              disabled={isSaving}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg transition-colors font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Scale size={16} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">
                Distribuir equitativamente
              </span>
              <span className="sm:hidden">Distribuir</span>
            </button>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 sm:p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
          {encuestadores.map((enc) => {
            const isExpanded = expandedEncuestadores[enc._id];
            const encData = cuotasPorEncuestador[enc._id];
            const cuotaTotal = encData?.totalCases || 0;

            return (
              <div
                key={enc._id}
                className="mb-3 sm:mb-4 border border-[var(--card-border)] rounded-lg overflow-hidden bg-[var(--input-background)]"
              >
                {/* Header del encuestador */}
                <div
                  className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 transition-colors ${
                    isSaving
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-[var(--hover-bg)]"
                  }`}
                  onClick={() => !isSaving && toggleExpandEncuestador(enc._id)}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                    {enc.fullName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 font-semibold text-sm sm:text-base text-[var(--text-primary)] truncate">
                    {enc.fullName}
                  </div>
                  <div className="font-bold text-sm sm:text-lg text-[var(--text-primary)] whitespace-nowrap">
                    {cuotaTotal} <span className="hidden sm:inline">casos</span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`sm:w-5 sm:h-5 text-[var(--text-secondary)] transition-transform flex-shrink-0 ${
                      isExpanded ? "" : "-rotate-90"
                    }`}
                  />
                </div>

                {/* Cuotas expandibles - Vista independiente por categoría */}
                {isExpanded && encData && (
                  <div className="px-2 sm:px-4 pb-4 pt-2 bg-[var(--card-background)] border-t border-[var(--card-border)]">
                    <div className="space-y-4">
                      {encData.quotas.filter(quota => visibleCategories[quota.category]).map((quota, quotaIdx) => {
                        const totalCategoria = quota.segments.reduce(
                          (sum, seg) => sum + seg.target,
                          0
                        );

                        return (
                          <div
                            key={quotaIdx}
                            className="bg-[var(--input-background)] rounded-lg p-3 border border-[var(--card-border)]"
                          >
                            {/* Título de la categoría */}
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                                {quota.category}
                              </h4>
                              <span className="text-xs font-medium text-[var(--text-secondary)]">
                                Total: {totalCategoria}
                              </span>
                            </div>

                            {/* Grid de segmentos */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {quota.segments.map((segment, segIdx) => {
                                const isComplete = segment.target > 0;

                                return (
                                  <div
                                    key={segIdx}
                                    className={`rounded-lg p-2 border transition-colors ${
                                      isComplete
                                        ? "bg-[var(--card-background)] border-[var(--primary)]/30"
                                        : "bg-[var(--card-background)] border-[var(--card-border)]"
                                    }`}
                                  >
                                    <div className="text-xs text-[var(--text-secondary)] mb-2 text-center line-clamp-1">
                                      {segment.name}
                                    </div>
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() =>
                                          incrementSegmentTarget(
                                            enc._id,
                                            quota.category,
                                            segment.name,
                                            -1
                                          )
                                        }
                                        disabled={
                                          isSaving || segment.target <= 0
                                        }
                                        className="w-7 h-7 flex items-center justify-center bg-[var(--input-background)] hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-500 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
                                      >
                                        −
                                      </button>
                                      <input
                                        type="number"
                                        value={segment.target}
                                        onChange={(e) =>
                                          updateSegmentTarget(
                                            enc._id,
                                            quota.category,
                                            segment.name,
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        disabled={isSaving}
                                        className="w-12 h-7 text-center bg-[var(--background)] border border-[var(--card-border)] rounded text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <button
                                        onClick={() =>
                                          incrementSegmentTarget(
                                            enc._id,
                                            quota.category,
                                            segment.name,
                                            1
                                          )
                                        }
                                        disabled={isSaving}
                                        className="w-7 h-7 flex items-center justify-center bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--card-border)] bg-[var(--input-background)] flex-shrink-0">
          <div
            className={`flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-3 ${
              totalAsignadoEncuestadores === metaTotal
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-orange-500/10 border border-orange-500/30"
            }`}
          >
            <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
              ✓ Total asignado
            </span>
            <span
              className={`text-sm sm:text-lg font-bold ${
                totalAsignadoEncuestadores === metaTotal
                  ? "text-green-600 dark:text-green-400"
                  : "text-orange-600 dark:text-orange-400"
              }`}
            >
              {totalAsignadoEncuestadores} / {metaTotal}
            </span>
          </div>

          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 sm:py-2.5 bg-[var(--card-background)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-lg transition-colors font-medium text-sm sm:text-base border border-[var(--card-border)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 sm:py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg transition-colors font-medium text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar</span>
                  <span className="hidden sm:inline">✓</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
