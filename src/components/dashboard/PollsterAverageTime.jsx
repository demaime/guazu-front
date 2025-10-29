"use client";

import { Clock } from "lucide-react";

const PollsterAverageTime = ({
  pollstersTime,
  selectedPollsters = ["all"],
}) => {
  if (!pollstersTime || pollstersTime.length === 0) {
    return null;
  }

  // Filtrar encuestadores según la selección
  const filteredPollstersTime = selectedPollsters.includes("all")
    ? pollstersTime
    : pollstersTime.filter((p) => selectedPollsters.includes(p.id));

  if (filteredPollstersTime.length === 0) {
    return null;
  }

  // Función para convertir minutos decimales a formato "Xm Ys"
  const formatTime = (minutes) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return { mins, secs };
  };

  return (
    <div className="bg-[var(--card-background)] rounded-xl border border-[var(--card-border)] p-4 sm:p-6 mb-6">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2 text-[var(--text-primary)]">
        <Clock size={20} className="sm:w-6 sm:h-6 text-[var(--primary)]" />
        Tiempo Promedio por Encuestador
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredPollstersTime.map((pollster) => {
          const { mins, secs } = formatTime(pollster.avgMinutes);
          const isHighlighted = !selectedPollsters.includes("all");
          return (
            <div
              key={pollster.id}
              className={`rounded-lg p-3 sm:p-4 border transition-all ${
                isHighlighted
                  ? "bg-[var(--primary)]/10 border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-md"
                  : "bg-[var(--input-background)] border-[var(--card-border)] hover:border-[var(--primary)]"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                  style={{ backgroundColor: pollster.color }}
                />
                <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                  {pollster.name}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--primary)] mb-1">
                {mins}
                <span className="text-base sm:text-lg text-[var(--text-secondary)] mr-1">
                  m
                </span>
                {secs}
                <span className="text-base sm:text-lg text-[var(--text-secondary)]">
                  s
                </span>
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {pollster.totalResponses} encuestas
              </div>
              <div className="mt-2 h-1 bg-[var(--card-background)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--primary)] transition-all"
                  style={{
                    width: `${Math.min(
                      (pollster.avgMinutes /
                        Math.max(...pollstersTime.map((p) => p.avgMinutes))) *
                        100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PollsterAverageTime;
