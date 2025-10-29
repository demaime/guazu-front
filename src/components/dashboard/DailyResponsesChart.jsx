"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

const DailyResponsesChart = ({ dailyData, onDateClick, selectedDate }) => {
  // Calcular métricas
  const today = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });

  // Buscar respuestas de hoy
  const todayData = dailyData.find((d) => d.date === today);
  const todayResponses = todayData ? todayData.responses : 0;

  const avgPerDay =
    dailyData.length > 0
      ? (
          dailyData.reduce((sum, d) => sum + d.responses, 0) / dailyData.length
        ).toFixed(1)
      : 0;
  const maxInDay =
    dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.responses)) : 0;

  return (
    <div className="bg-[var(--card-background)] rounded-xl border border-[var(--card-border)] p-4 sm:p-6 mb-6">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2 text-[var(--text-primary)]">
        <TrendingUp size={20} className="sm:w-6 sm:h-6 text-[var(--primary)]" />
        Encuestas por Día
      </h3>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart
          data={dailyData}
          onClick={(e) => {
            if (e && e.activeLabel) {
              onDateClick(
                selectedDate === e.activeLabel ? null : e.activeLabel
              );
            }
          }}
        >
          <defs>
            <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
          <XAxis
            dataKey="date"
            stroke="var(--text-secondary)"
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke="var(--text-secondary)" style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card-background)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              color: "var(--text-primary)",
            }}
            cursor={{ fill: "var(--hover-bg)" }}
          />
          <Area
            type="monotone"
            dataKey="responses"
            stroke="var(--primary)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorResponses)"
            name="Respuestas"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold text-[var(--primary)]">
            {selectedDate
              ? dailyData.find((d) => d.date === selectedDate)?.responses || 0
              : todayResponses}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            Respuestas {selectedDate || "hoy"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold text-[var(--success)]">
            {avgPerDay}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            Promedio diario
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold text-[var(--warning)]">
            {maxInDay}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            Máximo en un día
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyResponsesChart;
