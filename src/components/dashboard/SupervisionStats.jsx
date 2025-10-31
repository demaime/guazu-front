"use client";

import { Users, Target, Clock } from "lucide-react";

const SupervisionStats = ({ stats }) => {
  const {
    encuestadoresAsignados,
    respuestasCompletadas,
    diasRestantes,
    meta,
    isFiltered,
  } = stats;

  const porcentaje =
    meta > 0 ? Math.round((respuestasCompletadas / meta) * 100) : 0;

  // Cambiar texto según si hay filtro activo
  const encuestadoresLabel = isFiltered
    ? encuestadoresAsignados === 1
      ? "Encuestador Seleccionado"
      : "Encuestadores Seleccionados"
    : "Encuestadores Asignados";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Encuestadores Asignados */}
      <div className="bg-[var(--card-background)] p-4 sm:p-6 rounded-xl border border-[var(--primary)]/30 hover:border-[var(--primary)] transition">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-[var(--primary)]/20 rounded-lg flex-shrink-0">
            <Users size={20} className="sm:w-6 sm:h-6 text-[var(--primary)]" />
          </div>
          <div className="min-w-0">
            <div className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              {encuestadoresAsignados}
            </div>
            <div className="text-xs sm:text-sm text-[var(--text-secondary)]">
              {encuestadoresLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Respuestas Completadas */}
      <div className="bg-[var(--card-background)] p-4 sm:p-6 rounded-xl border border-[var(--success-border)]/30 hover:border-[var(--success-border)] transition">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-[var(--success-bg)] rounded-lg border border-[var(--success-border)]/20 flex-shrink-0">
            <Target size={20} className="sm:w-6 sm:h-6 text-[var(--success)]" />
          </div>
          <div className="min-w-0">
            <div className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              {respuestasCompletadas}
            </div>
            <div className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Respuestas Completadas
            </div>
            {meta > 0 && (
              <div className="text-xs text-[var(--success)] font-semibold mt-1">
                {porcentaje}% de {meta}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Días Restantes */}
      <div className="bg-[var(--card-background)] p-4 sm:p-6 rounded-xl border border-[var(--warning-border)]/30 hover:border-[var(--warning-border)] transition">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-[var(--warning-bg)] rounded-lg border border-[var(--warning-border)]/20 flex-shrink-0">
            <Clock size={20} className="sm:w-6 sm:h-6 text-[var(--warning)]" />
          </div>
          <div className="min-w-0">
            <div className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              {diasRestantes >= 0 ? diasRestantes : 0}
            </div>
            <div className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Días Restantes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisionStats;
