"use client";

const PollsterFilter = ({
  pollsters,
  selectedPollsters,
  onTogglePollster,
  onCenterMap,
  colors,
}) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
        Seleccionar encuestadores
      </h4>
      {pollsters.map((pollster) => {
        const isSelected =
          selectedPollsters.includes("all") ||
          selectedPollsters.includes(pollster.id);

        return (
          <div key={pollster.id} className="flex items-center gap-2">
            <button
              onClick={() => onTogglePollster(pollster.id)}
              className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-between transition-all ${
                isSelected
                  ? "bg-[var(--primary)]/15 border-2 border-[var(--primary)] shadow-md ring-2 ring-[var(--primary)]/20"
                  : "bg-[var(--card-background)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] opacity-50 hover:opacity-75"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isSelected ? "ring-2 ring-white" : ""
                  }`}
                  style={{
                    backgroundColor: colors[pollster.id] || "var(--primary)",
                  }}
                />
                <span
                  className={`text-sm ${
                    isSelected
                      ? "text-[var(--text-primary)] font-bold"
                      : "text-[var(--text-primary)] font-medium"
                  }`}
                >
                  {pollster.name}
                </span>
              </div>
              <span
                className={`text-xs ${
                  isSelected
                    ? "text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] font-semibold"
                }`}
              >
                {pollster.responses}
              </span>
            </button>
            {pollster.id !== "all" && pollster.responses > 0 && (
              <button
                onClick={() => onCenterMap(pollster.id)}
                className="p-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 rounded-lg transition"
                title="Centrar en mapa"
              >
                <svg
                  className="w-4 h-4 text-[var(--primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PollsterFilter;
