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
  const [cuotasDetalladasPorEncuestador, setCuotasDetalladasPorEncuestador] =
    useState({});
  const [cuotasPorEncuestador, setCuotasPorEncuestador] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar distribución
  useEffect(() => {
    if (open && encuestadores.length > 0 && categorias.length > 0) {
      if (initialDistribution?.quotaAssignments) {
        const detalladas = {};
        const totales = {};

        initialDistribution.quotaAssignments.forEach((assignment) => {
          detalladas[assignment.pollsterId] = assignment.matrix;
          const total = assignment.matrix.data.reduce(
            (sum, row) => sum + row.reduce((rowSum, val) => rowSum + val, 0),
            0
          );
          totales[assignment.pollsterId] = total;
        });

        setCuotasDetalladasPorEncuestador(detalladas);
        setCuotasPorEncuestador(totales);

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
    const cuotaPorEncuestador = Math.floor(metaTotal / encuestadores.length);
    const resto = metaTotal % encuestadores.length;

    const newCuotasDetalladas = {};
    const newCuotasTotales = {};

    encuestadores.forEach((enc, idx) => {
      const cuotaTotal = cuotaPorEncuestador + (idx === 0 ? resto : 0);
      newCuotasTotales[enc._id] = cuotaTotal;

      if (categorias.length === 2) {
        // Distribución EQUITATIVA para 2 categorías
        const cat1 = categorias[0];
        const cat2 = categorias[1];

        // Calcular cuánto corresponde a cada celda equitativamente
        const totalCeldas = cat1.segmentos.length * cat2.segmentos.length;
        const valorPorCelda = Math.floor(cuotaTotal / totalCeldas);
        const restoCeldas = cuotaTotal % totalCeldas;

        let celdasAsignadas = 0;
        const matriz = cat1.segmentos.map(() =>
          cat2.segmentos.map(() => {
            const valor =
              valorPorCelda + (celdasAsignadas < restoCeldas ? 1 : 0);
            celdasAsignadas++;
            return valor;
          })
        );

        newCuotasDetalladas[enc._id] = { data: matriz };
      } else if (categorias.length === 1) {
        // Distribución EQUITATIVA para 1 categoría
        const cat = categorias[0];
        const totalSegmentos = cat.segmentos.length;
        const valorPorSegmento = Math.floor(cuotaTotal / totalSegmentos);
        const restoSegmentos = cuotaTotal % totalSegmentos;

        const distribucion = cat.segmentos.map(
          (seg, idx) => valorPorSegmento + (idx < restoSegmentos ? 1 : 0)
        );
        newCuotasDetalladas[enc._id] = { data: [distribucion] };
      }
    });

    setCuotasDetalladasPorEncuestador(newCuotasDetalladas);
    setCuotasPorEncuestador(newCuotasTotales);

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

  const updateCuotaMatriz = (encuestadorId, cat1Idx, cat2Idx, valor) => {
    setCuotasDetalladasPorEncuestador((prev) => {
      const newDetalladas = { ...prev };
      if (!newDetalladas[encuestadorId]) {
        newDetalladas[encuestadorId] = { data: [] };
      }
      const newMatriz = newDetalladas[encuestadorId].data.map((row, ri) =>
        row.map((val, ci) =>
          ri === cat1Idx && ci === cat2Idx ? Math.max(0, valor) : val
        )
      );
      newDetalladas[encuestadorId] = { data: newMatriz };
      return newDetalladas;
    });

    // Recalcular total del encuestador
    const updatedMatriz =
      cuotasDetalladasPorEncuestador[encuestadorId]?.data || [];
    const newMatriz = updatedMatriz.map((row, ri) =>
      row.map((val, ci) =>
        ri === cat1Idx && ci === cat2Idx ? Math.max(0, valor) : val
      )
    );
    const newTotal = newMatriz.reduce(
      (sum, row) => sum + row.reduce((rowSum, val) => rowSum + val, 0),
      0
    );

    setCuotasPorEncuestador((prev) => ({
      ...prev,
      [encuestadorId]: newTotal,
    }));
  };

  const incrementCuotaMatriz = (encuestadorId, cat1Idx, cat2Idx, delta) => {
    const currentValue =
      cuotasDetalladasPorEncuestador[encuestadorId]?.data[cat1Idx]?.[cat2Idx] ||
      0;
    updateCuotaMatriz(encuestadorId, cat1Idx, cat2Idx, currentValue + delta);
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevenir múltiples clicks

    setIsSaving(true);
    try {
      const pollsterAssignments = encuestadores.map((enc) => ({
        pollsterId: enc._id,
        quota: cuotasPorEncuestador[enc._id] || 0,
      }));

      const quotaAssignments = encuestadores.map((enc) => ({
        pollsterId: enc._id,
        matrix: cuotasDetalladasPorEncuestador[enc._id] || { data: [] },
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
    (sum, val) => sum + val,
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
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 truncate">
                {categorias.map((c) => c.nombre).join(" × ")}
              </p>
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
            const cuotasDetalladas = cuotasDetalladasPorEncuestador[enc._id];
            const cuotaTotal = cuotasPorEncuestador[enc._id] || 0;

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
                      .slice(0, 2)}
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

                {/* Matriz expandible */}
                {isExpanded && cuotasDetalladas && categorias.length === 2 && (
                  <div className="px-2 sm:px-4 pb-4 pt-2 bg-[var(--card-background)] border-t border-[var(--card-border)]">
                    {/* Vista MÓVIL - Matriz transpuesta */}
                    <div className="block sm:hidden">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="p-1"></th>
                            {categorias[0].segmentos.map((seg, idx) => (
                              <th key={idx} className="p-1">
                                <div className="flex flex-col items-center gap-1">
                                  <IconRenderer
                                    iconName={seg.icon || "User"}
                                    size={28}
                                    className="text-[var(--primary)]"
                                  />
                                  <span className="text-xs text-[var(--text-primary)] font-medium">
                                    {seg.nombre}
                                  </span>
                                </div>
                              </th>
                            ))}
                            <th className="p-1">
                              <div className="text-xs text-[var(--text-primary)] font-medium">
                                Total
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {categorias[1].segmentos.map((seg2, idx2) => {
                            const totalFila = cuotasDetalladas.data.reduce(
                              (sum, row) => sum + (row[idx2] || 0),
                              0
                            );
                            return (
                              <tr key={idx2}>
                                <td className="p-1">
                                  <div className="flex flex-col items-center gap-1">
                                    <IconRenderer
                                      iconName={seg2.icon || "User"}
                                      size={20}
                                      className="text-[var(--primary)]"
                                    />
                                    <span className="text-xs font-medium text-[var(--text-primary)] whitespace-nowrap">
                                      {seg2.nombre}
                                    </span>
                                  </div>
                                </td>
                                {categorias[0].segmentos.map((seg1, idx1) => {
                                  const valor =
                                    cuotasDetalladas.data[idx1]?.[idx2] || 0;
                                  const isActive = valor > 0;
                                  return (
                                    <td key={idx1} className="p-1">
                                      <div
                                        className={`rounded-xl border-2 p-2 transition-all ${
                                          isActive
                                            ? "bg-[var(--primary)]/10 border-[var(--primary)]/50"
                                            : "bg-[var(--card-background)] border-[var(--card-border)]"
                                        }`}
                                      >
                                        <div className="flex flex-col items-center gap-1.5">
                                          <div className="text-3xl font-bold text-[var(--text-primary)]">
                                            {valor}
                                          </div>
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() =>
                                                incrementCuotaMatriz(
                                                  enc._id,
                                                  idx1,
                                                  idx2,
                                                  -1
                                                )
                                              }
                                              disabled={valor === 0 || isSaving}
                                              className="w-11 h-11 bg-[var(--input-background)] hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg)] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-xl font-bold flex items-center justify-center transition-colors touch-manipulation border border-[var(--card-border)]"
                                            >
                                              −
                                            </button>
                                            <button
                                              onClick={() =>
                                                incrementCuotaMatriz(
                                                  enc._id,
                                                  idx1,
                                                  idx2,
                                                  1
                                                )
                                              }
                                              disabled={isSaving}
                                              className="w-11 h-11 bg-[var(--primary)] hover:bg-[var(--primary-dark)] active:bg-[var(--primary-dark)] text-white rounded-xl text-xl font-bold flex items-center justify-center transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="p-1">
                                  <div className="text-center font-mono font-bold text-[var(--primary)] text-xl">
                                    {totalFila}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t-2 border-[var(--card-border)]">
                            <td className="p-1">
                              <div className="text-xs font-medium text-[var(--text-primary)]">
                                Total
                              </div>
                            </td>
                            {categorias[0].segmentos.map((seg, idx) => {
                              const totalCol =
                                cuotasDetalladas.data[idx]?.reduce(
                                  (a, b) => a + b,
                                  0
                                ) || 0;
                              return (
                                <td key={idx} className="p-1 text-center">
                                  <div className="font-mono font-bold text-[var(--primary)] text-xl">
                                    {totalCol}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="p-1 text-center">
                              <div className="font-mono font-bold text-[var(--primary)] text-xl">
                                {cuotaTotal}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Vista DESKTOP - Matriz normal */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="p-2"></th>
                            {categorias[1].segmentos.map((seg, idx) => (
                              <th key={idx} className="p-2 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <IconRenderer
                                    iconName={seg.icon || "User"}
                                    size={24}
                                    className="text-[var(--primary)]"
                                  />
                                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                                    {seg.nombre}
                                  </span>
                                </div>
                              </th>
                            ))}
                            <th className="p-2 text-center">
                              <span className="text-sm font-semibold text-[var(--text-primary)]">
                                Total
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {categorias[0].segmentos.map((seg1, idx1) => {
                            const totalFila =
                              cuotasDetalladas.data[idx1]?.reduce(
                                (a, b) => a + b,
                                0
                              ) || 0;
                            return (
                              <tr key={idx1}>
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <IconRenderer
                                      iconName={seg1.icon || "User"}
                                      size={24}
                                      className="text-[var(--primary)]"
                                    />
                                    <span className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
                                      {seg1.nombre}
                                    </span>
                                  </div>
                                </td>
                                {categorias[1].segmentos.map((seg2, idx2) => {
                                  const valor =
                                    cuotasDetalladas.data[idx1]?.[idx2] || 0;
                                  const isActive = valor > 0;
                                  return (
                                    <td key={idx2} className="p-2">
                                      <div
                                        className={`rounded-xl p-3 border-2 transition-all ${
                                          isActive
                                            ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                                            : "bg-[var(--card-background)] border-[var(--card-border)]"
                                        }`}
                                      >
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="text-3xl font-bold text-[var(--text-primary)]">
                                            {valor}
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() =>
                                                incrementCuotaMatriz(
                                                  enc._id,
                                                  idx1,
                                                  idx2,
                                                  -1
                                                )
                                              }
                                              disabled={valor === 0 || isSaving}
                                              className="w-10 h-10 bg-[var(--input-background)] hover:bg-[var(--hover-bg)] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xl font-bold flex items-center justify-center transition-colors border border-[var(--card-border)]"
                                            >
                                              −
                                            </button>
                                            <button
                                              onClick={() =>
                                                incrementCuotaMatriz(
                                                  enc._id,
                                                  idx1,
                                                  idx2,
                                                  1
                                                )
                                              }
                                              disabled={isSaving}
                                              className="w-10 h-10 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-xl font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="p-2 text-center">
                                  <div className="text-2xl font-bold text-[var(--primary)]">
                                    {totalFila}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t-2 border-[var(--card-border)]">
                            <td className="p-2">
                              <span className="text-sm font-semibold text-[var(--text-primary)]">
                                Total
                              </span>
                            </td>
                            {categorias[1].segmentos.map((seg, idx) => {
                              const totalCol = cuotasDetalladas.data.reduce(
                                (sum, row) => sum + (row[idx] || 0),
                                0
                              );
                              return (
                                <td key={idx} className="p-2 text-center">
                                  <div className="text-2xl font-bold text-[var(--primary)]">
                                    {totalCol}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="p-2 text-center">
                              <div className="text-2xl font-bold text-[var(--primary)]">
                                {cuotaTotal}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Lista simple para 1 categoría */}
                {isExpanded && cuotasDetalladas && categorias.length === 1 && (
                  <div className="px-2 sm:px-4 pb-3 sm:pb-4 pt-2 space-y-2 bg-[var(--card-background)] border-t border-[var(--card-border)]">
                    {categorias[0].segmentos.map((seg, idx) => {
                      const valor = cuotasDetalladas.data[0]?.[idx] || 0;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 sm:p-3 rounded-lg border border-[var(--card-border)]"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <IconRenderer
                              iconName={seg.icon || "User"}
                              size={18}
                              className="text-[var(--primary)] flex-shrink-0 sm:w-5 sm:h-5"
                            />
                            <span className="font-medium text-sm sm:text-base text-[var(--text-primary)] truncate">
                              {seg.nombre}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <button
                              onClick={() => {
                                const newDist = [
                                  ...(cuotasDetalladas.data[0] || []),
                                ];
                                newDist[idx] = Math.max(0, valor - 1);
                                setCuotasDetalladasPorEncuestador((prev) => ({
                                  ...prev,
                                  [enc._id]: { data: [newDist] },
                                }));
                                setCuotasPorEncuestador((prev) => ({
                                  ...prev,
                                  [enc._id]: newDist.reduce((a, b) => a + b, 0),
                                }));
                              }}
                              disabled={valor === 0 || isSaving}
                              className="w-9 h-9 sm:w-10 sm:h-10 bg-[var(--input-background)] hover:bg-[var(--hover-bg)] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-lg sm:text-xl font-bold flex items-center justify-center border border-[var(--card-border)] touch-manipulation"
                            >
                              −
                            </button>
                            <div className="w-12 sm:w-16 text-center font-mono font-bold text-[var(--text-primary)] text-xl sm:text-2xl">
                              {valor}
                            </div>
                            <button
                              onClick={() => {
                                const newDist = [
                                  ...(cuotasDetalladas.data[0] || []),
                                ];
                                newDist[idx] = valor + 1;
                                setCuotasDetalladasPorEncuestador((prev) => ({
                                  ...prev,
                                  [enc._id]: { data: [newDist] },
                                }));
                                setCuotasPorEncuestador((prev) => ({
                                  ...prev,
                                  [enc._id]: newDist.reduce((a, b) => a + b, 0),
                                }));
                              }}
                              disabled={isSaving}
                              className="w-9 h-9 sm:w-10 sm:h-10 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-lg sm:text-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer con validación */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--card-border)] flex-shrink-0 space-y-3">
          <div
            className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border text-xs sm:text-sm font-medium ${
              totalAsignadoEncuestadores === metaTotal
                ? "bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)]"
                : totalAsignadoEncuestadores > metaTotal
                ? "bg-[var(--error-bg)] border-[var(--error-border)] text-[var(--error-text)]"
                : "bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--warning)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex-1 min-w-0">
                {totalAsignadoEncuestadores === metaTotal
                  ? "✓ Total asignado"
                  : totalAsignadoEncuestadores > metaTotal
                  ? "⚠️ Exceso de casos"
                  : "⚠️ Faltan casos"}
              </span>
              <span className="font-mono font-bold text-base sm:text-lg flex-shrink-0">
                {totalAsignadoEncuestadores} / {metaTotal}
              </span>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--card-background)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-lg transition-colors font-semibold text-sm sm:text-base text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg transition-colors font-semibold text-sm sm:text-base text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2
                    size={16}
                    className="sm:w-[18px] sm:h-[18px] animate-spin"
                  />
                  <span className="hidden sm:inline">Guardando...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
