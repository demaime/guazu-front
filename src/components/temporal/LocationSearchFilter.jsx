import { X } from "lucide-react";

export default function LocationSearchFilter({
  provinces,
  cities,
  selectedProvince,
  selectedCity,
  onProvinceChange,
  onCityChange,
  onClearFilters,
}) {
  const hasFilters = selectedProvince || selectedCity;

  return (
    <div className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)]">
          Filtrar por Ubicación
        </h3>
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-[var(--error-text)] hover:text-[var(--error-border)] flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Province Selector */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Provincia
          </label>
          <select
            value={selectedProvince}
            onChange={(e) => onProvinceChange(e.target.value)}
            className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
          >
            <option value="">Todas las provincias</option>
            {provinces.map(({ name, count }) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
        </div>

        {/* City Selector (only visible when province is selected) */}
        {selectedProvince && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Ciudad
            </label>
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
            >
              <option value="">Todas las ciudades</option>
              {cities.map(({ name, count }) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Current Filter Display */}
      {hasFilters && (
        <div className="mt-3 p-2 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-lg text-sm">
          <span className="text-[var(--text-secondary)]">Filtrando por: </span>
          <span className="font-medium text-[var(--primary)]">
            {[selectedProvince, selectedCity].filter(Boolean).join(" → ")}
          </span>
        </div>
      )}
    </div>
  );
}
